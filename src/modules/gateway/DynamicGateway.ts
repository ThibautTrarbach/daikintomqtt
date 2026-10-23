import "reflect-metadata";
import {DaikinCloudDevice} from "../../daikin-cloud";
import {PROPERTY_METADATA_CMD, PROPERTY_METADATA_DAIKIN} from "../decorator";
import {ClassModule, DevicesInformation, ModulePropertyMetadata, ModulesDescriptionMetadata} from "../../types";
import {converterEnum, typeEnum} from "./typeConstants";
import {registerDeviceMetadata} from "./metadataRegistry";
import {standardGatewayDeviceInfo} from "./characteristics/catalog";

export interface DynamicCharacteristicDef {
	key: string;
	managementPoint: string;
	dataPoint: string;
	dataPointPath?: string;
	settable: boolean;
	cmdMeta: ModulesDescriptionMetadata;
	daikinMeta: ModulePropertyMetadata;
}

const SKIP_DATAPOINTS = new Set(['schedule', 'firmwareUpdate', 'firmwareUpdateStatus']);

function makePropertyKey(embeddedId: string, dataPoint: string, dataPointPath?: string): string {
	const pathPart = dataPointPath
		? dataPointPath.replace(/^\//, '').replace(/\//g, '_').replace(/#/g, '')
		: '';
	const base = pathPart ? `${embeddedId}_${dataPoint}_${pathPart}` : `${embeddedId}_${dataPoint}`;
	return `_${base}`;
}

function inferType(def: { value?: unknown; values?: unknown[]; minValue?: number; maxValue?: number }): number {
	if (Array.isArray(def.values)) {
		const normalized = def.values.map(v => String(v).toLowerCase());
		if (normalized.every(v => v === 'on' || v === 'off')) {
			return typeEnum.binary;
		}
		return typeEnum.string;
	}
	if (typeof def.value === 'number' || typeof def.minValue === 'number' || typeof def.maxValue === 'number') {
		return typeEnum.numeric;
	}
	if (typeof def.value === 'boolean') {
		return typeEnum.binary;
	}
	return typeEnum.string;
}

function inferConverter(def: { values?: unknown[]; value?: unknown }, type: number): number | undefined {
	if (type === typeEnum.binary) {
		return converterEnum.binary;
	}
	if (type === typeEnum.numeric && typeof def.value === 'number') {
		return converterEnum.numeric;
	}
	return undefined;
}

function formatDisplayName(embeddedId: string, dataPoint: string, dataPointPath?: string): string {
	const pathLabel = dataPointPath ? ` ${dataPointPath.replace(/\//g, ' ')}` : '';
	return `${embeddedId} - ${dataPoint}${pathLabel}`.trim();
}

function walkDatapointLeaves(
	embeddedId: string,
	dataPoint: string,
	obj: Record<string, unknown>,
	pathPrefix: string,
	exposeReadOnly: boolean,
	results: DynamicCharacteristicDef[]
): void {
	if (!obj || typeof obj !== 'object') {
		return;
	}

	const hasLeafShape = 'value' in obj || 'settable' in obj;
	if (hasLeafShape) {
		const leaf = obj as { value?: unknown; settable?: boolean; values?: unknown[]; minValue?: number; maxValue?: number; unit?: string };
		if (!leaf.settable && !exposeReadOnly) {
			return;
		}
		if (leaf.value !== undefined && typeof leaf.value === 'object' && leaf.value !== null && !Array.isArray(leaf.value)) {
			return;
		}

		const dataPointPath = pathPrefix || undefined;
		const key = makePropertyKey(embeddedId, dataPoint, dataPointPath);
		const type = inferType(leaf);
		const converter = inferConverter(leaf, type);

		const cmdMeta: ModulesDescriptionMetadata = {
			name: formatDisplayName(embeddedId, dataPoint, dataPointPath),
			settable: !!leaf.settable,
			type,
			values: leaf.values as object | undefined,
			minValue: leaf.minValue,
			maxValue: leaf.maxValue,
			unite: (leaf as { unit?: string }).unit,
		};

		const daikinMeta: ModulePropertyMetadata = {
			managementPoint: embeddedId,
			dataPoint,
			dataPointPath,
			converter,
		};

		results.push({ key, managementPoint: embeddedId, dataPoint, dataPointPath, settable: !!leaf.settable, cmdMeta, daikinMeta });
		return;
	}

	for (const [subKey, subVal] of Object.entries(obj)) {
		if (subKey === 'meta' || subVal === null || typeof subVal !== 'object') {
			continue;
		}
		const newPath = subKey === ''
			? (pathPrefix || '')
			: (pathPrefix ? `${pathPrefix}/${subKey}` : `/${subKey}`);
		walkDatapointLeaves(embeddedId, dataPoint, subVal as Record<string, unknown>, newPath, exposeReadOnly, results);
	}
}

function buildDeviceInfo(device: DaikinCloudDevice): DevicesInformation {
	const readField = (managementPoint: string, field: string): string => {
		try {
			const data = device.getData(managementPoint, field, undefined);
			return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
		} catch {
			return '';
		}
	};
	const readGateway = (field: string): string => readField('gateway', field);
	const wifiSsid = readGateway('wifiConnectionSSID') || readGateway('ssid');

	return {
		id: device.getId(),
		name: readGateway('name') || device.getId(),
		modelInfo: readGateway('modelInfo'),
		serialNumber: readGateway('serialNumber'),
		firmwareVersion: readGateway('firmwareVersion'),
		isInErrorState: readGateway('isInErrorState'),
		errorCode: '',
		timeZone: readGateway('timeZone'),
		wifiConnectionSSID: wifiSsid,
		wifiConnectionStrength: readGateway('wifiConnectionStrength'),
		ipAddress: readGateway('ipAddress'),
		macAddress: readGateway('macAddress'),
		indoorUnitSoftwareVersion: readField('indoorUnit', 'softwareVersion'),
		isCloudConnectionUp: device.isCloudConnectionUp() ? 'true' : 'false',
	};
}

function convertReadValue(value: unknown, converter?: number): unknown {
	if (converter === converterEnum.binary) {
		if (value === 'on' || value === true) return true;
		if (value === 'off' || value === false) return false;
	}
	if (converter === converterEnum.numeric && value !== undefined && value !== null) {
		return Number(value);
	}
	return value;
}

export class DynamicGateway implements ClassModule {
	readonly isDynamic = true;
	_device: DevicesInformation;
	private characteristics = new Map<string, DynamicCharacteristicDef>();

	constructor(device: DaikinCloudDevice) {
		this._device = buildDeviceInfo(device);
		registerDeviceMetadata(this, '_device', standardGatewayDeviceInfo('gateway'));
		this.buildFromDevice(device);
	}

	get device(): DevicesInformation {
		return this._device;
	}

	set device(value: DevicesInformation) {
		this._device = value;
	}

	getCharacteristicDefs(): DynamicCharacteristicDef[] {
		return Array.from(this.characteristics.values());
	}

	isDynamicGateway(): boolean {
		return true;
	}

	buildFromDevice(device: DaikinCloudDevice): void {
		this._device = buildDeviceInfo(device);
		this.characteristics.clear();

		const exposeReadOnly = config.system?.exposeReadOnly !== false;
		const defs: DynamicCharacteristicDef[] = [];

		for (const embeddedId of Object.keys(device.managementPoints)) {
			const point = device.managementPoints[embeddedId];
			if (!point || typeof point !== 'object') {
				continue;
			}

			for (const [dataPoint, rawValue] of Object.entries(point)) {
				if (SKIP_DATAPOINTS.has(dataPoint)) {
					continue;
				}
				if (!rawValue || typeof rawValue !== 'object') {
					continue;
				}
				if ('ref' in (rawValue as object)) {
					continue;
				}
				walkDatapointLeaves(embeddedId, dataPoint, rawValue as Record<string, unknown>, '', exposeReadOnly, defs);
			}
		}

		const cmdMetadata: Record<string, ModulesDescriptionMetadata> = {};
		const daikinMetadata: Record<string, ModulePropertyMetadata> = {};

		for (const def of defs) {
			this.characteristics.set(def.key, def);
			cmdMetadata[def.key] = def.cmdMeta;
			daikinMetadata[def.key] = def.daikinMeta;
			(this as Record<string, unknown>)[def.key] = convertReadValue(
				device.getData(def.managementPoint, def.dataPoint, def.dataPointPath)?.value,
				def.daikinMeta.converter
			);
		}

		this.addFirmwareMetadata(device, cmdMetadata, daikinMetadata);
		this.addScheduleReadMetadata(device, cmdMetadata, daikinMetadata);

		Reflect.defineMetadata(PROPERTY_METADATA_CMD, cmdMetadata, this);
		Reflect.defineMetadata(PROPERTY_METADATA_DAIKIN, daikinMetadata, this);
	}

	private addFirmwareMetadata(
		device: DaikinCloudDevice,
		cmdMetadata: Record<string, ModulesDescriptionMetadata>,
		daikinMetadata: Record<string, ModulePropertyMetadata>
	): void {
		const available = device.isFirmwareUpdateAvailable();
		const status = device.getFirmwareUpdateStatus();
		const details = device.getFirmwareUpdateDetails();

		(this as Record<string, unknown>)._firmwareUpdateAvailable = available;
		(this as Record<string, unknown>)._firmwareUpdateStatus = status ?? '';
		(this as Record<string, unknown>)._firmwareUpdateTarget = details?.version ?? '';

		cmdMetadata._firmwareUpdateAvailable = { name: 'Firmware Update Available', settable: false, type: typeEnum.binary };
		cmdMetadata._firmwareUpdateStatus = { name: 'Firmware Update Status', settable: false, type: typeEnum.string };
		cmdMetadata._firmwareUpdateTarget = { name: 'Firmware Update Target', settable: false, type: typeEnum.string };
		cmdMetadata._triggerFirmwareUpdate = { name: 'Trigger Firmware Update', settable: true, type: typeEnum.binary, generic_type: 'OTHER' };
		cmdMetadata._setPresetAway = { name: 'Set Away Preset (Holiday)', settable: true, type: typeEnum.binary, generic_type: 'MODE' };

		daikinMetadata._triggerFirmwareUpdate = { managementPoint: 'gateway', dataPoint: '__firmwareUpdate__' };
		daikinMetadata._setPresetAway = { managementPoint: 'gateway', dataPoint: '__awayPreset__' };
	}

	private addScheduleReadMetadata(
		device: DaikinCloudDevice,
		cmdMetadata: Record<string, ModulesDescriptionMetadata>,
		daikinMetadata: Record<string, ModulePropertyMetadata>
	): void {
		for (const embeddedId of Object.keys(device.managementPoints)) {
			const schedule = device.getData(embeddedId, 'schedule', undefined);
			if (!schedule?.value) {
				continue;
			}
			const key = `_${embeddedId}_scheduleEnabled`;
			(this as Record<string, unknown>)[key] = schedule.value?.enabled ?? false;
			cmdMetadata[key] = { name: `${embeddedId} - Schedule Enabled`, settable: true, type: typeEnum.binary };
			daikinMetadata[key] = { managementPoint: embeddedId, dataPoint: '__scheduleEnable__' };
		}
	}

	resolveCharacteristic(key: string): DynamicCharacteristicDef | undefined {
		const normalized = key.startsWith('_') ? key : `_${key}`;
		return this.characteristics.get(normalized);
	}
}
