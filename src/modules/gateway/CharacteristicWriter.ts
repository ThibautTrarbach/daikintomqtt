import {DaikinCloudDevice} from "../../daikin-cloud";
import {DynamicGateway} from "./DynamicGateway";
import {Gateways} from "../../types";
import {eventValue} from "./BaseModules";
import {enableSchedule, setAwayPreset} from "./ScheduleManager";

function isDynamicGateway(gateway: Gateways): gateway is DynamicGateway {
	return typeof (gateway as DynamicGateway).isDynamicGateway === 'function'
		&& (gateway as DynamicGateway).isDynamicGateway();
}

function isScheduleKey(key: string): boolean {
	return key.endsWith('_scheduleEnabled');
}

async function applySpecialCommands(
	device: DaikinCloudDevice,
	gateway: Gateways,
	events: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const remaining: Record<string, unknown> = {};

	for (const [rawKey, rawValue] of Object.entries(events)) {
		const key = rawKey.startsWith('_') ? rawKey : `_${rawKey}`;

		if (key === '_triggerFirmwareUpdate' && rawValue === true) {
			await device.updateFirmware();
			continue;
		}

		if (key === '_setPresetAway' && (rawValue === true || rawValue === 'away')) {
			await setAwayPreset(device);
			continue;
		}

		if (isScheduleKey(key)) {
			const embeddedId = key.replace(/^_/, '').replace(/_scheduleEnabled$/, '');
			await enableSchedule(device, embeddedId, rawValue === true || rawValue === 'on');
			if (isDynamicGateway(gateway)) {
				(gateway as unknown as Record<string, unknown>)[key] = rawValue;
			}
			continue;
		}

		remaining[rawKey] = rawValue;
	}

	return remaining;
}

async function applyDynamicEvents(
	device: DaikinCloudDevice,
	gateway: DynamicGateway,
	events: Record<string, unknown>
): Promise<void> {
	const afterSpecial = await applySpecialCommands(device, gateway, events);
	const standardEvents: Record<string, unknown> = {};

	for (const [rawKey, rawValue] of Object.entries(afterSpecial)) {
		const key = rawKey.startsWith('_') ? rawKey : `_${rawKey}`;
		const def = gateway.resolveCharacteristic(key);
		if (!def) {
			logger.warn(`[CharacteristicWriter.ts] => Unknown dynamic characteristic ${key}`);
			continue;
		}
		if (!def.settable) {
			logger.warn(`[CharacteristicWriter.ts] => Characteristic ${key} is read-only`);
			continue;
		}
		standardEvents[rawKey] = rawValue;
	}

	if (Object.keys(standardEvents).length > 0) {
		await eventValue(device, gateway, standardEvents);
	}
}

async function applyGatewayEvents(
	device: DaikinCloudDevice,
	gateway: Gateways,
	events: Record<string, unknown>
): Promise<void> {
	const afterSpecial = await applySpecialCommands(device, gateway, events);

	if (isDynamicGateway(gateway)) {
		await applyDynamicEvents(device, gateway, afterSpecial);
		return;
	}

	if (Object.keys(afterSpecial).length > 0) {
		await eventValue(device, gateway, afterSpecial);
	}
}

export {
	isDynamicGateway,
	applyDynamicEvents,
	applyGatewayEvents,
};
