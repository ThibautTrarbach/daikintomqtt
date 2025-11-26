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
        return 10;
    }
    return isNightTime()
        ? (pollingConfig.nightInterval ?? 20)
        : (pollingConfig.dayInterval ?? 10);
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
    logger.debug(`[cron.ts] => Prochain polling dans ${Math.round(timeUntilNext / 1000)}s (${isNight ? 'nuit' : 'jour'} - intervalle: ${interval}min)`);
    pollingTimer = setTimeout(async () => {
        logger.debug(`[cron.ts] => CRON - Daikin Polling = RUN (${isNightTime() ? 'nuit' : 'jour'})`);
        await (0, daikin_1.sendDevice)(null, true);
        logger.debug("[cron.ts] => CRON - Daikin Polling = FINISH");
        scheduleNextPolling();
    }, timeUntilNext);
}
async function loadCron() {
    if (!config.system.polling) {
        config.system.polling = {
            dayInterval: 10,
            nightInterval: 20,
            nightStart: 22,
            nightEnd: 7
        };
        logger.warn("[cron.ts] => Configuration polling non trouvée, utilisation des valeurs par défaut");
    }
    const pollingConfig = config.system.polling;
    const isNight = isNightTime();
    const currentInterval = getCurrentPollingInterval();
    const now = new Date();
    const currentTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    logger.info("[cron.ts] => Configuration du polling dynamique :");
    logger.info(`[cron.ts] =>   - Intervalle journée : ${pollingConfig.dayInterval} minutes`);
    logger.info(`[cron.ts] =>   - Intervalle nuit : ${pollingConfig.nightInterval} minutes`);
    logger.info(`[cron.ts] =>   - Période nuit : ${pollingConfig.nightStart}h - ${pollingConfig.nightEnd}h`);
    logger.info(`[cron.ts] =>   - Heure actuelle : ${currentTime} (${isNight ? 'nuit' : 'jour'})`);
    logger.info(`[cron.ts] =>   - Intervalle actuel : ${currentInterval} minutes`);
    scheduleNextPolling();
    node_cron_1.default.schedule('58 23 * * *', async function () {
        logger.info("[cron.ts] => CRON - Refresh forcé à 23h58 pour les stats électriques = RUN");
        await (0, daikin_1.sendDevice)(null, true);
        logger.info("[cron.ts] => CRON - Refresh forcé à 23h58 pour les stats électriques = FINISH");
    });
    node_cron_1.default.schedule('*/15 * * * * *', async function () {
        logger.debug("[cron.ts] => CRON - Refresh data after action = RUN");
        await (0, daikin_1.timeUpdate)();
        logger.debug("[cron.ts] => CRON - Refresh data after action = FINISH");
    });
}
//# sourceMappingURL=cron.js.map