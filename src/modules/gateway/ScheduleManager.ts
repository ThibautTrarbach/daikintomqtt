import {DaikinCloudDevice} from "../../daikin-cloud";

async function requestPut(device: DaikinCloudDevice, path: string, body: object): Promise<void> {
	if (!global.daikinClient) {
		throw new Error('Daikin client not initialized');
	}

	const {rateLimiter} = await import("../rateLimiter");
	await rateLimiter.executeWithRetry(
		async () => {
			await global.daikinClient.requestResource(path, {
				method: 'PUT',
				body: JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' },
			});
		},
		`schedule-${device.getId()}-${path}`,
		{ maxRetries: 2, baseDelay: 1000, maxDelay: 30000 }
	);
}

function findClimateEmbeddedId(device: DaikinCloudDevice): string {
	for (const embeddedId of Object.keys(device.managementPoints)) {
		if (embeddedId.startsWith('climateControl')) {
			return embeddedId;
		}
	}
	return 'climateControl';
}

async function enableSchedule(device: DaikinCloudDevice, embeddedId: string, enabled: boolean): Promise<void> {
	const schedule = device.getData(embeddedId, 'schedule', undefined);
	const scheduleId = schedule?.value?.scheduleId ?? schedule?.value?.currentScheduleId ?? '0';

	await requestPut(
		device,
		`/v1/gateway-devices/${device.getId()}/management-points/${embeddedId}/schedule/any/current`,
		{ scheduleId: String(scheduleId), enabled }
	);
}

async function setAwayPreset(device: DaikinCloudDevice): Promise<void> {
	const embeddedId = findClimateEmbeddedId(device);

	try {
		await device.setData(embeddedId, 'onOffMode', undefined, 'off', { updateLocalData: true });
	} catch {
		// Some devices expose holiday via preset only
	}

	try {
		await enableSchedule(device, embeddedId, false);
	} catch (error) {
		logger.debug(`[ScheduleManager.ts] => Could not disable schedule for away preset: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export {
	enableSchedule,
	setAwayPreset,
	requestPut,
};
