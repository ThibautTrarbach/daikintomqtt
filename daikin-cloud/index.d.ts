import { EventEmitter } from 'events';
import { DaikinCloudDevice } from './device';
import { OnectaClient } from './onecta/oidc-client';
import { OnectaClientConfig, OnectaRateLimitStatus, OnectaMockDevice } from './onecta/oidc-utils';
import { TokenSet } from "openid-client";
import type { AuthMode, WebSocketDeviceUpdate } from './types';
import { AUTH_MODE_DEVELOPER_PORTAL, AUTH_MODE_MOBILE_APP } from './constants';
import type { HttpTransportMode } from './http-transport';
export { DaikinCloudDevice } from './device';
export { OnectaClientConfig, OnectaRateLimitStatus, TokenSet, OnectaMockDevice };
export type { AuthMode, WebSocketDeviceUpdate };
export { AUTH_MODE_DEVELOPER_PORTAL, AUTH_MODE_MOBILE_APP };
export interface DaikinControllerConfig extends OnectaClientConfig {
    authMode?: AuthMode;
    mobileEmail?: string;
    mobilePassword?: string;
    mobileTokenFilePath?: string;
    enableWebSocket?: boolean;
    httpTransport?: HttpTransportMode;
}
interface DaikinCloudControllerEvents {
    "error": [err: Error];
    "authorization_request": [url: string];
    "token_update": [tokenSet: TokenSet];
    "rate_limit_status": [OnectaRateLimitStatus];
    "websocket_connected": [];
    "websocket_disconnected": [info?: {
        reconnecting?: boolean;
        code?: number;
        reason?: string;
    }];
    "websocket_device_update": [update: WebSocketDeviceUpdate];
}
export declare class RateLimitedError extends Error {
    retryAfter?: number | undefined;
    constructor(message: string, retryAfter?: number | undefined);
}
export declare class DaikinCloudController extends EventEmitter<DaikinCloudControllerEvents> {
    #private;
    constructor(config: DaikinControllerConfig);
    getAuthMode(): AuthMode;
    isAuthenticated(): boolean;
    authenticateMobile(): Promise<void>;
    isWebSocketConnected(): boolean;
    enableWebSocket(): Promise<void>;
    disableWebSocket(): void;
    getApiInfo(): Promise<any>;
    requestResource(path: string, opts?: Parameters<OnectaClient['requestResource']>[1]): Promise<any>;
    getCloudDeviceDetails(): Promise<any[]>;
    getCloudDevices(): Promise<DaikinCloudDevice[]>;
    getDeviceById(deviceId: string): DaikinCloudDevice | undefined;
    updateAllDeviceData(): Promise<void>;
}
