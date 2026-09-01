"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRP069C4x = exports.BRP069B4x = exports.BRP069A4x = void 0;
exports.buildExtendedMonoZoneCharacteristics = buildExtendedMonoZoneCharacteristics;
const AbstractGateway_1 = require("./AbstractGateway");
const catalog_1 = require("./characteristics/catalog");
const MP = 'climateControl';
const OPERATION_MODES = ['fanOnly', 'heating', 'cooling', 'auto', 'dry'];
function buildExtendedMonoZoneCharacteristics(opts) {
    const chars = [
        (0, catalog_1.stateBool)(MP, 'isHolidayModeActive', 'Holiday Mode'),
        (0, catalog_1.stateBool)(MP, 'isInErrorState', 'Error State'),
    ];
    if (opts.warningState) {
        chars.push((0, catalog_1.stateBool)(MP, 'isInWarningState', 'Warning State'));
    }
    chars.push((0, catalog_1.stateBool)(MP, 'isInModeConflict', 'Conflict State'));
    if (opts.cautionState) {
        chars.push((0, catalog_1.stateBool)(MP, 'isInCautionState', 'Caution State'));
    }
    if (opts.coolHeatMaster) {
        chars.push((0, catalog_1.stateBool)(MP, 'isCoolHeatMaster', 'Master'));
    }
    chars.push((0, catalog_1.operationModeClimate)(MP, OPERATION_MODES), (0, catalog_1.stateBool)(MP, 'onOffMode', 'State', { settable: true, generic_type: 'ENERGY_STATE' }));
    if (opts.econoMode) {
        chars.push((0, catalog_1.stateBool)(MP, 'econoMode', 'Eco Mode', { settable: true, generic_type: 'ENERGY_STATE' }));
    }
    chars.push(...(0, catalog_1.powerfulModeClimate)(MP));
    if (opts.streamerMode) {
        chars.push((0, catalog_1.stateBool)(MP, 'streamerMode', 'Streamer Mode', { settable: true, generic_type: 'ENERGY_STATE' }));
    }
    chars.push((0, catalog_1.sensoryTemperature)(MP, '/roomTemperature', 'Room Temperature', '_roomTemperature', opts.roomTempFixedRange ?? {}));
    if (opts.humidity !== false) {
        chars.push((0, catalog_1.sensoryHumidity)(MP, 'Room Humidity'));
    }
    chars.push((0, catalog_1.sensoryTemperature)(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'));
    if (opts.outdoorSilentMode) {
        chars.push((0, catalog_1.stateBool)(MP, 'outdoorSilentMode', 'Outdoor Silent', {
            settable: true,
            generic_type: 'ENERGY_STATE',
            propertyKey: '_outdoorSilentMode',
        }));
    }
    chars.push((0, catalog_1.temperatureControlRoom)(MP, 'Temperature Control', '_temperatureControl'));
    if (opts.fanHorizontal || opts.fanVertical) {
        chars.push(...(0, catalog_1.fanClimatePack)(MP, { horizontal: opts.fanHorizontal, vertical: opts.fanVertical }));
    }
    chars.push(...(0, catalog_1.consumptionPack)(MP, ''));
    return chars;
}
function appendDeviceSpecificCharacteristics(device, chars) {
    chars.push(...(0, catalog_1.gatewayDiagnosticsPack)());
    if ('indoorUnit' in device.managementPoints) {
        chars.push(...(0, catalog_1.auxiliaryUnitPack)('indoorUnit', 'Indoor Unit'));
    }
    if ('outdoorUnit' in device.managementPoints) {
        chars.push(...(0, catalog_1.auxiliaryUnitPack)('outdoorUnit', 'Outdoor Unit'));
    }
}
const A4X_OPTS = {
    warningState: true,
    cautionState: true,
    fanVertical: true,
    roomTempFixedRange: { minValue: 10, maxValue: 30 },
};
const B4X_OPTS = {
    econoMode: true,
    streamerMode: true,
    fanHorizontal: true,
    fanVertical: true,
};
const C4X_OPTS = {
    warningState: true,
    cautionState: true,
    coolHeatMaster: true,
    econoMode: true,
    streamerMode: true,
    outdoorSilentMode: true,
    fanHorizontal: true,
    fanVertical: true,
};
class BRP069A4x extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        const chars = buildExtendedMonoZoneCharacteristics(A4X_OPTS);
        appendDeviceSpecificCharacteristics(device, chars);
        super(device, chars, (0, catalog_1.standardGatewayDeviceInfo)(MP));
    }
}
exports.BRP069A4x = BRP069A4x;
class BRP069B4x extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        const chars = buildExtendedMonoZoneCharacteristics(B4X_OPTS);
        appendDeviceSpecificCharacteristics(device, chars);
        super(device, chars, (0, catalog_1.standardGatewayDeviceInfo)(MP));
    }
}
exports.BRP069B4x = BRP069B4x;
class BRP069C4x extends AbstractGateway_1.AbstractGateway {
    constructor(device) {
        const chars = buildExtendedMonoZoneCharacteristics(C4X_OPTS);
        appendDeviceSpecificCharacteristics(device, chars);
        super(device, chars, (0, catalog_1.standardGatewayDeviceInfo)(MP));
    }
}
exports.BRP069C4x = BRP069C4x;
//# sourceMappingURL=ExtendedMonoZoneClimateGateway.js.map