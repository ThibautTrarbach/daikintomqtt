"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRP069A78 = void 0;
exports.buildMultiZoneCharacteristics = buildMultiZoneCharacteristics;
const AbstractGateway_1 = require("./AbstractGateway");
const typeConstants_1 = require("./typeConstants");
const catalog_1 = require("./characteristics/catalog");
const MAIN_MP = 'climateControlMainZone';
const TANK_MP = 'domesticHotWaterTank';
function buildMainZoneCharacteristics() {
    const prefix = 'Main Zone -';
    return [
        (0, catalog_1.stringField)(MAIN_MP, 'controlMode', `${prefix} controlMode`, {
            propertyKey: '_controlModeMain',
        }),
        (0, catalog_1.stringField)(MAIN_MP, 'errorCode', `${prefix} Error Code`, {
            propertyKey: '_errorCodeMain',
        }),
        (0, catalog_1.stateBool)(MAIN_MP, 'isHolidayModeActive', `${prefix}Holiday Mode`, {
            propertyKey: '_isHolidayModeActiveMain',
        }),
        (0, catalog_1.stateBool)(MAIN_MP, 'isInEmergencyState', `${prefix} Emergency State`, {
            propertyKey: '_isInEmergencyStateMain',
        }),
        (0, catalog_1.stateBool)(MAIN_MP, 'isInErrorState', `${prefix} Error State`, {
            propertyKey: '_isInErrorStateMain',
        }),
        (0, catalog_1.stateBool)(MAIN_MP, 'isInInstallerState', `${prefix} Installer State`, {
            propertyKey: '_isInInstallerStateMain',
        }),
        (0, catalog_1.stateBool)(MAIN_MP, 'isInWarningState', `${prefix} Warning State`, {
            propertyKey: '_isInWarningStateMain',
        }),
        (0, catalog_1.stateBool)(MAIN_MP, 'onOffMode', `${prefix} State`, {
            settable: true,
            generic_type: 'ENERGY_STATE',
            propertyKey: '_onOffModeMain',
        }),
        (0, catalog_1.stringField)(MAIN_MP, 'operationMode', `${prefix} Operation Mode`, {
            propertyKey: '_operationModeMain',
            settable: true,
            values: ['heating'],
        }),
        (0, catalog_1.sensoryTemperature)(MAIN_MP, '/roomTemperature', `${prefix} Room Temperature`, '_roomTemperatureMain'),
        (0, catalog_1.sensoryTemperature)(MAIN_MP, '/outdoorTemperature', `${prefix} Outdoor Temperature`, '_outdoorTemperatureMain'),
        (0, catalog_1.sensoryTemperature)(MAIN_MP, '/leavingWaterTemperature', `${prefix} Leaving Water Temperature`, '_leavingWaterTemperatureMain'),
        (0, catalog_1.sensoryTemperature)(MAIN_MP, '/leavingWaterOffset', `${prefix} Leaving Water Offset`, '_leavingWaterOffsetMain'),
        (0, catalog_1.stringField)(MAIN_MP, 'setpointMode', `${prefix} Setpoint Mode`, {
            propertyKey: '_setpointModeMain',
            converter: typeConstants_1.converterEnum.string,
        }),
        (0, catalog_1.temperatureControlRoom)(MAIN_MP, `${prefix} Temperature Control`, '_temperatureControlMain'),
        (0, catalog_1.temperatureControlLeavingWater)(MAIN_MP, `${prefix} Leaving Water Control`, '_temperatureControlWaterMain'),
        (0, catalog_1.temperatureControlLeavingWaterOffset)(MAIN_MP, `${prefix} Leaving Water Offset Control`, '_temperatureControlWaterOffsetMain'),
        ...(0, catalog_1.consumptionPack)(MAIN_MP, `${prefix} `, 'Main'),
    ];
}
function buildTankZoneCharacteristics() {
    const prefix = 'Water Tank -';
    return [
        (0, catalog_1.stringField)(TANK_MP, 'name', `${prefix} Name`, {
            propertyKey: '_nameTank',
        }),
        (0, catalog_1.stringField)(TANK_MP, 'errorCode', `${prefix} Error Code`, {
            propertyKey: '_errorCodeTank',
        }),
        (0, catalog_1.stringField)(TANK_MP, 'heatupMode', 'Main Zone - Heatup Code', {
            propertyKey: '_heatupModeTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'isHolidayModeActive', `${prefix} Holiday Mode`, {
            propertyKey: '_isHolidayModeActiveTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'isInEmergencyState', `${prefix} Emergency State`, {
            propertyKey: '_isInEmergencyStatTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'isInErrorState', `${prefix} Error State`, {
            propertyKey: '_isInErrorStateTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'isInInstallerState', `${prefix} Installer State`, {
            propertyKey: '_isInInstallerStateTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'isInWarningState', `${prefix} Warning State`, {
            propertyKey: '_isInWarningStateTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'onOffMode', `${prefix} State`, {
            settable: true,
            generic_type: 'ENERGY_STATE',
            propertyKey: '_onOffModeTank',
        }),
        (0, catalog_1.stringField)(TANK_MP, 'operationMode', `${prefix} Operation Mode`, {
            propertyKey: '_operationModeTank',
            settable: true,
            values: ['heating'],
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'powerfulMode', `${prefix} Powerful Mode`, {
            settable: true,
            generic_type: 'ENERGY_STATE',
            propertyKey: '_powerfulModeTank',
        }),
        (0, catalog_1.stateBool)(TANK_MP, 'isPowerfulModeActive', `${prefix} Powerful Mode Active`, {
            propertyKey: '_isPowerfulModeActiveTank',
        }),
        (0, catalog_1.sensoryTemperature)(TANK_MP, '/tankTemperature', `${prefix} Tank Temperature`, '_tankTemperatureTank'),
        (0, catalog_1.stringField)(TANK_MP, 'setpointMode', `${prefix} Setpoint Mode`, {
            propertyKey: '_setpointModeTank',
            converter: typeConstants_1.converterEnum.string,
        }),
        (0, catalog_1.temperatureControlDhw)(TANK_MP, `${prefix} Domestic Water Temperature`, '_domesticHotWaterTemperatureTank', {
            fixedHeatingPath: true,
        }),
    ];
}
function buildMultiZoneCharacteristics() {
    return [
        ...buildMainZoneCharacteristics(),
        ...buildTankZoneCharacteristics(),
    ];
}
function appendMultiZoneDeviceSpecificCharacteristics(device, chars) {
    chars.push(...(0, catalog_1.gatewayDiagnosticsPack)());
    const infoOnlyUnits = [
        ['indoorUnitHydro', 'Indoor Unit Hydro'],
        ['userInterface', 'User Interface'],
    ];
    for (const [managementPoint, label] of infoOnlyUnits) {
        if (managementPoint in device.managementPoints) {
            chars.push(...(0, catalog_1.auxiliaryUnitInfoPack)(managementPoint, label));
        }
    }
    if ('outdoorUnit' in device.managementPoints) {
        chars.push(...(0, catalog_1.auxiliaryUnitPack)('outdoorUnit', 'Outdoor Unit'));
    }
}
class BRP069A78 extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        const chars = buildMultiZoneCharacteristics();
        appendMultiZoneDeviceSpecificCharacteristics(device, chars);
        super(device, chars, (0, catalog_1.multiZoneDeviceInfo)());
    }
}
exports.BRP069A78 = BRP069A78;
//# sourceMappingURL=MultiZoneClimateGateway.js.map