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
	apiKey: process.env.DAIKIN_API_KEY ?? '',
	clientId: process.env.DAIKIN_CLIENT_ID ?? '',
	clientSecret: process.env.DAIKIN_CLIENT_SECRET ?? '',
	redirectUri: process.env.DAIKIN_REDIRECT_URI || 'daikinunified://cdc/',
	gigyaBaseUrl: process.env.DAIKIN_GIGYA_BASE_URL || 'https://cdc.daikin.eu',
	idpTokenEndpoint: process.env.DAIKIN_IDP_TOKEN_ENDPOINT || 'https://idp.onecta.daikineurope.com/v1/oidc/token',
	scope: process.env.DAIKIN_SCOPE || 'openid onecta:onecta.application offline_access',
	apiBaseUrl: process.env.DAIKIN_API_BASE_URL || 'https://api.onecta.daikineurope.com',
};

export type { AuthMode };
