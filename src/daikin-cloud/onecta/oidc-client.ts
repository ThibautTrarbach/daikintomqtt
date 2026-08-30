
import { IncomingMessage } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import { BaseClient, TokenSet, custom } from 'openid-client';
import {
    OnectaOIDCScope,
    OnectaAPIBaseUrl,
    OnectaClientConfig,
    onecta_oidc_issuer,
    OnectaRateLimitStatus,
    maybeParseInt,
    RESOLVED,
} from './oidc-utils';
import { OnectaOIDCCallbackServer } from './oidc-callback-server';
import { RateLimitedError } from "../index";
import { TOKEN_FILE_MODE } from '../token-storage';
import { AuthenticationError, categorizeHttpError, GatewayError, getRetryDelayMs, isRetryableError } from '../../modules/errorHandler';
import type { OAuthProvider } from '../types';
import { MAX_RETRY_ATTEMPTS } from '../constants';

type RequestParameters = Parameters<typeof BaseClient.prototype.requestResource>[2] & {
    ignoreRateLimit?: boolean;
    _authRetry?: boolean;
}

const ONE_DAY_S = 24 * 60 * 60;

custom.setHttpOptionsDefaults({
    timeout: 10_000,
});

export class OnectaClient {

    #config: OnectaClientConfig;
    #client: BaseClient;
    #tokenSet: TokenSet | null;
    #emitter: EventEmitter;
    #getTokenSetQueue: { resolve: (set: TokenSet) => any, reject: (err: Error) => any }[];
    #blockedUntil: number = 0;
    #refreshPromise: Promise<TokenSet> | null = null;
    #mobileOAuth: OAuthProvider | null = null;

