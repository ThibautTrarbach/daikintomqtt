import type { TokenSet as OpenIdTokenSet } from 'openid-client';
import type { AuthMode } from './constants';

export type TokenSet = OpenIdTokenSet & {
	expires_at?: number;
};

export interface OAuthProvider {
	getAccessToken(): Promise<string>;
	isAuthenticated(): boolean;
	refreshToken(): Promise<TokenSet>;
}

export interface WebSocketDeviceUpdate {
	deviceId: string;
	embeddedId: string;
	managementPointId?: string;
	characteristicName: string;
	data: {
		name: string;
		settable?: boolean;
		value: unknown;
		values?: string[];
		ref?: string;
		minValue?: number;
		maxValue?: number;
		stepValue?: number;
	};
}

export interface MobileClientConfig {
	email: string;
	password: string;
	tokenFilePath: string;
}

export const DAIKIN_MOBILE_CONFIG = {
	apiKey: process.env.DAIKIN_API_KEY || '3_xRB3jaQ62bVjqXU1omaEsPDVYC0Twi1zfq1zHPu_5HFT0zWkDvZJS97Yw1loJnTm',
	clientId: process.env.DAIKIN_CLIENT_ID || 'FjS6T5oZHvzpZENIDybFRdtK',
	clientSecret: process.env.DAIKIN_CLIENT_SECRET || '_yWGLBGUnQFrN-u7uIOAZhSBsJOfcnBs0IS87wTgUvUmnLnEOs4NQmaKagqZBpQpG0XYl07KeCx8XHHKxAn24w',
	redirectUri: process.env.DAIKIN_REDIRECT_URI || 'daikinunified://cdc/',
	gigyaBaseUrl: process.env.DAIKIN_GIGYA_BASE_URL || 'https://cdc.daikin.eu',
	idpTokenEndpoint: process.env.DAIKIN_IDP_TOKEN_ENDPOINT || 'https://idp.onecta.daikineurope.com/v1/oidc/token',
	scope: process.env.DAIKIN_SCOPE || 'openid onecta:onecta.application offline_access',
	apiBaseUrl: process.env.DAIKIN_API_BASE_URL || 'https://api.onecta.daikineurope.com',
	// Node sends no User-Agent by default; Daikin's WAF drops such requests silently.
	userAgent: process.env.DAIKIN_USER_AGENT
		|| 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

export type { AuthMode };
