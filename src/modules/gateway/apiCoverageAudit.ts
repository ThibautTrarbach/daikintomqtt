import {PROPERTY_METADATA_CMD, PROPERTY_METADATA_DAIKIN, PROPERTY_METADATA_DAIKIN_DEVICE} from '../decorator';
import {Gateways, ModuleDeviceMetadata, ModulePropertyMetadata, ModulesDescriptionMetadata} from '../../types';
import {DaikinCloudDevice} from '../../daikin-cloud';
import {DynamicGateway} from './DynamicGateway';
import {ApiDatapointRef, discoverApiDatapoints, makeDatapointKey} from './apiDiscovery';

export type ConfigCoverage = 'complete' | 'incomplete';

export interface SettableMismatch {
	key: string;
	propertyKey?: string;
	apiSettable: boolean;
	mappedSettable: boolean;
	valueType?: ApiDatapointRef['valueType'];
	values?: unknown[];
	minValue?: number;
	maxValue?: number;
	stepValue?: number;
	unit?: string;
}

export interface CoverageAuditResult {
	configCoverage: ConfigCoverage;
	mappedCount: number;
	apiCount: number;
	configCoverageDetail: string;
	unmappedDatapoints: string[];
	unmappedDatapointDetails: ApiDatapointRef[];
	totalUnmappedCount: number;
	settableMismatches: SettableMismatch[];
	apiDatapointDetails: ApiDatapointRef[];
}

interface MappedCharacteristicInfo {
	propertyKey: string;
	settable: boolean;
	exactKey?: string;
	pattern?: RegExp;
}

const SYNTHETIC_DATAPOINTS = new Set(['__firmwareUpdate__', '__awayPreset__', '__scheduleEnable__', '__support__']);

const EXTRA_DEVICE_DATAPOINTS: Array<[string, string, string | undefined]> = [
	['gateway', 'timeZone', undefined],
	['gateway', 'wifiConnectionSSID', undefined],
	['gateway', 'wifiConnectionStrength', undefined],
	['gateway', 'ssid', undefined],
	['gateway', 'ipAddress', undefined],
	['gateway', 'macAddress', undefined],
	['indoorUnit', 'softwareVersion', undefined],
];

/** API-settable leaves intentionally kept read-only (device identity via `_device`, no MQTT CMD). */
const SETTABLE_MISMATCH_EXCEPTIONS = new Set([
	'climateControl/name',
]);

function isDeviceMetadataField(value: unknown): value is ModulePropertyMetadata {
	return typeof value === 'object' && value !== null && 'managementPoint' in value && 'dataPoint' in value;
}

function mappedKeyToPattern(mappedKey: string): RegExp | null {
	if (!mappedKey.includes('#value#')) {
		return null;
	}
	const escaped = mappedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('#value#', '[^/]+');
	return new RegExp(`^${escaped}$`);
}

function collectMappedCharacteristics(gateway: Gateways): MappedCharacteristicInfo[] {
	const mapped: MappedCharacteristicInfo[] = [];
	const daikinMetadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gateway) as Record<string, ModulePropertyMetadata> | undefined;
	const cmdMetadata = Reflect.getMetadata(PROPERTY_METADATA_CMD, gateway) as Record<string, ModulesDescriptionMetadata> | undefined;

	if (daikinMetadata) {
		for (const [propertyKey, meta] of Object.entries(daikinMetadata)) {
			if (propertyKey.startsWith('_support') || propertyKey.startsWith('_config') || propertyKey.startsWith('_debug') || propertyKey.startsWith('_unmapped') || propertyKey.startsWith('_api') || propertyKey.startsWith('_settable') || propertyKey.startsWith('_unit') || propertyKey.startsWith('_management') || propertyKey.startsWith('_github')) {
				continue;
			}
			if (!meta?.managementPoint || !meta.dataPoint || SYNTHETIC_DATAPOINTS.has(meta.dataPoint)) {
				continue;
			}
			const mappedKey = makeDatapointKey(meta.managementPoint, meta.dataPoint, meta.dataPointPath);
			const pattern = mappedKeyToPattern(mappedKey);
			const settable = !!(cmdMetadata?.[propertyKey]?.settable);
			if (pattern) {
				mapped.push({ propertyKey, settable, pattern });
			} else {
				mapped.push({ propertyKey, settable, exactKey: mappedKey });
			}
		}
	}

	if (gateway instanceof DynamicGateway) {
		for (const def of gateway.getCharacteristicDefs()) {
			const mappedKey = makeDatapointKey(def.managementPoint, def.dataPoint, def.dataPointPath);
			const pattern = mappedKeyToPattern(mappedKey);
			if (pattern) {
				mapped.push({ propertyKey: def.key, settable: def.settable, pattern });
			} else {
				mapped.push({ propertyKey: def.key, settable: def.settable, exactKey: mappedKey });
			}
		}
	}

	const deviceMetadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, gateway) as Record<string, ModuleDeviceMetadata> | undefined;
	if (deviceMetadata) {
		for (const deviceBlock of Object.values(deviceMetadata)) {
			for (const [fieldKey, fieldMeta] of Object.entries(deviceBlock)) {
				if (!isDeviceMetadataField(fieldMeta)) {
					continue;
				}
				const mappedKey = makeDatapointKey(fieldMeta.managementPoint, fieldMeta.dataPoint, fieldMeta.dataPointPath);
				mapped.push({ propertyKey: fieldKey, settable: false, exactKey: mappedKey });
			}
		}
	}

	for (const [managementPoint, dataPoint, dataPointPath] of EXTRA_DEVICE_DATAPOINTS) {
		mapped.push({
			propertyKey: `__extra__${managementPoint}/${dataPoint}`,
			settable: false,
			exactKey: makeDatapointKey(managementPoint, dataPoint, dataPointPath),
		});
	}

	return mapped;
}