    constructor(config: OnectaClientConfig, emitter: EventEmitter, mobileOAuth?: OAuthProvider | null) {
        this.#config = config;
        this.#emitter = emitter;
        this.#mobileOAuth = mobileOAuth ?? null;
        this.#client = new onecta_oidc_issuer.Client({
            client_id: config.oidcClientId ?? '',
            client_secret: config.oidcClientSecret ?? '',
        });
        this.#tokenSet = config.tokenSet ? new TokenSet(config.tokenSet) : null;
        this.#getTokenSetQueue = [];
    }

    get blockedUntil(): number {
        return this.#blockedUntil;
    }

    async #getAuthCodeWithCustomReceiver(): Promise<{ authCode: string, redirectUri: string }> {
        const { customOidcCodeReceiver: receiver, oidcCallbackServerBaseUrl: redirectUri } = this.#config;
        if (!receiver || !redirectUri) {
            throw new Error('Config params "customOidcCodeReceiver" and "oidcCallbackServerBaseUrl" are both required when using a custom OIDC authorization grant receiver');
        }
        const reqState = randomBytes(32).toString('hex');
        const authUrl = this.#client.authorizationUrl({
            scope: OnectaOIDCScope.basic,
            state: reqState,
            redirect_uri: redirectUri,
        });
        return { authCode: await receiver(authUrl, reqState), redirectUri };
    }

    async #getAuthCodeWithServer(): Promise<{ authCode: string, redirectUri: string }> {
        const reqState = randomBytes(32).toString('hex');
        const server = new OnectaOIDCCallbackServer(this.#config);
        const redirectUri = await server.listen();
        const authUrl = this.#client.authorizationUrl({
            scope: OnectaOIDCScope.basic,
            state: reqState,
            redirect_uri: redirectUri,
        });
        this.#emitter.emit('authorization_request', redirectUri);
        return { authCode: await server.waitForAuthCodeAndClose(reqState, authUrl), redirectUri };
    }

    async #authorize(): Promise<TokenSet> {
        const config = this.#config;
        const { authCode, redirectUri } = config.customOidcCodeReceiver
            ? await this.#getAuthCodeWithCustomReceiver() : await this.#getAuthCodeWithServer();
        return await this.#client.grant({
            grant_type: 'authorization_code',
            client_id: this.#config.oidcClientId,
            client_secret: this.#config.oidcClientSecret,
            code: authCode,
            redirect_uri: redirectUri,
        });
    }

    async #refreshOnce(refreshToken: string): Promise<TokenSet> {
        if (this.#refreshPromise) {
            return this.#refreshPromise;
        }
        this.#refreshPromise = this.#refresh(refreshToken).finally(() => {
            this.#refreshPromise = null;
        });
        return this.#refreshPromise;
    }

    async #refresh(refreshToken: string): Promise<TokenSet> {
        return await this.#client.grant({
            grant_type: 'refresh_token',
            client_id: this.#config.oidcClientId,
            client_secret: this.#config.oidcClientSecret,
            refresh_token: refreshToken,
        });
    }

    async #loadTokenSet(): Promise<TokenSet | null> {
        if (this.#config.oidcTokenSetFilePath) {
            try {
                const data = await readFile(this.#config.oidcTokenSetFilePath, 'utf8');
                return new TokenSet(JSON.parse(data));
            } catch (err) {
                if ((err as { code?: string }).code !== 'ENOENT') {
                    this.#emitter.emit('error', 'Could not load OIDC tokenset from disk: ' + (err as Error).message);
                }
            }
        }
        return null;
    }

    async #storeTokenSet(set: TokenSet): Promise<void> {
        this.#emitter.emit('token_update', set);
        if (this.#config.oidcTokenSetFilePath) {
            try {
                await writeFile(this.#config.oidcTokenSetFilePath, JSON.stringify(set, null, 2), { mode: TOKEN_FILE_MODE });
            } catch (err) {
                this.#emitter.emit('error', 'Could not store OIDC tokenset to disk: ' + (err as Error).message);
            }
        }
    }

    async #getTokenSet(): Promise<TokenSet> {
        if (this.#mobileOAuth) {
            const accessToken = await this.#mobileOAuth.getAccessToken();
            return new TokenSet({ access_token: accessToken, token_type: 'Bearer' });
        }

        let tokenSet: TokenSet | null = this.#tokenSet;
        if (!tokenSet && (tokenSet = await this.#loadTokenSet())){
            this.#tokenSet = tokenSet;
        }
        if (!tokenSet || !tokenSet.refresh_token) {
            tokenSet = await this.#authorize();
        } else if (!tokenSet.expires_at || tokenSet.expires_at < (Date.now() / 1000) + 10) {
            tokenSet = await this.#refreshOnce(tokenSet.refresh_token);
        }
        if (this.#tokenSet !== tokenSet) {
            await this.#storeTokenSet(tokenSet);
        }
        this.#tokenSet = tokenSet;
        return tokenSet;
    }

    async #getTokenSetQueued(): Promise<TokenSet> {
        return new Promise((resolve, reject) => {
            this.#getTokenSetQueue.push({ resolve, reject });
            if (this.#getTokenSetQueue.length === 1) {
                this.#getTokenSet()
                    .then((tokenSet) => {
                        this.#getTokenSetQueue.forEach(({ resolve }) => resolve(tokenSet));
                        this.#getTokenSetQueue = [];
                    })
                    .catch((err) => {
                        this.#getTokenSetQueue.forEach(({ reject }) => reject(err));
                        this.#getTokenSetQueue = [];
                    });
            }
        });
    }

    #getRateLimitStatus(res: IncomingMessage): OnectaRateLimitStatus {
        return {
            limitMinute: maybeParseInt(res.headers['x-ratelimit-limit-minute']),
            remainingMinute: maybeParseInt(res.headers['x-ratelimit-remaining-minute']),
            limitDay: maybeParseInt(res.headers['x-ratelimit-limit-day']),
            remainingDay: maybeParseInt(res.headers['x-ratelimit-remaining-day']),
        };
    }

    #parseResponseBody(res: IncomingMessage & { body?: Buffer }): any {
        return res.body ? JSON.parse(res.body.toString()) : null;
    }

    async #executeRequest(path: string, opts?: RequestParameters): Promise<any> {
        if (!opts?.ignoreRateLimit && this.#blockedUntil > Date.now()) {
            const retryAfter = Math.ceil((this.#blockedUntil - Date.now()) / 1000);
            throw new RateLimitedError(`API request blocked because of rate-limits for ${retryAfter} seconds`, retryAfter);
        }
        const reqOpts = { ...opts };
        delete reqOpts.ignoreRateLimit;
        delete reqOpts._authRetry;
        if (this.#config.mockId) {
            reqOpts.headers = {
                ...reqOpts.headers,
                'X-Mocking-Example-Id': this.#config.mockId,
            };
        }
        const tokenSet = await this.#getTokenSetQueued();
        const baseUrl = this.#config.useMock ? OnectaAPIBaseUrl.mock : OnectaAPIBaseUrl.prod;
        const url = `${baseUrl}${path}`;
        const res = await this.#client.requestResource(url, tokenSet, reqOpts) as IncomingMessage & { body?: Buffer; statusCode?: number };
        RESOLVED.then(() => this.#emitter.emit('rate_limit_status', this.#getRateLimitStatus(res)));

        switch (res.statusCode) {
            case 200:
            case 204:
                return this.#parseResponseBody(res);
            case 400: {
                const body = res.body ? res.body.toString() : '';
                throw categorizeHttpError(400, body);
            }
            case 401: {
                const body = res.body ? res.body.toString() : '';
                if (!opts?._authRetry && this.#mobileOAuth) {
                    await this.#mobileOAuth.refreshToken();
                    return this.#executeRequest(path, { ...opts, _authRetry: true });
                }
                if (!opts?._authRetry && this.#tokenSet?.refresh_token) {
                    this.#tokenSet = await this.#refreshOnce(this.#tokenSet.refresh_token);
                    await this.#storeTokenSet(this.#tokenSet);
                    return this.#executeRequest(path, { ...opts, _authRetry: true });
                }
                throw categorizeHttpError(401, body);
            }
            case 404:
                throw new Error(`Not Found (404): ${res.body ? res.body.toString() : 'No body response from the API'}`);
            case 409:
                throw new Error(`Conflict (409): ${res.body ? res.body.toString() : 'No body response from the API'}`);
            case 422:
                throw new Error(`Unprocessable Entity (422): ${res.body ? res.body.toString() : 'No body response from the API'}`);
            case 429: {
                const retryAfter = maybeParseInt(res.headers['retry-after']);
                let blockedFor = retryAfter;
                if (retryAfter !== undefined) {
                    blockedFor = retryAfter > ONE_DAY_S ? ONE_DAY_S : retryAfter;
                    this.#blockedUntil = Date.now() + blockedFor * 1000;
                }
                throw new RateLimitedError(`API request rate-limited, retry after ${retryAfter} seconds. API requests blocked for ${blockedFor} seconds`, blockedFor);
            }
            case 502:
            case 503:
            case 504: {
                const body = res.body ? res.body.toString() : '';
                throw new GatewayError(`Gateway error (${res.statusCode}): ${body || 'Temporary server error'}`, res.statusCode ?? 502);
            }
            case 500:
            default:
                throw new Error(`Unexpected API error (${res.statusCode})`);
        }
    }

    async requestResource(path: string, opts?: RequestParameters): Promise<any> {
        let lastError: unknown;
        for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                return await this.#executeRequest(path, opts);
            } catch (error) {
                lastError = error;
                if (error instanceof AuthenticationError || error instanceof RateLimitedError) {
                    throw error;
                }
                if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS - 1) {
                    throw error;
                }
                const delay = getRetryDelayMs(attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }

}
