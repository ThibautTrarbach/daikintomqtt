import type { WebSocketDeviceUpdate } from '../daikin-cloud';
import { DaikinCloudDevice } from '../daikin-cloud';
import { publishToMQTT } from './mqtt';
import { DEVICE_CACHE_TTL_MS, WS_CONFIRMATION_TTL_MS } from './constants';

function resolveEmbeddedId(device: DaikinCloudDevice, update: WebSocketDeviceUpdate): string {
	const points = device.managementPoints;
	if (update.embeddedId in points) {
		return update.embeddedId;
	}
	if (update.managementPointId && update.managementPointId in points) {
		return update.managementPointId;
	}
	if (update.managementPointId) {
		for (const id of Object.keys(points)) {
			if (id === update.managementPointId || id.startsWith(update.managementPointId)) {
				return id;
			}
		}
	}
	return update.embeddedId;
}

async function recordWebSocketConfirmation(deviceId: string): Promise<void> {
	const key = `ws/confirmed/${deviceId}`;
	await cache.set(key, Date.now(), WS_CONFIRMATION_TTL_MS);
}

async function wasConfirmedByWebSocket(deviceId: string | undefined, actionTs: number): Promise<boolean> {
	if (!deviceId) {
		return false;
	}
	const confirmedAt = await cache.get(`ws/confirmed/${deviceId}`);
	if (typeof confirmedAt !== 'number') {
		return false;
	}
	return confirmedAt >= actionTs * 1000;
}

/**
 * Applies a WebSocket device update and publishes the refreshed gateway payload to MQTT.
 */
async function handleWebSocketDeviceUpdate(update: WebSocketDeviceUpdate): Promise<void> {
	if (!global.daikinClient) {
		return;
	}

	const device = global.daikinClient.getDeviceById(update.deviceId);
	if (!device) {
		logger.debug(`[wsUpdateMapper.ts] => No cached device for WebSocket update: ${update.deviceId}`);
		return;
	}

	const embeddedId = resolveEmbeddedId(device, update);
	const applied = device.applyWebSocketUpdate(embeddedId, update.characteristicName, update.data);
	if (!applied) {
		logger.debug(
			`[wsUpdateMapper.ts] => Could not apply WS update ${update.characteristicName} on ${update.deviceId}`
			+ ` (embeddedId=${embeddedId}, ref=${update.data.ref ?? 'none'})`,
		);
		return;
	}

	await recordWebSocketConfirmation(update.deviceId);

	const { getModels } = await import('./daikin');
	const gateway = getModels(device);
	if (!gateway) {
		return;
	}

	const gatewayJson = JSON.stringify(gateway);
	await publishToMQTT(update.deviceId, gatewayJson);
	logger.debug(`[wsUpdateMapper.ts] => Published WS update for ${update.deviceId}.${update.characteristicName}`);

	await cache.set(`device_${update.deviceId}`, device, DEVICE_CACHE_TTL_MS);

	const cachedDevices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
	if (cachedDevices) {
		const idx = cachedDevices.findIndex((d) => d.getId() === update.deviceId);
		if (idx >= 0) {
			cachedDevices[idx] = device;
			await cache.set('devices', cachedDevices, DEVICE_CACHE_TTL_MS);
		}
	}
}

export {
	handleWebSocketDeviceUpdate,
	wasConfirmedByWebSocket,
	recordWebSocketConfirmation,
};
