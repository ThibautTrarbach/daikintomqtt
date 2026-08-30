"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_REFRESH_REASONS = void 0;
exports.canRefresh = canRefresh;
exports.getBudgetStatus = getBudgetStatus;
exports.getPollingIntervalMultiplier = getPollingIntervalMultiplier;
exports.getSkippedRefreshCount = getSkippedRefreshCount;
exports.incrementSkippedRefreshCount = incrementSkippedRefreshCount;
exports.getReservedDailyGets = getReservedDailyGets;
exports.getDefaultDailyQuotaLimit = getDefaultDailyQuotaLimit;
exports.getConfiguredAuthMode = getAuthMode;
const constants_1 = require("../daikin-cloud/constants");
const constants_2 = require("../daikin-cloud/constants");
const PRIORITY_REFRESH_REASONS = new Set([
    'cron_forced_23h58_stats',
    'startup_devices_load',
    'authorization_initial_request',
    'system_bridge_refresh_all',
]);
exports.PRIORITY_REFRESH_REASONS = PRIORITY_REFRESH_REASONS;
const ENERGY_STATS_RESERVED = 1;
function getAuthMode() {
    return config.daikin?.authMode === constants_1.AUTH_MODE_MOBILE_APP ? constants_1.AUTH_MODE_MOBILE_APP : 'developer_portal';
}
function getThresholds() {
    return constants_2.BUDGET_THRESHOLDS[getAuthMode()];
}
async function getRemainingDay() {
    const remainingDay = await cache.get('rate/remainingDay');
    if (remainingDay === undefined || remainingDay === null) {
        return undefined;
    }
    return Number(remainingDay);
}
function statusFromRemaining(remaining) {
    const { low, critical } = getThresholds();
    if (remaining === undefined) {
        return 'ok';
    }
    if (remaining <= 0) {
        return 'exhausted';
    }
    if (remaining <= critical) {
        return 'critical';
    }
    if (remaining <= low) {
        return 'low';
    }
    return 'ok';
}
async function getBudgetStatus() {
    return statusFromRemaining(await getRemainingDay());
}
async function canRefresh(reason) {
    const { critical } = getThresholds();
    if (PRIORITY_REFRESH_REASONS.has(reason)) {
        const remaining = await getRemainingDay();
        if (remaining !== undefined && remaining <= 0) {
            logger.warn(`[requestBudget.ts] => Daily quota exhausted, blocking even priority refresh (${reason})`);
            return false;
        }
        return true;
    }
    const remaining = await getRemainingDay();
    if (remaining === undefined) {
        return true;
    }
    if (remaining <= 0) {
        logger.warn(`[requestBudget.ts] => Daily quota exhausted, blocking refresh (${reason})`);
        return false;
    }
    if (reason === 'post_action_refresh' && remaining <= critical) {
        logger.info(`[requestBudget.ts] => Low daily quota (${remaining}), deferring post-action refresh (${reason})`);
        return false;
    }
    const { low } = getThresholds();
    if (reason === 'cron_polling' && remaining <= low) {
        logger.info(`[requestBudget.ts] => Low daily quota (${remaining}), skipping polling refresh`);
        return false;
    }
    return true;
}
async function getPollingIntervalMultiplier() {
    const remaining = await getRemainingDay();
    const { critical, low } = getThresholds();
    if (remaining === undefined) {
        return 1;
    }
    if (remaining <= critical) {
        return 2;
    }
    if (remaining <= low) {
        return 1.5;
    }
    return 1;
}
function getDefaultDailyQuotaLimit() {
    return getThresholds().defaultDayLimit;
}
async function incrementSkippedRefreshCount() {
    const current = await cache.get('budget/skippedRefreshCount');
    const next = (typeof current === 'number' ? current : 0) + 1;
    await cache.set('budget/skippedRefreshCount', next);
    return next;
}
async function getSkippedRefreshCount() {
    const current = await cache.get('budget/skippedRefreshCount');
    return typeof current === 'number' ? current : 0;
}
function getReservedDailyGets() {
    return ENERGY_STATS_RESERVED;
}
//# sourceMappingURL=requestBudget.js.map