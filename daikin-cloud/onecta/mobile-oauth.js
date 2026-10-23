"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaikinMobileOAuth = void 0;
const crypto = __importStar(require("node:crypto"));
const types_1 = require("../types");
const token_storage_1 = require("../token-storage");
const http_transport_1 = require("../http-transport");
const constants_1 = require("../constants");
class DaikinMobileOAuth {
    config;
    onTokenUpdate;
    onError;
    onLog;
    tokenSet = null;
    refreshPromise = null;
    cookies = '';
    pendingOAuthState = null;
    constructor(config, onTokenUpdate, onError, onLog) {
        this.config = config;
        this.onTokenUpdate = onTokenUpdate;
        this.onError = onError;
        this.onLog = onLog;
        this.tokenSet = (0, token_storage_1.loadTokenFromFile)(config.tokenFilePath);
        if (this.tokenSet?.expires_in && !this.tokenSet.expires_at) {
            this.tokenSet.expires_at = Math.floor(Date.now() / 1000) + this.tokenSet.expires_in;
        }
    }
    async authenticate() {
        const pkce = this.generatePKCE();
        const context = await this.getOidcContext(pkce);
        this.cookies = await this.initGigyaSdk(context);
        const loginToken = await this.gigyaLogin();
        const code = await this.authorizeWithToken(context, loginToken);
        const tokenSet = await this.exchangeCodeForTokens(code, pkce);
        this.setTokenSet(tokenSet);
        return tokenSet;
    }
    async refreshToken() {
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
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async getAccessToken() {
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
        return this.tokenSet.access_token;
    }
    isAuthenticated() {
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
    getTokenSet() {
        return this.tokenSet;
    }
    clearTokens() {
        (0, token_storage_1.deleteTokenFile)(this.config.tokenFilePath);
        this.tokenSet = null;
    }
    async performRefresh() {
        const basicAuth = Buffer.from(`${types_1.DAIKIN_MOBILE_CONFIG.clientId}:${types_1.DAIKIN_MOBILE_CONFIG.clientSecret}`).toString('base64');
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.tokenSet.refresh_token,
        });
        const response = await this.httpsRequest(types_1.DAIKIN_MOBILE_CONFIG.idpTokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${basicAuth}`,
            },
        }, params.toString());
        const result = this.parseJsonResponse(response, types_1.DAIKIN_MOBILE_CONFIG.idpTokenEndpoint, 'Token refresh failed');
        if (result.error) {
            throw new Error(`Token refresh failed: ${result.error_description || result.error}`);
        }
        return result;
    }
    setTokenSet(tokenSet) {
        if (tokenSet.expires_in && !tokenSet.expires_at) {
            tokenSet.expires_at = Math.floor(Date.now() / 1000) + tokenSet.expires_in;
        }
        const merged = {
            ...(this.tokenSet ?? {}),
            ...tokenSet,
            refresh_token: tokenSet.refresh_token ?? this.tokenSet?.refresh_token,
        };
        this.tokenSet = merged;
        (0, token_storage_1.saveTokenToFile)(this.config.tokenFilePath, merged);
        this.onTokenUpdate?.(merged);
    }
    generatePKCE() {
        const verifier = crypto.randomBytes(32).toString('base64url');
        const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
        return { verifier, challenge };
    }
    get gigyaPostHeaders() {
        return {
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: 'https://id.daikin.eu',
            Referer: 'https://id.daikin.eu/',
            Cookie: this.cookies,
        };
    }
    get gigyaSdkParams() {
        return {
            targetEnv: 'jssdk',
            include: 'profile,data,emails,subscriptions,preferences,',
            APIKey: types_1.DAIKIN_MOBILE_CONFIG.apiKey,
            source: 'showScreenSet',
            sdk: 'js_latest',
            authMode: 'cookie',
            pageURL: `https://id.daikin.eu/cdc/onecta/oidc/registration-login.html?gig_client_id=${types_1.DAIKIN_MOBILE_CONFIG.clientId}`,
            sdkBuild: '18305',
            format: 'json',
        };
    }
    extractLoginToken(result, context) {
        const errorCode = Number(result.errorCode);
        if (errorCode !== 0) {
            throw new Error(`${context} (${errorCode}): ${result.errorMessage || result.errorDetails}`);
        }
        if (!result.sessionInfo?.login_token) {
            throw new Error(`No login_token in ${context} response`);
        }
        return result.sessionInfo.login_token;
    }
    async getOidcContext(pkce) {
        this.pendingOAuthState = crypto.randomBytes(16).toString('hex');
        const params = new URLSearchParams({
            client_id: types_1.DAIKIN_MOBILE_CONFIG.clientId,
            redirect_uri: types_1.DAIKIN_MOBILE_CONFIG.redirectUri,
            response_type: 'code',
            scope: types_1.DAIKIN_MOBILE_CONFIG.scope,
            code_challenge: pkce.challenge,
            code_challenge_method: 'S256',
            state: this.pendingOAuthState,
        });
        const oidcBase = `${types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/oidc/op/v1.0/${types_1.DAIKIN_MOBILE_CONFIG.apiKey}`;
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
        throw new Error(`Failed to get OIDC context: ${hostname} returned HTTP ${response.statusCode}`
            + (response.headers.location ? ` (Location: ${String(response.headers.location).slice(0, 120)})` : '')
            + (snippet ? `: ${snippet}` : ' with an empty body'));
    }
    async initGigyaSdk(context) {
        const proxyUrl = `https://id.daikin.eu/cdc/onecta/oidc/proxy.html?context=${encodeURIComponent(context)}&client_id=${types_1.DAIKIN_MOBILE_CONFIG.clientId}&mode=login&scope=${encodeURIComponent(types_1.DAIKIN_MOBILE_CONFIG.scope)}&gig_skipConsent=true`;
        const params = new URLSearchParams({
            apiKey: types_1.DAIKIN_MOBILE_CONFIG.apiKey,
            pageURL: proxyUrl,
            sdk: 'js_latest',
            sdkBuild: '18305',
            format: 'json',
        });
        const response = await this.httpsRequest(`${types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/accounts.webSdkBootstrap?${params}`, {
            method: 'GET',
            headers: {
                Accept: '*/*',
                Origin: 'https://id.daikin.eu',
                Referer: 'https://id.daikin.eu/',
            },
        });
        const cookies = [];
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
        cookies.push(`gig_bootstrap_${types_1.DAIKIN_MOBILE_CONFIG.apiKey}=cdc_ver4`);
        return cookies.join('; ');
    }
    generateRiskContext() {
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
    async gigyaLogin() {
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
        const response = await this.httpsRequest(`${types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/accounts.login`, { method: 'POST', headers: this.gigyaPostHeaders }, params.toString());
        const result = this.parseJsonResponse(response, types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl, 'Login failed');
        const errorCode = Number(result.errorCode);
        if (errorCode === 206001) {
            this.onLog?.('Account has pending registration (206001). Attempting to complete registration automatically...');
            if (result.sessionInfo?.login_token) {
                return result.sessionInfo.login_token;
            }
            if (result.regToken) {
                return this.completePendingRegistration(result.regToken, result.data, result.profile);
            }
            throw new Error('Account pending registration (206001) without regToken. '
                + 'Please open the Daikin Onecta app, complete your account setup, then restart Daikin2MQTT.');
        }
        return this.extractLoginToken(result, 'Login failed');
    }
    async completePendingRegistration(regToken, existingData, existingProfile) {
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
        const response = await this.httpsRequest(`${types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/accounts.register`, { method: 'POST', headers: this.gigyaPostHeaders }, params.toString());
        const result = this.parseJsonResponse(response, types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl, 'Registration completion failed');
        const loginToken = this.extractLoginToken(result, 'Registration completion failed');
        this.onLog?.('Pending registration completed successfully.');
        return loginToken;
    }
    async authorizeWithToken(context, loginToken) {
        const params = new URLSearchParams({ context, login_token: loginToken });
        const cookieStr = `${this.cookies}; glt_${types_1.DAIKIN_MOBILE_CONFIG.apiKey}=${loginToken}`;
        const oidcBase = `${types_1.DAIKIN_MOBILE_CONFIG.gigyaBaseUrl}/oidc/op/v1.0/${types_1.DAIKIN_MOBILE_CONFIG.apiKey}`;
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
    async exchangeCodeForTokens(code, pkce) {
        const basicAuth = Buffer.from(`${types_1.DAIKIN_MOBILE_CONFIG.clientId}:${types_1.DAIKIN_MOBILE_CONFIG.clientSecret}`).toString('base64');
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: types_1.DAIKIN_MOBILE_CONFIG.redirectUri,
            code_verifier: pkce.verifier,
        });
        const response = await this.httpsRequest(types_1.DAIKIN_MOBILE_CONFIG.idpTokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${basicAuth}`,
            },
        }, params.toString());
        const result = this.parseJsonResponse(response, types_1.DAIKIN_MOBILE_CONFIG.idpTokenEndpoint, 'Token exchange failed');
        if (result.error) {
            throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
        }
        return result;
    }
    parseJsonResponse(response, url, context) {
        try {
            return JSON.parse(response.body);
        }
        catch {
            const { hostname } = new URL(url);
            const snippet = response.body.trim().slice(0, 200);
            throw new Error(`${context}: ${hostname} returned a non-JSON response (HTTP ${response.statusCode})`
                + (snippet ? `: ${snippet}` : ' with an empty body'));
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async httpsRequest(url, options, postData) {
        for (let attempt = 1;; attempt++) {
            try {
                return await (0, http_transport_1.httpRequest)(url, options, postData);
            }
            catch (error) {
                const err = error;
                const retryable = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(err.code ?? '');
                if (attempt >= constants_1.MAX_RETRY_ATTEMPTS || !retryable) {
                    throw error;
                }
                const delay = Math.min(constants_1.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), constants_1.RETRY_MAX_DELAY_MS);
                this.onLog?.(`Request failed (${err.code}); retrying in ${delay}ms (attempt ${attempt + 1}/${constants_1.MAX_RETRY_ATTEMPTS})`);
                await this.sleep(delay);
            }
        }
    }
}
exports.DaikinMobileOAuth = DaikinMobileOAuth;
//# sourceMappingURL=mobile-oauth.js.map