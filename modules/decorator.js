"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPERTY_METADATA_DAIKIN_DEVICE = exports.PROPERTY_METADATA_DAIKIN = exports.PROPERTY_METADATA_CMD = void 0;
exports.modulesDataDescription = modulesDataDescription;
exports.modulesDaikinAcces = modulesDaikinAcces;
exports.modulesDaikinDevice = modulesDaikinDevice;
exports.PROPERTY_METADATA_CMD = Symbol("PROPERTY_METADATA_CMD");
exports.PROPERTY_METADATA_DAIKIN = Symbol("PROPERTY_METADATA_DAIKIN");
exports.PROPERTY_METADATA_DAIKIN_DEVICE = Symbol("PROPERTY_METADATA_DAIKIN_DEVICE");
function defineMetadata(symbol, metadata) {
    return function (target, propertyKey) {
        const allMetadata = Reflect.getMetadata(symbol, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key) => {
            allMetadata[propertyKey][key] = metadata[String(key)];
        });
        Reflect.defineMetadata(symbol, allMetadata, target);
    };
}
function modulesDataDescription(metadata) {
    return defineMetadata(exports.PROPERTY_METADATA_CMD, metadata);
}
function modulesDaikinAcces(metadata) {
    return defineMetadata(exports.PROPERTY_METADATA_DAIKIN, metadata);
}
function modulesDaikinDevice(metadata) {
    return defineMetadata(exports.PROPERTY_METADATA_DAIKIN_DEVICE, metadata);
}
//# sourceMappingURL=decorator.js.map