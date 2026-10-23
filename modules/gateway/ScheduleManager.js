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
exports.enableSchedule = enableSchedule;
exports.setAwayPreset = setAwayPreset;
exports.requestPut = requestPut;
async function requestPut(device, path, body) {
    if (!global.daikinClient) {
        throw new Error('Daikin client not initialized');
    }
    const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("../rateLimiter")));
    await rateLimiter.executeWithRetry(async () => {
        await global.daikinClient.requestResource(path, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });
    }, `schedule-${device.getId()}-${path}`, { maxRetries: 2, baseDelay: 1000, maxDelay: 30000 });
}
function findClimateEmbeddedId(device) {
    for (const embeddedId of Object.keys(device.managementPoints)) {
        if (embeddedId.startsWith('climateControl')) {
            return embeddedId;
        }
    }
    return 'climateControl';
}
async function enableSchedule(device, embeddedId, enabled) {
    const schedule = device.getData(embeddedId, 'schedule', undefined);
    const scheduleId = schedule?.value?.scheduleId ?? schedule?.value?.currentScheduleId ?? '0';
    await requestPut(device, `/v1/gateway-devices/${device.getId()}/management-points/${embeddedId}/schedule/any/current`, { scheduleId: String(scheduleId), enabled });
}
async function setAwayPreset(device) {
    const embeddedId = findClimateEmbeddedId(device);
    try {
        await device.setData(embeddedId, 'onOffMode', undefined, 'off', { updateLocalData: true });
    }
    catch {
    }
    try {
        await enableSchedule(device, embeddedId, false);
    }
    catch (error) {
        logger.debug(`[ScheduleManager.ts] => Could not disable schedule for away preset: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=ScheduleManager.js.map