"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventValue = exports.convertDaikinDevice = exports.converterEnum = exports.typeEnum = void 0;
const decorator_1 = require("../decorator");
const typeEnum = Object.freeze({
    numeric: 0,
    string: 1,
    binary: 2,
});
exports.typeEnum = typeEnum;
const converterEnum = Object.freeze({
    numeric: 0,
    string: 1,
    binary: 2,
});
exports.converterEnum = converterEnum;
function convertDaikinDevice(device, gatewayClass) {
    let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gatewayClass);
    createDeviceInfo(device, gatewayClass);
    Object.entries(data).forEach(entry => {
        const [key, value] = entry;
        let daikinValue;
        try {
            if (value.multiple == undefined && value.multiple !== true) {
                if (value.dataPointPath !== undefined)
                    daikinValue = device.getData(value.managementPoint, value.dataPoint, value.dataPointPath).value;
                else
                    daikinValue = device.getData(value.managementPoint, value.dataPoint).value;
            }
            else if (value.multiple == true) {
                let multipleValue;
                if (value.multipleValue.dataPointPath !== undefined)
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value;
                else
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint).value;
                let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
                daikinValue = device.getData(value.managementPoint, value.dataPoint, dataPointPath).value || "auto";
            }
            if (value.converter != undefined) {
                daikinValue = convert(value.converter, daikinValue, 0);
            }
        }
        catch (e) {
            daikinValue = undefined;
        }
        gatewayClass[key] = daikinValue;
    });
}
exports.convertDaikinDevice = convertDaikinDevice;
function createDeviceInfo(device, gatewayClass) {
    let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN_DEVICE, gatewayClass);
    Object.entries(data).forEach(entry1 => {
        const [key1, value1] = entry1;
        Object.entries(value1).forEach(entry2 => {
            const [key2, value2] = entry2;
            let deviceValue;
            if (value2.dataPointPath !== undefined) {
                deviceValue = device.getData(value2.managementPoint, value2.dataPoint, value2.dataPointPath).value;
            }
            else {
                deviceValue = device.getData(value2.managementPoint, value2.dataPoint).value;
            }
            gatewayClass[key1][key2] = deviceValue;
        });
        gatewayClass[key1]['id'] = device.getId();
    });
}
function eventValue(device, gatewayClass, events) {
    return __awaiter(this, void 0, void 0, function* () {
        Object.entries(events).forEach(entry => {
            const [key, value] = entry;
            gatewayClass[key] = value;
        });
        yield updateDaikinDevice(device, gatewayClass);
    });
}
exports.eventValue = eventValue;
function updateDaikinDevice(device, gatewayClass) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gatewayClass);
        Object.entries(data).forEach(entry => {
            const [key, value] = entry;
            try {
                if (value.multiple == undefined && value.multiple !== true) {
                    if (value.dataPointPath !== undefined) {
                        validateDataPath(device, value, value.dataPointPath, gatewayClass[key]);
                    }
                    else {
                        validateData(device, value, gatewayClass[key]);
                    }
                }
                else if (value.multiple == true) {
                    let multipleValue;
                    if (value.multipleValue.dataPointPath !== undefined)
                        multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value;
                    else
                        multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint).value;
                    let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
                    validateDataPath(device, value, dataPointPath, gatewayClass[key]);
                }
            }
            catch (e) {
                logger.error(e);
                return;
            }
        });
        yield device.updateData();
    });
}
function validateData(device, def, value) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = device.getData(def.managementPoint, def.dataPoint);
        if (def.converter !== undefined)
            value = convert(def.converter, value, 1);
        let data = checkData(params, value);
        if (!data.isOK)
            return;
        yield device.setData(def.managementPoint, def.dataPoint, data.value);
    });
}
function validateDataPath(device, def, dataPointPath, value) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = device.getData(def.managementPoint, def.dataPoint, dataPointPath);
        if (def.converter !== undefined)
            value = convert(def.converter, value, 1);
        let data = checkData(params, value);
        if (!data.isOK)
            return;
        yield device.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value);
    });
}
function checkData(params, value) {
    let result = {
        isOK: false,
        value: value
    };
    if (params == null)
        return result;
    if (!params.settable)
        return result;
    if (params.values && !params.values.includes(value))
        return result;
    if (value < params.minValue)
        result.value = params.minValue;
    if (params.maxValue < value)
        result.value = params.maxValue;
    if (result.value === params.value)
        return result;
    result.isOK = true;
    return result;
}
function convert(converter, value, to) {
    switch (converter) {
        case converterEnum.binary:
            if (to == 0)
                return convertBinary0(value);
            if (to == 1)
                return convertBinary1(value);
            break;
        case converterEnum.numeric:
            return parseInt(value);
    }
}
function convertBinary0(value) {
    switch (value) {
        case 'on':
            return true;
        case 'off':
            return false;
    }
}
function convertBinary1(value) {
    switch (value) {
        case true:
            return 'on';
        case false:
            return 'off';
    }
}
