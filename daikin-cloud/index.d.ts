import { EventEmitter } from 'events';
import { DaikinCloudDevice } from './device';
import { OnectaClientConfig, OnectaRateLimitStatus, OnectaMockDevice } from './onecta/oidc-utils';
import { TokenSet } from "openid-client";
export { DaikinCloudDevice } from './device';
export { OnectaClientConfig, OnectaRateLimitStatus, TokenSet, OnectaMockDevice };
interface DaikinCloudControllerEvents {
    "error": [err: Error];
    "authorization_request": [url: string];
    "token_update": [tokenSet: TokenSet];
    "rate_limit_status": [OnectaRateLimitStatus];
}
export declare class RateLimitedError extends Error {
    retryAfter?: number | undefined;
    constructor(message: string, retryAfter?: number | undefined);
}
export declare class DaikinCloudController extends EventEmitter<DaikinCloudControllerEvents> {
    #private;
    constructor(config: OnectaClientConfig);
    getApiInfo(): Promise<any>;
    getCloudDeviceDetails(): Promise<any[]>;
    getCloudDevices(): Promise<DaikinCloudDevice[]>;
    updateAllDeviceData(): Promise<void>;
}
