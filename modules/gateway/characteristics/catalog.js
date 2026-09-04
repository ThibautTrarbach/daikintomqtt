"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardGatewayDeviceInfo = standardGatewayDeviceInfo;
exports.dualZoneDeviceInfo = dualZoneDeviceInfo;
exports.multiZoneDeviceInfo = multiZoneDeviceInfo;
exports.consumptionPack = consumptionPack;
exports.stateBool = stateBool;
exports.stringField = stringField;
exports.sensoryTemperature = sensoryTemperature;
exports.sensoryHumidity = sensoryHumidity;
exports.operationModeClimate = operationModeClimate;
exports.temperatureControlRoom = temperatureControlRoom;
exports.temperatureControlLeavingWater = temperatureControlLeavingWater;
exports.temperatureControlLeavingWaterOffset = temperatureControlLeavingWaterOffset;
exports.temperatureControlDhw = temperatureControlDhw;
exports.fanClimatePack = fanClimatePack;
exports.powerfulModeClimate = powerfulModeClimate;
exports.demandControlPack = demandControlPack;
exports.gatewayDiagnosticsPack = gatewayDiagnosticsPack;
exports.auxiliaryUnitPack = auxiliaryUnitPack;
exports.auxiliaryUnitInfoPack = auxiliaryUnitInfoPack;
exports.zoneStatusPack = zoneStatusPack;
const typeConstants_1 = require("../typeConstants");
function standardGatewayDeviceInfo(managementPoint, nameDataPoint = 'name') {
    return {
        name: { managementPoint, dataPoint: nameDataPoint },
        modelInfo: { managementPoint: 'gateway', dataPoint: 'modelInfo' },
        serialNumber: { managementPoint: 'gateway', dataPoint: 'serialNumber' },
        firmwareVersion: { managementPoint: 'gateway', dataPoint: 'firmwareVersion' },
        isInErrorState: { managementPoint, dataPoint: 'isInErrorState' },
        errorCode: { managementPoint, dataPoint: 'errorCode' },
    };
}
function dualZoneDeviceInfo() {
    return {
        name: { managementPoint: '0', dataPoint: 'name' },
        modelInfo: { managementPoint: '0', dataPoint: 'modelInfo' },
        serialNumber: { managementPoint: '0', dataPoint: 'serialNumber' },
        firmwareVersion: { managementPoint: '0', dataPoint: 'firmwareVersion' },
        isInErrorState: { managementPoint: '0', dataPoint: 'isInErrorState' },
        errorCode: { managementPoint: '1', dataPoint: 'errorCode' },
    };
}
function multiZoneDeviceInfo() {
    return {
        name: { managementPoint: 'climateControlMainZone', dataPoint: 'name' },
        modelInfo: { managementPoint: 'gateway', dataPoint: 'modelInfo' },
        serialNumber: { managementPoint: 'gateway', dataPoint: 'serialNumber' },
        firmwareVersion: { managementPoint: 'gateway', dataPoint: 'firmwareVersion' },
        isInErrorState: { managementPoint: 'gateway', dataPoint: 'isInErrorState' },
    };
}
function consumptionPack(managementPoint, prefix, suffix = '') {
    const defs = [
        { key: `_heatingConsumptionD${suffix}`, label: `${prefix}Heating Consumption Day`, consumptionT: typeConstants_1.consumptionEnum.heatingDay },
        { key: `_heatingConsumptionW${suffix}`, label: `${prefix}Heating Consumption Week`, consumptionT: typeConstants_1.consumptionEnum.heatingWeek },
        { key: `_heatingConsumptionM${suffix}`, label: `${prefix}Heating Consumption Month`, consumptionT: typeConstants_1.consumptionEnum.heatingMonth },
        { key: `_coolingConsumptionD${suffix}`, label: `${prefix}Cooling Consumption Day`, consumptionT: typeConstants_1.consumptionEnum.coolingDay },
        { key: `_coolingConsumptionW${suffix}`, label: `${prefix}Cooling Consumption Week`, consumptionT: typeConstants_1.consumptionEnum.coolingWeek },
        { key: `_coolingConsumptionM${suffix}`, label: `${prefix}Cooling Consumption Month`, consumptionT: typeConstants_1.consumptionEnum.coolingMonth },
    ];
    return defs.map(({ key, label, consumptionT }) => ({
        propertyKey: key,
        daikin: {
            managementPoint,
            dataPoint: 'consumptionData',
            dataPointPath: '/electrical',
            consumptionT,
            converter: typeConstants_1.converterEnum.consumption,
        },
        description: {
            name: label,
            settable: false,
            type: typeConstants_1.typeEnum.numeric,
            minValue: 0,
            maxValue: 3000,
            unite: 'kWh',
        },
    }));
}
function stateBool(managementPoint, dataPoint, label, opts = {}) {
    const propertyKey = opts.propertyKey ?? `_${dataPoint}`;
    return {
        propertyKey,
        daikin: {
            managementPoint,
            dataPoint,
            ...(opts.settable ? { converter: typeConstants_1.converterEnum.binary } : {}),
        },
        description: {
            name: label,
            settable: opts.settable ?? false,
            type: typeConstants_1.typeEnum.binary,
            ...(opts.generic_type ? { generic_type: opts.generic_type } : {}),
        },
    };
}
function stringField(managementPoint, dataPoint, label, opts = {}) {
    const propertyKey = opts.propertyKey ?? `_${dataPoint}`;
    return {
        propertyKey,
        daikin: {
            managementPoint,
            dataPoint,
            ...(opts.converter !== undefined ? { converter: opts.converter } : {}),
        },
        description: {
            name: label,
            settable: opts.settable ?? false,
            type: typeConstants_1.typeEnum.string,
            ...(opts.values ? { values: opts.values } : {}),
        },
    };
}
function sensoryTemperature(managementPoint, dataPointPath, label, propertyKey, opts = {}) {
    return {
        propertyKey,
        daikin: {
            managementPoint,
            dataPoint: 'sensoryData',
            dataPointPath,
        },
        description: {
            name: label,
            settable: false,
            type: typeConstants_1.typeEnum.numeric,
            unite: '°C',
            ...(opts.minValue !== undefined && opts.maxValue !== undefined
                ? { minValue: opts.minValue, maxValue: opts.maxValue }
                : {
                    minMaxValue: {
                        managementPoint,
                        dataPoint: 'sensoryData',
                        dataPointPath,
                    },
                }),
        },
    };
}
function sensoryHumidity(managementPoint, label, propertyKey = '_roomHumidity') {
    const dataPointPath = '/roomHumidity';
    return {
        propertyKey,
        daikin: {
            managementPoint,
            dataPoint: 'sensoryData',
            dataPointPath,
        },
        description: {
            name: label,
            settable: false,
            type: typeConstants_1.typeEnum.numeric,
            unite: '%',
            minMaxValue: {
                managementPoint,
                dataPoint: 'sensoryData',
                dataPointPath,
            },
        },
    };
}
function operationModeClimate(managementPoint, values, propertyKey = '_operationMode') {
    return stringField(managementPoint, 'operationMode', 'Operation Mode', {
        propertyKey,
        settable: true,
        values,
    });
}
function temperatureControlRoom(managementPoint, label, propertyKey) {
    const daikin = {
        managementPoint,
        dataPoint: 'temperatureControl',
        dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
        multiple: true,
        converter: typeConstants_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: true,
            type: typeConstants_1.typeEnum.numeric,
            unite: '°C',
            minMaxValue: {
                managementPoint,
                dataPoint: 'temperatureControl',
                dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
                multiple: true,
                multipleValue: { managementPoint, dataPoint: 'operationMode' },
            },
        },
    };
}
function temperatureControlLeavingWater(managementPoint, label, propertyKey) {
    const daikin = {
        managementPoint,
        dataPoint: 'temperatureControl',
        dataPointPath: '/operationModes/#value#/setpoints/leavingWaterTemperature',
        multiple: true,
        converter: typeConstants_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: true,
            type: typeConstants_1.typeEnum.numeric,
            unite: '°C',
            minMaxValue: {
                managementPoint,
                dataPoint: 'temperatureControl',
                dataPointPath: '/operationModes/#value#/setpoints/leavingWaterTemperature',
                multiple: true,
                multipleValue: { managementPoint, dataPoint: 'operationMode' },
            },
        },
    };
}
function temperatureControlLeavingWaterOffset(managementPoint, label, propertyKey) {
    const daikin = {
        managementPoint,
        dataPoint: 'temperatureControl',
        dataPointPath: '/operationModes/#value#/setpoints/leavingWaterOffset',
        multiple: true,
        converter: typeConstants_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: true,
            type: typeConstants_1.typeEnum.numeric,
            unite: '°C',
            minMaxValue: {
                managementPoint,
                dataPoint: 'temperatureControl',
                dataPointPath: '/operationModes/#value#/setpoints/leavingWaterOffset',
                multiple: true,
                multipleValue: { managementPoint, dataPoint: 'operationMode' },
            },
        },
    };
}
function temperatureControlDhw(managementPoint, label, propertyKey, opts = {}) {
    if (opts.fixedHeatingPath) {
        const dataPointPath = '/operationModes/heating/setpoints/domesticHotWaterTemperature';
        return {
            propertyKey,
            daikin: {
                managementPoint,
                dataPoint: 'temperatureControl',
                dataPointPath,
                converter: typeConstants_1.converterEnum.numeric,
            },
            description: {
                name: label,
                settable: true,
                type: typeConstants_1.typeEnum.numeric,
                unite: '°C',
                minMaxValue: {
                    managementPoint,
                    dataPoint: 'temperatureControl',
                    dataPointPath,
                },
            },
        };
    }
    const daikin = {
        managementPoint,
        dataPoint: 'temperatureControl',
        dataPointPath: '/operationModes/#value#/setpoints/domesticHotWaterTemperature',
        multiple: true,
        converter: typeConstants_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: false,
            type: typeConstants_1.typeEnum.numeric,
            unite: '°C',
            minMaxValue: {
                managementPoint,
                dataPoint: 'temperatureControl',
                dataPointPath: '/operationModes/#value#/setpoints/domesticHotWaterTemperature',
                multiple: true,
                multipleValue: { managementPoint, dataPoint: 'operationMode' },
            },
        },
    };
}
function fanClimatePack(managementPoint, opts = {}) {
    const multipleValue = { managementPoint, dataPoint: 'operationMode' };
    const defs = [
        {
            propertyKey: '_fanCurrentMode',
            daikin: {
                managementPoint,
                dataPoint: 'fanControl',
                dataPointPath: '/operationModes/#value#/fanSpeed/currentMode',
                multiple: true,
                multipleValue,
            },
            description: {
                name: 'Fan Current Mode',
                settable: true,
                type: typeConstants_1.typeEnum.string,
                values: ['auto', 'quiet', 'fixed'],
            },
        },
        {
            propertyKey: '_fanFixed',
            daikin: {
                managementPoint,
                dataPoint: 'fanControl',
                dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
                multiple: true,
                converter: typeConstants_1.converterEnum.numeric,
                multipleValue,
            },
            description: {
                name: 'Fan Fixed',
                settable: true,
                type: typeConstants_1.typeEnum.numeric,
                minMaxValue: {
                    managementPoint,
                    dataPoint: 'fanControl',
                    dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
                    multiple: true,
                    multipleValue,
                },
            },
        },
    ];
    if (opts.horizontal) {
        defs.push({
            propertyKey: '_fanHorizontal',
            daikin: {
                managementPoint,
                dataPoint: 'fanControl',
                dataPointPath: '/operationModes/#value#/fanDirection/horizontal/currentMode',
                multiple: true,
                multipleValue,
            },
            description: {
                name: 'Fan Horizontal',
                settable: true,
                type: typeConstants_1.typeEnum.string,
                values: ['stop', 'swing'],
            },
        });
    }
    if (opts.vertical) {
        defs.push({
            propertyKey: '_fanVertical',
            daikin: {
                managementPoint,
                dataPoint: 'fanControl',
                dataPointPath: '/operationModes/#value#/fanDirection/vertical/currentMode',
                multiple: true,
                multipleValue,
            },
            description: {
                name: 'Fan Vertical',
                settable: true,
                type: typeConstants_1.typeEnum.string,
                values: ['stop', 'swing', 'windNice'],
            },
        });
    }
    return defs;
}
function powerfulModeClimate(managementPoint) {
    return [
        stateBool(managementPoint, 'powerfulMode', 'Powerful Mode', { settable: true, generic_type: 'ENERGY_STATE' }),
        stateBool(managementPoint, 'isPowerfulModeActive', 'Powerful Mode Active', { propertyKey: '_isPowerfulModeActive' }),
    ];
}
function gatewayDiagnosticsPack() {
    const MP = 'gateway';
    return [
        stringField(MP, 'ipAddress', 'Gateway IP Address', { propertyKey: '_gatewayIpAddress' }),
        stringField(MP, 'macAddress', 'Gateway MAC Address', { propertyKey: '_gatewayMacAddress' }),
        stringField(MP, 'ssid', 'Gateway SSID', { propertyKey: '_gatewaySsid' }),
        stateBool(MP, 'daylightSavingTimeEnabled', 'Daylight Saving', { settable: true, propertyKey: '_gatewayDaylightSaving' }),
        stateBool(MP, 'ledEnabled', 'LED Enabled', { settable: true, propertyKey: '_gatewayLedEnabled' }),
        stringField(MP, 'regionCode', 'Region Code', { propertyKey: '_gatewayRegionCode' }),
        stateBool(MP, 'isFirmwareUpdateSupported', 'Firmware Update Supported', { propertyKey: '_gatewayFirmwareUpdateSupported' }),
        stateBool(MP, 'isInErrorState', 'Gateway Error State', { propertyKey: '_gatewayIsInErrorState' }),
        stringField(MP, 'errorCode', 'Gateway Error Code', { propertyKey: '_gatewayErrorCode' }),
    ];
}
function demandControlPack(managementPoint) {
    return [
        {
            propertyKey: '_demandControlCurrentMode',
            daikin: {
                managementPoint,
                dataPoint: 'demandControl',
                dataPointPath: '/currentMode',
            },
            description: {
                name: 'Demand Control Mode',
                settable: true,
                type: typeConstants_1.typeEnum.string,
                values: ['off', 'auto', 'fixed', 'scheduled'],
            },
        },
        {
            propertyKey: '_demandControlFixed',
            daikin: {
                managementPoint,
                dataPoint: 'demandControl',
                dataPointPath: '/modes/fixed',
                converter: typeConstants_1.converterEnum.numeric,
            },
            description: {
                name: 'Demand Control Fixed',
                settable: true,
                type: typeConstants_1.typeEnum.numeric,
                minMaxValue: {
                    managementPoint,
                    dataPoint: 'demandControl',
                    dataPointPath: '/modes/fixed',
                },
            },
        },
    ];
}
function auxiliaryUnitPack(managementPoint, labelPrefix) {
    const chars = [];
    if (managementPoint === 'indoorUnit') {
        chars.push(stringField(managementPoint, 'modelInfo', `${labelPrefix} Model`, { propertyKey: '_indoorUnitModelInfo' }), stringField(managementPoint, 'serialNumber', `${labelPrefix} Serial Number`, { propertyKey: '_indoorUnitSerialNumber' }), stringField(managementPoint, 'softwareVersion', `${labelPrefix} Software Version`, {
            propertyKey: '_indoorUnitSoftwareVersion',
        }), stringField(managementPoint, 'eepromVersion', `${labelPrefix} EEPROM Version`, {
            propertyKey: '_indoorUnitEepromVersion',
        }), stateBool(managementPoint, 'dryKeepSetting', `${labelPrefix} Dry Keep`, {
            settable: true,
            propertyKey: '_indoorUnitDryKeepSetting',
        }), stateBool(managementPoint, 'isInThermoOnState', `${labelPrefix} Thermo On State`, {
            propertyKey: '_indoorUnitIsInThermoOnState',
        }), stringField(managementPoint, 'frontPanelSetting', `${labelPrefix} Front Panel Setting`, {
            settable: true,
            propertyKey: '_indoorUnitFrontPanelSetting',
        }), stringField(managementPoint, 'installationPosition', `${labelPrefix} Installation Position`, {
            propertyKey: '_indoorUnitInstallationPosition',
        }));
    }
    if (managementPoint === 'outdoorUnit') {
        chars.push(stringField(managementPoint, 'modelInfo', `${labelPrefix} Model`, { propertyKey: '_outdoorUnitModelInfo' }), stringField(managementPoint, 'serialNumber', `${labelPrefix} Serial Number`, { propertyKey: '_outdoorUnitSerialNumber' }), stringField(managementPoint, 'softwareVersion', `${labelPrefix} Software Version`, {
            propertyKey: '_outdoorUnitSoftwareVersion',
        }), stringField(managementPoint, 'errorCode', `${labelPrefix} Error Code`, { propertyKey: '_outdoorUnitErrorCode' }), stateBool(managementPoint, 'isInErrorState', `${labelPrefix} Error State`, { propertyKey: '_outdoorUnitIsInErrorState' }), stateBool(managementPoint, 'isInWarningState', `${labelPrefix} Warning State`, { propertyKey: '_outdoorUnitIsInWarningState' }), stateBool(managementPoint, 'isInCautionState', `${labelPrefix} Caution State`, { propertyKey: '_outdoorUnitIsInCautionState' }), stateBool(managementPoint, 'isInDefrostState', `${labelPrefix} Defrost State`, { propertyKey: '_outdoorUnitIsInDefrostState' }));
    }
    return chars;
}
function auxiliaryUnitInfoPack(managementPoint, labelPrefix) {
    const suffix = managementPoint.replace(/[^a-zA-Z0-9]/g, '');
    return [
        stringField(managementPoint, 'modelInfo', `${labelPrefix} Model`, { propertyKey: `_aux${suffix}ModelInfo` }),
        stringField(managementPoint, 'softwareVersion', `${labelPrefix} Software Version`, {
            propertyKey: `_aux${suffix}SoftwareVersion`,
        }),
    ];
}
function zoneStatusPack(managementPoint, labelPrefix, keySuffix) {
    return [
        stateBool(managementPoint, 'isHolidayModeActive', `${labelPrefix} Holiday Mode`, {
            propertyKey: `_isHolidayModeActive${keySuffix}`,
        }),
        stateBool(managementPoint, 'isInErrorState', `${labelPrefix} Error State`, {
            propertyKey: `_isInErrorState${keySuffix}`,
        }),
        stateBool(managementPoint, 'isInWarningState', `${labelPrefix} Warning State`, {
            propertyKey: `_isInWarningState${keySuffix}`,
        }),
        stateBool(managementPoint, 'isInInstallerState', `${labelPrefix} Installer State`, {
            propertyKey: `_isInInstallerState${keySuffix}`,
        }),
        stateBool(managementPoint, 'isInEmergencyState', `${labelPrefix} Emergency State`, {
            propertyKey: `_isInEmergencyState${keySuffix}`,
        }),
    ];
}
//# sourceMappingURL=catalog.js.map