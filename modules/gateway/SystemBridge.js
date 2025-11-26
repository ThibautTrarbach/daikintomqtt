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
exports.SystemBridge = void 0;
require("reflect-metadata");
const decorator_1 = require("../decorator");
const BaseModules_1 = require("./BaseModules");
class SystemBridge {
    _device = {
        id: "Daikin2MQTT",
        name: "Daikin2MQTT Bridge",
        modelInfo: "Daikin2MQTT",
        serialNumber: "Daikin2MQTT",
        firmwareVersion: "1.3.0",
        isInErrorState: "false",
        errorCode: ""
    };
    get device() {
        return this._device;
    }
    set device(value) {
        this._device = value;
    }
    _rateLimitMinute;
    _rateRemainingMinute;
    _rateLimitDay;
    _rateRemainingDay;
    _modulesCount;
    _modulesList;
    _unsupportedModulesCount;
    _unsupportedModulesList;
    _refreshAllDevices;
    _authorizationUrl;
    _authorizationRequest;
    _authorizationTimeout;
    constructor() {
        this._rateLimitMinute = 0;
        this._rateRemainingMinute = 0;
        this._rateLimitDay = 0;
        this._rateRemainingDay = 0;
        this._modulesCount = 0;
        this._modulesList = "[]";
        this._unsupportedModulesCount = 0;
        this._unsupportedModulesList = "[]";
        this._refreshAllDevices = false;
        this._authorizationUrl = "";
        this._authorizationRequest = false;
        this._authorizationTimeout = false;
    }
    get rateLimitMinute() {
        return this._rateLimitMinute;
    }
    set rateLimitMinute(value) {
        this._rateLimitMinute = value;
    }
    get rateRemainingMinute() {
        return this._rateRemainingMinute;
    }
    set rateRemainingMinute(value) {
        this._rateRemainingMinute = value;
    }
    get rateLimitDay() {
        return this._rateLimitDay;
    }
    set rateLimitDay(value) {
        this._rateLimitDay = value;
    }
    get rateRemainingDay() {
        return this._rateRemainingDay;
    }
    set rateRemainingDay(value) {
        this._rateRemainingDay = value;
    }
    get modulesCount() {
        return this._modulesCount;
    }
    set modulesCount(value) {
        this._modulesCount = value;
    }
    get modulesList() {
        return this._modulesList;
    }
    set modulesList(value) {
        this._modulesList = value;
    }
    get unsupportedModulesCount() {
        return this._unsupportedModulesCount;
    }
    set unsupportedModulesCount(value) {
        this._unsupportedModulesCount = value;
    }
    get unsupportedModulesList() {
        return this._unsupportedModulesList;
    }
    set unsupportedModulesList(value) {
        this._unsupportedModulesList = value;
    }
    get refreshAllDevices() {
        return this._refreshAllDevices;
    }
    set refreshAllDevices(value) {
        this._refreshAllDevices = value;
    }
    get authorizationUrl() {
        return this._authorizationUrl;
    }
    set authorizationUrl(value) {
        this._authorizationUrl = value;
    }
    get authorizationRequest() {
        return this._authorizationRequest;
    }
    set authorizationRequest(value) {
        this._authorizationRequest = value;
    }
    get authorizationTimeout() {
        return this._authorizationTimeout;
    }
    set authorizationTimeout(value) {
        this._authorizationTimeout = value;
    }
}
exports.SystemBridge = SystemBridge;
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Rate Limit Minute',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: 'req/min'
    }),
    __metadata("design:type", Number)
], SystemBridge.prototype, "_rateLimitMinute", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Rate Remaining Minute',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: 'req/min'
    }),
    __metadata("design:type", Number)
], SystemBridge.prototype, "_rateRemainingMinute", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Rate Limit Day',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: 'req/day'
    }),
    __metadata("design:type", Number)
], SystemBridge.prototype, "_rateLimitDay", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Rate Remaining Day',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: 'req/day'
    }),
    __metadata("design:type", Number)
], SystemBridge.prototype, "_rateRemainingDay", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Modules Count',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: 'modules'
    }),
    __metadata("design:type", Number)
], SystemBridge.prototype, "_modulesCount", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Modules List',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], SystemBridge.prototype, "_modulesList", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Unsupported Modules Count',
        settable: false,
        type: BaseModules_1.typeEnum.numeric,
        unite: 'modules'
    }),
    __metadata("design:type", Number)
], SystemBridge.prototype, "_unsupportedModulesCount", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Unsupported Modules List',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], SystemBridge.prototype, "_unsupportedModulesList", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Refresh All Devices',
        settable: true,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], SystemBridge.prototype, "_refreshAllDevices", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Authorization URL',
        settable: false,
        type: BaseModules_1.typeEnum.string
    }),
    __metadata("design:type", String)
], SystemBridge.prototype, "_authorizationUrl", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Authorization Request',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], SystemBridge.prototype, "_authorizationRequest", void 0);
__decorate([
    (0, decorator_1.modulesDataDescription)({
        name: 'Authorization Timeout',
        settable: false,
        type: BaseModules_1.typeEnum.binary
    }),
    __metadata("design:type", Boolean)
], SystemBridge.prototype, "_authorizationTimeout", void 0);
//# sourceMappingURL=SystemBridge.js.map