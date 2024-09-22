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
exports.BRP069A78 = void 0;
const BaseModules_1 = require("./BaseModules");
const decorator_1 = require("../decorator");
class BRP069A78 {
    _device = {
        id: "",
        name: "",
        modelInfo: "",
        serialNumber: "",
        firmwareVersion: "",
        isInErrorState: "",
        errorCode: ""
    };
    _controlModeMain;
    _errorCodeMain;
    _isHolidayModeActiveMain;
    _isInEmergencyStateMain;
    _isInErrorStateMain;
    _isInInstallerStateMain;
    _isInWarningStateMain;
    _onOffModeMain;
    _operationModeMain;
    _roomTemperatureMain;
    _outdoorTemperatureMain;
    _leavingWaterTemperatureMain;
    _setpointModeMain;
    _temperatureControlMain;
    _temperatureControlWaterMain;
    _errorCodeTank;
    _heatupModeTank;
    _isHolidayModeActiveTank;
    _isInEmergencyStatTank;
    _isInErrorStateTank;
    _isInInstallerStateTank;
    _isInWarningStateTank;
    _onOffModeTank;
    _operationModeTank;
    _powerfulModeTank;
    _tankTemperatureTank;
    _setpointModeTank;
    _domesticHotWaterTemperatureTank;
    set controlModeMain(value) {
        this._controlModeMain = value;
    }
    set errorCodeMain(value) {
        this._errorCodeMain = value;
    }
    set isHolidayModeActiveMain(value) {
        this._isHolidayModeActiveMain = value;
    }
    set isInEmergencyStateMain(value) {
        this._isInEmergencyStateMain = value;
    }
    set isInErrorStateMain(value) {
        this._isInErrorStateMain = value;
    }
    set isInInstallerStateMain(value) {
        this._isInInstallerStateMain = value;
    }
    set isInWarningStateMain(value) {
        this._isInWarningStateMain = value;
    }
    set onOffModeMain(value) {
        this._onOffModeMain = value;
    }
    set operationModeMain(value) {
        this._operationModeMain = value;
    }
    set roomTemperatureMain(value) {
        this._roomTemperatureMain = value;
    }
    set outdoorTemperatureMain(value) {
        this._outdoorTemperatureMain = value;
    }
    set leavingWaterTemperatureMain(value) {
        this._leavingWaterTemperatureMain = value;
    }
    set setpointModeMain(value) {
        this._setpointModeMain = value;
    }
    set temperatureControlMain(value) {
        this._temperatureControlMain = value;
    }
    set temperatureControlWaterMain(value) {
        this._temperatureControlWaterMain = value;
    }
    set errorCodeTank(value) {
        this._errorCodeTank = value;
    }
    set heatupModeTank(value) {
        this._heatupModeTank = value;
    }
    set isHolidayModeActiveTank(value) {
        this._isHolidayModeActiveTank = value;
    }
    set isInEmergencyStatTank(value) {
        this._isInEmergencyStatTank = value;
    }
    set isInErrorStateTank(value) {
        this._isInErrorStateTank = value;
    }
    set isInInstallerStateTank(value) {
        this._isInInstallerStateTank = value;
    }
    set isInWarningStateTank(value) {
        this._isInWarningStateTank = value;
    }
    set onOffModeTank(value) {
        this._onOffModeTank = value;
    }
    set operationModeTank(value) {
        this._operationModeTank = value;
    }
    set powerfulModeTank(value) {
        this._powerfulModeTank = value;
    }
    set tankTemperatureTank(value) {
        this._tankTemperatureTank = value;
    }
    set setpointModeTank(value) {
        this._setpointModeTank = value;
    }
    set domesticHotWaterTemperatureTank(value) {
        this._domesticHotWaterTemperatureTank = value;
    }
    set device(value) {
        this._device = value;
    }
    constructor(device) {
        (0, BaseModules_1.convertDaikinDevice)(device, this);
    }
}
exports.BRP069A78 = BRP069A78;
__decorate([
    (0, decorator_1.modulesDaikinDevice)({
        name: {
            managementPoint: "climateControl",
            dataPoint: "name",
        },
        modelInfo: {
            managementPoint: "gateway",
            dataPoint: "modelInfo",
        },
        serialNumber: {
            managementPoint: "gateway",
            dataPoint: "serialNumber",
        },
        firmwareVersion: {
            managementPoint: "gateway",
            dataPoint: "firmwareVersion",
        },
        isInErrorState: {
            managementPoint: "gateway",
            dataPoint: "isInErrorState",
        }
    }),
    __metadata("design:type", Object)
], BRP069A78.prototype, "_device", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "controlMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - controlMode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], BRP069A78.prototype, "_controlModeMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "errorCode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Error Code',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], BRP069A78.prototype, "_errorCodeMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "isHolidayModeActive"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone -Holiday Mode',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isHolidayModeActiveMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "isInEmergencyState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Emergency State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInEmergencyStateMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "isInErrorState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Error State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInErrorStateMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "isInInstallerState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Installer State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInInstallerStateMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "isInWarningState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Warning State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInWarningStateMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "onOffMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - State',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_onOffModeMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "operationMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Operation Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string,
        values: [
            "heating"
        ]
    }),
    __metadata("design:type", String)
], BRP069A78.prototype, "_operationModeMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "sensoryData",
        dataPointPath: "/roomTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Room Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "sensoryData",
            dataPointPath: "/roomTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_roomTemperatureMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "sensoryData",
        dataPointPath: "/outdoorTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Outdoor Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "sensoryData",
            dataPointPath: "/outdoorTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_outdoorTemperatureMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "sensoryData",
        dataPointPath: "/leavingWaterTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Leaving Water Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "sensoryData",
            dataPointPath: "/leavingWaterTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_leavingWaterTemperatureMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "setpointMode",
        converter: BaseModules_1.converterEnum.string
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Setpoint Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_setpointModeMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
        multiple: true,
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Temperature Control',
        settable: true,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
            multiple: true,
            multipleValue: {
                managementPoint: "climateControlMainZone",
                dataPoint: "operationMode"
            }
        }
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_temperatureControlMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControlMainZone",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
        multiple: true,
        converter: BaseModules_1.converterEnum.numeric,
        multipleValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Leaving Water Control',
        settable: true,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "climateControlMainZone",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
            multiple: true,
            multipleValue: {
                managementPoint: "climateControlMainZone",
                dataPoint: "operationMode"
            }
        }
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_temperatureControlWaterMain", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "errorCode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Error Code',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], BRP069A78.prototype, "_errorCodeTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "heatupMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Main Zone - Heatup Code',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], BRP069A78.prototype, "_heatupModeTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "isHolidayModeActive"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Holiday Mode',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isHolidayModeActiveTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "isInEmergencyState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Emergency State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInEmergencyStatTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "isInErrorState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Error State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInErrorStateTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "isInInstallerState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Installer State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInInstallerStateTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "isInWarningState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Warning State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_isInWarningStateTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "onOffMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - State',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_onOffModeTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "operationMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Operation Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string,
        values: [
            "heating"
        ]
    }),
    __metadata("design:type", String)
], BRP069A78.prototype, "_operationModeTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "powerfulMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Powerful Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_powerfulModeTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "sensoryData",
        dataPointPath: "/tankTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Tank Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minMaxValue: {
            managementPoint: "domesticHotWaterTank",
            dataPoint: "sensoryData",
            dataPointPath: "/tankTemperature"
        },
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_tankTemperatureTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "setpointMode",
        converter: BaseModules_1.converterEnum.string
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Setpoint Mode',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", Boolean)
], BRP069A78.prototype, "_setpointModeTank", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "domesticHotWaterTank",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/heating/setpoints/domesticHotWaterTemperature",
        converter: BaseModules_1.converterEnum.numeric
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Water Tank - Domestic Water Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "domesticHotWaterTank",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/heating/setpoints/domesticHotWaterTemperature",
        },
    }),
    __metadata("design:type", Number)
], BRP069A78.prototype, "_domesticHotWaterTemperatureTank", void 0);
