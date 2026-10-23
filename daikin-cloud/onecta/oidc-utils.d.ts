import { Issuer, TokenSet } from 'openid-client';
export declare enum OnectaOIDCScope {
    basic = "openid onecta:basic.integration"
}
export declare enum OnectaAPIBaseUrl {
    prod = "https://api.onecta.daikineurope.com",
    mock = "https://api.onecta.daikineurope.com/mock"
}
export declare enum OnectaOIDCEndpoint {
    authorization = "https://idp.onecta.daikineurope.com/v1/oidc/authorize",
    token = "https://idp.onecta.daikineurope.com/v1/oidc/token",
    revocation = "https://idp.onecta.daikineurope.com/v1/oidc/revoke",
    introspection = "https://idp.onecta.daikineurope.com/v1/oidc/introspect"
}
export declare enum OnectaMockDevice {
    airToAirDx23 = "air-to-air-dx23",
    airToAirDx4 = "air-to-air-dx4",
    airPurifierWithHumidifier = "airpurifier-with-humidifier",
    airPurifier = "airpurifier",
    althermaAirToWaterLan = "altherma-air-to-water-lan",
    althermaAirToWaterWlan = "altherma-air-to-water-wlan",
    d2cndGasBoiler = "d2cnd-gas-boiler"
}
export declare const onecta_oidc_issuer: Issuer<import("openid-client").BaseClient>;
export declare const onecta_oidc_auth_thank_you_html = "\n<html>\n<head>\n<title>Thank you!</title>\n</head>\n<body>\n  <h1>Authorization complete</h1>\n  <p>Thank you for authorizing <code>daikin-controller-cloud</code> to access your devices.</p>\n</body>\n</html>\n";
export interface OnectaClientConfig {
    oidcClientId?: string;
    oidcClientSecret?: string;
    oidcCallbackServerExternalAddress?: string;
    oidcCallbackServerBaseUrl?: string;
    oidcCallbackServerPort?: number;
    oidcCallbackServerBindAddr?: string;
    oidcAuthorizationTimeoutS?: number;
    oidcTokenSetFilePath?: string;
    certificatePathCert?: string;
    certificatePathKey?: string;
    onectaOidcAuthThankYouHtml?: string;
    customOidcCodeReceiver?: (auth_url: string, state: string) => Promise<string>;
    tokenSet?: TokenSet;
    useMock?: boolean;
    mockId?: string | OnectaMockDevice;
}
export interface OnectaRateLimitStatus {
    limitMinute?: number;
    remainingMinute?: number;
    limitDay?: number;
    remainingDay?: number;
}
export declare const maybeParseInt: (v: any) => number | undefined;
export declare const RESOLVED: Promise<void>;
