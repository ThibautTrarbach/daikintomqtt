"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRP069A62 = void 0;
const decorator_1 = require("../decorator");
const BaseModules_1 = require("./BaseModules");
class BRP069A62 {
    _device = {
        id: "",
        name: "",
        modelInfo: "",
        serialNumber: "",
        firmwareVersion: "",
        isInErrorState: "",
        errorCode: ""
    };
    _isHolidayModeActive1;
    _isInErrorState1;
    _isInWarningState1;
    _isInInstallerState1;
    _isInEmergencyState1;
    _operationMode1;
    _onOffMode1;
    _setpointMode1;
    _controlMode1;
    _roomTemperature1;
    _outdoorTemperature1;
    _leavingWaterTemperature1;
    _temperatureControl1;
    _targetTemperature1;
    _isHolidayModeActive2;
    _isInErrorState2;
    _isInWarningState2;
    _isInInstallerState2;
    _isInEmergencyState2;
    _onOffMode2;
    _operationMode2;
    _powerfulMode;
    _heatupMode2;
    _tankTemperature2;
    _temperatureControl;
    _setpointMode2;
    set isHolidayModeActive1(value) {
        this._isHolidayModeActive1 = value;
    }
    set isInErrorState1(value) {
        this._isInErrorState1 = value;
    }
    set isInWarningState1(value) {
        this._isInWarningState1 = value;
    }
    set isInInstallerState1(value) {
        this._isInInstallerState1 = value;
    }
    set isInEmergencyState1(value) {
        this._isInEmergencyState1 = value;
    }
    set operationMode1(value) {
        this._operationMode1 = value;
    }
    set onOffMode1(value) {
        this._onOffMode1 = value;
    }
    set setpointMode1(value) {
        this._setpointMode1 = value;
    }
    set controlMode1(value) {
        this._controlMode1 = value;
    }
    set roomTemperature1(value) {
        this._roomTemperature1 = value;
    }
    set outdoorTemperature1(value) {
        this._outdoorTemperature1 = value;
    }
    set leavingWaterTemperature1(value) {
        this._leavingWaterTemperature1 = value;
    }
    set temperatureControl1(value) {
        this._temperatureControl1 = value;
    }
    set targetTemperature1(value) {
        this._targetTemperature1 = value;
    }
    set isHolidayModeActive2(value) {
        this._isHolidayModeActive2 = value;
    }
    set isInErrorState2(value) {
        this._isInErrorState2 = value;
    }
    set isInWarningState2(value) {
        this._isInWarningState2 = value;
    }
    set isInInstallerState2(value) {
        this._isInInstallerState2 = value;
    }
    set isInEmergencyState2(value) {
        this._isInEmergencyState2 = value;
    }
    set onOffMode2(value) {
        this._onOffMode2 = value;
    }
    set operationMode2(value) {
        this._operationMode2 = value;
    }
    set powerfulMode(value) {
        this._powerfulMode = value;
    }
    set heatupMode2(value) {
        this._heatupMode2 = value;
    }
    set tankTemperature2(value) {
        this._tankTemperature2 = value;
    }
    set temperatureControl(value) {
        this._temperatureControl = value;
    }
    set setpointMode2(value) {
        this._setpointMode2 = value;
    }
    set device(value) {
        this._device = value;
    }
    constructor(device) {
        (0, BaseModules_1.convertDaikinDevice)(device, this);
    }
}
exports.BRP069A62 = BRP069A62;
__decorate([
    (0, decorator_1.modulesDaikinDevice)({
        name: {
            managementPoint: "0",
            dataPoint: "name",
        },
        modelInfo: {
            managementPoint: "0",
            dataPoint: "modelInfo",
        },
        serialNumber: {
            managementPoint: "0",
            dataPoint: "serialNumber",
        },
        firmwareVersion: {
            managementPoint: "0",
            dataPoint: "firmwareVersion",
        },
        isInErrorState: {
            managementPoint: "0",
            dataPoint: "isInErrorState",
        },
        errorCode: {
            managementPoint: "1",
            dataPoint: "errorCode",
        }
    }),
    __metadata("design:type", Object)
], BRP069A62.prototype, "_device", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "isHolidayModeActive"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Holiday Mode',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isHolidayModeActive1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "isInErrorState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Error State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInErrorState1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "isInWarningState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Warning State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInWarningState1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "isInInstallerState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Installer State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInInstallerState1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "isInEmergencyState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Emergency State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInEmergencyState1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "operationMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Operation Mode',
        settable: true,
        type: BaseModules_1.typeEnum.string,
        values: [
            "heating"
        ]
    }),
    __metadata("design:type", String)
], BRP069A62.prototype, "_operationMode1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "onOffMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - State',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_onOffMode1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "setpointMode",
        converter: BaseModules_1.converterEnum.string
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Setpoint Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_setpointMode1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "controlMode",
        converter: BaseModules_1.converterEnum.string
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Control Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_controlMode1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "sensoryData",
        dataPointPath: "/roomTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Room Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "1",
            dataPoint: "sensoryData",
            dataPointPath: "/roomTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_roomTemperature1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "sensoryData",
        dataPointPath: "/outdoorTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Outdoor Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "1",
            dataPoint: "sensoryData",
            dataPointPath: "/outdoorTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_outdoorTemperature1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "sensoryData",
        dataPointPath: "/leavingWaterTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Leaving Water Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "1",
            dataPoint: "sensoryData",
            dataPointPath: "/leavingWaterTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_leavingWaterTemperature1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
        multiple: true,
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: {
            managementPoint: "1",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Temperature Control',
        settable: true,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "1",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
            multiple: true,
            multipleValue: {
                managementPoint: "1",
                dataPoint: "operationMode"
            }
        }
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_temperatureControl1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "1",
        dataPoint: "targetTemperature",
        converter: BaseModules_1.converterEnum.numeric
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '1 - Target Temperature',
        settable: true,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "1",
            dataPoint: "targetTemperature",
        }
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_targetTemperature1", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "isHolidayModeActive"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Holiday Mode',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isHolidayModeActive2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "isInErrorState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Error State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInErrorState2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "isInWarningState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Warning State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInWarningState2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "isInInstallerState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Installer State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInInstallerState2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "isInEmergencyState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Emergency State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_isInEmergencyState2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "onOffMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - State',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_onOffMode2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "operationMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Operation Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], BRP069A62.prototype, "_operationMode2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "powerfulMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Powerful Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_powerfulMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "heatupMode",
    }),
    (0, decorator_1.modulesDataDescription)({
        name: ' 2 - Heatup Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], BRP069A62.prototype, "_heatupMode2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "sensoryData",
        dataPointPath: "/tankTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Tank Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "2",
            dataPoint: "sensoryData",
            dataPointPath: "/tankTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_tankTemperature2", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/domesticHotWaterTemperature",
        multiple: true,
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: {
            managementPoint: "2",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Temperature Control',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "2",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/#value#/setpoints/domesticHotWaterTemperature",
            multiple: true,
            multipleValue: {
                managementPoint: "2",
                dataPoint: "operationMode"
            }
        },
    }),
    __metadata("design:type", Number)
], BRP069A62.prototype, "_temperatureControl", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "2",
        dataPoint: "setpointMode",
        converter: BaseModules_1.converterEnum.string
    }),
    (0, decorator_1.modulesDataDescription)({
        name: '2 - Setpoint Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", Boolean)
], BRP069A62.prototype, "_setpointMode2", void 0);
