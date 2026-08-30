"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaikinCloudController = exports.RateLimitedError = exports.OnectaMockDevice = exports.TokenSet = exports.DaikinCloudDevice = void 0;
const events_1 = require("events");
const device_1 = require("./device");
const oidc_client_1 = require("./onecta/oidc-client");
const oidc_utils_1 = require("./onecta/oidc-utils");
Object.defineProperty(exports, "OnectaMockDevice", { enumerable: true, get: function () { return oidc_utils_1.OnectaMockDevice; } });
const openid_client_1 = require("openid-client");
Object.defineProperty(exports, "TokenSet", { enumerable: true, get: function () { return openid_client_1.TokenSet; } });
var device_2 = require("./device");
Object.defineProperty(exports, "DaikinCloudDevice", { enumerable: true, get: function () { return device_2.DaikinCloudDevice; } });
class RateLimitedError extends Error {
    retryAfter;
    constructor(message, retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitedError = RateLimitedError;
class DaikinCloudController extends events_1.EventEmitter {
    #client;
    #devices = new Map();
    constructor(config) {
        super();
        this.#client = new oidc_client_1.OnectaClient(config, this);
    }
    async getApiInfo() {
        return this.#client.requestResource('/v1/info');
    }
    async getCloudDeviceDetails() {
        return await this.#client.requestResource('/v1/gateway-devices');
    }
    async getCloudDevices() {
        await this.updateAllDeviceData();
        return Array.from(this.#devices.values());
    }
    async updateAllDeviceData() {
        const data = await this.getCloudDeviceDetails();
        if (!Array.isArray(data)) {
            throw new Error('Invalid data received from cloud');
        }
        data.forEach(d => {
            const device = this.#devices.get(d.id);
            if (device) {
                device.setDescription(d);
            }
            else {
                const newDevice = new device_1.DaikinCloudDevice(d, this.#client);
                this.#devices.set(newDevice.getId(), newDevice);
            }
        });
    }
}
exports.DaikinCloudController = DaikinCloudController;
//# sourceMappingURL=index.js.map