/**
 * Prefer LAN HTTP for read/write when a device is LAN-compatible and reachable.
 * Falls back to the original cloud updateData/setData on failure (hybrid only).
 */

import { DaikinCloudDevice } from '../../daikin-cloud';
import type { DeviceAccessMode, DeviceControlPath } from '../../types';
import {
	applyClimateStateToManagementPoints,
	applyCloudWriteToLanControl,
	buildLanDeviceDescription,
	mapLanToClimateState,
} from './LanMapper';
import type { LocalBinding, LocalDeviceRegistry } from './LocalDeviceRegistry';
import { LocalHttpClient, type LanKeyValue } from './LocalHttpClient';
import { isLanCompatibleModel } from './LanCompatibility';

const META_KEY = '__daikinLocalMeta';

export interface DeviceLocalMeta {
	accessMode: DeviceAccessMode;
	controlPath: DeviceControlPath;
	ip?: string;
	/** raw control snapshot for set_control_info merges */
	lastControl?: LanKeyValue;
	localOnly: boolean;
}

export function getDeviceLocalMeta(device: DaikinCloudDevice): DeviceLocalMeta | undefined {
	return (device as any)[META_KEY] as DeviceLocalMeta | undefined;
}

export function setDeviceLocalMeta(device: DaikinCloudDevice, meta: DeviceLocalMeta): void {
	(device as any)[META_KEY] = meta;
}

function formatMacForId(mac: string): string {
	return mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
}

/**
 * Probe IP, build a local-only DaikinCloudDevice (stub client), attach LAN transport.
 */
export async function createLocalOnlyDevice(
	ip: string,
	client: LocalHttpClient,
	cloudStub: { requestResource: (...args: any[]) => Promise<any> },
): Promise<DaikinCloudDevice> {
	const basic = await client.getBasicInfo(ip);
	const control = await client.getControlInfo(ip);
	let sensor: LanKeyValue = {};
	try {
		sensor = await client.getSensorInfo(ip);
	} catch {
		// optional
	}

	const mac = formatMacForId(basic.mac ?? '');
	if (!mac) {
		throw new Error(`LAN device at ${ip} did not return a MAC address`);
	}
	const deviceId = `local-${mac}`;
	const modelInfo = basic.model ?? basic.ver ?? 'BRP069A42';
	const name = basic.name ? decodeUriComponentSafe(basic.name) : `Daikin ${ip}`;
	const climate = mapLanToClimateState(control, sensor);
	const desc = buildLanDeviceDescription({
		deviceId,
		name,
		modelInfo: isLanCompatibleModel(modelInfo) ? modelInfo : 'BRP069A42',
		macAddress: basic.mac,
		ipAddress: ip,
		firmwareVersion: basic.ver,
		climate,
	});

	const device = new DaikinCloudDevice(desc, cloudStub as any);
	setDeviceLocalMeta(device, {
		accessMode: 'local',
		controlPath: 'local',
		ip,
		lastControl: control,
		localOnly: true,
	});
	attachLocalTransport(device, client, { ip, deviceId, accessMode: 'local', controlPath: 'local' });
	return device;
}

function decodeUriComponentSafe(value: string): string {
	try {
		return decodeURIComponent(value.replace(/\+/g, ' '));
	} catch {
		return value;
	}
}

/**
 * Attach local-preferrence overrides on updateData / setData for a cloud or local device.
 */
export function attachLocalTransport(
	device: DaikinCloudDevice,
	client: LocalHttpClient,
	binding: LocalBinding,
): void {
	const originalUpdateData = device.updateData.bind(device);
	const originalSetData = device.setData.bind(device);
	const localOnly = binding.accessMode === 'local' || device.getId().startsWith('local-');

	const meta = getDeviceLocalMeta(device) ?? {
		accessMode: binding.accessMode,
		controlPath: binding.controlPath,
		ip: binding.ip,
		localOnly,
	};
	meta.ip = binding.ip;
	meta.accessMode = binding.accessMode;
	meta.localOnly = localOnly;
	setDeviceLocalMeta(device, meta);

	device.updateData = async (): Promise<boolean> => {
		const ip = meta.ip;
		if (!ip) {
			if (localOnly) {
				throw new Error(`Local-only device ${device.getId()} has no IP`);
			}
			meta.controlPath = 'cloud';
			setDeviceLocalMeta(device, meta);
			return originalUpdateData();
		}

		try {
			const control = await client.getControlInfo(ip);
			let sensor: LanKeyValue = {};
			try {
				sensor = await client.getSensorInfo(ip);
			} catch {
				// optional
			}
			const climate = mapLanToClimateState(control, sensor);
			applyClimateStateToManagementPoints(device.managementPoints, climate);
			meta.lastControl = control;
			meta.controlPath = 'local';
			setDeviceLocalMeta(device, meta);
			(device as any).emit?.('updated');
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.warn(`[localTransport.ts] => LAN update failed for ${device.getId()} @ ${ip}: ${message}`);
			if (localOnly) {
				meta.controlPath = 'local';
				setDeviceLocalMeta(device, meta);
				throw err;
			}
			meta.controlPath = 'degraded_cloud';
			setDeviceLocalMeta(device, meta);
			return originalUpdateData();
		}
	};

	device.setData = async (
		managementPoint: any,
		dataPoint: any,
		dataPointPath: any,
		value: any,
		options: any = { ignoreWritableCheck: false, updateLocalData: false },
	): Promise<any> => {
		const ip = meta.ip;
		if (!ip) {
			return originalSetData(managementPoint, dataPoint, dataPointPath, value, options);
		}

		let path = dataPointPath;
		let val = value;
		let opts = options;
		if (typeof options === 'boolean') {
			opts = { ignoreWritableCheck: options, updateLocalData: false };
		}
		if (val === undefined) {
			val = path;
			path = undefined;
		}

		try {
			let current = meta.lastControl;
			if (!current) {
				current = await client.getControlInfo(ip);
				meta.lastControl = current;
			}
			const next = applyCloudWriteToLanControl(current, {
				managementPoint,
				dataPoint,
				dataPointPath: path,
				value: val,
			});
			if (!next) {
				if (localOnly) {
					throw new Error(
						`Datapoint ${managementPoint}/${dataPoint} is not supported over LAN for ${device.getId()}`,
					);
				}
				meta.controlPath = 'degraded_cloud';
				setDeviceLocalMeta(device, meta);
				return originalSetData(managementPoint, dataPoint, path, val, opts);
			}

			await client.setControlInfo(ip, next);
			meta.lastControl = next;
			meta.controlPath = 'local';
			setDeviceLocalMeta(device, meta);

			// Optimistic local cache update (same as updateLocalData)
			try {
				const def = path
					? device.managementPoints[managementPoint][dataPoint][path]
					: device.managementPoints[managementPoint][dataPoint];
				if (def && typeof def === 'object' && 'value' in def) {
					def.value = val;
				}
			} catch {
				// ignore cache patch errors
			}
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.warn(`[localTransport.ts] => LAN setData failed for ${device.getId()} @ ${ip}: ${message}`);
			if (localOnly) {
				throw err;
			}
			meta.controlPath = 'degraded_cloud';
			setDeviceLocalMeta(device, meta);
			return originalSetData(managementPoint, dataPoint, path, val, opts);
		}
	};
}