function findMappedInfo(apiKey: string, mapped: MappedCharacteristicInfo[]): MappedCharacteristicInfo | undefined {
	const exact = mapped.find((entry) => entry.exactKey === apiKey);
	if (exact) {
		return exact;
	}
	return mapped.find((entry) => entry.pattern?.test(apiKey));
}

function filterApiDatapointsForCoverage(apiDatapoints: ApiDatapointRef[]): ApiDatapointRef[] {
	const exposeReadOnly = config.system?.exposeReadOnly !== false;
	return apiDatapoints.filter((ref) => ref.settable || exposeReadOnly);
}

function toSettableMismatch(ref: ApiDatapointRef, mapped: MappedCharacteristicInfo): SettableMismatch {
	return {
		key: makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath),
		propertyKey: mapped.propertyKey.startsWith('__extra__') ? undefined : mapped.propertyKey,
		apiSettable: true,
		mappedSettable: false,
		...(ref.valueType ? { valueType: ref.valueType } : {}),
		...(ref.values !== undefined ? { values: ref.values } : {}),
		...(ref.minValue !== undefined ? { minValue: ref.minValue } : {}),
		...(ref.maxValue !== undefined ? { maxValue: ref.maxValue } : {}),
		...(ref.stepValue !== undefined ? { stepValue: ref.stepValue } : {}),
		...(ref.unit !== undefined ? { unit: ref.unit } : {}),
	};
}

export function auditApiCoverage(device: DaikinCloudDevice, gateway: Gateways): CoverageAuditResult {
	const apiDatapoints = filterApiDatapointsForCoverage(discoverApiDatapoints(device));
	const mapped = collectMappedCharacteristics(gateway);

	const unmappedRefs: ApiDatapointRef[] = [];
	const settableMismatches: SettableMismatch[] = [];

	for (const ref of apiDatapoints) {
		const key = makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath);
		const mappedInfo = findMappedInfo(key, mapped);
		if (!mappedInfo) {
			unmappedRefs.push(ref);
			continue;
		}
		if (ref.settable && !mappedInfo.settable && !SETTABLE_MISMATCH_EXCEPTIONS.has(key)) {
			settableMismatches.push(toSettableMismatch(ref, mappedInfo));
		}
	}

	const apiCount = apiDatapoints.length;
	const totalUnmappedCount = unmappedRefs.length;
	const mappedCount = apiCount - totalUnmappedCount;
	const hasGaps = totalUnmappedCount > 0 || settableMismatches.length > 0;
	const configCoverage: ConfigCoverage = hasGaps ? 'incomplete' : 'complete';
	const mismatchPart = settableMismatches.length > 0 ? `, ${settableMismatches.length} settable mismatch(es)` : '';
	const configCoverageDetail = `${mappedCount}/${apiCount} datapoints mapped${mismatchPart}`;
	const unmappedSlice = unmappedRefs.slice(0, 50);
	const mismatchSlice = settableMismatches.slice(0, 50);

	return {
		configCoverage,
		mappedCount,
		apiCount,
		configCoverageDetail,
		unmappedDatapoints: unmappedSlice.map((ref) => makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath)),
		unmappedDatapointDetails: unmappedSlice,
		totalUnmappedCount,
		settableMismatches: mismatchSlice,
		apiDatapointDetails: apiDatapoints.slice(0, 100),
	};
}
