import {PROPERTY_METADATA_DAIKIN, PROPERTY_METADATA_DAIKIN_DEVICE} from '../decorator';
import {Gateways, ModuleDeviceMetadata, ModulePropertyMetadata} from '../../types';
import {DaikinCloudDevice} from '../../daikin-cloud';
import {DynamicGateway} from './DynamicGateway';
import {ApiDatapointRef, discoverApiDatapoints, makeDatapointKey} from './apiDiscovery';

export type ConfigCoverage = 'complete' | 'incomplete';

export interface CoverageAuditResult {
	configCoverage: ConfigCoverage;
	mappedCount: number;
	apiCount: number;
	configCoverageDetail: string;
	unmappedDatapoints: string[];
}

const SYNTHETIC_DATAPOINTS = new Set(['__firmwareUpdate__', '__awayPreset__', '__scheduleEnable__']);

const EXTRA_DEVICE_DATAPOINTS: Array<[string, string, string | undefined]> = [
	['gateway', 'timeZone', undefined],
	['gateway', 'wifiConnectionSSID', undefined],
	['gateway', 'wifiConnectionStrength', undefined],
	['gateway', 'ssid', undefined],
];

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

function isDatapointCovered(apiKey: string, exactMappedKeys: Set<string>, mappedPatterns: RegExp[]): boolean {
	if (exactMappedKeys.has(apiKey)) {
		return true;
	}
	return mappedPatterns.some((pattern) => pattern.test(apiKey));
}

function addDeviceMetadataKeys(gateway: Gateways, mapped: Set<string>): void {
	const deviceMetadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, gateway) as Record<string, ModuleDeviceMetadata> | undefined;
	if (deviceMetadata) {
		for (const deviceBlock of Object.values(deviceMetadata)) {
			for (const fieldMeta of Object.values(deviceBlock)) {
				if (isDeviceMetadataField(fieldMeta)) {
					mapped.add(makeDatapointKey(fieldMeta.managementPoint, fieldMeta.dataPoint, fieldMeta.dataPointPath));
				}
			}
		}
	}

	for (const [managementPoint, dataPoint, dataPointPath] of EXTRA_DEVICE_DATAPOINTS) {
		mapped.add(makeDatapointKey(managementPoint, dataPoint, dataPointPath));
	}
}

function getGatewayMappedKeys(gateway: Gateways): { exact: Set<string>; patterns: RegExp[] } {
	const exact = new Set<string>();
	const patterns: RegExp[] = [];
	const metadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gateway) as Record<string, ModulePropertyMetadata> | undefined;

	if (metadata) {
		for (const [propertyKey, meta] of Object.entries(metadata)) {
			if (propertyKey.startsWith('_support') || propertyKey.startsWith('_config') || propertyKey.startsWith('_debug')) {
				continue;
			}
			if (!meta?.managementPoint || !meta.dataPoint || SYNTHETIC_DATAPOINTS.has(meta.dataPoint)) {
				continue;
			}
			const mappedKey = makeDatapointKey(meta.managementPoint, meta.dataPoint, meta.dataPointPath);
			const pattern = mappedKeyToPattern(mappedKey);
			if (pattern) {
				patterns.push(pattern);
			} else {
				exact.add(mappedKey);
			}
		}
	}

	if (gateway instanceof DynamicGateway) {
		for (const def of gateway.getCharacteristicDefs()) {
			const mappedKey = makeDatapointKey(def.managementPoint, def.dataPoint, def.dataPointPath);
			const pattern = mappedKeyToPattern(mappedKey);
			if (pattern) {
				patterns.push(pattern);
			} else {
				exact.add(mappedKey);
			}
		}
	}

	addDeviceMetadataKeys(gateway, exact);

	return { exact, patterns };
}

function filterApiDatapointsForCoverage(apiDatapoints: ApiDatapointRef[]): ApiDatapointRef[] {
	const exposeReadOnly = config.system?.exposeReadOnly !== false;
	return apiDatapoints.filter((ref) => ref.settable || exposeReadOnly);
}

export function auditApiCoverage(device: DaikinCloudDevice, gateway: Gateways): CoverageAuditResult {
	const apiDatapoints = filterApiDatapointsForCoverage(discoverApiDatapoints(device));
	const { exact: mappedKeys, patterns: mappedPatterns } = getGatewayMappedKeys(gateway);

	const unmapped: string[] = [];
	for (const ref of apiDatapoints) {
		const key = makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath);
		if (!isDatapointCovered(key, mappedKeys, mappedPatterns)) {
			unmapped.push(key);
		}
	}

	const apiCount = apiDatapoints.length;
	const mappedCount = apiCount - unmapped.length;
	const configCoverage: ConfigCoverage = unmapped.length === 0 ? 'complete' : 'incomplete';
	const configCoverageDetail = `${mappedCount}/${apiCount} datapoints mapped`;

	return {
		configCoverage,
		mappedCount,
		apiCount,
		configCoverageDetail,
		unmappedDatapoints: unmapped.slice(0, 50),
	};
}
