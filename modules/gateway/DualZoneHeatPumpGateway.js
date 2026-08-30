"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRP069A62 = exports.BRP069A61 = void 0;
exports.buildDualZoneCharacteristics = buildDualZoneCharacteristics;
const AbstractGateway_1 = require("./AbstractGateway");
const BaseModules_1 = require("./BaseModules");
const catalog_1 = require("./characteristics/catalog");
function buildHeatPumpZone1Characteristics(extended) {
    const MP = '1';
    const prefix = '1 - ';
    const chars = [
        ...(0, catalog_1.zoneStatusPack)(MP, prefix.trim(), '1'),
    ];
    if (extended) {
        chars.push((0, catalog_1.stringField)(MP, 'operationMode', `${prefix}Operation Mode`, {
            propertyKey: '_operationMode1',
            settable: true,
            values: ['heating'],
        }));
    }
    chars.push((0, catalog_1.stateBool)(MP, 'onOffMode', `${prefix}State`, {
        settable: true,
        generic_type: 'ENERGY_STATE',
        propertyKey: '_onOffMode1',
    }), (0, catalog_1.stringField)(MP, 'setpointMode', `${prefix}Setpoint Mode`, {
        propertyKey: '_setpointMode1',
        converter: BaseModules_1.converterEnum.string,
    }), (0, catalog_1.stringField)(MP, 'controlMode', `${prefix}Control Mode`, {
        propertyKey: '_controlMode1',
        converter: BaseModules_1.converterEnum.string,
    }));
    if (extended) {
        chars.push((0, catalog_1.sensoryTemperature)(MP, '/roomTemperature', `${prefix}Room Temperature`, '_roomTemperature1'), (0, catalog_1.sensoryTemperature)(MP, '/outdoorTemperature', `${prefix}Outdoor Temperature`, '_outdoorTemperature1'), (0, catalog_1.sensoryTemperature)(MP, '/leavingWaterTemperature', `${prefix}Leaving Water Temperature`, '_leavingWaterTemperature1'), (0, catalog_1.sensoryTemperature)(MP, '/leavingWaterOffset', `${prefix}Leaving Water Offset`, '_leavingWaterOffset1'), (0, catalog_1.temperatureControlRoom)(MP, `${prefix}Temperature Control`, '_temperatureControl1'), {
            propertyKey: '_targetTemperature1',
            daikin: {
                managementPoint: MP,
                dataPoint: 'targetTemperature',
                converter: BaseModules_1.converterEnum.numeric,
            },
            description: {
                name: `${prefix}Target Temperature`,
                settable: true,
                type: BaseModules_1.typeEnum.numeric,
                unite: '°C',
                minMaxValue: {
                    managementPoint: MP,
                    dataPoint: 'targetTemperature',
                },
            },
        });
    }
    else {
        chars.push((0, catalog_1.sensoryTemperature)(MP, '/outdoorTemperature', `${prefix}Outdoor Temperature`, '_outdoorTemperature1'));
    }
    return chars;
}
function buildDhwZone2Characteristics() {
    const MP = '2';
    const prefix = '2 - ';
    return [
        ...(0, catalog_1.zoneStatusPack)(MP, prefix.trim(), '2'),
        (0, catalog_1.stateBool)(MP, 'onOffMode', `${prefix}State`, {
            settable: true,
            generic_type: 'ENERGY_STATE',
            propertyKey: '_onOffMode2',
        }),
        (0, catalog_1.stringField)(MP, 'operationMode', `${prefix}Operation Mode`, {
            propertyKey: '_operationMode2',
        }),
        (0, catalog_1.stateBool)(MP, 'powerfulMode', `${prefix}Powerful Mode`, {
            settable: true,
            generic_type: 'ENERGY_STATE',
            propertyKey: '_powerfulMode',
        }),
        (0, catalog_1.stringField)(MP, 'heatupMode', ' 2 - Heatup Mode', {
            propertyKey: '_heatupMode2',
        }),
        (0, catalog_1.sensoryTemperature)(MP, '/tankTemperature', `${prefix}Tank Temperature`, '_tankTemperature2'),
        (0, catalog_1.temperatureControlDhw)(MP, `${prefix}Temperature Control`, '_temperatureControl'),
        (0, catalog_1.stringField)(MP, 'setpointMode', `${prefix}Setpoint Mode`, {
            propertyKey: '_setpointMode2',
            converter: BaseModules_1.converterEnum.string,
        }),
        ...(0, catalog_1.consumptionPack)(MP, prefix, '2'),
    ];
}
function buildDualZoneCharacteristics(opts) {
    return [
        ...buildHeatPumpZone1Characteristics(opts.zone1Extended ?? false),
        ...buildDhwZone2Characteristics(),
    ];
}
class BRP069A61 extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        super(device, buildDualZoneCharacteristics({ zone1Extended: false }), (0, catalog_1.dualZoneDeviceInfo)());
    }
}
exports.BRP069A61 = BRP069A61;
class BRP069A62 extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        super(device, buildDualZoneCharacteristics({ zone1Extended: true }), (0, catalog_1.dualZoneDeviceInfo)());
    }
}
exports.BRP069A62 = BRP069A62;
//# sourceMappingURL=DualZoneHeatPumpGateway.js.map