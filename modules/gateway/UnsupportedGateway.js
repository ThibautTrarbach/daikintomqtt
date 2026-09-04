"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedGateway = void 0;
require("reflect-metadata");
const decorator_1 = require("../decorator");
const metadataRegistry_1 = require("./metadataRegistry");
const catalog_1 = require("./characteristics/catalog");
function buildDeviceInfo(device) {
    const readField = (managementPoint, field) => {
        try {
            const data = device.getData(managementPoint, field, undefined);
            return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
        }
        catch {
            return '';
        }
    };
    const readGateway = (field) => readField('gateway', field);
    const wifiSsid = readGateway('wifiConnectionSSID') || readGateway('ssid');
    return {
        id: device.getId(),
        name: readGateway('name') || device.getId(),
        modelInfo: readGateway('modelInfo'),
        serialNumber: readGateway('serialNumber'),
        firmwareVersion: readGateway('firmwareVersion'),
        isInErrorState: readGateway('isInErrorState'),
        errorCode: '',
        timeZone: readGateway('timeZone'),
        wifiConnectionSSID: wifiSsid,
        wifiConnectionStrength: readGateway('wifiConnectionStrength'),
        ipAddress: readGateway('ipAddress'),
        macAddress: readGateway('macAddress'),
        indoorUnitSoftwareVersion: readField('indoorUnit', 'softwareVersion'),
        isCloudConnectionUp: device.isCloudConnectionUp() ? 'true' : 'false',
    };
}
class UnsupportedGateway {
    isUnsupported = true;
    _device;
    constructor(device) {
        this._device = buildDeviceInfo(device);
        (0, metadataRegistry_1.registerDeviceMetadata)(this, '_device', (0, catalog_1.standardGatewayDeviceInfo)('gateway'));
        Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_CMD, {}, this);
        Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, {}, this);
    }
    get device() {
        return this._device;
    }
    set device(value) {
        this._device = value;
    }
    isUnsupportedGateway() {
        return true;
    }
}
exports.UnsupportedGateway = UnsupportedGateway;
//# sourceMappingURL=UnsupportedGateway.js.map