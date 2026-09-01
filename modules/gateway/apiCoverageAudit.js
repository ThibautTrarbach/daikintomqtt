"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditApiCoverage = auditApiCoverage;
const decorator_1 = require("../decorator");
const DynamicGateway_1 = require("./DynamicGateway");
const apiDiscovery_1 = require("./apiDiscovery");
const SYNTHETIC_DATAPOINTS = new Set(['__firmwareUpdate__', '__awayPreset__', '__scheduleEnable__']);
function getGatewayMappedKeys(gateway) {
    const mapped = new Set();
    const metadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gateway);
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
        mapped.add((0, apiDiscovery_1.makeDatapointKey)(meta.managementPoint, meta.dataPoint, meta.dataPointPath));
    }
    if (gateway instanceof DynamicGateway_1.DynamicGateway) {
        for (const def of gateway.getCharacteristicDefs()) {
            mapped.add((0, apiDiscovery_1.makeDatapointKey)(def.managementPoint, def.dataPoint, def.dataPointPath));
        }
    }
    return mapped;
}
function filterApiDatapointsForCoverage(apiDatapoints) {
    const exposeReadOnly = config.system?.exposeReadOnly !== false;
    return apiDatapoints.filter((ref) => ref.settable || exposeReadOnly);
}
function auditApiCoverage(device, gateway) {
    const apiDatapoints = filterApiDatapointsForCoverage((0, apiDiscovery_1.discoverApiDatapoints)(device));
    const mappedKeys = getGatewayMappedKeys(gateway);
    const unmapped = [];
    for (const ref of apiDatapoints) {
        const key = (0, apiDiscovery_1.makeDatapointKey)(ref.managementPoint, ref.dataPoint, ref.dataPointPath);
        if (!mappedKeys.has(key)) {
            unmapped.push(key);
        }
    }
    const apiCount = apiDatapoints.length;
    const mappedCount = apiCount - unmapped.length;
    const configCoverage = unmapped.length === 0 ? 'complete' : 'incomplete';
    const configCoverageDetail = `${mappedCount}/${apiCount} datapoints mapped`;
    return {
        configCoverage,
        mappedCount,
        apiCount,
        configCoverageDetail,
        unmappedDatapoints: unmapped.slice(0, 50),
    };
}
//# sourceMappingURL=apiCoverageAudit.js.map