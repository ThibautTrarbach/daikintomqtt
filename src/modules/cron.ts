import cron from "node-cron";
import {sendDevice} from "./daikin";
import {timeUpdateFallback, initActionRefreshOnBoot} from "./actionRefresh";
import {canRefresh, getPollingIntervalMultiplier, incrementSkippedRefreshCount} from "./requestBudget";

let nextPollingAt = 0;
let pollingTimer: NodeJS.Timeout | null = null;

/**
 * Determines if we are currently in night period
 */
function isNightTime(): boolean {
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
	return currentHour >= nightStart && currentHour < nightEnd;
}

/**
 * Gets the current polling interval based on time (minutes)
 */
async function getCurrentPollingInterval(): Promise<number> {
	const pollingConfig = config.system.polling;
	if (!pollingConfig) {
		return 15;
	}
	
	const base = isNightTime()
		? (pollingConfig.nightInterval ?? 30)
		: (pollingConfig.dayInterval ?? 15);

	const multiplier = await getPollingIntervalMultiplier();
	return Math.min(60, Math.round(base * multiplier));
}

/**
 * Calculates time until next interval in milliseconds
 */
async function getTimeUntilNextInterval(): Promise<number> {
	const intervalMinutes = await getCurrentPollingInterval();
	const now = new Date();
	const currentMinutes = now.getMinutes();
	const currentSeconds = now.getSeconds();
	
	const secondsInCurrentHour = currentMinutes * 60 + currentSeconds;
	const intervalSeconds = intervalMinutes * 60;
	const nextInterval = Math.ceil(secondsInCurrentHour / intervalSeconds) * intervalSeconds;
	let timeUntilNext = (nextInterval - secondsInCurrentHour) * 1000;
	
	if (timeUntilNext === 0) {
		timeUntilNext = intervalSeconds * 1000;
	}
	
	return timeUntilNext;
}

function getNextPollingAt(): number {
	return nextPollingAt;
}

function getMergeWithPollWindowMs(): number {
	const minutes = config.system?.mergeWithPollWindowMinutes ?? 5;
	return minutes * 60 * 1000;
}

function parseEnergyStatsCronTime(): { hour: number; minute: number } {
	const raw = config.system?.energyStatsRefreshTime ?? '23:58';
	const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
	if (!match) {
		return { hour: 23, minute: 58 };
	}
	return {
		hour: Math.min(23, Math.max(0, parseInt(match[1], 10))),
		minute: Math.min(59, Math.max(0, parseInt(match[2], 10))),
	};
}

/**
 * Schedules next polling based on current time
 */
async function scheduleNextPolling() {
	if (pollingTimer) {
		clearTimeout(pollingTimer);
	}

	const timeUntilNext = await getTimeUntilNextInterval();
	const isNight = isNightTime();
	const interval = await getCurrentPollingInterval();
	nextPollingAt = Date.now() + timeUntilNext;
	
	logger.debug(`[cron.ts] => Next polling in ${Math.round(timeUntilNext / 1000)}s (${isNight ? 'night' : 'day'} - interval: ${interval}min)`);
	
	pollingTimer = setTimeout(async () => {
		const currentIsNight = isNightTime();
		logger.info(`[cron.ts] => CRON - Daikin Polling = START (${currentIsNight ? 'night' : 'day'})`);
		try {
			if (await canRefresh('cron_polling')) {
				await sendDevice(null, true, "cron_polling");
				logger.info(`[cron.ts] => CRON - Daikin Polling = SUCCESS (${currentIsNight ? 'night' : 'day'})`);
			} else {
				logger.warn('[cron.ts] => CRON - Daikin Polling skipped (API budget)');
				await incrementSkippedRefreshCount();
			}
		} catch (error) {
			logger.error(`[cron.ts] => CRON - Error during Daikin polling: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
			}
		} finally {
			await scheduleNextPolling();
		}
	}, timeUntilNext);
}

async function runEnergyStatsRefresh(): Promise<void> {
	logger.info("[cron.ts] => CRON - Energy stats refresh = START");
	try {
		if (await canRefresh('cron_forced_23h58_stats')) {
			await sendDevice(null, true, "cron_forced_23h58_stats");
			logger.info("[cron.ts] => CRON - Energy stats refresh = SUCCESS");
		} else {
			logger.error("[cron.ts] => CRON - Energy stats refresh blocked: daily API quota exhausted");
		}
	} catch (error) {
		logger.error(`[cron.ts] => CRON - Error during energy stats refresh: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
		}
	}
}

async function loadCron() {
	try {
		if (!config.system.polling) {
			config.system.polling = {
				dayInterval: 15,
				nightInterval: 30,
				nightStart: 22,
				nightEnd: 7
			};
			logger.warn("[cron.ts] => Polling configuration not found, using default values");
		}
		
		const pollingConfig = config.system.polling;
		const isNight = isNightTime();
		const currentInterval = await getCurrentPollingInterval();
		const now = new Date();
		const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		
		logger.info("[cron.ts] => Dynamic polling configuration:");
		logger.info(`[cron.ts] =>   - Day interval: ${pollingConfig.dayInterval} minutes`);
		logger.info(`[cron.ts] =>   - Night interval: ${pollingConfig.nightInterval} minutes`);
		logger.info(`[cron.ts] =>   - Night period: ${pollingConfig.nightStart}h - ${pollingConfig.nightEnd}h`);
		logger.info(`[cron.ts] =>   - Current time: ${currentTime} (${isNight ? 'night' : 'day'})`);
		logger.info(`[cron.ts] =>   - Current interval: ${currentInterval} minutes`);

		const refreshMode = config.system?.actionRefreshMode ?? 3;
		const refreshDelay = config.system?.actionRefreshDelaySeconds ?? 60;
		const refreshStrategy = config.system?.actionRefreshStrategy ?? 'merge_with_poll';
		logger.info("[cron.ts] => Post-action refresh configuration:");
		logger.info(`[cron.ts] =>   - Action refresh mode: ${refreshMode}`);
		logger.info(`[cron.ts] =>   - Action refresh delay: ${refreshDelay}s (modes 1 and 3)`);
		logger.info(`[cron.ts] =>   - Action refresh strategy: ${refreshStrategy}`);
		logger.info(`[cron.ts] =>   - Command coalesce: ${config.system?.commandCoalesceMs ?? 400}ms`);
		logger.info(`[cron.ts] =>   - Energy stats refresh: ${config.system?.energyStatsRefreshTime ?? '23:58'}`);
		
		await initActionRefreshOnBoot();
		await scheduleNextPolling();
		logger.info("[cron.ts] => Dynamic polling system started");
		
		const energyTime = parseEnergyStatsCronTime();
		const energyCron = `${energyTime.minute} ${energyTime.hour} * * *`;
		cron.schedule(energyCron, runEnergyStatsRefresh);
		logger.debug(`[cron.ts] => CRON task scheduled for daily energy stats at ${config.system?.energyStatsRefreshTime ?? '23:58'}`);
		
		// Safety net every 60s for post-action refresh after restart
		cron.schedule('0 * * * * *', async function () {
			try {
				await timeUpdateFallback();
			} catch (error) {
				logger.error(`[cron.ts] => CRON - Error in post-action fallback: ${error instanceof Error ? error.message : String(error)}`);
			}
		});
		logger.debug("[cron.ts] => CRON task scheduled for post-action fallback every 60s");
		
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
	loadCron,
	getNextPollingAt,
	getMergeWithPollWindowMs,
	isNightTime,
	getCurrentPollingInterval,
}
