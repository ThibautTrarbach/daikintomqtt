/**
 * API request budget management based on Daikin rate-limit headers.
 * Thresholds adapt to auth mode (developer_portal vs mobile_app).
 */

import { AUTH_MODE_MOBILE_APP } from '../daikin-cloud/constants';
import { BUDGET_THRESHOLDS } from '../daikin-cloud/constants';

export type ApiBudgetStatus = 'ok' | 'low' | 'critical' | 'exhausted';

const PRIORITY_REFRESH_REASONS = new Set([
	'cron_forced_23h58_stats',
	'startup_devices_load',
	'authorization_initial_request',
	'system_bridge_refresh_all',
]);

const ENERGY_STATS_RESERVED = 1;

function getAuthMode(): 'developer_portal' | 'mobile_app' {
	return config.daikin?.authMode === AUTH_MODE_MOBILE_APP ? AUTH_MODE_MOBILE_APP : 'developer_portal';
}

function getThresholds() {
	return BUDGET_THRESHOLDS[getAuthMode()];
}

async function getRemainingDay(): Promise<number | undefined> {
	const remainingDay = await cache.get('rate/remainingDay');
	if (remainingDay === undefined || remainingDay === null) {
		return undefined;
	}
	return Number(remainingDay);
}

function statusFromRemaining(remaining: number | undefined): ApiBudgetStatus {
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

async function getBudgetStatus(): Promise<ApiBudgetStatus> {
	return statusFromRemaining(await getRemainingDay());
}

async function canRefresh(reason: string): Promise<boolean> {
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

async function getPollingIntervalMultiplier(): Promise<number> {
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

function getDefaultDailyQuotaLimit(): number {
	return getThresholds().defaultDayLimit;
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
	getDefaultDailyQuotaLimit,
	getAuthMode as getConfiguredAuthMode,
	PRIORITY_REFRESH_REASONS,
};
