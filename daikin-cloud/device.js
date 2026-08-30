"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaikinCloudDevice = void 0;
const events_1 = require("events");
const writeQueue_1 = require("../modules/writeQueue");
class DaikinCloudDevice extends events_1.EventEmitter {
    #client;
    desc;
    managementPoints;
    constructor(deviceDescription, client) {
        super();
        this.managementPoints = {};
        this.#client = client;
        this.setDescription(deviceDescription);
    }
    #traverseDatapointStructure(obj, data, pathPrefix) {
        if (obj === null)
            return;
        data = data || {};
        pathPrefix = pathPrefix || '';
        Object.keys(obj).forEach(sub => {
            if (!sub || !obj[sub])
                return;
            const subKeys = Object.keys(obj[sub]);
            if (sub === 'meta' || subKeys.includes('value') || subKeys.includes('settable') || subKeys.includes('unit')) {
                data[pathPrefix + '/' + sub] = obj[sub];
            }
            else if (sub === "electrical" && pathPrefix === '' && typeof obj[sub] === 'object' && obj[sub] !== null) {
                obj[sub].unit = 'kWh';
                data[pathPrefix + '/' + sub] = obj[sub];
            }
            else if (typeof obj[sub] === 'object' && obj[sub] !== null) {
                this.#traverseDatapointStructure(obj[sub], data, pathPrefix + '/' + sub);
            }
            else {
            }
        });
        return data;
    }
    setDescription(desc) {
        this.desc = desc;
        this.managementPoints = {};
        this.desc.managementPoints.forEach((mp) => {
            const dataPoints = {};
            Object.keys(mp).forEach((key) => {
                if (!mp[key] || typeof mp[key] !== 'object')
                    return;
                if (typeof mp[key].value !== 'object' || (Object.keys(mp[key].value).length === 1 && mp[key].value.hasOwnProperty('enabled'))) {
                    dataPoints[key] = mp[key];
                }
                else {
                    dataPoints[key] = this.#traverseDatapointStructure(mp[key].value);
                }
            });
            this.managementPoints[mp.embeddedId] = dataPoints;
        });
        this.emit('updated');
    }
    getId() {
        return this.desc.id;
    }
    getDescription() {
        return this.desc;
    }
    getLastUpdated() {
        return new Date(this.desc.lastUpdateReceived || this.desc.timestamp);
    }
    isCloudConnectionUp() {
        return !!this.desc.isCloudConnectionUp.value;
    }
    getData(managementPoint, dataPoint, dataPointPath) {
        if (!managementPoint) {
            return this.managementPoints;
        }
        if (!this.managementPoints[managementPoint]) {
            return null;
        }
        if (!dataPoint) {
            return this.managementPoints[managementPoint];
        }
        if (!this.managementPoints[managementPoint][dataPoint]) {
            return null;
        }
        if (!dataPointPath) {
            return this.managementPoints[managementPoint][dataPoint];
        }
        if (!this.managementPoints[managementPoint][dataPoint][dataPointPath]) {
            return null;
        }
        return this.managementPoints[managementPoint][dataPoint][dataPointPath];
    }
    async updateData() {
        const desc = await this.#client.requestResource('/v1/gateway-devices/' + this.getId());
        this.setDescription(desc);
        return true;
    }
    #validateData(def, value, ignoreWritableCheck = false) {
        if (!def.hasOwnProperty('value') && !def.hasOwnProperty('settable')) {
            throw new Error('Value can not be set without dataPointPath');
        }
        if (!ignoreWritableCheck && (!def.hasOwnProperty('settable') || !def.settable)) {
            throw new Error('Value is not writable');
        }
        if (def.hasOwnProperty('value') && typeof def.value !== typeof value) {
            throw new Error('Type of value (' + typeof value + ') is not the expected type ' + typeof def.value);
        }
        if (Array.isArray(def.values) && !def.values.includes(value)) {
            throw new Error('Value (' + value + ') is not in the list of allowed values ' + def.values.join(','));
        }
        if (typeof def.maxLength === 'number' && typeof value === 'string' && value.length > def.maxLength) {
            throw new Error('Length of value (' + value.length + ') is longer then the allowed ' + def.maxLength + ' characters');
        }
        if (typeof def.minValue === 'number' && typeof value === 'number' && value < def.minValue) {
            throw new Error('Value (' + value + ') must not be smaller then ' + def.minValue);
        }
        if (typeof def.maxValue === 'number' && typeof value === 'number' && value > def.maxValue) {
            throw new Error('Value (' + value + ') must not be bigger then ' + def.maxValue);
        }
        if (typeof def.stepValue === 'number' && typeof value === 'number') {
            const remainder = Math.abs((value - (typeof def.minValue === 'number' ? def.minValue : 0)) % def.stepValue);
            if (remainder > 0.0001 && Math.abs(remainder - def.stepValue) > 0.0001) {
                throw new Error('Value (' + value + ') must be a multiple of step ' + def.stepValue);
            }
        }
    }
    applyWebSocketUpdate(embeddedId, characteristicName, data) {
        const mp = this.managementPoints[embeddedId];
        if (!mp) {
            return false;
        }
        const dp = mp[characteristicName];
        if (!dp) {
            return false;
        }
        if (typeof dp === 'object' && dp !== null && 'value' in dp) {
            dp.value = data.value;
            this.emit('updated');
            return true;
        }
        return false;
    }
    async setData(managementPoint, dataPoint, dataPointPath, value, options = { ignoreWritableCheck: false, updateLocalData: false }) {
        if (typeof options === 'boolean') {
            console.warn('ignoreWritableCheck is deprecated and replaced with an options object. Please provide a SetDataOptions object for setData()');
            options = {
                ignoreWritableCheck: options,
                updateLocalData: false
            };
        }
        if (value === undefined) {
            value = dataPointPath;
            dataPointPath = undefined;
        }
        if (!this.managementPoints[managementPoint] || !this.managementPoints[managementPoint][dataPoint] || (dataPointPath && !this.managementPoints[managementPoint][dataPoint][dataPointPath])) {
            throw new Error('Please provide a valid datapoint definition that exists in the data structure');
        }
        const dataPointDef = dataPointPath ? this.managementPoints[managementPoint][dataPoint][dataPointPath] : this.managementPoints[managementPoint][dataPoint];
        this.#validateData(dataPointDef, value, options.ignoreWritableCheck);
        const setPath = '/v1/gateway-devices/' + this.getId() + '/management-points/' + managementPoint + '/characteristics/' + dataPoint;
        const setBody = {
            value,
            path: dataPointPath
        };
        const setOptions = {
            method: 'PATCH',
            body: JSON.stringify(setBody),
            headers: {
                'Content-Type': 'application/json'
            }
        };
        await (0, writeQueue_1.enqueueWriteForDevice)(this.getId(), () => this.#client.requestResource(setPath, setOptions));
        if (options.updateLocalData) {
            dataPointDef.value = value;
        }
        return true;
    }
    isFirmwareUpdateAvailable() {
        const gateway = this.managementPoints['gateway'];
        if (!gateway)
            return false;
        return !!(gateway.firmwareUpdate && gateway.firmwareUpdate.value);
    }
    getFirmwareUpdateDetails() {
        const gateway = this.managementPoints['gateway'];
        if (!gateway || !gateway.firmwareUpdate)
            return null;
        return gateway.firmwareUpdate.value;
    }
    getFirmwareUpdateStatus() {
        const gateway = this.managementPoints['gateway'];
        if (!gateway || !gateway.firmwareUpdateStatus)
            return null;
        return gateway.firmwareUpdateStatus.value;
    }
    async updateFirmware() {
        const gateway = this.managementPoints['gateway'];
        if (!gateway) {
            throw new Error('Gateway management point not found');
        }
        const firmwareUpdate = gateway.firmwareUpdate;
        if (!firmwareUpdate || !firmwareUpdate.value || !firmwareUpdate.value.id) {
            throw new Error('No firmware update available');
        }
        const gatewayDeviceId = this.desc.id;
        const embeddedId = 'gateway';
        const firmwareId = firmwareUpdate.value.id;
        await this.#client.requestResource(`/v1/gateway-devices/${gatewayDeviceId}/management-points/${embeddedId}/firmware/${firmwareId}`, {
            method: 'PUT'
        });
    }
}
exports.DaikinCloudDevice = DaikinCloudDevice;
//# sourceMappingURL=device.js.map