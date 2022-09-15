"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modulesDaikinDevice = exports.modulesDaikinAcces = exports.modulesDataDescription = exports.PROPERTY_METADATA_DAIKIN_DEVICE = exports.PROPERTY_METADATA_DAIKIN = exports.PROPERTY_METADATA_CMD = void 0;
exports.PROPERTY_METADATA_CMD = Symbol("PROPERTY_METADATA_CMD");
exports.PROPERTY_METADATA_DAIKIN = Symbol("PROPERTY_METADATA_DAIKIN");
exports.PROPERTY_METADATA_DAIKIN_DEVICE = Symbol("PROPERTY_METADATA_DAIKIN_DEVICE");
function modulesDataDescription(metadata) {
    return function (target, propertyKey) {
        const allMetadata = Reflect.getMetadata(exports.PROPERTY_METADATA_CMD, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key) => {
            allMetadata[propertyKey][key] = metadata[String(key)];
        });
        Reflect.defineMetadata(exports.PROPERTY_METADATA_CMD, allMetadata, target);
    };
}
exports.modulesDataDescription = modulesDataDescription;
function modulesDaikinAcces(metadata) {
    return function (target, propertyKey) {
        const allMetadata = Reflect.getMetadata(exports.PROPERTY_METADATA_DAIKIN, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key) => {
            allMetadata[propertyKey][key] = metadata[String(key)];
        });
        Reflect.defineMetadata(exports.PROPERTY_METADATA_DAIKIN, allMetadata, target);
    };
}
exports.modulesDaikinAcces = modulesDaikinAcces;
function modulesDaikinDevice(metadata) {
    return function (target, propertyKey) {
        const allMetadata = Reflect.getMetadata(exports.PROPERTY_METADATA_DAIKIN_DEVICE, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key) => {
            allMetadata[propertyKey][key] = metadata[String(key)];
        });
        Reflect.defineMetadata(exports.PROPERTY_METADATA_DAIKIN_DEVICE, allMetadata, target);
    };
}
exports.modulesDaikinDevice = modulesDaikinDevice;
