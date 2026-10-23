"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.docModeToCloud = docModeToCloud;
exports.cloudModeToDoc = cloudModeToDoc;
exports.docPowToCloud = docPowToCloud;
exports.cloudOnOffToDoc = cloudOnOffToDoc;
exports.docFanToCloud = docFanToCloud;
exports.cloudFanToDoc = cloudFanToDoc;
exports.docDirToCloud = docDirToCloud;
exports.cloudDirToDoc = cloudDirToDoc;
exports.mapLanToClimateState = mapLanToClimateState;
exports.applyCloudWriteToLanControl = applyCloudWriteToLanControl;
exports.buildLanDeviceDescription = buildLanDeviceDescription;
exports.applyClimateStateToManagementPoints = applyClimateStateToManagementPoints;
const DOC_MODE_TO_CLOUD = {
    '0': 'auto',
    '1': 'auto',
    '7': 'auto',
    '2': 'dry',
    '3': 'cooling',
    '4': 'heating',
    '6': 'fanOnly',
};
const CLOUD_MODE_TO_DOC = {
    auto: '1',
    dry: '2',
    cooling: '3',
    heating: '4',
    fanOnly: '6',
};
function parseOptionalNumber(raw) {
    if (raw === undefined || raw === '' || raw === '-' || raw === '--' || raw === 'M') {
        return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}
function docModeToCloud(mode) {
    if (!mode) {
        return 'auto';
    }
    return DOC_MODE_TO_CLOUD[mode] ?? 'auto';
}
function cloudModeToDoc(mode) {
    return CLOUD_MODE_TO_DOC[mode] ?? '1';
}
function docPowToCloud(pow) {
    return pow === '1' ? 'on' : 'off';
}
function cloudOnOffToDoc(value) {
    return value === 'on' ? '1' : '0';
}
function docFanToCloud(fRate) {
    if (fRate === 'A' || fRate === undefined || fRate === '') {
        return { mode: 'auto', fixed: null };
    }
    if (fRate === 'B') {
        return { mode: 'quiet', fixed: null };
    }
    const speed = Number(fRate);
    if (Number.isFinite(speed) && speed >= 3 && speed <= 7) {
        return { mode: 'fixed', fixed: speed - 2 };
    }
    return { mode: 'auto', fixed: null };
}
function cloudFanToDoc(mode, fixed) {
    if (mode === 'quiet') {
        return 'B';
    }
    if (mode === 'fixed' && fixed !== null && fixed >= 1 && fixed <= 5) {
        return String(fixed + 2);
    }
    return 'A';
}
function docDirToCloud(fDir) {
    switch (fDir) {
        case '1':
            return { vertical: 'swing', horizontal: 'stop' };
        case '2':
            return { vertical: 'stop', horizontal: 'swing' };
        case '3':
            return { vertical: 'swing', horizontal: 'swing' };
        default:
            return { vertical: 'stop', horizontal: 'stop' };
    }
}
function cloudDirToDoc(vertical, horizontal) {
    const v = vertical === 'swing';
    const h = horizontal === 'swing';
    if (v && h) {
        return '3';
    }
    if (v) {
        return '1';
    }
    if (h) {
        return '2';
    }
    return '0';
}
function mapLanToClimateState(control, sensor = {}) {
    const fan = docFanToCloud(control.f_rate);
    const dir = docDirToCloud(control.f_dir);
    return {
        onOffMode: docPowToCloud(control.pow),
        operationMode: docModeToCloud(control.mode),
        targetTemperature: parseOptionalNumber(control.stemp),
        humiditySetpoint: parseOptionalNumber(control.shum),
        fanMode: fan.mode,
        fanFixed: fan.fixed,
        swingVertical: dir.vertical,
        swingHorizontal: dir.horizontal,
        roomTemperature: parseOptionalNumber(sensor.htemp),
        outdoorTemperature: parseOptionalNumber(sensor.otemp),
        roomHumidity: parseOptionalNumber(sensor.hhum),
        rawControl: { ...control },
    };
}
function applyCloudWriteToLanControl(current, write) {
    if (write.managementPoint !== 'climateControl') {
        return null;
    }
    const next = {
        pow: current.pow ?? '0',
        mode: current.mode ?? '1',
        stemp: current.stemp ?? '20',
        shum: current.shum ?? '0',
        f_rate: current.f_rate ?? 'A',
        f_dir: current.f_dir ?? '0',
    };
    const { dataPoint, dataPointPath, value } = write;
    if (dataPoint === 'onOffMode') {
        next.pow = cloudOnOffToDoc(value === 'on' || value === true ? 'on' : 'off');
        return next;
    }
    if (dataPoint === 'operationMode' && typeof value === 'string') {
        next.mode = cloudModeToDoc(value);
        return next;
    }
    if (dataPoint === 'temperatureControl' && dataPointPath?.includes('roomTemperature')) {
        const n = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(n)) {
            next.stemp = n.toFixed(1);
        }
        return next;
    }
    if (dataPoint === 'fanControl') {
        const fan = docFanToCloud(next.f_rate);
        const dir = docDirToCloud(next.f_dir);
        if (dataPointPath?.includes('fanSpeed/currentMode') && typeof value === 'string') {
            next.f_rate = cloudFanToDoc(value, fan.fixed);
            return next;
        }
        if (dataPointPath?.includes('fanSpeed/modes/fixed')) {
            const n = typeof value === 'number' ? value : Number(value);
            next.f_rate = cloudFanToDoc('fixed', Number.isFinite(n) ? n : 3);
            return next;
        }
        if (dataPointPath?.includes('fanDirection/vertical')) {
            next.f_dir = cloudDirToDoc(value === 'swing' ? 'swing' : 'stop', dir.horizontal);
            return next;
        }
        if (dataPointPath?.includes('fanDirection/horizontal')) {
            next.f_dir = cloudDirToDoc(dir.vertical, value === 'swing' ? 'swing' : 'stop');
            return next;
        }
    }
    return null;
}
function leaf(value, settable = false, extra = {}) {
    return { value, settable, ...extra };
}
const OPERATION_MODES = ['fanOnly', 'heating', 'cooling', 'auto', 'dry'];
const FAN_MODES = ['auto', 'quiet', 'fixed'];
function buildLanDeviceDescription(opts) {
    const mode = opts.climate.operationMode;
    const stemp = opts.climate.targetTemperature ?? 20;
    const fanMode = opts.climate.fanMode;
    const fanFixed = opts.climate.fanFixed ?? 3;
    const buildFanForMode = () => ({
        fanSpeed: {
            currentMode: leaf(fanMode, true, { values: FAN_MODES }),
            modes: {
                fixed: leaf(fanFixed, true, { minValue: 1, maxValue: 5, stepValue: 1 }),
            },
        },
        fanDirection: {
            horizontal: { currentMode: leaf(opts.climate.swingHorizontal, true, { values: ['stop', 'swing'] }) },
            vertical: { currentMode: leaf(opts.climate.swingVertical, true, { values: ['stop', 'swing'] }) },
        },
    });
    const fanOperationModes = {};
    const tempOperationModes = {};
    for (const m of OPERATION_MODES) {
        fanOperationModes[m] = buildFanForMode();
        if (m !== 'dry' && m !== 'fanOnly') {
            tempOperationModes[m] = {
                setpoints: {
                    roomTemperature: leaf(stemp, true, { minValue: 18, maxValue: 32, stepValue: 0.5 }),
                },
            };
        }
    }
    return {
        id: opts.deviceId,
        name: opts.name,
        isCloudConnectionUp: { value: false },
        managementPoints: [
            {
                embeddedId: 'gateway',
                modelInfo: leaf(opts.modelInfo),
                macAddress: leaf(opts.macAddress ?? ''),
                ipAddress: leaf(opts.ipAddress),
                firmwareVersion: leaf(opts.firmwareVersion ?? ''),
                name: leaf(opts.name, true),
            },
            {
                embeddedId: 'climateControl',
                name: leaf(opts.name, true),
                operationMode: leaf(mode, true, { values: OPERATION_MODES }),
                onOffMode: leaf(opts.climate.onOffMode, true, { values: ['on', 'off'] }),
                isHolidayModeActive: leaf('off'),
                isInErrorState: leaf('off'),
                isInModeConflict: leaf('off'),
                isInWarningState: leaf('off'),
                isInCautionState: leaf('off'),
                powerfulMode: leaf('off', true),
                sensoryData: {
                    value: {
                        roomTemperature: leaf(opts.climate.roomTemperature ?? 0),
                        outdoorTemperature: leaf(opts.climate.outdoorTemperature ?? 0),
                        humidity: leaf(opts.climate.roomHumidity ?? 0),
                    },
                },
                temperatureControl: {
                    value: {
                        operationModes: tempOperationModes,
                    },
                },
                fanControl: {
                    value: {
                        operationModes: fanOperationModes,
                    },
                },
            },
        ],
    };
}
function applyClimateStateToManagementPoints(managementPoints, climate) {
    const cc = managementPoints.climateControl;
    if (!cc) {
        return;
    }
    if (cc.onOffMode) {
        cc.onOffMode.value = climate.onOffMode;
    }
    if (cc.operationMode) {
        cc.operationMode.value = climate.operationMode;
    }
    const mode = climate.operationMode;
    const stempPath = `/operationModes/${mode}/setpoints/roomTemperature`;
    if (cc.temperatureControl?.[stempPath] && climate.targetTemperature !== null) {
        cc.temperatureControl[stempPath].value = climate.targetTemperature;
    }
    const fanModePath = `/operationModes/${mode}/fanSpeed/currentMode`;
    if (cc.fanControl?.[fanModePath]) {
        cc.fanControl[fanModePath].value = climate.fanMode;
    }
    const fanFixedPath = `/operationModes/${mode}/fanSpeed/modes/fixed`;
    if (cc.fanControl?.[fanFixedPath] && climate.fanFixed !== null) {
        cc.fanControl[fanFixedPath].value = climate.fanFixed;
    }
    const vPath = `/operationModes/${mode}/fanDirection/vertical/currentMode`;
    if (cc.fanControl?.[vPath]) {
        cc.fanControl[vPath].value = climate.swingVertical;
    }
    const hPath = `/operationModes/${mode}/fanDirection/horizontal/currentMode`;
    if (cc.fanControl?.[hPath]) {
        cc.fanControl[hPath].value = climate.swingHorizontal;
    }
    if (cc.sensoryData) {
        if (cc.sensoryData['/roomTemperature'] && climate.roomTemperature !== null) {
            cc.sensoryData['/roomTemperature'].value = climate.roomTemperature;
        }
        if (cc.sensoryData['/outdoorTemperature'] && climate.outdoorTemperature !== null) {
            cc.sensoryData['/outdoorTemperature'].value = climate.outdoorTemperature;
        }
        if (cc.sensoryData['/humidity'] && climate.roomHumidity !== null) {
            cc.sensoryData['/humidity'].value = climate.roomHumidity;
        }
    }
    const gw = managementPoints.gateway;
    if (gw) {
    }
}
//# sourceMappingURL=LanMapper.js.map