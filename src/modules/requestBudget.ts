/**
 * API request budget management based on Daikin rate-limit headers.
 * Daikin Onecta default: 200 req/day, 20 req/minute.
 */

export type ApiBudgetStatus = 'ok' | 'low' | 'critical' | 'exhausted';

const PRIORITY_REFRESH_REASONS = new Set([
	'cron_forced_23h58_stats',
	'startup_devices_load',
	'authorization_initial_request',
	'system_bridge_refresh_all',
]);

const LOW_THRESHOLD = 50;
const CRITICAL_THRESHOLD = 30;
const EXHAUSTED_THRESHOLD = 0;
const ENERGY_STATS_RESERVED = 1;

async function getRemainingDay(): Promise<number | undefined> {
	const remainingDay = await cache.get('rate/remainingDay');
	if (remainingDay === undefined || remainingDay === null) {
		return undefined;
	}
	return Number(remainingDay);
}

function statusFromRemaining(remaining: number | undefined): ApiBudgetStatus {
	if (remaining === undefined) {
		return 'ok';
	}
	if (remaining <= EXHAUSTED_THRESHOLD) {
		return 'exhausted';
	}
	if (remaining <= CRITICAL_THRESHOLD) {
		return 'critical';
	}
	if (remaining <= LOW_THRESHOLD) {
		return 'low';
	}
	return 'ok';
}

async function getBudgetStatus(): Promise<ApiBudgetStatus> {
	return statusFromRemaining(await getRemainingDay());
}

/**
 * Returns true if a cloud GET (refresh) is allowed for the given reason.
 */
async function canRefresh(reason: string): Promise<boolean> {
	if (PRIORITY_REFRESH_REASONS.has(reason)) {
		const remaining = await getRemainingDay();
		if (remaining !== undefined && remaining <= EXHAUSTED_THRESHOLD) {
			logger.warn(`[requestBudget.ts] => Daily quota exhausted, blocking even priority refresh (${reason})`);
			return false;
		}
		return true;
	}

	const remaining = await getRemainingDay();
	if (remaining === undefined) {
		return true;
	}

	if (remaining <= EXHAUSTED_THRESHOLD) {
		logger.warn(`[requestBudget.ts] => Daily quota exhausted, blocking refresh (${reason})`);
		return false;
	}

	if (reason === 'post_action_refresh' && remaining <= CRITICAL_THRESHOLD) {
		logger.info(`[requestBudget.ts] => Low daily quota (${remaining}), deferring post-action refresh (${reason})`);
		return false;
	}

	if (reason === 'cron_polling' && remaining <= LOW_THRESHOLD) {
		logger.info(`[requestBudget.ts] => Low daily quota (${remaining}), skipping polling refresh`);
		return false;
	}

	return true;
}

/**
 * Multiplier applied to configured polling interval when quota is low (1 = no change).
 */
async function getPollingIntervalMultiplier(): Promise<number> {
	const remaining = await getRemainingDay();
	if (remaining === undefined) {
		return 1;
	}
	if (remaining <= CRITICAL_THRESHOLD) {
		return 2;
	}
	if (remaining <= LOW_THRESHOLD) {
		return 1.5;
	}
	return 1;
}

async function incrementSkippedRefreshCount(): Promise<number> {
	const current = await cache.get('budget/skippedRefreshCount');
	const next = (typeof current === 'number' ? current : 0) + 1;
	await cache.set('budget/skippedRefreshCount', next);
	return next;
}

async function getSkippedRefreshCount(): Promise<number> {
	const current = await cache.get('budget/skippedRefreshCount');
	return typeof current === 'number' ? current : 0;
}

function getReservedDailyGets(): number {
	return ENERGY_STATS_RESERVED;
}

export {
	canRefresh,
	getBudgetStatus,
	getPollingIntervalMultiplier,
	getSkippedRefreshCount,
	incrementSkippedRefreshCount,
	getReservedDailyGets,
	PRIORITY_REFRESH_REASONS,
};
