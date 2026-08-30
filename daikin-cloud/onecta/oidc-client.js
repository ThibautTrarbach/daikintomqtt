"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnectaClient = void 0;
const promises_1 = require("node:fs/promises");
const node_crypto_1 = require("node:crypto");
const openid_client_1 = require("openid-client");
const oidc_utils_1 = require("./oidc-utils");
const oidc_callback_server_1 = require("./oidc-callback-server");
const index_1 = require("../index");
const token_storage_1 = require("../token-storage");
const errorHandler_1 = require("../../modules/errorHandler");
const constants_1 = require("../constants");
const ONE_DAY_S = 24 * 60 * 60;
openid_client_1.custom.setHttpOptionsDefaults({
    timeout: 10_000,
});
class OnectaClient {
    #config;
    #client;
    #tokenSet;
    #emitter;
    #getTokenSetQueue;
    #blockedUntil = 0;
    #refreshPromise = null;
    #mobileOAuth = null;
    constructor(config, emitter, mobileOAuth) {
        this.#config = config;
        this.#emitter = emitter;
        this.#mobileOAuth = mobileOAuth ?? null;
        this.#client = new oidc_utils_1.onecta_oidc_issuer.Client({
            client_id: config.oidcClientId ?? '',
            client_secret: config.oidcClientSecret ?? '',
        });
        this.#tokenSet = config.tokenSet ? new openid_client_1.TokenSet(config.tokenSet) : null;
        this.#getTokenSetQueue = [];
    }
    get blockedUntil() {
        return this.#blockedUntil;
    }
    async #getAuthCodeWithCustomReceiver() {
        const { customOidcCodeReceiver: receiver, oidcCallbackServerBaseUrl: redirectUri } = this.#config;
        if (!receiver || !redirectUri) {
            throw new Error('Config params "customOidcCodeReceiver" and "oidcCallbackServerBaseUrl" are both required when using a custom OIDC authorization grant receiver');
        }
        const reqState = (0, node_crypto_1.randomBytes)(32).toString('hex');
        const authUrl = this.#client.authorizationUrl({
            scope: oidc_utils_1.OnectaOIDCScope.basic,
            state: reqState,
            redirect_uri: redirectUri,
        });
        return { authCode: await receiver(authUrl, reqState), redirectUri };
    }
    async #getAuthCodeWithServer() {
        const reqState = (0, node_crypto_1.randomBytes)(32).toString('hex');
        const server = new oidc_callback_server_1.OnectaOIDCCallbackServer(this.#config);
        const redirectUri = await server.listen();
        const authUrl = this.#client.authorizationUrl({
            scope: oidc_utils_1.OnectaOIDCScope.basic,
            state: reqState,
            redirect_uri: redirectUri,
        });
        this.#emitter.emit('authorization_request', redirectUri);
        return { authCode: await server.waitForAuthCodeAndClose(reqState, authUrl), redirectUri };
    }
    async #authorize() {
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
    async #refreshOnce(refreshToken) {
        if (this.#refreshPromise) {
            return this.#refreshPromise;
        }
        this.#refreshPromise = this.#refresh(refreshToken).finally(() => {
            this.#refreshPromise = null;
        });
        return this.#refreshPromise;
    }
    async #refresh(refreshToken) {
        return await this.#client.grant({
            grant_type: 'refresh_token',
            client_id: this.#config.oidcClientId,
            client_secret: this.#config.oidcClientSecret,
            refresh_token: refreshToken,
        });
    }
    async #loadTokenSet() {
        if (this.#config.oidcTokenSetFilePath) {
            try {
                const data = await (0, promises_1.readFile)(this.#config.oidcTokenSetFilePath, 'utf8');
                return new openid_client_1.TokenSet(JSON.parse(data));
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    this.#emitter.emit('error', 'Could not load OIDC tokenset from disk: ' + err.message);
                }
            }
        }
        return null;
    }
    async #storeTokenSet(set) {
        this.#emitter.emit('token_update', set);
        if (this.#config.oidcTokenSetFilePath) {
            try {
                await (0, promises_1.writeFile)(this.#config.oidcTokenSetFilePath, JSON.stringify(set, null, 2), { mode: token_storage_1.TOKEN_FILE_MODE });
            }
            catch (err) {
                this.#emitter.emit('error', 'Could not store OIDC tokenset to disk: ' + err.message);
            }
        }
    }
    async #getTokenSet() {
        if (this.#mobileOAuth) {
            const accessToken = await this.#mobileOAuth.getAccessToken();
            return new openid_client_1.TokenSet({ access_token: accessToken, token_type: 'Bearer' });
        }
        let tokenSet = this.#tokenSet;
        if (!tokenSet && (tokenSet = await this.#loadTokenSet())) {
            this.#tokenSet = tokenSet;
        }
        if (!tokenSet || !tokenSet.refresh_token) {
            tokenSet = await this.#authorize();
        }
        else if (!tokenSet.expires_at || tokenSet.expires_at < (Date.now() / 1000) + 10) {
            tokenSet = await this.#refreshOnce(tokenSet.refresh_token);
        }
        if (this.#tokenSet !== tokenSet) {
            await this.#storeTokenSet(tokenSet);
        }
        this.#tokenSet = tokenSet;
        return tokenSet;
    }
    async #getTokenSetQueued() {
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
    #getRateLimitStatus(res) {
        return {
            limitMinute: (0, oidc_utils_1.maybeParseInt)(res.headers['x-ratelimit-limit-minute']),
            remainingMinute: (0, oidc_utils_1.maybeParseInt)(res.headers['x-ratelimit-remaining-minute']),
            limitDay: (0, oidc_utils_1.maybeParseInt)(res.headers['x-ratelimit-limit-day']),
            remainingDay: (0, oidc_utils_1.maybeParseInt)(res.headers['x-ratelimit-remaining-day']),
        };
    }
    #parseResponseBody(res) {
        return res.body ? JSON.parse(res.body.toString()) : null;
    }
    async #executeRequest(path, opts) {
        if (!opts?.ignoreRateLimit && this.#blockedUntil > Date.now()) {
            const retryAfter = Math.ceil((this.#blockedUntil - Date.now()) / 1000);
            throw new index_1.RateLimitedError(`API request blocked because of rate-limits for ${retryAfter} seconds`, retryAfter);
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
        const baseUrl = this.#config.useMock ? oidc_utils_1.OnectaAPIBaseUrl.mock : oidc_utils_1.OnectaAPIBaseUrl.prod;
        const url = `${baseUrl}${path}`;
        const res = await this.#client.requestResource(url, tokenSet, reqOpts);
        oidc_utils_1.RESOLVED.then(() => this.#emitter.emit('rate_limit_status', this.#getRateLimitStatus(res)));
        switch (res.statusCode) {
            case 200:
            case 204:
                return this.#parseResponseBody(res);
            case 400: {
                const body = res.body ? res.body.toString() : '';
                throw (0, errorHandler_1.categorizeHttpError)(400, body);
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
                throw (0, errorHandler_1.categorizeHttpError)(401, body);
            }
            case 404:
                throw new Error(`Not Found (404): ${res.body ? res.body.toString() : 'No body response from the API'}`);
            case 409:
                throw new Error(`Conflict (409): ${res.body ? res.body.toString() : 'No body response from the API'}`);
            case 422:
                throw new Error(`Unprocessable Entity (422): ${res.body ? res.body.toString() : 'No body response from the API'}`);
            case 429: {
                const retryAfter = (0, oidc_utils_1.maybeParseInt)(res.headers['retry-after']);
                let blockedFor = retryAfter;
                if (retryAfter !== undefined) {
                    blockedFor = retryAfter > ONE_DAY_S ? ONE_DAY_S : retryAfter;
                    this.#blockedUntil = Date.now() + blockedFor * 1000;
                }
                throw new index_1.RateLimitedError(`API request rate-limited, retry after ${retryAfter} seconds. API requests blocked for ${blockedFor} seconds`, blockedFor);
            }
            case 502:
            case 503:
            case 504: {
                const body = res.body ? res.body.toString() : '';
                throw new errorHandler_1.GatewayError(`Gateway error (${res.statusCode}): ${body || 'Temporary server error'}`, res.statusCode ?? 502);
            }
            case 500:
            default:
                throw new Error(`Unexpected API error (${res.statusCode})`);
        }
    }
    async requestResource(path, opts) {
        let lastError;
        for (let attempt = 0; attempt < constants_1.MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                return await this.#executeRequest(path, opts);
            }
            catch (error) {
                lastError = error;
                if (error instanceof errorHandler_1.AuthenticationError || error instanceof index_1.RateLimitedError) {
                    throw error;
                }
                if (!(0, errorHandler_1.isRetryableError)(error) || attempt >= constants_1.MAX_RETRY_ATTEMPTS - 1) {
                    throw error;
                }
                const delay = (0, errorHandler_1.getRetryDelayMs)(attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
}
exports.OnectaClient = OnectaClient;
//# sourceMappingURL=oidc-client.js.map