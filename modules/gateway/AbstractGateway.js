"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractGateway = void 0;
const BaseModules_1 = require("./BaseModules");
const metadataRegistry_1 = require("./metadataRegistry");
class AbstractGateway {
    _device;
    constructor(device, characteristics, deviceMetadata, deviceKey = '_device') {
        (0, metadataRegistry_1.registerCharacteristics)(this, characteristics);
        (0, metadataRegistry_1.registerDeviceMetadata)(this, deviceKey, deviceMetadata);
        (0, metadataRegistry_1.installGatewayProperties)(this, characteristics);
        this._device = {};
        (0, BaseModules_1.convertDaikinDevice)(device, this);
    }
    set device(value) {
        this._device = value;
    }
    get device() {
        return this._device;
    }
}
exports.AbstractGateway = AbstractGateway;
//# sourceMappingURL=AbstractGateway.js.map