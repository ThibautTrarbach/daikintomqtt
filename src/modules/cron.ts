import cron from "node-cron";
import {sendDevice, timeUpdate} from "./daikin";

/**
 * Determines if we are currently in night period
 */
function isNightTime(): boolean {
	const now = new Date();
	const currentHour = now.getHours();
	
	const pollingConfig = config.system.polling;
	if (!pollingConfig) {
		// By default, if no config, consider it's daytime
		return false;
	}
	
	const nightStart = pollingConfig.nightStart ?? 22;
	const nightEnd = pollingConfig.nightEnd ?? 7;
	
	// Handle case where night period crosses midnight (e.g., 22h-7h)
	if (nightStart > nightEnd) {
		// Night period crossing midnight (e.g., 22h to 7h)
		return currentHour >= nightStart || currentHour < nightEnd;
	} else {
		// Night period within same day (e.g., 0h to 6h)
		return currentHour >= nightStart && currentHour < nightEnd;
	}
}

/**
 * Gets the current polling interval based on time
 */
function getCurrentPollingInterval(): number {
	const pollingConfig = config.system.polling;
	if (!pollingConfig) {
		// Default, 10 minutes if no config
		return 30;
	}
	
	return isNightTime() 
		? (pollingConfig.nightInterval ?? 60)
		: (pollingConfig.dayInterval ?? 20);
}

/**
 * Calculates time until next interval in milliseconds
 */
function getTimeUntilNextInterval(): number {
	const intervalMinutes = getCurrentPollingInterval();
	const now = new Date();
	const currentMinutes = now.getMinutes();
	const currentSeconds = now.getSeconds();
	
	// Calculate seconds elapsed in current hour
	const secondsInCurrentHour = currentMinutes * 60 + currentSeconds;
	
	// Calculate next interval (in seconds)
	const intervalSeconds = intervalMinutes * 60;
	
	// Calculate time until next interval
	const nextInterval = Math.ceil(secondsInCurrentHour / intervalSeconds) * intervalSeconds;
	const timeUntilNext = (nextInterval - secondsInCurrentHour) * 1000;
	
	// If timeUntilNext is 0, it means we're exactly at an interval boundary
	// In this case, wait for the full interval to avoid immediate re-triggering
	if (timeUntilNext === 0) {
		return intervalSeconds * 1000;
	}
	
	return timeUntilNext;
}

let pollingTimer: NodeJS.Timeout | null = null;

/**
 * Schedules next polling based on current time
 */
function scheduleNextPolling() {
	// Cancel previous timer if it exists
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
			await sendDevice(null, true, "cron_polling");
			logger.info(`[cron.ts] => CRON - Daikin Polling = SUCCESS (${currentIsNight ? 'night' : 'day'})`);
		} catch (error) {
			logger.error(`[cron.ts] => CRON - Error during Daikin polling: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
			}
		} finally {
			// Schedule next polling even on error
			scheduleNextPolling();
		}
	}, timeUntilNext);
}

async function loadCron() {
	try {
		// Default configuration if not defined
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
		
		// Log configuration information at startup
		logger.info("[cron.ts] => Dynamic polling configuration:");
		logger.info(`[cron.ts] =>   - Day interval: ${pollingConfig.dayInterval} minutes`);
		logger.info(`[cron.ts] =>   - Night interval: ${pollingConfig.nightInterval} minutes`);
		logger.info(`[cron.ts] =>   - Night period: ${pollingConfig.nightStart}h - ${pollingConfig.nightEnd}h`);
		logger.info(`[cron.ts] =>   - Current time: ${currentTime} (${isNight ? 'night' : 'day'})`);
		logger.info(`[cron.ts] =>   - Current interval: ${currentInterval} minutes`);

		// Log post-action refresh configuration
		const refreshMode = config.system?.actionRefreshMode ?? 1;
		const refreshDelay = config.system?.actionRefreshDelaySeconds ?? 45;
		logger.info("[cron.ts] => Post-action refresh configuration:");
		logger.info(`[cron.ts] =>   - Action refresh mode: ${refreshMode}`);
		logger.info(`[cron.ts] =>   - Action refresh delay: ${refreshDelay}s (used for modes 1 and 3)`);
		
		// Start dynamic polling
		scheduleNextPolling();
		logger.info("[cron.ts] => Dynamic polling system started");
		
		// Forced refresh at 23:58 every day for electrical stats
		cron.schedule('58 23 * * *', async function () {
			logger.info("[cron.ts] => CRON - Forced refresh at 23:58 for electrical stats = START");
			try {
				await sendDevice(null, true, "cron_forced_23h58_stats");
				logger.info("[cron.ts] => CRON - Forced refresh at 23:58 for electrical stats = SUCCESS");
			} catch (error) {
				logger.error(`[cron.ts] => CRON - Error during forced refresh at 23:58: ${error instanceof Error ? error.message : String(error)}`);
				if (error instanceof Error && error.stack) {
					logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
				}
			}
		});
		logger.debug("[cron.ts] => CRON task scheduled for daily refresh at 23:58");
		
		// Check every 15 seconds for refresh after action
		cron.schedule('*/15 * * * * *', async function () {
			logger.debug("[cron.ts] => CRON - Checking refresh after action = START");
			try {
				await timeUpdate();
				logger.debug("[cron.ts] => CRON - Checking refresh after action = FINISH");
			} catch (error) {
				logger.error(`[cron.ts] => CRON - Error checking refresh: ${error instanceof Error ? error.message : String(error)}`);
				if (error instanceof Error && error.stack) {
					logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
				}
			}
		});
		logger.debug("[cron.ts] => CRON task scheduled for refresh check every 15 seconds");
		
		logger.info("[cron.ts] => CRON system initialized successfully");
	} catch (error) {
		logger.error(`[cron.ts] => Error initializing CRON system: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

export {
	loadCron
}
