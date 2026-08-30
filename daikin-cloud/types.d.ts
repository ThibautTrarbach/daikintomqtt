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
export declare const DAIKIN_MOBILE_CONFIG: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    gigyaBaseUrl: string;
    idpTokenEndpoint: string;
    scope: string;
    apiBaseUrl: string;
    userAgent: string;
};
export type { AuthMode };
