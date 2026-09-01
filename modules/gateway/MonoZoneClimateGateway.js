"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRP069C8x = exports.BRP069C41 = void 0;
exports.buildMonoZoneClimateCharacteristics = buildMonoZoneClimateCharacteristics;
const AbstractGateway_1 = require("./AbstractGateway");
const typeConstants_1 = require("./typeConstants");
const catalog_1 = require("./characteristics/catalog");
const MP = 'climateControl';
function buildMonoZoneClimateCharacteristics() {
    const operationModeValues = ['auto', 'dry', 'cooling', 'heating', 'fanOnly'];
    const fanModeValues = ['auto', 'quiet', 'fixed'];
    return [
        (0, catalog_1.stateBool)(MP, 'isHolidayModeActive', 'Holiday Mode'),
        (0, catalog_1.stateBool)(MP, 'isInErrorState', 'Error State'),
        (0, catalog_1.stateBool)(MP, 'isInModeConflict', 'Conflict State'),
        {
            propertyKey: '_operationMode',
            daikin: { managementPoint: MP, dataPoint: 'operationMode' },
            description: {
                name: 'Operation Mode',
                settable: true,
                type: typeConstants_1.typeEnum.string,
                values: operationModeValues,
            },
        },
        (0, catalog_1.stateBool)(MP, 'onOffMode', 'State', { settable: true, generic_type: 'ENERGY_STATE' }),
        (0, catalog_1.sensoryTemperature)(MP, '/roomTemperature', 'Room Temperature', '_roomTemperature'),
        (0, catalog_1.sensoryTemperature)(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'),
        {
            propertyKey: '_temperatureControl',
            daikin: {
                managementPoint: MP,
                dataPoint: 'temperatureControl',
                dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
                multiple: true,
                converter: typeConstants_1.converterEnum.numeric,
                multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
            },
            description: {
                name: 'Temperature Control',
                settable: true,
                type: typeConstants_1.typeEnum.numeric,
                unite: '°C',
                minMaxValue: {
                    managementPoint: MP,
                    dataPoint: 'temperatureControl',
                    dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
                    multiple: true,
                    multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
                },
            },
        },
        {
            propertyKey: '_fanCurrentMode',
            daikin: {
                managementPoint: MP,
                dataPoint: 'fanControl',
                dataPointPath: '/operationModes/#value#/fanSpeed/currentMode',
                multiple: true,
                multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
            },
            description: {
                name: 'Fan Current Mode',
                settable: true,
                type: typeConstants_1.typeEnum.string,
                values: fanModeValues,
            },
        },
        {
            propertyKey: '_fanFixed',
            daikin: {
                managementPoint: MP,
                dataPoint: 'fanControl',
                dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
                multiple: true,
                converter: typeConstants_1.converterEnum.numeric,
                multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
            },
            description: {
                name: 'Fan Fixed',
                settable: true,
                type: typeConstants_1.typeEnum.numeric,
                minMaxValue: {
                    managementPoint: MP,
                    dataPoint: 'fanControl',
                    dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
                    multiple: true,
                    multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
                },
            },
        },
        (0, catalog_1.stateBool)(MP, 'powerfulMode', 'Powerful Mode', { settable: true, generic_type: 'ENERGY_STATE' }),
        ...(0, catalog_1.consumptionPack)(MP, ''),
    ];
}
class BRP069C41 extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        super(device, buildMonoZoneClimateCharacteristics(), (0, catalog_1.standardGatewayDeviceInfo)(MP));
    }
}
exports.BRP069C41 = BRP069C41;
class BRP069C8x extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        super(device, buildMonoZoneClimateCharacteristics(), (0, catalog_1.standardGatewayDeviceInfo)(MP));
    }
}
exports.BRP069C8x = BRP069C8x;
//# sourceMappingURL=MonoZoneClimateGateway.js.map