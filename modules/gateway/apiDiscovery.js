"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKIP_DATAPOINTS = void 0;
exports.makeDatapointKey = makeDatapointKey;
exports.discoverApiDatapoints = discoverApiDatapoints;
exports.SKIP_DATAPOINTS = new Set(['schedule', 'firmwareUpdate', 'firmwareUpdateStatus']);
function makeDatapointKey(managementPoint, dataPoint, dataPointPath) {
    const path = dataPointPath ? (dataPointPath.startsWith('/') ? dataPointPath : `/${dataPointPath}`) : '';
    return `${managementPoint}/${dataPoint}${path}`;
}
function walkDatapointLeaves(embeddedId, dataPoint, obj, pathPrefix, exposeReadOnly, results) {
    if (!obj || typeof obj !== 'object') {
        return;
    }
    const hasLeafShape = 'value' in obj || 'settable' in obj;
    if (hasLeafShape) {
        const leaf = obj;
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
        walkDatapointLeaves(embeddedId, dataPoint, subVal, newPath, exposeReadOnly, results);
    }
}
function discoverApiDatapoints(device, exposeReadOnly = config.system?.exposeReadOnly !== false) {
    const results = [];
    for (const embeddedId of Object.keys(device.managementPoints)) {
        const point = device.managementPoints[embeddedId];
        if (!point || typeof point !== 'object') {
            continue;
        }
        for (const [dataPoint, rawValue] of Object.entries(point)) {
            if (exports.SKIP_DATAPOINTS.has(dataPoint)) {
                continue;
            }
            if (!rawValue || typeof rawValue !== 'object') {
                continue;
            }
            if ('ref' in rawValue) {
                continue;
            }
            walkDatapointLeaves(embeddedId, dataPoint, rawValue, '', exposeReadOnly, results);
        }
    }
    return results;
}
//# sourceMappingURL=apiDiscovery.js.map