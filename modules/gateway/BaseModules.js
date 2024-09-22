"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumptionEnum = exports.converterEnum = exports.typeEnum = void 0;
exports.convertDaikinDevice = convertDaikinDevice;
exports.eventValue = eventValue;
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
    consumption: 3
});
exports.converterEnum = converterEnum;
const consumptionEnum = Object.freeze({
    heatingDay: 0,
    heatingWeek: 1,
    heatingMonth: 2,
    coolingDay: 3,
    coolingWeek: 4,
    coolingMonth: 5
});
exports.consumptionEnum = consumptionEnum;
function convertDaikinDevice(device, gatewayClass) {
    let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gatewayClass);
    createDeviceInfo(device, gatewayClass);
    Object.entries(data).forEach(entry => {
        const [key, value] = entry;
        let daikinValue;
        try {
            if (value.multiple == undefined && value.multiple !== true) {
                if (value.dataPointPath !== undefined) {
                    if (value.dataPoint == "consumptionData") {
                        let datavalue = device.getData(value.managementPoint, value.dataPoint, value.dataPointPath);
                        daikinValue = getConsumptionData(datavalue, value.consumptionT);
                    }
                    else {
                        daikinValue = device.getData(value.managementPoint, value.dataPoint, value.dataPointPath).value;
                    }
                }
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
function createDeviceInfo(device, gatewayClass) {
    let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN_DEVICE, gatewayClass);
    Object.entries(data).forEach(entry1 => {
        const [key1, value1] = entry1;
        Object.entries(value1).forEach(entry2 => {
            const [key2, value2] = entry2;
            let deviceValue;
            try {
                if (value2.dataPointPath !== undefined) {
                    deviceValue = device.getData(value2.managementPoint, value2.dataPoint, value2.dataPointPath).value;
                }
                else {
                    deviceValue = device.getData(value2.managementPoint, value2.dataPoint).value;
                }
            }
            catch (e) {
                deviceValue = undefined;
            }
            gatewayClass[key1][key2] = deviceValue;
        });
        gatewayClass[key1]['id'] = device.getId();
    });
}
async function eventValue(device, gatewayClass, events) {
    Object.entries(events).forEach(entry => {
        const [key, value] = entry;
        gatewayClass[key] = value;
    });
    await updateDaikinDevice(device, gatewayClass);
}
async function updateDaikinDevice(device, gatewayClass) {
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
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, null).value;
                let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
                validateDataPath(device, value, dataPointPath, gatewayClass[key]);
            }
        }
        catch (e) {
            logger.error(e);
            return;
        }
    });
}
async function validateData(device, def, value) {
    let params = device.getData(def.managementPoint, def.dataPoint, null);
    if (def.converter !== undefined)
        value = convert(def.converter, value, 1);
    let data = checkData(params, value);
    if (!data.isOK)
        return;
    if (params.value == data.value)
        return;
    const deviceD = global.cache[device.getId()];
    logger.debug('=====================================> Send Request to cloud : Action | ' + value);
    await deviceD.setData(def.managementPoint, def.dataPoint, data.value);
    await cache.set('needRefresh', Math.floor(Date.now() / 1000));
}
async function validateDataPath(device, def, dataPointPath, value) {
    let params = device.getData(def.managementPoint, def.dataPoint, dataPointPath);
    if (def.converter !== undefined)
        value = convert(def.converter, value, 1);
    let data = checkData(params, value);
    if (!data.isOK)
        return;
    if (params.value == data.value)
        return;
    const deviceD = global.cache[device.getId()];
    logger.debug('=====================================> Send Request to cloud : Action | ' + value);
    await deviceD.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value);
    await cache.set('needRefresh', Math.floor(Date.now() / 1000));
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
            return parseFloat(value);
        case converterEnum.consumption:
            if (to != 0)
                return 0;
            return convertConsumption(value);
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
function convertConsumption(values) {
    let consumption = parseFloat(String(values.reduce((acc, currentValue) => acc + currentValue, 0)));
    return Math.round((consumption + Number.EPSILON) * 100) / 100;
}
function getConsumptionData(values, consumptionT) {
    switch (consumptionT) {
        case consumptionEnum.heatingDay:
            return values.heating.d;
        case consumptionEnum.heatingWeek:
            return values.heating.w;
        case consumptionEnum.heatingMonth:
            return values.heating.m;
        case consumptionEnum.coolingDay:
            return values.cooling.d;
        case consumptionEnum.coolingWeek:
            return values.cooling.w;
        case consumptionEnum.coolingMonth:
            return values.cooling.m;
    }
}
