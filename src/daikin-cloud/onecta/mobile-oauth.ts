/**
 * Mobile App OAuth (Gigya + PKCE) — ported from mp-consulting/homebridge-daikin-cloud
 */

import * as crypto from 'node:crypto';
import type { MobileClientConfig, OAuthProvider, TokenSet } from '../types';
import { DAIKIN_MOBILE_CONFIG } from '../types';
import { deleteTokenFile, loadTokenFromFile, saveTokenToFile } from '../token-storage';
import { httpRequest } from '../http-transport';
import { MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS } from '../constants';

interface PKCEPair {
	verifier: string;
	challenge: string;
}

interface GigyaLoginResult {
	errorCode: number;
	errorMessage?: string;
	errorDetails?: string;
	regToken?: string;
	data?: { profile?: Record<string, string> };
	profile?: { firstName?: string; lastName?: string };
	sessionInfo?: { login_token: string };
}

export class DaikinMobileOAuth implements OAuthProvider {
	private tokenSet: TokenSet | null = null;
	private refreshPromise: Promise<TokenSet> | null = null;
	private cookies = '';
	private pendingOAuthState: string | null = null;

	constructor(
		private readonly config: MobileClientConfig,
		private readonly onTokenUpdate?: (tokenSet: TokenSet) => void,
		private readonly onError?: (error: Error) => void,
		private readonly onLog?: (message: string) => void,
	) {
		this.tokenSet = loadTokenFromFile(config.tokenFilePath);
		if (this.tokenSet?.expires_in && !this.tokenSet.expires_at) {
			this.tokenSet.expires_at = Math.floor(Date.now() / 1000) + this.tokenSet.expires_in;
		}
	}

	async authenticate(): Promise<TokenSet> {
		const pkce = this.generatePKCE();
		const context = await this.getOidcContext(pkce);
		this.cookies = await this.initGigyaSdk(context);
		const loginToken = await this.gigyaLogin();
		const code = await this.authorizeWithToken(context, loginToken);
		const tokenSet = await this.exchangeCodeForTokens(code, pkce);
		this.setTokenSet(tokenSet);
		return tokenSet;
	}

	async refreshToken(): Promise<TokenSet> {
		if (!this.tokenSet?.refresh_token) {
			throw new Error('No refresh token available');
		}
		if (this.refreshPromise) {
			return this.refreshPromise;
		}
		this.refreshPromise = this.performRefresh();
		try {
			const tokenSet = await this.refreshPromise;
			this.setTokenSet(tokenSet);
			return tokenSet;
		} finally {
			this.refreshPromise = null;
		}
	}

	async getAccessToken(): Promise<string> {
		if (!this.tokenSet) {
			throw new Error('Not authenticated. Please authenticate first.');
		}
		const now = Math.floor(Date.now() / 1000);
		const expiresAt = this.tokenSet.expires_at || 0;
		if (expiresAt < now + 10) {
			if (!this.tokenSet.refresh_token) {
				throw new Error('Token expired and no refresh token available. Please re-authenticate.');
			}
			await this.refreshToken();
		}
		return this.tokenSet!.access_token as string;
	}

	isAuthenticated(): boolean {
		if (!this.tokenSet?.access_token) {
			return false;
		}
		const now = Math.floor(Date.now() / 1000);
		const expiresAt = this.tokenSet.expires_at;
		if (expiresAt !== undefined && expiresAt < now + 10) {
			return !!this.tokenSet.refresh_token;
		}
		return true;
	}

	getTokenSet(): TokenSet | null {
		return this.tokenSet;
	}

	clearTokens(): void {
		deleteTokenFile(this.config.tokenFilePath);
		this.tokenSet = null;
	}

