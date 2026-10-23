import { getNextPollingAt, getEffectiveNextPollingAt, getMergeWithPollWindowMs, pausePolling, resumePolling } from './cron';
import { canRefresh, incrementSkippedRefreshCount } from './requestBudget';
import { wasConfirmedByWebSocket } from './wsUpdateMapper';

let postActionTimer: NodeJS.Timeout | null = null;
let postActionDebounceActive = false;

function getActionRefreshMode(): number {
	return config.system?.actionRefreshMode ?? 3;
}

function getActionRefreshDelaySeconds(): number {
	return config.system?.actionRefreshDelaySeconds ?? 60;
}

function getActionRefreshStrategy(): string {
	return config.system?.actionRefreshStrategy ?? 'merge_with_poll';
}

async function shouldMergePostActionWithPoll(): Promise<boolean> {
	if (getActionRefreshStrategy() !== 'merge_with_poll') {
		return false;
	}

	const nextPollingAt = getEffectiveNextPollingAt();
	if (nextPollingAt <= 0) {
		return false;
	}

	const windowMs = getMergeWithPollWindowMs();
	return nextPollingAt - Date.now() <= windowMs;
}

function finishPostActionDebounce(): void {
	if (postActionDebounceActive) {
		postActionDebounceActive = false;
		resumePolling();
	}
}

async function executePostActionRefresh(): Promise<void> {
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

	const deviceIdPending = await cache.get('postActionDeviceId') as string | undefined;
	if (typeof lastActionTs === 'number' && await wasConfirmedByWebSocket(deviceIdPending, lastActionTs)) {
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
		await incrementSkippedRefreshCount();
		finishPostActionDebounce();
		return;
	}

	if (!(await canRefresh('post_action_refresh'))) {
		logger.warn('[actionRefresh.ts] => Post-action refresh skipped due to API budget');
		await cache.del('needRefresh');
		await cache.del('postActionDeviceId');
		await incrementSkippedRefreshCount();
		finishPostActionDebounce();
		return;
	}

	await cache.del('needRefresh');
	const deviceId = await cache.get('postActionDeviceId') as string | undefined;
	await cache.del('postActionDeviceId');

	logger.info(`[actionRefresh.ts] => Executing post-action cloud refresh${deviceId ? ` (triggered by ${deviceId})` : ''}`);
	try {
		const { sendDevice } = await import('./daikin');
		await sendDevice(null, true, 'post_action_refresh', deviceId ? [deviceId] : undefined);
	} finally {
		finishPostActionDebounce();
	}
}

function clearPostActionTimer(): void {
	if (postActionTimer) {
		clearTimeout(postActionTimer);
		postActionTimer = null;
	}
}

/**
 * Schedules a debounced post-action cloud refresh after the configured delay.
 */
async function schedulePostActionRefresh(deviceId: string): Promise<void> {
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
		pausePolling();
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

/**
 * Safety net called periodically to catch missed timers after restart.
 */
async function timeUpdateFallback(): Promise<void> {
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
	} else {
		const remainingMs = (delaySeconds - elapsed) * 1000;
		postActionTimer = setTimeout(() => {
			executePostActionRefresh().catch((error) => {
				logger.error(`[actionRefresh.ts] => Post-action refresh failed: ${error instanceof Error ? error.message : String(error)}`);
			});
		}, remainingMs);
		logger.debug(`[actionRefresh.ts] => Restored post-action timer with ${Math.round(remainingMs / 1000)}s remaining`);
	}
}

async function initActionRefreshOnBoot(): Promise<void> {
	await timeUpdateFallback();
}

export {
	schedulePostActionRefresh,
	executePostActionRefresh,
	timeUpdateFallback,
	initActionRefreshOnBoot,
	clearPostActionTimer,
	getActionRefreshStrategy,
};
