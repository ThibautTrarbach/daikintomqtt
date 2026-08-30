"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulePostActionRefresh = schedulePostActionRefresh;
exports.executePostActionRefresh = executePostActionRefresh;
exports.timeUpdateFallback = timeUpdateFallback;
exports.initActionRefreshOnBoot = initActionRefreshOnBoot;
exports.clearPostActionTimer = clearPostActionTimer;
exports.getActionRefreshStrategy = getActionRefreshStrategy;
const cron_1 = require("./cron");
const requestBudget_1 = require("./requestBudget");
const wsUpdateMapper_1 = require("./wsUpdateMapper");
let postActionTimer = null;
let postActionDebounceActive = false;
function getActionRefreshMode() {
    return config.system?.actionRefreshMode ?? 3;
}
function getActionRefreshDelaySeconds() {
    return config.system?.actionRefreshDelaySeconds ?? 60;
}
function getActionRefreshStrategy() {
    return config.system?.actionRefreshStrategy ?? 'merge_with_poll';
}
async function shouldMergePostActionWithPoll() {
    if (getActionRefreshStrategy() !== 'merge_with_poll') {
        return false;
    }
    const nextPollingAt = (0, cron_1.getNextPollingAt)();
    if (nextPollingAt <= 0) {
        return false;
    }
    const windowMs = (0, cron_1.getMergeWithPollWindowMs)();
    return nextPollingAt - Date.now() <= windowMs;
}
function finishPostActionDebounce() {
    if (postActionDebounceActive) {
        postActionDebounceActive = false;
        (0, cron_1.resumePolling)();
    }
}
async function executePostActionRefresh() {
    const mode = getActionRefreshMode();
    if (mode === 2) {
        finishPostActionDebounce();
        return;
    }
    const lastActionTs = await cache.get('needRefresh');
    if (lastActionTs === undefined || lastActionTs === null) {
        finishPostActionDebounce();
        return;
    }
    const deviceIdPending = await cache.get('postActionDeviceId');
    if (typeof lastActionTs === 'number' && await (0, wsUpdateMapper_1.wasConfirmedByWebSocket)(deviceIdPending, lastActionTs)) {
        logger.info('[actionRefresh.ts] => Skipping post-action refresh: change confirmed by WebSocket');
        await cache.del('needRefresh');
        await cache.del('postActionDeviceId');
        finishPostActionDebounce();
        return;
    }
    const lastPeriodicRefreshTs = await cache.get('lastPeriodicRefreshTs');
    if (typeof lastPeriodicRefreshTs === 'number' && typeof lastActionTs === 'number' && lastPeriodicRefreshTs >= lastActionTs) {
        logger.info('[actionRefresh.ts] => Skipping post-action refresh: periodic refresh already occurred');
        await cache.del('needRefresh');
        await cache.del('postActionDeviceId');
        finishPostActionDebounce();
        return;
    }
    if (await shouldMergePostActionWithPoll()) {
        logger.info('[actionRefresh.ts] => Merging post-action refresh with upcoming scheduled poll');
        await cache.del('needRefresh');
        await cache.del('postActionDeviceId');
        await (0, requestBudget_1.incrementSkippedRefreshCount)();
        finishPostActionDebounce();
        return;
    }
    if (!(await (0, requestBudget_1.canRefresh)('post_action_refresh'))) {
        logger.warn('[actionRefresh.ts] => Post-action refresh skipped due to API budget');
        await cache.del('needRefresh');
        await cache.del('postActionDeviceId');
        await (0, requestBudget_1.incrementSkippedRefreshCount)();
        finishPostActionDebounce();
        return;
    }
    await cache.del('needRefresh');
    const deviceId = await cache.get('postActionDeviceId');
    await cache.del('postActionDeviceId');
    logger.info(`[actionRefresh.ts] => Executing post-action cloud refresh${deviceId ? ` (triggered by ${deviceId})` : ''}`);
    try {
        const { sendDevice } = await Promise.resolve().then(() => __importStar(require('./daikin')));
        await sendDevice(null, true, 'post_action_refresh', deviceId ? [deviceId] : undefined);
    }
    finally {
        finishPostActionDebounce();
    }
}
function clearPostActionTimer() {
    if (postActionTimer) {
        clearTimeout(postActionTimer);
        postActionTimer = null;
    }
}
async function schedulePostActionRefresh(deviceId) {
    const mode = getActionRefreshMode();
    if (mode === 2 || getActionRefreshStrategy() === 'disabled') {
        await cache.del('needRefresh');
        await cache.del('postActionDeviceId');
        clearPostActionTimer();
        return;
    }
    const now = Math.floor(Date.now() / 1000);
    await cache.set('needRefresh', now);
    await cache.set('postActionDeviceId', deviceId);
    clearPostActionTimer();
    if (!postActionDebounceActive) {
        postActionDebounceActive = true;
        (0, cron_1.pausePolling)();
    }
    const delayMs = getActionRefreshDelaySeconds() * 1000;
    postActionTimer = setTimeout(() => {
        executePostActionRefresh().catch((error) => {
            logger.error(`[actionRefresh.ts] => Post-action refresh failed: ${error instanceof Error ? error.message : String(error)}`);
            finishPostActionDebounce();
        });
    }, delayMs);
    logger.debug(`[actionRefresh.ts] => Post-action refresh scheduled in ${getActionRefreshDelaySeconds()}s for device ${deviceId}`);
}
async function timeUpdateFallback() {
    const mode = getActionRefreshMode();
    if (mode === 2) {
        return;
    }
    const lastActionTs = await cache.get('needRefresh');
    if (lastActionTs === undefined || lastActionTs === null || typeof lastActionTs !== 'number') {
        return;
    }
    if (postActionTimer) {
        return;
    }
    const delaySeconds = getActionRefreshDelaySeconds();
    const elapsed = Math.floor(Date.now() / 1000) - lastActionTs;
    if (elapsed >= delaySeconds) {
        await executePostActionRefresh();
    }
    else {
        const remainingMs = (delaySeconds - elapsed) * 1000;
        postActionTimer = setTimeout(() => {
            executePostActionRefresh().catch((error) => {
                logger.error(`[actionRefresh.ts] => Post-action refresh failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        }, remainingMs);
        logger.debug(`[actionRefresh.ts] => Restored post-action timer with ${Math.round(remainingMs / 1000)}s remaining`);
    }
}
async function initActionRefreshOnBoot() {
    await timeUpdateFallback();
}
//# sourceMappingURL=actionRefresh.js.map