/**
 * After cloud devices are loaded, resolve LAN IPs and attach transport when compatible.
 */
export async function attachLocalToCloudDevices(
	devices: DaikinCloudDevice[],
	registry: LocalDeviceRegistry,
): Promise<void> {
	if (!registry.enabled) {
		return;
	}

	for (const device of devices) {
		const id = device.getId();
		const model =
			device.getData('gateway', 'modelInfo', undefined)?.value ??
			device.getData('0', 'modelInfo', undefined)?.value;
		const cloudIp =
			device.getData('gateway', 'ipAddress', undefined)?.value ??
			device.getData('0', 'ipAddress', undefined)?.value;

		const hasOverride = registry.hasOverride(id);
		const modelOk = isLanCompatibleModel(model);
		// Auto LAN only for whitelisted models; overrides always try LAN
		if (!hasOverride && !modelOk) {
			setDeviceLocalMeta(device, {
				accessMode: 'cloud',
				controlPath: 'cloud',
				localOnly: false,
			});
			continue;
		}

		const ip = hasOverride
			? registry.getHybridBinding(id)!.ip
			: registry.resolveHybridIp(id, model, cloudIp != null ? String(cloudIp) : null);
		if (!ip) {
			setDeviceLocalMeta(device, {
				accessMode: 'cloud',
				controlPath: 'cloud',
				localOnly: false,
			});
			continue;
		}

		const binding = registry.ensureHybridBinding(id, ip, model != null ? String(model) : undefined);
		if (hasOverride) {
			binding.fromOverride = true;
		}
		attachLocalTransport(device, registry.client, binding);

		try {
			await registry.client.getBasicInfo(ip);
			await device.updateData();
			registry.markProbe(id, true);
			const meta = getDeviceLocalMeta(device)!;
			meta.accessMode = 'hybrid';
			meta.controlPath = 'local';
			setDeviceLocalMeta(device, meta);
			logger.info(`[localTransport.ts] => Hybrid LAN OK for ${id} @ ${ip}`);
		} catch (err) {
			registry.markProbe(id, false);
			const meta = getDeviceLocalMeta(device)!;
			meta.accessMode = 'hybrid';
			meta.controlPath = 'degraded_cloud';
			setDeviceLocalMeta(device, meta);
			const message = err instanceof Error ? err.message : String(err);
			logger.warn(`[localTransport.ts] => Hybrid LAN probe failed for ${id} @ ${ip}: ${message} — using cloud`);
		}
	}
}

/**
 * Create devices for configured local-only IPs.
 */
export async function loadLocalOnlyDevices(registry: LocalDeviceRegistry): Promise<DaikinCloudDevice[]> {
	if (!registry.enabled) {
		return [];
	}

	const stub = {
		requestResource: async () => {
			throw new Error('Cloud API is not available for local-only devices');
		},
	};

	const result: DaikinCloudDevice[] = [];
	for (const ip of registry.getPendingLocalIps()) {
		try {
			const device = await createLocalOnlyDevice(ip, registry.client, stub);
			registry.registerLocalOnly({
				ip,
				deviceId: device.getId(),
				accessMode: 'local',
				controlPath: 'local',
				lastProbeOk: true,
				lastProbeAt: Date.now(),
			});
			result.push(device);
			logger.info(`[localTransport.ts] => Local-only device ${device.getId()} @ ${ip}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error(`[localTransport.ts] => Failed to add local device @ ${ip}: ${message}`);
			registry.clearPendingLocalIp(ip);
		}
	}
	return result;
}
