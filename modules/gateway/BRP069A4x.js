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
exports.BRP069A4x = void 0;
require("reflect-metadata");
const decorator_1 = require("../decorator");
const BaseModules_1 = require("./BaseModules");
class BRP069A4x {
    _device = {
        id: "",
        name: "",
        modelInfo: "",
        serialNumber: "",
        firmwareVersion: "",
        isInErrorState: "",
        errorCode: ""
    };
    _isHolidayModeActive;
    _isInErrorState;
    _isInModeConflict;
    _operationMode;
    _onOffMode;
    _powerfulMode;
    _roomTemperature;
    _temperatureControl;
    _fanCurrentMode;
    _fanFixed;
    _fanVertical;
    _heatingConsumptionD;
    _heatingConsumptionW;
    _heatingConsumptionM;
    _coolingConsumptionD;
    _coolingConsumptionW;
    _coolingConsumptionM;
    set isHolidayModeActive(value) {
        this._isHolidayModeActive = value;
    }
    set isInErrorState(value) {
        this._isInErrorState = value;
    }
    set isInModeConflict(value) {
        this._isInModeConflict = value;
    }
    set operationMode(value) {
        this._operationMode = value;
    }
    set onOffMode(value) {
        this._onOffMode = value;
    }
    set powerfulMode(value) {
        this._powerfulMode = value;
    }
    set roomTemperature(value) {
        this._roomTemperature = value;
    }
    set temperatureControl(value) {
        this._temperatureControl = value;
    }
    set fanCurrentMode(value) {
        this._fanCurrentMode = value;
    }
    set fanFixed(value) {
        this._fanFixed = value;
    }
    set fanVertical(value) {
        this._fanVertical = value;
    }
    set device(value) {
        this._device = value;
    }
    constructor(device) {
        (0, BaseModules_1.convertDaikinDevice)(device, this);
    }
}
exports.BRP069A4x = BRP069A4x;
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
], BRP069A4x.prototype, "_device", void 0);
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
], BRP069A4x.prototype, "_isHolidayModeActive", void 0);
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
], BRP069A4x.prototype, "_isInErrorState", void 0);
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
], BRP069A4x.prototype, "_isInModeConflict", void 0);
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
            "fanOnly",
            "heating",
            "cooling",
            "auto",
            "dry"
        ]
    }),
    __metadata("design:type", String)
], BRP069A4x.prototype, "_operationMode", void 0);
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
], BRP069A4x.prototype, "_onOffMode", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "isPowerfulModeActive",
        converter: BaseModules_1.converterEnum.binary
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Powerful Mode',
        settable: false,
        generic_type: "ENERGY_STATE",
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], BRP069A4x.prototype, "_powerfulMode", void 0);
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
], BRP069A4x.prototype, "_roomTemperature", void 0);
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
        minMaxValue: {
            managementPoint: "climateControl",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
            multiple: true,
            multipleValue: {
                managementPoint: "climateControl",
                dataPoint: "operationMode"
            }
        },
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_temperatureControl", void 0);
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
], BRP069A4x.prototype, "_fanCurrentMode", void 0);
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
        minMaxValue: {
            managementPoint: "climateControl",
            dataPoint: "fanControl",
            dataPointPath: "/operationModes/#value#/fanSpeed/modes/fixed",
            multiple: true,
            multipleValue: {
                managementPoint: "climateControl",
                dataPoint: "operationMode"
            }
        },
    }),
    __metadata("design:type", String)
], BRP069A4x.prototype, "_fanFixed", void 0);
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
], BRP069A4x.prototype, "_fanVertical", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: BaseModules_1.consumptionEnum.heatingDay,
        converter: BaseModules_1.converterEnum.consumption
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Heating Consumption Day',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_heatingConsumptionD", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: BaseModules_1.consumptionEnum.heatingWeek,
        converter: BaseModules_1.converterEnum.consumption
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Heating Consumption Week',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_heatingConsumptionW", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: BaseModules_1.consumptionEnum.heatingMonth,
        converter: BaseModules_1.converterEnum.consumption
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Heating Consumption Month',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_heatingConsumptionM", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: BaseModules_1.consumptionEnum.coolingDay,
        converter: BaseModules_1.converterEnum.consumption
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Cooling Consumption Day',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_coolingConsumptionD", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: BaseModules_1.consumptionEnum.coolingWeek,
        converter: BaseModules_1.converterEnum.consumption
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Cooling Consumption Week',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_coolingConsumptionW", void 0);
__decorate([
    (0, decorator_1.modulesDaikinAcces)({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: BaseModules_1.consumptionEnum.coolingMonth,
        converter: BaseModules_1.converterEnum.consumption
    }),
    (0, decorator_1.modulesDataDescription)({
        name: 'Cooling Consumption Month',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    }),
    __metadata("design:type", Number)
], BRP069A4x.prototype, "_coolingConsumptionM", void 0);
