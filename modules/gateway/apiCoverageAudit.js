"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditApiCoverage = auditApiCoverage;
const decorator_1 = require("../decorator");
const DynamicGateway_1 = require("./DynamicGateway");
const apiDiscovery_1 = require("./apiDiscovery");
const SYNTHETIC_DATAPOINTS = new Set(['__firmwareUpdate__', '__awayPreset__', '__scheduleEnable__', '__support__']);
const EXTRA_DEVICE_DATAPOINTS = [
    ['gateway', 'timeZone', undefined],
    ['gateway', 'wifiConnectionSSID', undefined],
    ['gateway', 'wifiConnectionStrength', undefined],
    ['gateway', 'ssid', undefined],
    ['gateway', 'ipAddress', undefined],
    ['gateway', 'macAddress', undefined],
    ['indoorUnit', 'softwareVersion', undefined],
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
function collectMappedCharacteristics(gateway) {
    const mapped = [];
    const daikinMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gateway);
    const cmdMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, gateway);
    if (daikinMetadata) {
        for (const [propertyKey, meta] of Object.entries(daikinMetadata)) {
            if (propertyKey.startsWith('_support') || propertyKey.startsWith('_config') || propertyKey.startsWith('_debug') || propertyKey.startsWith('_unmapped') || propertyKey.startsWith('_api') || propertyKey.startsWith('_settable') || propertyKey.startsWith('_unit') || propertyKey.startsWith('_management') || propertyKey.startsWith('_github')) {
                continue;
            }
            if (!meta?.managementPoint || !meta.dataPoint || SYNTHETIC_DATAPOINTS.has(meta.dataPoint)) {
                continue;
            }
            const mappedKey = (0, apiDiscovery_1.makeDatapointKey)(meta.managementPoint, meta.dataPoint, meta.dataPointPath);
            const pattern = mappedKeyToPattern(mappedKey);
            const settable = !!(cmdMetadata?.[propertyKey]?.settable);
            if (pattern) {
                mapped.push({ propertyKey, settable, pattern });
            }
            else {
                mapped.push({ propertyKey, settable, exactKey: mappedKey });
            }
        }
    }
    if (gateway instanceof DynamicGateway_1.DynamicGateway) {
        for (const def of gateway.getCharacteristicDefs()) {
            const mappedKey = (0, apiDiscovery_1.makeDatapointKey)(def.managementPoint, def.dataPoint, def.dataPointPath);
            const pattern = mappedKeyToPattern(mappedKey);
            if (pattern) {
                mapped.push({ propertyKey: def.key, settable: def.settable, pattern });
            }
            else {
                mapped.push({ propertyKey: def.key, settable: def.settable, exactKey: mappedKey });
            }
        }
    }
    const deviceMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN_DEVICE, gateway);
    if (deviceMetadata) {
        for (const deviceBlock of Object.values(deviceMetadata)) {
            for (const [fieldKey, fieldMeta] of Object.entries(deviceBlock)) {
                if (!isDeviceMetadataField(fieldMeta)) {
                    continue;
                }
                const mappedKey = (0, apiDiscovery_1.makeDatapointKey)(fieldMeta.managementPoint, fieldMeta.dataPoint, fieldMeta.dataPointPath);
                mapped.push({ propertyKey: fieldKey, settable: false, exactKey: mappedKey });
            }
        }
    }
    for (const [managementPoint, dataPoint, dataPointPath] of EXTRA_DEVICE_DATAPOINTS) {
        mapped.push({
            propertyKey: `__extra__${managementPoint}/${dataPoint}`,
            settable: false,
            exactKey: (0, apiDiscovery_1.makeDatapointKey)(managementPoint, dataPoint, dataPointPath),
        });
    }
    return mapped;
}
function findMappedInfo(apiKey, mapped) {
    const exact = mapped.find((entry) => entry.exactKey === apiKey);
    if (exact) {
        return exact;
    }
    return mapped.find((entry) => entry.pattern?.test(apiKey));
}
function filterApiDatapointsForCoverage(apiDatapoints) {
    const exposeReadOnly = config.system?.exposeReadOnly !== false;
    return apiDatapoints.filter((ref) => ref.settable || exposeReadOnly);
}
function toSettableMismatch(ref, mapped) {
    return {
        key: (0, apiDiscovery_1.makeDatapointKey)(ref.managementPoint, ref.dataPoint, ref.dataPointPath),
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
function auditApiCoverage(device, gateway) {
    const apiDatapoints = filterApiDatapointsForCoverage((0, apiDiscovery_1.discoverApiDatapoints)(device));
    const mapped = collectMappedCharacteristics(gateway);
    const unmappedRefs = [];
    const settableMismatches = [];
    for (const ref of apiDatapoints) {
        const key = (0, apiDiscovery_1.makeDatapointKey)(ref.managementPoint, ref.dataPoint, ref.dataPointPath);
        const mappedInfo = findMappedInfo(key, mapped);
        if (!mappedInfo) {
            unmappedRefs.push(ref);
            continue;
        }
        if (ref.settable && !mappedInfo.settable) {
            settableMismatches.push(toSettableMismatch(ref, mappedInfo));
        }
    }
    const apiCount = apiDatapoints.length;
    const totalUnmappedCount = unmappedRefs.length;
    const mappedCount = apiCount - totalUnmappedCount;
    const hasGaps = totalUnmappedCount > 0 || settableMismatches.length > 0;
    const configCoverage = hasGaps ? 'incomplete' : 'complete';
    const mismatchPart = settableMismatches.length > 0 ? `, ${settableMismatches.length} settable mismatch(es)` : '';
    const configCoverageDetail = `${mappedCount}/${apiCount} datapoints mapped${mismatchPart}`;
    const unmappedSlice = unmappedRefs.slice(0, 50);
    const mismatchSlice = settableMismatches.slice(0, 50);
    return {
        configCoverage,
        mappedCount,
        apiCount,
        configCoverageDetail,
        unmappedDatapoints: unmappedSlice.map((ref) => (0, apiDiscovery_1.makeDatapointKey)(ref.managementPoint, ref.dataPoint, ref.dataPointPath)),
        unmappedDatapointDetails: unmappedSlice,
        totalUnmappedCount,
        settableMismatches: mismatchSlice,
        apiDatapointDetails: apiDatapoints.slice(0, 100),
    };
}
//# sourceMappingURL=apiCoverageAudit.js.map