export declare const ONE_MINUTE_MS = 60000;
export declare const DEFAULT_FORCE_UPDATE_DELAY_MS = 60000;
export declare const DEFAULT_UPDATE_INTERVAL_MINUTES = 15;
export declare const RATE_LIMIT_WARNING_THRESHOLD = 20;
export declare const MAX_RETRY_ATTEMPTS = 3;
export declare const RETRY_BASE_DELAY_MS = 2000;
export declare const RETRY_MAX_DELAY_MS = 60000;
export declare const DAIKIN_WEBSOCKET_URL: string;
export declare const AUTH_MODE_DEVELOPER_PORTAL: "developer_portal";
export declare const AUTH_MODE_MOBILE_APP: "mobile_app";
export type AuthMode = typeof AUTH_MODE_DEVELOPER_PORTAL | typeof AUTH_MODE_MOBILE_APP;
export declare const BUDGET_THRESHOLDS: {
    readonly developer_portal: {
        readonly low: 50;
        readonly critical: 30;
        readonly defaultDayLimit: 200;
    };
    readonly mobile_app: {
        readonly low: 500;
        readonly critical: 200;
        readonly defaultDayLimit: 3000;
    };
};
