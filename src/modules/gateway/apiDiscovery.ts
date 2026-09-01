import {DaikinCloudDevice} from '../../daikin-cloud';

export interface ApiDatapointRef {
	managementPoint: string;
	dataPoint: string;
	dataPointPath?: string;
	settable: boolean;
}

export const SKIP_DATAPOINTS = new Set(['schedule', 'firmwareUpdate', 'firmwareUpdateStatus']);

export function makeDatapointKey(
	managementPoint: string,
	dataPoint: string,
	dataPointPath?: string,
): string {
	const path = dataPointPath ? (dataPointPath.startsWith('/') ? dataPointPath : `/${dataPointPath}`) : '';
	return `${managementPoint}/${dataPoint}${path}`;
}

function walkDatapointLeaves(
	embeddedId: string,
	dataPoint: string,
	obj: Record<string, unknown>,
	pathPrefix: string,
	exposeReadOnly: boolean,
	results: ApiDatapointRef[],
): void {
	if (!obj || typeof obj !== 'object') {
		return;
	}

	const hasLeafShape = 'value' in obj || 'settable' in obj;
	if (hasLeafShape) {
		const leaf = obj as { value?: unknown; settable?: boolean };
		if (!leaf.settable && !exposeReadOnly) {
			return;
		}
		if (leaf.value !== undefined && typeof leaf.value === 'object' && leaf.value !== null && !Array.isArray(leaf.value)) {
			return;
		}

		const dataPointPath = pathPrefix || undefined;
		results.push({
			managementPoint: embeddedId,
			dataPoint,
			dataPointPath,
			settable: !!leaf.settable,
		});
		return;
	}

	for (const [subKey, subVal] of Object.entries(obj)) {
		if (subKey === 'meta' || subVal === null || typeof subVal !== 'object') {
			continue;
		}
		const newPath = pathPrefix ? `${pathPrefix}/${subKey}` : `/${subKey}`;
		walkDatapointLeaves(embeddedId, dataPoint, subVal as Record<string, unknown>, newPath, exposeReadOnly, results);
	}
}

export function discoverApiDatapoints(
	device: DaikinCloudDevice,
	exposeReadOnly: boolean = config.system?.exposeReadOnly !== false,
): ApiDatapointRef[] {
	const results: ApiDatapointRef[] = [];

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
			walkDatapointLeaves(embeddedId, dataPoint, rawValue as Record<string, unknown>, '', exposeReadOnly, results);
		}
	}

	return results;
}
