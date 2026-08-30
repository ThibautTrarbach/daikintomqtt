import { EventEmitter } from 'node:events';
import { BaseClient } from 'openid-client';
import { OnectaClientConfig } from './oidc-utils';
import type { OAuthProvider } from '../types';
type RequestParameters = Parameters<typeof BaseClient.prototype.requestResource>[2] & {
    ignoreRateLimit?: boolean;
    _authRetry?: boolean;
};
export declare class OnectaClient {
    #private;
    constructor(config: OnectaClientConfig, emitter: EventEmitter, mobileOAuth?: OAuthProvider | null);
    get blockedUntil(): number;
    requestResource(path: string, opts?: RequestParameters): Promise<any>;
}
export {};
