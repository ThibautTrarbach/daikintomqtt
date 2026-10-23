"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDynamicGateway = isDynamicGateway;
exports.applyDynamicEvents = applyDynamicEvents;
exports.applyGatewayEvents = applyGatewayEvents;
const BaseModules_1 = require("./BaseModules");
const ScheduleManager_1 = require("./ScheduleManager");
function isDynamicGateway(gateway) {
    return typeof gateway.isDynamicGateway === 'function'
        && gateway.isDynamicGateway();
}
function isScheduleKey(key) {
    return key.endsWith('_scheduleEnabled');
}
async function applySpecialCommands(device, gateway, events) {
    const remaining = {};
    for (const [rawKey, rawValue] of Object.entries(events)) {
        const key = rawKey.startsWith('_') ? rawKey : `_${rawKey}`;
        if (key === '_triggerFirmwareUpdate' && rawValue === true) {
            await device.updateFirmware();
            continue;
        }
        if (key === '_setPresetAway' && (rawValue === true || rawValue === 'away')) {
            await (0, ScheduleManager_1.setAwayPreset)(device);
            continue;
        }
        if (isScheduleKey(key)) {
            const embeddedId = key.replace(/^_/, '').replace(/_scheduleEnabled$/, '');
            await (0, ScheduleManager_1.enableSchedule)(device, embeddedId, rawValue === true || rawValue === 'on');
            if (isDynamicGateway(gateway)) {
                gateway[key] = rawValue;
            }
            continue;
        }
        remaining[rawKey] = rawValue;
    }
    return remaining;
}
async function applyDynamicEvents(device, gateway, events) {
    const afterSpecial = await applySpecialCommands(device, gateway, events);
    const standardEvents = {};
    for (const [rawKey, rawValue] of Object.entries(afterSpecial)) {
        const key = rawKey.startsWith('_') ? rawKey : `_${rawKey}`;
        const def = gateway.resolveCharacteristic(key);
        if (!def) {
            logger.warn(`[CharacteristicWriter.ts] => Unknown dynamic characteristic ${key}`);
            continue;
        }
        if (!def.settable) {
            logger.warn(`[CharacteristicWriter.ts] => Characteristic ${key} is read-only`);
            continue;
        }
        standardEvents[rawKey] = rawValue;
    }
    if (Object.keys(standardEvents).length > 0) {
        await (0, BaseModules_1.eventValue)(device, gateway, standardEvents);
    }
}
async function applyGatewayEvents(device, gateway, events) {
    const afterSpecial = await applySpecialCommands(device, gateway, events);
    if (isDynamicGateway(gateway)) {
        await applyDynamicEvents(device, gateway, afterSpecial);
        return;
    }
    if (Object.keys(afterSpecial).length > 0) {
        await (0, BaseModules_1.eventValue)(device, gateway, afterSpecial);
    }
}
//# sourceMappingURL=CharacteristicWriter.js.map