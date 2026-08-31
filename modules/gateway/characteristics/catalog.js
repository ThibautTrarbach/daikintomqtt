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
exports.temperatureControlDhw = temperatureControlDhw;
exports.fanClimatePack = fanClimatePack;
exports.zoneStatusPack = zoneStatusPack;
const BaseModules_1 = require("../BaseModules");
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
        { key: `_heatingConsumptionD${suffix}`, label: `${prefix}Heating Consumption Day`, consumptionT: BaseModules_1.consumptionEnum.heatingDay },
        { key: `_heatingConsumptionW${suffix}`, label: `${prefix}Heating Consumption Week`, consumptionT: BaseModules_1.consumptionEnum.heatingWeek },
        { key: `_heatingConsumptionM${suffix}`, label: `${prefix}Heating Consumption Month`, consumptionT: BaseModules_1.consumptionEnum.heatingMonth },
        { key: `_coolingConsumptionD${suffix}`, label: `${prefix}Cooling Consumption Day`, consumptionT: BaseModules_1.consumptionEnum.coolingDay },
        { key: `_coolingConsumptionW${suffix}`, label: `${prefix}Cooling Consumption Week`, consumptionT: BaseModules_1.consumptionEnum.coolingWeek },
        { key: `_coolingConsumptionM${suffix}`, label: `${prefix}Cooling Consumption Month`, consumptionT: BaseModules_1.consumptionEnum.coolingMonth },
    ];
    return defs.map(({ key, label, consumptionT }) => ({
        propertyKey: key,
        daikin: {
            managementPoint,
            dataPoint: 'consumptionData',
            dataPointPath: '/electrical',
            consumptionT,
            converter: BaseModules_1.converterEnum.consumption,
        },
        description: {
            name: label,
            settable: false,
            type: BaseModules_1.typeEnum.numeric,
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
            ...(opts.settable ? { converter: BaseModules_1.converterEnum.binary } : {}),
        },
        description: {
            name: label,
            settable: opts.settable ?? false,
            type: BaseModules_1.typeEnum.binary,
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
            type: BaseModules_1.typeEnum.string,
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
            type: BaseModules_1.typeEnum.numeric,
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
            type: BaseModules_1.typeEnum.numeric,
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
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: true,
            type: BaseModules_1.typeEnum.numeric,
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
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: true,
            type: BaseModules_1.typeEnum.numeric,
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
function temperatureControlDhw(managementPoint, label, propertyKey, opts = {}) {
    if (opts.fixedHeatingPath) {
        const dataPointPath = '/operationModes/heating/setpoints/domesticHotWaterTemperature';
        return {
            propertyKey,
            daikin: {
                managementPoint,
                dataPoint: 'temperatureControl',
                dataPointPath,
                converter: BaseModules_1.converterEnum.numeric,
            },
            description: {
                name: label,
                settable: false,
                type: BaseModules_1.typeEnum.numeric,
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
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: { managementPoint, dataPoint: 'operationMode' },
    };
    return {
        propertyKey,
        daikin,
        description: {
            name: label,
            settable: false,
            type: BaseModules_1.typeEnum.numeric,
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
                type: BaseModules_1.typeEnum.string,
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
                converter: BaseModules_1.converterEnum.numeric,
                multipleValue,
            },
            description: {
                name: 'Fan Fixed',
                settable: true,
                type: BaseModules_1.typeEnum.numeric,
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
                type: BaseModules_1.typeEnum.string,
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
                type: BaseModules_1.typeEnum.string,
                values: ['stop', 'swing', 'windNice'],
            },
        });
    }
    return defs;
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