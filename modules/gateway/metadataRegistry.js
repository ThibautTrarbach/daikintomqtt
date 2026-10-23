"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCharacteristic = registerCharacteristic;
exports.registerCharacteristics = registerCharacteristics;
exports.registerDeviceMetadata = registerDeviceMetadata;
exports.installGatewayProperties = installGatewayProperties;
require("reflect-metadata");
const decorator_1 = require("../decorator");
function appendMetadata(symbol, target, propertyKey, metadata) {
    const allMetadata = Reflect.getMetadata(symbol, target) || {};
    allMetadata[propertyKey] = { ...(allMetadata[propertyKey] || {}), ...metadata };
    Reflect.defineMetadata(symbol, allMetadata, target);
}
function registerCharacteristic(target, def) {
    appendMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, target, def.propertyKey, def.daikin);
    appendMetadata(decorator_1.PROPERTY_METADATA_CMD, target, def.propertyKey, def.description);
}
function registerCharacteristics(target, defs) {
    for (const def of defs) {
        registerCharacteristic(target, def);
    }
}
function registerDeviceMetadata(target, deviceKey, metadata) {
    appendMetadata(decorator_1.PROPERTY_METADATA_DAIKIN_DEVICE, target, deviceKey, metadata);
}
function installPropertyAccessors(target, propertyKey, _settable) {
    const setterName = propertyKey.replace(/^_/, '');
    Object.defineProperty(target, setterName, {
        set(value) {
            target[propertyKey] = value;
        },
        enumerable: false,
        configurable: true,
    });
}
function installGatewayProperties(target, defs) {
    for (const def of defs) {
        installPropertyAccessors(target, def.propertyKey, def.description.settable);
    }
}
//# sourceMappingURL=metadataRegistry.js.map