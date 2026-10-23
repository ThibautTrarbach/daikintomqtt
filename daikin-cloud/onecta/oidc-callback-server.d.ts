import { OnectaClientConfig } from './oidc-utils';
export declare class OnectaOIDCCallbackServer {
    #private;
    constructor(config: OnectaClientConfig);
    listen(): Promise<string>;
    waitForAuthCodeAndClose(oidc_state: string, auth_url: string): Promise<string>;
}
