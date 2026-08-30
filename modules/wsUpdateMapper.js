"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebSocketDeviceUpdate = handleWebSocketDeviceUpdate;
exports.wasConfirmedByWebSocket = wasConfirmedByWebSocket;
exports.recordWebSocketConfirmation = recordWebSocketConfirmation;
const mqtt_1 = require("./mqtt");
const constants_1 = require("./constants");
async function recordWebSocketConfirmation(deviceId) {
    const key = `ws/confirmed/${deviceId}`;
    await cache.set(key, Date.now(), constants_1.WS_CONFIRMATION_TTL_MS);
}
async function wasConfirmedByWebSocket(deviceId, actionTs) {
    if (!deviceId) {
        return false;
    }
    const confirmedAt = await cache.get(`ws/confirmed/${deviceId}`);
    if (typeof confirmedAt !== 'number') {
        return false;
    }
    return confirmedAt >= actionTs * 1000;
}
async function handleWebSocketDeviceUpdate(update) {
    if (!global.daikinClient) {
        return;
    }
    const device = global.daikinClient.getDeviceById(update.deviceId);
    if (!device) {
        logger.debug(`[wsUpdateMapper.ts] => No cached device for WebSocket update: ${update.deviceId}`);
        return;
    }
    const applied = device.applyWebSocketUpdate(update.embeddedId, update.characteristicName, update.data);
    if (!applied) {
        logger.debug(`[wsUpdateMapper.ts] => Could not apply WS update ${update.characteristicName} on ${update.deviceId}`);
        return;
    }
    await recordWebSocketConfirmation(update.deviceId);
    const { getModels } = await Promise.resolve().then(() => __importStar(require('./daikin')));
    const gateway = getModels(device);
    if (!gateway) {
        return;
    }
    const gatewayJson = JSON.stringify(gateway);
    await (0, mqtt_1.publishToMQTT)(update.deviceId, gatewayJson);
    logger.debug(`[wsUpdateMapper.ts] => Published WS update for ${update.deviceId}.${update.characteristicName}`);
    await cache.set(`device_${update.deviceId}`, device, constants_1.DEVICE_CACHE_TTL_MS);
    const cachedDevices = await cache.get('devices');
    if (cachedDevices) {
        const idx = cachedDevices.findIndex((d) => d.getId() === update.deviceId);
        if (idx >= 0) {
            cachedDevices[idx] = device;
            await cache.set('devices', cachedDevices, constants_1.DEVICE_CACHE_TTL_MS);
        }
    }
}
//# sourceMappingURL=wsUpdateMapper.js.map