	private async performRefresh(): Promise<TokenSet> {
		const basicAuth = Buffer.from(
			`${DAIKIN_MOBILE_CONFIG.clientId}:${DAIKIN_MOBILE_CONFIG.clientSecret}`,
		).toString('base64');

		const params = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: this.tokenSet!.refresh_token!,
		});

		const response = await this.httpsRequest(
			DAIKIN_MOBILE_CONFIG.idpTokenEndpoint,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${basicAuth}`,
				},
			},
			params.toString(),
		);

		const result = this.parseJsonResponse<TokenSet & { error?: string; error_description?: string }>(
			response,
			DAIKIN_MOBILE_CONFIG.idpTokenEndpoint,
			'Token refresh failed',
		);

		if (result.error) {
			throw new Error(`Token refresh failed: ${result.error_description || result.error}`);
		}

		return result;
	}

	private setTokenSet(tokenSet: TokenSet): void {
		if (tokenSet.expires_in && !tokenSet.expires_at) {
			tokenSet.expires_at = Math.floor(Date.now() / 1000) + tokenSet.expires_in;
		}
		const merged = {
			...(this.tokenSet ?? {}),
			...tokenSet,
			refresh_token: tokenSet.refresh_token ?? this.tokenSet?.refresh_token,
		} as TokenSet;
		this.tokenSet = merged;
		saveTokenToFile(this.config.tokenFilePath, merged);
		this.onTokenUpdate?.(merged);
	}

	private generatePKCE(): PKCEPair {
		const verifier = crypto.randomBytes(32).toString('base64url');
		const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
		return { verifier, challenge };
	}

	private get gigyaPostHeaders(): Record<string, string> {
		return {
			'Content-Type': 'application/x-www-form-urlencoded',
			Origin: 'https://id.daikin.eu',
			Referer: 'https://id.daikin.eu/',
			Cookie: this.cookies,
		};
	}

	private get gigyaSdkParams(): Record<string, string> {
		return {
			targetEnv: 'jssdk',
			include: 'profile,data,emails,subscriptions,preferences,',
			APIKey: DAIKIN_MOBILE_CONFIG.apiKey,
			source: 'showScreenSet',
			sdk: 'js_latest',
			authMode: 'cookie',
			pageURL: `https://id.daikin.eu/cdc/onecta/oidc/registration-login.html?gig_client_id=${DAIKIN_MOBILE_CONFIG.clientId}`,
			sdkBuild: '18305',
			format: 'json',
		};
	}

	private extractLoginToken(result: GigyaLoginResult, context: string): string {
		const errorCode = Number(result.errorCode);
		if (errorCode !== 0) {
			throw new Error(`${context} (${errorCode}): ${result.errorMessage || result.errorDetails}`);
		}
		if (!result.sessionInfo?.login_token) {
			throw new Error(`No login_token in ${context} response`);
		}
		return result.sessionInfo.login_token;
	}

	private async getOidcContext(pkce: PKCEPair): Promise<string> {
		this.pendingOAuthState = crypto.randomBytes(16).toString('hex');
		const params = new URLSearchParams({
			client_id: DAIKIN_MOBILE_CONFIG.clientId,
			redirect_uri: DAIKIN_MOBILE_CONFIG.redirectUri,
			response_type: 'code',
			scope: DAIKIN_MOBILE_CONFIG.scope,
			code_challenge: pkce.challenge,
			code_challenge_method: 'S256',
			state: this.pendingOAuthState,
		});

		const oidcBase = `${DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/oidc/op/v1.0/${DAIKIN_MOBILE_CONFIG.apiKey}`;
		const url = `${oidcBase}/authorize?${params}`;
		const response = await this.httpsRequest(url, { method: 'GET' });

		const redirectStatus = response.statusCode >= 300 && response.statusCode < 400;
		if (redirectStatus && response.headers.location) {
			const location = String(response.headers.location);
			const contextMatch = location.match(/context=([^&]+)/);
			if (contextMatch) {
				return decodeURIComponent(contextMatch[1]);
			}
		}

		const { hostname } = new URL(url);
		const snippet = response.body.trim().slice(0, 200);
		throw new Error(
			`Failed to get OIDC context: ${hostname} returned HTTP ${response.statusCode}`
			+ (response.headers.location ? ` (Location: ${String(response.headers.location).slice(0, 120)})` : '')
			+ (snippet ? `: ${snippet}` : ' with an empty body'),
		);
	}

	private async initGigyaSdk(context: string): Promise<string> {
		const proxyUrl = `https://id.daikin.eu/cdc/onecta/oidc/proxy.html?context=${encodeURIComponent(context)}&client_id=${DAIKIN_MOBILE_CONFIG.clientId}&mode=login&scope=${encodeURIComponent(DAIKIN_MOBILE_CONFIG.scope)}&gig_skipConsent=true`;

		const params = new URLSearchParams({
			apiKey: DAIKIN_MOBILE_CONFIG.apiKey,
			pageURL: proxyUrl,
			sdk: 'js_latest',
			sdkBuild: '18305',
			format: 'json',
		});

		const response = await this.httpsRequest(
			`${DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/accounts.webSdkBootstrap?${params}`,
			{
				method: 'GET',
				headers: {
					Accept: '*/*',
					Origin: 'https://id.daikin.eu',
					Referer: 'https://id.daikin.eu/',
				},
			},
		);

		const cookies: string[] = [];
		const setCookies = response.headers['set-cookie'];
		if (setCookies) {
			const cookieArray = Array.isArray(setCookies) ? setCookies : [setCookies];
			for (const cookie of cookieArray) {
				const match = cookie.match(/^([^=]+=[^;]+)/);
				if (match) {
					cookies.push(match[1]);
				}
			}
		}
		cookies.push(`gig_bootstrap_${DAIKIN_MOBILE_CONFIG.apiKey}=cdc_ver4`);
		return cookies.join('; ');
	}

	private generateRiskContext(): string {
		const now = new Date();
		const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
		return JSON.stringify({
			b0: 14063,
			b1: [0, 2, 2, 0],
			b2: 4,
			b3: [],
			b4: 2,
			b5: 1,
			b6: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
			b7: [],
			b8: timeStr,
			b9: 0,
			b10: { state: 'denied' },
			b11: false,
			b12: null,
			b13: [5, '402|874|24', false, true],
		});
	}

	private async gigyaLogin(): Promise<string> {
		const params = new URLSearchParams({
			...this.gigyaSdkParams,
			loginID: this.config.email,
			password: this.config.password,
			sessionExpiration: '31536000',
			includeUserInfo: 'true',
			loginMode: 'standard',
			lang: 'en',
			riskContext: this.generateRiskContext(),
		});

		const response = await this.httpsRequest(
			`${DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/accounts.login`,
			{ method: 'POST', headers: this.gigyaPostHeaders },
			params.toString(),
		);

		const result = this.parseJsonResponse<GigyaLoginResult>(
			response,
			DAIKIN_MOBILE_CONFIG.gigyaBaseUrl,
			'Login failed',
		);

		const errorCode = Number(result.errorCode);

		if (errorCode === 206001) {
			this.onLog?.('Account has pending registration (206001). Attempting to complete registration automatically...');
			if (result.sessionInfo?.login_token) {
				return result.sessionInfo.login_token;
			}
			if (result.regToken) {
				return this.completePendingRegistration(result.regToken, result.data, result.profile);
			}
			throw new Error(
				'Account pending registration (206001) without regToken. '
				+ 'Please open the Daikin Onecta app, complete your account setup, then restart Daikin2MQTT.',
			);
		}

		return this.extractLoginToken(result, 'Login failed');
	}

	private async completePendingRegistration(
		regToken: string,
		existingData?: { profile?: Record<string, string> },
		existingProfile?: { firstName?: string; lastName?: string },
	): Promise<string> {
		const customProfile = existingData?.profile || {};
		const countryResidence = customProfile.countryResidence || 'US';
		const communicationLanguage = customProfile.communicationLanguage || 'en';

		let firstName = existingProfile?.firstName;
		let lastName = existingProfile?.lastName;

		if (!firstName || !lastName) {
			const emailUser = this.config.email.split('@')[0];
			const nameParts = emailUser.split(/[._-]/);
			firstName = firstName || (nameParts[0]
				? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
				: 'User');
			lastName = lastName || (nameParts.length > 1
				? nameParts[nameParts.length - 1].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].slice(1)
				: 'Account');
			this.onLog?.(`Using derived name for registration: ${firstName} ${lastName}. You can update your name in the Daikin Onecta app.`);
		}

		this.onLog?.(`Completing pending registration with countryResidence=${countryResidence}, communicationLanguage=${communicationLanguage}`);
		this.onLog?.('Note: Privacy notice consent (privacy.PrivacyNotice.onecta) will be accepted automatically.');

		const params = new URLSearchParams({
			...this.gigyaSdkParams,
			regToken,
			email: this.config.email,
			password: this.config.password,
			profile: JSON.stringify({ firstName, lastName }),
			data: JSON.stringify({ profile: { countryResidence, communicationLanguage } }),
			preferences: JSON.stringify({
				'privacy.PrivacyNotice.onecta': { isConsentGranted: true },
			}),
			finalizeRegistration: 'true',
		});

		const response = await this.httpsRequest(
			`${DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/accounts.register`,
			{ method: 'POST', headers: this.gigyaPostHeaders },
			params.toString(),
		);

		const result = this.parseJsonResponse<GigyaLoginResult>(
			response,
			DAIKIN_MOBILE_CONFIG.gigyaBaseUrl,
			'Registration completion failed',
		);
		const loginToken = this.extractLoginToken(result, 'Registration completion failed');

		this.onLog?.('Pending registration completed successfully.');
		return loginToken;
	}

	private async authorizeWithToken(context: string, loginToken: string): Promise<string> {
		const params = new URLSearchParams({ context, login_token: loginToken });
		const cookieStr = `${this.cookies}; glt_${DAIKIN_MOBILE_CONFIG.apiKey}=${loginToken}`;
		const oidcBase = `${DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/oidc/op/v1.0/${DAIKIN_MOBILE_CONFIG.apiKey}`;
		const url = `${oidcBase}/authorize/continue?${params}`;

		const response = await this.httpsRequest(url, {
			method: 'GET',
			headers: { Cookie: cookieStr, Referer: 'https://id.daikin.eu/' },
		});

		if (response.statusCode === 302 && response.headers.location) {
			const location = String(response.headers.location);
			const stateMatch = location.match(/[?&]state=([^&]+)/);
			if (this.pendingOAuthState && stateMatch && decodeURIComponent(stateMatch[1]) !== this.pendingOAuthState) {
				throw new Error('OAuth state mismatch — possible CSRF attack');
			}
			const codeMatch = location.match(/code=([^&]+)/);
			if (codeMatch) {
				return decodeURIComponent(codeMatch[1]);
			}
			const errorMatch = location.match(/error=([^&]+)/);
			if (errorMatch) {
				const errorDesc = location.match(/error_description=([^&]+)/);
				throw new Error(`Authorization error: ${decodeURIComponent(errorDesc ? errorDesc[1] : errorMatch[1])}`);
			}
		}

		throw new Error('Failed to get authorization code');
	}

	private async exchangeCodeForTokens(code: string, pkce: PKCEPair): Promise<TokenSet> {
		const basicAuth = Buffer.from(
			`${DAIKIN_MOBILE_CONFIG.clientId}:${DAIKIN_MOBILE_CONFIG.clientSecret}`,
		).toString('base64');

		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: DAIKIN_MOBILE_CONFIG.redirectUri,
			code_verifier: pkce.verifier,
		});

		const response = await this.httpsRequest(
			DAIKIN_MOBILE_CONFIG.idpTokenEndpoint,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${basicAuth}`,
				},
			},
			params.toString(),
		);

		const result = this.parseJsonResponse<TokenSet & { error?: string; error_description?: string }>(
			response,
			DAIKIN_MOBILE_CONFIG.idpTokenEndpoint,
			'Token exchange failed',
		);

		if (result.error) {
			throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
		}

		return result;
	}

	private parseJsonResponse<T>(
		response: { statusCode: number; body: string },
		url: string,
		context: string,
	): T {
		try {
			return JSON.parse(response.body) as T;
		} catch {
			const { hostname } = new URL(url);
			const snippet = response.body.trim().slice(0, 200);
			throw new Error(
				`${context}: ${hostname} returned a non-JSON response (HTTP ${response.statusCode})`
				+ (snippet ? `: ${snippet}` : ' with an empty body'),
			);
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private async httpsRequest(
		url: string,
		options: { method: string; headers?: Record<string, string> },
		postData?: string,
	): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: string }> {
		for (let attempt = 1; ; attempt++) {
			try {
				return await httpRequest(url, options, postData);
			} catch (error) {
				const err = error as NodeJS.ErrnoException;
				const retryable = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(err.code ?? '');
				if (attempt >= MAX_RETRY_ATTEMPTS || !retryable) {
					throw error;
				}
				const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
				this.onLog?.(`Request failed (${err.code}); retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
				await this.sleep(delay);
			}
		}
	}
}
