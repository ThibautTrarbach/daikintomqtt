import {PROPERTY_METADATA_DAIKIN} from '../decorator';
import {Gateways, ModulePropertyMetadata} from '../../types';
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

function getGatewayMappedKeys(gateway: Gateways): Set<string> {
	const mapped = new Set<string>();
	const metadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gateway) as Record<string, ModulePropertyMetadata> | undefined;
	if (!metadata) {
		return mapped;
	}

	for (const [propertyKey, meta] of Object.entries(metadata)) {
		if (propertyKey.startsWith('_support') || propertyKey.startsWith('_config') || propertyKey.startsWith('_debug')) {
			continue;
		}
		if (!meta?.managementPoint || !meta.dataPoint || SYNTHETIC_DATAPOINTS.has(meta.dataPoint)) {
			continue;
		}
		mapped.add(makeDatapointKey(meta.managementPoint, meta.dataPoint, meta.dataPointPath));
	}

	if (gateway instanceof DynamicGateway) {
		for (const def of gateway.getCharacteristicDefs()) {
			mapped.add(makeDatapointKey(def.managementPoint, def.dataPoint, def.dataPointPath));
		}
	}

	return mapped;
}

function filterApiDatapointsForCoverage(apiDatapoints: ApiDatapointRef[]): ApiDatapointRef[] {
	const exposeReadOnly = config.system?.exposeReadOnly !== false;
	return apiDatapoints.filter((ref) => ref.settable || exposeReadOnly);
}

export function auditApiCoverage(device: DaikinCloudDevice, gateway: Gateways): CoverageAuditResult {
	const apiDatapoints = filterApiDatapointsForCoverage(discoverApiDatapoints(device));
	const mappedKeys = getGatewayMappedKeys(gateway);

	const unmapped: string[] = [];
	for (const ref of apiDatapoints) {
		const key = makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath);
		if (!mappedKeys.has(key)) {
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
