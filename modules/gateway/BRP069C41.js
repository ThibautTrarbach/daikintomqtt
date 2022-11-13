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
exports.BRP069C41 = void 0;
require("reflect-metadata");
const decorator_1 = require("../decorator");
const BaseModules_1 = require("./BaseModules");
class BRP069C41 {
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
    set powerfulMode(value) {
        this._powerfulMode = value;
    }
    set onOffMode(value) {
        this._onOffMode = value;
    }
    set operationMode(value) {
        this._operationMode = value;
    }
    set isHolidayModeActive(value) {
        this._isHolidayModeActive = value;
    }
    set isInErrorState(value) {
        this._isInErrorState = value;
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
        firmwareVersion: {
            managementPoint: "gateway",
            dataPoint: "firmwareVersion",
        },
        isInErrorState: {
            managementPoint: "climateControl",
            dataPoint: "isInErrorState",
        },
        errorCode: {
            managementPoint: "climateControl",
            dataPoint: "errorCode",
        }
    }),
    __metadata("design:type", Object)
], BRP069C41.prototype, "_device", void 0);
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
], BRP069C41.prototype, "_isHolidayModeActive", void 0);
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
], BRP069C41.prototype, "_isInErrorState", void 0);
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
], BRP069C41.prototype, "_isInModeConflict", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "operationMode"
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Operation Mode',
        settable: true,
        type: BaseModules_1.typeEnum.string,
        values: [
            "auto",
            "dry",
            "cooling",
            "heating",
            "fanOnly"
        ]
    }),
    __metadata("design:type", String)
], BRP069C41.prototype, "_operationMode", void 0);
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
], BRP069C41.prototype, "_onOffMode", void 0);
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
], BRP069C41.prototype, "_roomTemperature", void 0);
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
], BRP069C41.prototype, "_outdoorTemperature", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
        multiple: true,
        converter: BaseModules_1.converterEnum.numeric,
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
        minValue: 16,
        maxValue: 32
    }),
    __metadata("design:type", Number)
], BRP069C41.prototype, "_temperatureControl", void 0);
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
], BRP069C41.prototype, "_fanCurrentMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanSpeed/modes/fixed",
        multiple: true,
        converter: BaseModules_1.converterEnum.numeric,
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
], BRP069C41.prototype, "_fanFixed", void 0);
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
], BRP069C41.prototype, "_powerfulMode", void 0);
exports.BRP069C41 = BRP069C41;
