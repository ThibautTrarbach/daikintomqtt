"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicGateway = void 0;
require("reflect-metadata");
const decorator_1 = require("../decorator");
const BaseModules_1 = require("./BaseModules");
const SKIP_DATAPOINTS = new Set(['schedule', 'firmwareUpdate', 'firmwareUpdateStatus']);
function makePropertyKey(embeddedId, dataPoint, dataPointPath) {
    const pathPart = dataPointPath
        ? dataPointPath.replace(/^\//, '').replace(/\//g, '_').replace(/#/g, '')
        : '';
    const base = pathPart ? `${embeddedId}_${dataPoint}_${pathPart}` : `${embeddedId}_${dataPoint}`;
    return `_${base}`;
}
function inferType(def) {
    if (Array.isArray(def.values)) {
        const normalized = def.values.map(v => String(v).toLowerCase());
        if (normalized.every(v => v === 'on' || v === 'off')) {
            return BaseModules_1.typeEnum.binary;
        }
        return BaseModules_1.typeEnum.string;
    }
    if (typeof def.value === 'number' || typeof def.minValue === 'number' || typeof def.maxValue === 'number') {
        return BaseModules_1.typeEnum.numeric;
    }
    if (typeof def.value === 'boolean') {
        return BaseModules_1.typeEnum.binary;
    }
    return BaseModules_1.typeEnum.string;
}
function inferConverter(def, type) {
    if (type === BaseModules_1.typeEnum.binary) {
        return BaseModules_1.converterEnum.binary;
    }
    if (type === BaseModules_1.typeEnum.numeric && typeof def.value === 'number') {
        return BaseModules_1.converterEnum.numeric;
    }
    return undefined;
}
function formatDisplayName(embeddedId, dataPoint, dataPointPath) {
    const pathLabel = dataPointPath ? ` ${dataPointPath.replace(/\//g, ' ')}` : '';
    return `${embeddedId} - ${dataPoint}${pathLabel}`.trim();
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
        const key = makePropertyKey(embeddedId, dataPoint, dataPointPath);
        const type = inferType(leaf);
        const converter = inferConverter(leaf, type);
        const cmdMeta = {
            name: formatDisplayName(embeddedId, dataPoint, dataPointPath),
            settable: !!leaf.settable,
            type,
            values: leaf.values,
            minValue: leaf.minValue,
            maxValue: leaf.maxValue,
            unite: leaf.unit,
        };
        const daikinMeta = {
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
        const newPath = pathPrefix ? `${pathPrefix}/${subKey}` : `/${subKey}`;
        walkDatapointLeaves(embeddedId, dataPoint, subVal, newPath, exposeReadOnly, results);
    }
}
function buildDeviceInfo(device) {
    const readGateway = (field) => {
        try {
            const data = device.getData('gateway', field, undefined);
            return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
        }
        catch {
            return '';
        }
    };
    return {
        id: device.getId(),
        name: readGateway('name') || device.getId(),
        modelInfo: readGateway('modelInfo'),
        serialNumber: readGateway('serialNumber'),
        firmwareVersion: readGateway('firmwareVersion'),
        isInErrorState: readGateway('isInErrorState'),
        errorCode: '',
        timeZone: readGateway('timeZone'),
        wifiConnectionSSID: readGateway('wifiConnectionSSID'),
        wifiConnectionStrength: readGateway('wifiConnectionStrength'),
        isCloudConnectionUp: device.isCloudConnectionUp() ? 'true' : 'false',
    };
}
function convertReadValue(value, converter) {
    if (converter === BaseModules_1.converterEnum.binary) {
        if (value === 'on' || value === true)
            return true;
        if (value === 'off' || value === false)
            return false;
    }
    if (converter === BaseModules_1.converterEnum.numeric && value !== undefined && value !== null) {
        return Number(value);
    }
    return value;
}
class DynamicGateway {
    isDynamic = true;
    _device;
    characteristics = new Map();
    constructor(device) {
        this._device = buildDeviceInfo(device);
        this.buildFromDevice(device);
    }
    get device() {
        return this._device;
    }
    set device(value) {
        this._device = value;
    }
    getCharacteristicDefs() {
        return Array.from(this.characteristics.values());
    }
    isDynamicGateway() {
        return true;
    }
    buildFromDevice(device) {
        this._device = buildDeviceInfo(device);
        this.characteristics.clear();
        const exposeReadOnly = config.system?.exposeReadOnly !== false;
        const defs = [];
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
                if ('ref' in rawValue) {
                    continue;
                }
                walkDatapointLeaves(embeddedId, dataPoint, rawValue, '', exposeReadOnly, defs);
            }
        }
        const cmdMetadata = {};
        const daikinMetadata = {};
        for (const def of defs) {
            this.characteristics.set(def.key, def);
            cmdMetadata[def.key] = def.cmdMeta;
            daikinMetadata[def.key] = def.daikinMeta;
            this[def.key] = convertReadValue(device.getData(def.managementPoint, def.dataPoint, def.dataPointPath)?.value, def.daikinMeta.converter);
        }
        this.addFirmwareMetadata(device, cmdMetadata, daikinMetadata);
        this.addScheduleReadMetadata(device, cmdMetadata, daikinMetadata);
        Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_CMD, cmdMetadata, this);
        Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, daikinMetadata, this);
        Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_DAIKIN_DEVICE, { _device: this._device }, this);
    }
    addFirmwareMetadata(device, cmdMetadata, daikinMetadata) {
        const available = device.isFirmwareUpdateAvailable();
        const status = device.getFirmwareUpdateStatus();
        const details = device.getFirmwareUpdateDetails();
        this._firmwareUpdateAvailable = available;
        this._firmwareUpdateStatus = status ?? '';
        this._firmwareUpdateTarget = details?.version ?? '';
        cmdMetadata._firmwareUpdateAvailable = { name: 'Firmware Update Available', settable: false, type: BaseModules_1.typeEnum.binary };
        cmdMetadata._firmwareUpdateStatus = { name: 'Firmware Update Status', settable: false, type: BaseModules_1.typeEnum.string };
        cmdMetadata._firmwareUpdateTarget = { name: 'Firmware Update Target', settable: false, type: BaseModules_1.typeEnum.string };
        cmdMetadata._triggerFirmwareUpdate = { name: 'Trigger Firmware Update', settable: true, type: BaseModules_1.typeEnum.binary, generic_type: 'OTHER' };
        cmdMetadata._setPresetAway = { name: 'Set Away Preset (Holiday)', settable: true, type: BaseModules_1.typeEnum.binary, generic_type: 'MODE' };
        daikinMetadata._triggerFirmwareUpdate = { managementPoint: 'gateway', dataPoint: '__firmwareUpdate__' };
        daikinMetadata._setPresetAway = { managementPoint: 'gateway', dataPoint: '__awayPreset__' };
    }
    addScheduleReadMetadata(device, cmdMetadata, daikinMetadata) {
        for (const embeddedId of Object.keys(device.managementPoints)) {
            const schedule = device.getData(embeddedId, 'schedule', undefined);
            if (!schedule?.value) {
                continue;
            }
            const key = `_${embeddedId}_scheduleEnabled`;
            this[key] = schedule.value?.enabled ?? false;
            cmdMetadata[key] = { name: `${embeddedId} - Schedule Enabled`, settable: true, type: BaseModules_1.typeEnum.binary };
            daikinMetadata[key] = { managementPoint: embeddedId, dataPoint: '__scheduleEnable__' };
        }
    }
    resolveCharacteristic(key) {
        const normalized = key.startsWith('_') ? key : `_${key}`;
        return this.characteristics.get(normalized);
    }
}
exports.DynamicGateway = DynamicGateway;
//# sourceMappingURL=DynamicGateway.js.map