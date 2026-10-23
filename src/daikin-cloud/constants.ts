export const ONE_MINUTE_MS = 60_000;
export const DEFAULT_FORCE_UPDATE_DELAY_MS = 60_000;
export const DEFAULT_UPDATE_INTERVAL_MINUTES = 15;
export const RATE_LIMIT_WARNING_THRESHOLD = 20;

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 2_000;
export const RETRY_MAX_DELAY_MS = 60_000;

export const DAIKIN_WEBSOCKET_URL = process.env.DAIKIN_WEBSOCKET_URL || 'wss://wsapi.onecta.daikineurope.com';

export const AUTH_MODE_DEVELOPER_PORTAL = 'developer_portal' as const;
export const AUTH_MODE_MOBILE_APP = 'mobile_app' as const;

export type AuthMode = typeof AUTH_MODE_DEVELOPER_PORTAL | typeof AUTH_MODE_MOBILE_APP;

export const BUDGET_THRESHOLDS = {
	developer_portal: { low: 50, critical: 30, defaultDayLimit: 200 },
	mobile_app: { low: 500, critical: 200, defaultDayLimit: 3000 },
} as const;
