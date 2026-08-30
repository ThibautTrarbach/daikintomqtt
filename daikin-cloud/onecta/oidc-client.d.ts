import { EventEmitter } from 'node:events';
import { BaseClient } from 'openid-client';
import { OnectaClientConfig } from './oidc-utils';
type RequestParameters = Parameters<typeof BaseClient.prototype.requestResource>[2] & {
    ignoreRateLimit?: boolean;
};
export declare class OnectaClient {
    #private;
    constructor(config: OnectaClientConfig, emitter: EventEmitter);
    get blockedUntil(): number;
    requestResource(path: string, opts?: RequestParameters): Promise<any>;
}
export {};
