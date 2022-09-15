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
exports.BRP069C4x = void 0;
require("reflect-metadata");
const decorator_1 = require("../decorator");
const BaseModules_1 = require("./BaseModules");
class BRP069C4x {
    constructor(device) {
        this._device = {
            id: "",
            name: "",
            modelInfo: "",
            serialNumber: "",
            firmwareVersion: "",
            isInErrorState: "",
            errorCode: ""
        };
        (0, BaseModules_1.convertDaikinDevice)(device, this);
    }
    set outdoorSilentMode(value) {
        this._outdoorSilentMode = value;
    }
    set streamerMode(value) {
        this._streamerMode = value;
    }
    set powerfulMode(value) {
        this._powerfulMode = value;
    }
    set econoMode(value) {
        this._econoMode = value;
    }
    set onOffMode(value) {
        this._onOffMode = value;
    }
    set operationMode(value) {
        this._operationMode = value;
    }
    set isCoolHeatMaster(value) {
        this._isCoolHeatMaster = value;
    }
    set isHolidayModeActive(value) {
        this._isHolidayModeActive = value;
    }
    set isInErrorState(value) {
        this._isInErrorState = value;
    }
    set isInWarningState(value) {
        this._isInWarningState = value;
    }
    set isInCautionState(value) {
        this._isInCautionState = value;
    }
    set roomTemperature(value) {
        this._roomTemperature = value;
    }
    set outdoorTemperature(value) {
        this._outdoorTemperature = value;
    }
    set temperatureControl(value) {
        this._temperatureControl = value;
    }
    set fanVertical(value) {
        this._fanVertical = value;
    }
    set fanHorizontal(value) {
        this._fanHorizontal = value;
    }
    set fanFixed(value) {
        this._fanFixed = value;
    }
    set fanCurrentMode(value) {
        this.fanCurrentMode = value;
    }
    set device(value) {
        this._device = value;
    }
}
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
        },
        errorCode: {
            managementPoint: "climateControl",
            dataPoint: "errorCode",
        }
    }),
    __metadata("design:type", Object)
], BRP069C4x.prototype, "_device", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isHolidayModeActive"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Holiday Mode',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_isHolidayModeActive", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isInErrorState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Error State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_isInErrorState", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isInWarningState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Warning State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_isInWarningState", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isInModeConflict"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Conflict State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_isInModeConflict", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isInCautionState"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Caution State',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_isInCautionState", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isCoolHeatMaster"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Master',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_isCoolHeatMaster", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "operationMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Operation Mode',
        settable: false,
        generic_type: "ENERGY_STATE",
        minValue: 10,
        maxValue: 20,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", String)
], BRP069C4x.prototype, "_operationMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "onOffMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'State',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_onOffMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "econoMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Eco Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_econoMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "powerfulMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Powerful Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_powerfulMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "streamerMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Streamer Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_streamerMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "sensoryData",
        dataPointPath: "/roomTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Room Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 10,
        maxValue: 30,
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069C4x.prototype, "_roomTemperature", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "sensoryData",
        dataPointPath: "/outdoorTemperature"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Outdoor Temperature',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: -10,
        maxValue: 40,
        unite: '°C'
    }),
    __metadata("design:type", Number)
], BRP069C4x.prototype, "_outdoorTemperature", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "outdoorSilentMode",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Outdoor Silent',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069C4x.prototype, "_outdoorSilentMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Temperature Control',
        settable: true,
        type: BaseModules_1.typeEnum.numeric,
        unite: '°C',
        minValue: 18,
        maxValue: 33
    }),
    __metadata("design:type", Number)
], BRP069C4x.prototype, "_temperatureControl", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanSpeed/currentMode",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Fan Current Mode',
        settable: true,
        type: BaseModules_1.typeEnum.string,
        values: [
            "auto",
            "quiet",
            "fixed",
        ]
    }),
    __metadata("design:type", String)
], BRP069C4x.prototype, "_fanCurrentMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanSpeed/modes/fixed",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Fan Fixed',
        settable: true,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 1,
        maxValue: 5
    }),
    __metadata("design:type", String)
], BRP069C4x.prototype, "_fanFixed", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanDirection/horizontal/currentMode",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Fan Horizontal',
        settable: true,
        type: BaseModules_1.typeEnum.string,
        values: [
            "stop",
            "swing"
        ]
    }),
    __metadata("design:type", String)
], BRP069C4x.prototype, "_fanHorizontal", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanDirection/vertical/currentMode",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Fan Vertical',
        settable: true,
        type: BaseModules_1.typeEnum.string,
        values: [
            "stop",
            "swing",
            "windNice"
        ]
    }),
    __metadata("design:type", String)
], BRP069C4x.prototype, "_fanVertical", void 0);
exports.BRP069C4x = BRP069C4x;
