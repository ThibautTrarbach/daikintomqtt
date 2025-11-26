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
            if (value.multiple !== true) {
                if (value.dataPointPath !== undefined) {
                    if (value.dataPoint == "consumptionData") {
                        logger.debug("[BaseModules.ts] => Retrieving consumption with dataPointPath");
                        logger.debug(value.dataPointPath);
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
            else if (value.multiple === true) {
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
            const errorMessage = e instanceof Error ? e.message : String(e);
            if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("reading 'value'")) {
                logger.debug(`[BaseModules.ts] => Error retrieving value for ${key}: ${errorMessage}`);
            }
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
                const errorMessage = e instanceof Error ? e.message : String(e);
                if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("reading 'value'")) {
                    logger.debug(`[BaseModules.ts] => Error retrieving device value for ${key1}/${key2}: ${errorMessage}`);
                }
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
    for (const entry of Object.entries(data)) {
        const [key, value] = entry;
        try {
            if (value.multiple !== true) {
                if (value.dataPointPath !== undefined) {
                    await validateDataPath(device, value, value.dataPointPath, gatewayClass[key]);
                }
                else {
                    await validateData(device, value, gatewayClass[key]);
                }
            }
            else if (value.multiple === true) {
                let multipleValue;
                if (value.multipleValue.dataPointPath !== undefined)
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value;
                else
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, null).value;
                let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
                await validateDataPath(device, value, dataPointPath, gatewayClass[key]);
            }
        }
        catch (e) {
            logger.error(`[BaseModules.ts] => Error updating device ${device.getId()} for property ${key}: ${e instanceof Error ? e.message : String(e)}`);
            if (e instanceof Error && e.stack) {
                logger.debug(`[BaseModules.ts] => Stack trace: ${e.stack}`);
            }
            continue;
        }
    }
}
async function validateData(device, def, value) {
    try {
        const deviceId = device.getId();
        let params = device.getData(def.managementPoint, def.dataPoint, null);
        if (!params) {
            logger.warn(`[BaseModules.ts] => Parameters not found for ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
            return;
        }
        if (def.converter !== undefined) {
            value = convert(def.converter, value, 1);
        }
        let data = checkData(params, value);
        if (!data.isOK) {
            logger.debug(`[BaseModules.ts] => Validation failed for ${deviceId} - ${def.managementPoint}/${def.dataPoint}, value: ${value}`);
            return;
        }
        if (params.value == data.value) {
            logger.debug(`[BaseModules.ts] => Identical value for ${deviceId} - ${def.managementPoint}/${def.dataPoint}, no update needed`);
            return;
        }
        const deviceD = await cache.get(`device_${deviceId}`);
        if (!deviceD) {
            logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
            return;
        }
        logger.info(`[BaseModules.ts] => Sending request to cloud for ${deviceId} - ${def.managementPoint}/${def.dataPoint}: ${data.value}`);
        try {
            const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("../rateLimiter")));
            await rateLimiter.executeWithRetry(async () => {
                await deviceD.setData(def.managementPoint, def.dataPoint, null, data.value);
                await cache.set('needRefresh', Math.floor(Date.now() / 1000));
            }, `setData-${deviceId}-${def.managementPoint}-${def.dataPoint}`, {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 60000
            });
            logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
        }
        catch (setError) {
            logger.error(`[BaseModules.ts] => Error updating cloud for ${deviceId}: ${setError instanceof Error ? setError.message : String(setError)}`);
            if (setError instanceof Error && setError.stack) {
                logger.debug(`[BaseModules.ts] => Stack trace: ${setError.stack}`);
            }
            throw setError;
        }
    }
    catch (error) {
        logger.error(`[BaseModules.ts] => Error in validateData: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[BaseModules.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
async function validateDataPath(device, def, dataPointPath, value) {
    try {
        const deviceId = device.getId();
        let params = device.getData(def.managementPoint, def.dataPoint, dataPointPath);
        if (!params) {
            logger.warn(`[BaseModules.ts] => Parameters not found for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}`);
            return;
        }
        if (def.converter !== undefined) {
            value = convert(def.converter, value, 1);
        }
        let data = checkData(params, value);
        if (!data.isOK) {
            logger.debug(`[BaseModules.ts] => Validation failed for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}, value: ${value}`);
            return;
        }
        if (params.value == data.value) {
            logger.debug(`[BaseModules.ts] => Identical value for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}, no update needed`);
            return;
        }
        const deviceD = await cache.get(`device_${deviceId}`);
        if (!deviceD) {
            logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
            return;
        }
        logger.info(`[BaseModules.ts] => Sending request to cloud for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}: ${data.value}`);
        try {
            const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("../rateLimiter")));
            await rateLimiter.executeWithRetry(async () => {
                await deviceD.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value);
                await cache.set('needRefresh', Math.floor(Date.now() / 1000));
            }, `setData-${deviceId}-${def.managementPoint}-${def.dataPoint}-${dataPointPath}`, {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 60000
            });
            logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}`);
        }
        catch (setError) {
            logger.error(`[BaseModules.ts] => Error updating cloud for ${deviceId}: ${setError instanceof Error ? setError.message : String(setError)}`);
            if (setError instanceof Error && setError.stack) {
                logger.debug(`[BaseModules.ts] => Stack trace: ${setError.stack}`);
            }
            throw setError;
        }
    }
    catch (error) {
        logger.error(`[BaseModules.ts] => Error in validateDataPath: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[BaseModules.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
function checkData(params, value) {
    let result = {
        isOK: false,
        value: value
    };
    if (params == null) {
        logger.debug(`[BaseModules.ts] => Null parameters in checkData`);
        return result;
    }
    if (!params.settable) {
        logger.debug(`[BaseModules.ts] => Property not settable in checkData`);
        return result;
    }
    if (params.values && !params.values.includes(value)) {
        logger.debug(`[BaseModules.ts] => Value ${value} not in allowed values list: ${JSON.stringify(params.values)}`);
        return result;
    }
    if (params.minValue !== undefined && value < params.minValue) {
        logger.debug(`[BaseModules.ts] => Value ${value} below minimum ${params.minValue}, adjusting`);
        result.value = params.minValue;
    }
    if (params.maxValue !== undefined && params.maxValue < result.value) {
        logger.debug(`[BaseModules.ts] => Value ${result.value} above maximum ${params.maxValue}, adjusting`);
        result.value = params.maxValue;
    }
    if (result.value === params.value) {
        logger.debug(`[BaseModules.ts] => Value identical to current value, no change needed`);
        return result;
    }
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
//# sourceMappingURL=BaseModules.js.map