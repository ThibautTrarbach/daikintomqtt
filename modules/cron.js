"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCron = loadCron;
const node_cron_1 = __importDefault(require("node-cron"));
const daikin_1 = require("./daikin");
function isNightTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const pollingConfig = config.system.polling;
    if (!pollingConfig) {
        return false;
    }
    const nightStart = pollingConfig.nightStart ?? 22;
    const nightEnd = pollingConfig.nightEnd ?? 7;
    if (nightStart > nightEnd) {
        return currentHour >= nightStart || currentHour < nightEnd;
    }
    else {
        return currentHour >= nightStart && currentHour < nightEnd;
    }
}
function getCurrentPollingInterval() {
    const pollingConfig = config.system.polling;
    if (!pollingConfig) {
        return 30;
    }
    return isNightTime()
        ? (pollingConfig.nightInterval ?? 60)
        : (pollingConfig.dayInterval ?? 20);
}
function getTimeUntilNextInterval() {
    const intervalMinutes = getCurrentPollingInterval();
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    const secondsInCurrentHour = currentMinutes * 60 + currentSeconds;
    const intervalSeconds = intervalMinutes * 60;
    const nextInterval = Math.ceil(secondsInCurrentHour / intervalSeconds) * intervalSeconds;
    const timeUntilNext = (nextInterval - secondsInCurrentHour) * 1000;
    if (timeUntilNext === 0) {
        return intervalSeconds * 1000;
    }
    return timeUntilNext;
}
let pollingTimer = null;
function scheduleNextPolling() {
    if (pollingTimer) {
        clearTimeout(pollingTimer);
    }
    const timeUntilNext = getTimeUntilNextInterval();
    const isNight = isNightTime();
    const interval = getCurrentPollingInterval();
    logger.debug(`[cron.ts] => Next polling in ${Math.round(timeUntilNext / 1000)}s (${isNight ? 'night' : 'day'} - interval: ${interval}min)`);
    pollingTimer = setTimeout(async () => {
        const currentIsNight = isNightTime();
        logger.info(`[cron.ts] => CRON - Daikin Polling = START (${currentIsNight ? 'night' : 'day'})`);
        try {
            await (0, daikin_1.sendDevice)(null, true, "cron_polling");
            logger.info(`[cron.ts] => CRON - Daikin Polling = SUCCESS (${currentIsNight ? 'night' : 'day'})`);
        }
        catch (error) {
            logger.error(`[cron.ts] => CRON - Error during Daikin polling: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
            }
        }
        finally {
            scheduleNextPolling();
        }
    }, timeUntilNext);
}
async function loadCron() {
    try {
        if (!config.system.polling) {
            config.system.polling = {
                dayInterval: 10,
                nightInterval: 20,
                nightStart: 22,
                nightEnd: 7
            };
            logger.warn("[cron.ts] => Polling configuration not found, using default values");
        }
        const pollingConfig = config.system.polling;
        const isNight = isNightTime();
        const currentInterval = getCurrentPollingInterval();
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        logger.info("[cron.ts] => Dynamic polling configuration:");
        logger.info(`[cron.ts] =>   - Day interval: ${pollingConfig.dayInterval} minutes`);
        logger.info(`[cron.ts] =>   - Night interval: ${pollingConfig.nightInterval} minutes`);
        logger.info(`[cron.ts] =>   - Night period: ${pollingConfig.nightStart}h - ${pollingConfig.nightEnd}h`);
        logger.info(`[cron.ts] =>   - Current time: ${currentTime} (${isNight ? 'night' : 'day'})`);
        logger.info(`[cron.ts] =>   - Current interval: ${currentInterval} minutes`);
        const refreshMode = config.system?.actionRefreshMode ?? 1;
        const refreshDelay = config.system?.actionRefreshDelaySeconds ?? 45;
        logger.info("[cron.ts] => Post-action refresh configuration:");
        logger.info(`[cron.ts] =>   - Action refresh mode: ${refreshMode}`);
        logger.info(`[cron.ts] =>   - Action refresh delay: ${refreshDelay}s (used for modes 1 and 3)`);
        scheduleNextPolling();
        logger.info("[cron.ts] => Dynamic polling system started");
        node_cron_1.default.schedule('58 23 * * *', async function () {
            logger.info("[cron.ts] => CRON - Forced refresh at 23:58 for electrical stats = START");
            try {
                await (0, daikin_1.sendDevice)(null, true, "cron_forced_23h58_stats");
                logger.info("[cron.ts] => CRON - Forced refresh at 23:58 for electrical stats = SUCCESS");
            }
            catch (error) {
                logger.error(`[cron.ts] => CRON - Error during forced refresh at 23:58: ${error instanceof Error ? error.message : String(error)}`);
                if (error instanceof Error && error.stack) {
                    logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
                }
            }
        });
        logger.debug("[cron.ts] => CRON task scheduled for daily refresh at 23:58");
        node_cron_1.default.schedule('*/15 * * * * *', async function () {
            logger.debug("[cron.ts] => CRON - Checking refresh after action = START");
            try {
                await (0, daikin_1.timeUpdate)();
                logger.debug("[cron.ts] => CRON - Checking refresh after action = FINISH");
            }
            catch (error) {
                logger.error(`[cron.ts] => CRON - Error checking refresh: ${error instanceof Error ? error.message : String(error)}`);
                if (error instanceof Error && error.stack) {
                    logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
                }
            }
        });
        logger.debug("[cron.ts] => CRON task scheduled for refresh check every 15 seconds");
        logger.info("[cron.ts] => CRON system initialized successfully");
    }
    catch (error) {
        logger.error(`[cron.ts] => Error initializing CRON system: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
//# sourceMappingURL=cron.js.map