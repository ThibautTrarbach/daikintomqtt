"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaikinCloudController = exports.RateLimitedError = exports.AUTH_MODE_MOBILE_APP = exports.AUTH_MODE_DEVELOPER_PORTAL = exports.OnectaMockDevice = exports.TokenSet = exports.DaikinCloudDevice = void 0;
const events_1 = require("events");
const device_1 = require("./device");
const oidc_client_1 = require("./onecta/oidc-client");
const mobile_oauth_1 = require("./onecta/mobile-oauth");
const websocket_1 = require("./onecta/websocket");
const oidc_utils_1 = require("./onecta/oidc-utils");
Object.defineProperty(exports, "OnectaMockDevice", { enumerable: true, get: function () { return oidc_utils_1.OnectaMockDevice; } });
const openid_client_1 = require("openid-client");
Object.defineProperty(exports, "TokenSet", { enumerable: true, get: function () { return openid_client_1.TokenSet; } });
const constants_1 = require("./constants");
Object.defineProperty(exports, "AUTH_MODE_DEVELOPER_PORTAL", { enumerable: true, get: function () { return constants_1.AUTH_MODE_DEVELOPER_PORTAL; } });
Object.defineProperty(exports, "AUTH_MODE_MOBILE_APP", { enumerable: true, get: function () { return constants_1.AUTH_MODE_MOBILE_APP; } });
const http_transport_1 = require("./http-transport");
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
    #authMode;
    #mobileOAuth = null;
    #websocket = null;
    constructor(config) {
        super();
        this.#authMode = config.authMode ?? constants_1.AUTH_MODE_DEVELOPER_PORTAL;
        (0, http_transport_1.configureHttpTransport)(config.httpTransport);
        if (this.#authMode === constants_1.AUTH_MODE_MOBILE_APP) {
            if (!config.mobileEmail || !config.mobilePassword || !config.mobileTokenFilePath) {
                throw new Error('Mobile App auth requires mobileEmail, mobilePassword and mobileTokenFilePath');
            }
            this.#mobileOAuth = new mobile_oauth_1.DaikinMobileOAuth({
                email: config.mobileEmail,
                password: config.mobilePassword,
                tokenFilePath: config.mobileTokenFilePath,
            }, (tokenSet) => this.emit('token_update', tokenSet), (error) => this.emit('error', error), (message) => this.emit('log', message));
        }
        this.#client = new oidc_client_1.OnectaClient(config, this, this.#mobileOAuth);
    }
    getAuthMode() {
        return this.#authMode;
    }
    isAuthenticated() {
        if (this.#authMode === constants_1.AUTH_MODE_MOBILE_APP) {
            return this.#mobileOAuth?.isAuthenticated() ?? false;
        }
        return true;
    }
    async authenticateMobile() {
        if (!this.#mobileOAuth) {
            throw new Error('Mobile OAuth is not configured');
        }
        await this.#mobileOAuth.authenticate();
    }
    isWebSocketConnected() {
        return this.#websocket?.isConnected() ?? false;
    }
    async enableWebSocket() {
        if (this.#authMode !== constants_1.AUTH_MODE_MOBILE_APP || !this.#mobileOAuth) {
            return;
        }
        if (this.#websocket) {
            await this.#websocket.connect();
            return;
        }
        this.#websocket = new websocket_1.DaikinWebSocket(this.#mobileOAuth, (error) => this.emit('error', error));
        this.#websocket.on('connected', () => this.emit('websocket_connected'));
        this.#websocket.on('disconnected', (info) => this.emit('websocket_disconnected', info));
        this.#websocket.on('device_update', (update) => this.emit('websocket_device_update', update));
        await this.#websocket.connect();
    }
    disableWebSocket() {
        this.#websocket?.disconnect();
    }
    async getApiInfo() {
        return this.#client.requestResource('/v1/info');
    }
    async requestResource(path, opts) {
        return this.#client.requestResource(path, opts);
    }
    async getCloudDeviceDetails() {
        return await this.#client.requestResource('/v1/gateway-devices');
    }
    async getCloudDevices() {
        await this.updateAllDeviceData();
        return Array.from(this.#devices.values());
    }
    getDeviceById(deviceId) {
        return this.#devices.get(deviceId);
    }
    async updateAllDeviceData() {
        const data = await this.getCloudDeviceDetails();
        if (!Array.isArray(data)) {
            throw new Error('Invalid data received from cloud');
        }
        const activeIds = new Set();
        data.forEach(d => {
            activeIds.add(d.id);
            const device = this.#devices.get(d.id);
            if (device) {
                device.setDescription(d);
            }
            else {
                const newDevice = new device_1.DaikinCloudDevice(d, this.#client);
                this.#devices.set(newDevice.getId(), newDevice);
            }
        });
        for (const deviceId of this.#devices.keys()) {
            if (!activeIds.has(deviceId)) {
                this.#devices.delete(deviceId);
            }
        }
    }
}
exports.DaikinCloudController = DaikinCloudController;
//# sourceMappingURL=index.js.map