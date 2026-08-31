"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUDGET_THRESHOLDS = exports.AUTH_MODE_MOBILE_APP = exports.AUTH_MODE_DEVELOPER_PORTAL = exports.DAIKIN_WEBSOCKET_URL = exports.RETRY_MAX_DELAY_MS = exports.RETRY_BASE_DELAY_MS = exports.MAX_RETRY_ATTEMPTS = exports.RATE_LIMIT_WARNING_THRESHOLD = exports.DEFAULT_UPDATE_INTERVAL_MINUTES = exports.DEFAULT_FORCE_UPDATE_DELAY_MS = exports.ONE_MINUTE_MS = void 0;
exports.ONE_MINUTE_MS = 60_000;
exports.DEFAULT_FORCE_UPDATE_DELAY_MS = 60_000;
exports.DEFAULT_UPDATE_INTERVAL_MINUTES = 15;
exports.RATE_LIMIT_WARNING_THRESHOLD = 20;
exports.MAX_RETRY_ATTEMPTS = 3;
exports.RETRY_BASE_DELAY_MS = 2_000;
exports.RETRY_MAX_DELAY_MS = 60_000;
exports.DAIKIN_WEBSOCKET_URL = process.env.DAIKIN_WEBSOCKET_URL || 'wss://wsapi.onecta.daikineurope.com';
exports.AUTH_MODE_DEVELOPER_PORTAL = 'developer_portal';
exports.AUTH_MODE_MOBILE_APP = 'mobile_app';
exports.BUDGET_THRESHOLDS = {
    developer_portal: { low: 50, critical: 30, defaultDayLimit: 200 },
    mobile_app: { low: 500, critical: 200, defaultDayLimit: 3000 },
};
//# sourceMappingURL=constants.js.map