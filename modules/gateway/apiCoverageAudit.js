"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditApiCoverage = auditApiCoverage;
const decorator_1 = require("../decorator");
const DynamicGateway_1 = require("./DynamicGateway");
const apiDiscovery_1 = require("./apiDiscovery");
const SYNTHETIC_DATAPOINTS = new Set(['__firmwareUpdate__', '__awayPreset__', '__scheduleEnable__']);
const EXTRA_DEVICE_DATAPOINTS = [
    ['gateway', 'timeZone', undefined],
    ['gateway', 'wifiConnectionSSID', undefined],
    ['gateway', 'wifiConnectionStrength', undefined],
    ['gateway', 'ssid', undefined],
];
function isDeviceMetadataField(value) {
    return typeof value === 'object' && value !== null && 'managementPoint' in value && 'dataPoint' in value;
}
function mappedKeyToPattern(mappedKey) {
    if (!mappedKey.includes('#value#')) {
        return null;
    }
    const escaped = mappedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('#value#', '[^/]+');
    return new RegExp(`^${escaped}$`);
}
function isDatapointCovered(apiKey, exactMappedKeys, mappedPatterns) {
    if (exactMappedKeys.has(apiKey)) {
        return true;
    }
    return mappedPatterns.some((pattern) => pattern.test(apiKey));
}
function addDeviceMetadataKeys(gateway, mapped) {
    const deviceMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN_DEVICE, gateway);
    if (deviceMetadata) {
        for (const deviceBlock of Object.values(deviceMetadata)) {
            for (const fieldMeta of Object.values(deviceBlock)) {
                if (isDeviceMetadataField(fieldMeta)) {
                    mapped.add((0, apiDiscovery_1.makeDatapointKey)(fieldMeta.managementPoint, fieldMeta.dataPoint, fieldMeta.dataPointPath));
                }
            }
        }
    }
    for (const [managementPoint, dataPoint, dataPointPath] of EXTRA_DEVICE_DATAPOINTS) {
        mapped.add((0, apiDiscovery_1.makeDatapointKey)(managementPoint, dataPoint, dataPointPath));
    }
}
function getGatewayMappedKeys(gateway) {
    const exact = new Set();
    const patterns = [];
    const metadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gateway);
    if (metadata) {
        for (const [propertyKey, meta] of Object.entries(metadata)) {
            if (propertyKey.startsWith('_support') || propertyKey.startsWith('_config') || propertyKey.startsWith('_debug')) {
                continue;
            }
            if (!meta?.managementPoint || !meta.dataPoint || SYNTHETIC_DATAPOINTS.has(meta.dataPoint)) {
                continue;
            }
            const mappedKey = (0, apiDiscovery_1.makeDatapointKey)(meta.managementPoint, meta.dataPoint, meta.dataPointPath);
            const pattern = mappedKeyToPattern(mappedKey);
            if (pattern) {
                patterns.push(pattern);
            }
            else {
                exact.add(mappedKey);
            }
        }
    }
    if (gateway instanceof DynamicGateway_1.DynamicGateway) {
        for (const def of gateway.getCharacteristicDefs()) {
            const mappedKey = (0, apiDiscovery_1.makeDatapointKey)(def.managementPoint, def.dataPoint, def.dataPointPath);
            const pattern = mappedKeyToPattern(mappedKey);
            if (pattern) {
                patterns.push(pattern);
            }
            else {
                exact.add(mappedKey);
            }
        }
    }
    addDeviceMetadataKeys(gateway, exact);
    return { exact, patterns };
}
function filterApiDatapointsForCoverage(apiDatapoints) {
    const exposeReadOnly = config.system?.exposeReadOnly !== false;
    return apiDatapoints.filter((ref) => ref.settable || exposeReadOnly);
}
function auditApiCoverage(device, gateway) {
    const apiDatapoints = filterApiDatapointsForCoverage((0, apiDiscovery_1.discoverApiDatapoints)(device));
    const { exact: mappedKeys, patterns: mappedPatterns } = getGatewayMappedKeys(gateway);
    const unmapped = [];
    for (const ref of apiDatapoints) {
        const key = (0, apiDiscovery_1.makeDatapointKey)(ref.managementPoint, ref.dataPoint, ref.dataPointPath);
        if (!isDatapointCovered(key, mappedKeys, mappedPatterns)) {
            unmapped.push(key);
        }
    }
    const apiCount = apiDatapoints.length;
    const totalUnmappedCount = unmapped.length;
    const mappedCount = apiCount - totalUnmappedCount;
    const configCoverage = totalUnmappedCount === 0 ? 'complete' : 'incomplete';
    const configCoverageDetail = `${mappedCount}/${apiCount} datapoints mapped`;
    return {
        configCoverage,
        mappedCount,
        apiCount,
        configCoverageDetail,
        unmappedDatapoints: unmapped.slice(0, 50),
        totalUnmappedCount,
    };
}
//# sourceMappingURL=apiCoverageAudit.js.map