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
const mqtt_1 = require("../mqtt");
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
                        if (datavalue && datavalue.value) {
                            daikinValue = getConsumptionData(datavalue.value, value.consumptionT);
                            if (!Array.isArray(daikinValue)) {
                                daikinValue = [];
                            }
                        }
                        else {
                            logger.debug(`[BaseModules.ts] => Consumption data not available for ${key} at path ${value.dataPointPath}`);
                            daikinValue = [];
                        }
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
    const deviceId = device.getId();
    logger.debug(`[BaseModules.ts] => eventValue called for device ${deviceId} with events: ${JSON.stringify(events)}`);
    Object.entries(events).forEach(entry => {
        const [key, value] = entry;
        let propertyKey = key;
        if (key.startsWith('_')) {
            propertyKey = key.substring(1);
            logger.debug(`[BaseModules.ts] => Mapping property ${key} -> ${propertyKey} (removed underscore)`);
        }
        logger.debug(`[BaseModules.ts] => Assigning ${propertyKey} = ${value} (type: ${typeof value})`);
        gatewayClass[propertyKey] = value;
        const assignedValue = gatewayClass[propertyKey];
        const privateKey = `_${propertyKey}`;
        const privateValue = gatewayClass[privateKey];
        logger.debug(`[BaseModules.ts] => After assignment - ${propertyKey}: ${assignedValue}, ${privateKey}: ${privateValue}`);
    });
    const updateResult = await updateDaikinDevice(device, gatewayClass);
    logger.debug(`[BaseModules.ts] => eventValue - updateResult for ${deviceId}: success=${updateResult.success}, hasUpdates=${updateResult.hasUpdates}, hasErrors=${updateResult.hasErrors}`);
    try {
        const mode = config.system?.actionRefreshMode ?? 1;
        const now = Math.floor(Date.now() / 1000);
        const deviceId = device.getId();
        if ((mode === 2 || mode === 3) && updateResult.success) {
            try {
                await cache.set(`device_${deviceId}`, device, 10800000);
                const payload = JSON.stringify(gatewayClass);
                await (0, mqtt_1.publishToMQTT)(deviceId, payload);
                logger.debug(`[BaseModules.ts] => Post-action optimistic update published for device ${deviceId} (mode=${mode})`);
            }
            catch (e) {
                logger.error(`[BaseModules.ts] => Error during optimistic post-action update for device ${deviceId}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        else if ((mode === 2 || mode === 3) && !updateResult.success) {
            if (updateResult.hasErrors) {
                logger.warn(`[BaseModules.ts] => Skipping optimistic update for device ${deviceId} (mode=${mode}) because API update failed`);
            }
            else if (!updateResult.hasUpdates) {
                logger.debug(`[BaseModules.ts] => Skipping optimistic update for device ${deviceId} (mode=${mode}) because no updates were necessary`);
            }
        }
        if (mode === 1 || mode === 3) {
            await cache.set('needRefresh', now);
            logger.debug(`[BaseModules.ts] => Post-action refresh scheduled (mode=${mode}) at ${new Date(now * 1000).toISOString()}`);
        }
        else {
            await cache.del('needRefresh');
            logger.debug("[BaseModules.ts] => Post-action refresh disabled (mode=2), any pending refresh cleared");
        }
    }
    catch (postActionError) {
        logger.error(`[BaseModules.ts] => Error handling post-action behavior: ${postActionError instanceof Error ? postActionError.message : String(postActionError)}`);
    }
}
async function updateDaikinDevice(device, gatewayClass) {
    const deviceId = device.getId();
    logger.debug(`[BaseModules.ts] => updateDaikinDevice called for device ${deviceId}`);
    let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gatewayClass);
    let allSucceeded = true;
    let atLeastOneUpdate = false;
    const entries = Object.entries(data);
    const operationModeEntry = entries.find(([key, value]) => value.dataPoint === "operationMode" && !value.dataPointPath);
    const onOffModeEntry = entries.find(([key, value]) => value.dataPoint === "onOffMode" && !value.dataPointPath);
    const otherEntries = entries.filter(([key, value]) => {
        const isOperationMode = value.dataPoint === "operationMode" && !value.dataPointPath;
        const isOnOffMode = value.dataPoint === "onOffMode" && !value.dataPointPath;
        return !isOperationMode && !isOnOffMode;
    });
    logger.debug(`[BaseModules.ts] => Found ${entries.length} total properties: operationMode=${operationModeEntry ? 'yes' : 'no'}, onOffMode=${onOffModeEntry ? 'yes' : 'no'}, others=${otherEntries.length}`);
    const orderedEntries = [];
    if (operationModeEntry) {
        orderedEntries.push(operationModeEntry);
        logger.debug(`[BaseModules.ts] => operationMode entry: key=${operationModeEntry[0]}, dataPoint=${operationModeEntry[1].dataPoint}`);
    }
    if (onOffModeEntry) {
        orderedEntries.push(onOffModeEntry);
        logger.debug(`[BaseModules.ts] => onOffMode entry: key=${onOffModeEntry[0]}, dataPoint=${onOffModeEntry[1].dataPoint}`);
    }
    orderedEntries.push(...otherEntries);
    logger.debug(`[BaseModules.ts] => Processing ${orderedEntries.length} properties in order`);
    for (const entry of orderedEntries) {
        const [key, value] = entry;
        try {
            logger.debug(`[BaseModules.ts] => Processing property ${key} (dataPoint: ${value.dataPoint}, managementPoint: ${value.managementPoint})`);
            let propertyValue = gatewayClass[key];
            logger.debug(`[BaseModules.ts] => Initial read of ${key}: ${propertyValue} (type: ${typeof propertyValue})`);
            if (propertyValue === undefined && key.startsWith('_')) {
                propertyValue = gatewayClass[key];
                logger.debug(`[BaseModules.ts] => After retry, ${key}: ${propertyValue} (type: ${typeof propertyValue})`);
            }
            if (propertyValue === undefined && key.startsWith('_')) {
                const propertyKeyWithoutUnderscore = key.substring(1);
                propertyValue = gatewayClass[propertyKeyWithoutUnderscore];
                logger.debug(`[BaseModules.ts] => Trying without underscore ${propertyKeyWithoutUnderscore}: ${propertyValue} (type: ${typeof propertyValue})`);
            }
            if (propertyValue === undefined) {
                logger.debug(`[BaseModules.ts] => WARNING: Property ${key} is undefined in gatewayClass after all attempts`);
            }
            else {
                logger.debug(`[BaseModules.ts] => Successfully read property ${key}: ${propertyValue} (type: ${typeof propertyValue})`);
            }
            let updateMade = false;
            if (value.multiple !== true) {
                if (value.dataPointPath !== undefined) {
                    updateMade = await validateDataPath(device, value, value.dataPointPath, propertyValue);
                }
                else {
                    updateMade = await validateData(device, value, propertyValue);
                }
            }
            else if (value.multiple === true) {
                let multipleValue;
                if (value.multipleValue.dataPointPath !== undefined)
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value;
                else
                    multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, undefined).value;
                let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
                updateMade = await validateDataPath(device, value, dataPointPath, propertyValue);
            }
            if (updateMade) {
                atLeastOneUpdate = true;
            }
        }
        catch (e) {
            logger.error(`[BaseModules.ts] => Error updating device ${device.getId()} for property ${key}: ${e instanceof Error ? e.message : String(e)}`);
            if (e instanceof Error && e.stack) {
                logger.debug(`[BaseModules.ts] => Stack trace: ${e.stack}`);
            }
            allSucceeded = false;
            continue;
        }
    }
    const result = {
        success: atLeastOneUpdate && allSucceeded,
        hasUpdates: atLeastOneUpdate,
        hasErrors: !allSucceeded
    };
    logger.debug(`[BaseModules.ts] => updateDaikinDevice completed for ${deviceId}: success=${result.success}, hasUpdates=${result.hasUpdates}, hasErrors=${result.hasErrors}`);
    return result;
}
async function validateData(device, def, value) {
    try {
        const deviceId = device.getId();
        logger.debug(`[BaseModules.ts] => validateData called for ${deviceId} - ${def.managementPoint}/${def.dataPoint}, input value: ${value} (type: ${typeof value})`);
        const deviceD = await cache.get(`device_${deviceId}`);
        if (!deviceD) {
            logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
            return false;
        }
        let params = deviceD.getData(def.managementPoint, def.dataPoint, undefined);
        if (!params) {
            logger.warn(`[BaseModules.ts] => Parameters not found for ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
            return false;
        }
        logger.debug(`[BaseModules.ts] => Current params value: ${params.value} (type: ${typeof params.value}), settable: ${params.settable}, values: ${params.values ? JSON.stringify(params.values) : 'N/A'}`);
        if (def.converter !== undefined) {
            const valueBeforeConversion = value;
            value = convert(def.converter, value, 1);
            logger.debug(`[BaseModules.ts] => Value converted: ${valueBeforeConversion} -> ${value} (converter: ${def.converter})`);
        }
        if (String(params.value) === String(value)) {
            logger.debug(`[BaseModules.ts] => Value identical to current value for ${deviceId} - ${def.managementPoint}/${def.dataPoint} (${params.value} === ${value}), skipping API call`);
            return false;
        }
        let data = checkData(params, value);
        if (!data.isOK) {
            logger.debug(`[BaseModules.ts] => Validation failed for ${deviceId} - ${def.managementPoint}/${def.dataPoint}, value: ${value}`);
            return false;
        }
        if (String(params.value) === String(data.value)) {
            logger.debug(`[BaseModules.ts] => Value identical to current value after validation for ${deviceId} - ${def.managementPoint}/${def.dataPoint} (${params.value} === ${data.value}), skipping API call`);
            return false;
        }
        if (def.dataPoint === "onOffMode" && data.value === "on") {
            logger.debug(`[BaseModules.ts] => Pre-activation check: Verifying operationMode before setting onOffMode to "on" for ${deviceId}`);
            logger.debug(`[BaseModules.ts] => Pre-activation check - data.value: "${data.value}" (type: ${typeof data.value}), def.dataPoint: "${def.dataPoint}"`);
            const operationModeParams = deviceD.getData(def.managementPoint, "operationMode", undefined);
            if (!operationModeParams) {
                logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: operationMode parameters not found`);
                return false;
            }
            logger.debug(`[BaseModules.ts] => Pre-activation check - operationMode params: settable=${operationModeParams.settable}, value="${operationModeParams.value}", values=${operationModeParams.values ? JSON.stringify(operationModeParams.values) : 'N/A'}`);
            logger.debug(`[BaseModules.ts] => Pre-activation check - operationMode params full: ${JSON.stringify(operationModeParams)}`);
            if (!operationModeParams.value) {
                logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: operationMode is not set`);
                return false;
            }
            if (operationModeParams.values && !operationModeParams.values.includes(operationModeParams.value)) {
                logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: current operationMode "${operationModeParams.value}" is not in allowed values ${JSON.stringify(operationModeParams.values)}`);
                return false;
            }
            if (operationModeParams.settable) {
                logger.debug(`[BaseModules.ts] => operationMode is settable and will be processed before onOffMode`);
            }
            else {
                logger.debug(`[BaseModules.ts] => operationMode is not settable but has valid value "${operationModeParams.value}", allowing onOffMode activation`);
            }
            logger.debug(`[BaseModules.ts] => Pre-activation check PASSED: operationMode is valid, allowing onOffMode activation`);
        }
        logger.info(`[BaseModules.ts] => API CALL - setData (reason: action_mqtt_no_dataPointPath) for ${deviceId} - ${def.managementPoint}/${def.dataPoint}: ${data.value}`);
        logger.debug(`[BaseModules.ts] => API CALL DETAILS - managementPoint: "${def.managementPoint}", dataPoint: "${def.dataPoint}", dataPointPath: null, value: "${data.value}" (type: ${typeof data.value})`);
        logger.debug(`[BaseModules.ts] => API CALL DETAILS - Current params value: "${params.value}", settable: ${params.settable}, values: ${params.values ? JSON.stringify(params.values) : 'N/A'}`);
        try {
            const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("../rateLimiter")));
            await rateLimiter.executeWithRetry(async () => {
                logger.debug(`[BaseModules.ts] => Executing setData: deviceD.setData("${def.managementPoint}", "${def.dataPoint}", undefined, ${JSON.stringify(data.value)}, {updateLocalData: true})`);
                await deviceD.setData(def.managementPoint, def.dataPoint, undefined, data.value, { updateLocalData: true });
            }, `setData-${deviceId}-${def.managementPoint}-${def.dataPoint}`, {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 60000
            });
            await cache.set(`device_${deviceId}`, deviceD, 10800000);
            logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint} and cache updated`);
            return true;
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
        const deviceD = await cache.get(`device_${deviceId}`);
        if (!deviceD) {
            logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
            return false;
        }
        let params = deviceD.getData(def.managementPoint, def.dataPoint, dataPointPath);
        if (!params) {
            const normalizedPath = dataPointPath.startsWith('/') ? dataPointPath : `/${dataPointPath}`;
            logger.warn(`[BaseModules.ts] => Parameters not found for ${deviceId} - ${def.managementPoint}/${def.dataPoint}${normalizedPath}`);
            return false;
        }
        if (def.converter !== undefined) {
            value = convert(def.converter, value, 1);
        }
        if (String(params.value) === String(value)) {
            logger.debug(`[BaseModules.ts] => Value identical to current value for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath} (${params.value} === ${value}), skipping API call`);
            return false;
        }
        let data = checkData(params, value);
        if (!data.isOK) {
            logger.debug(`[BaseModules.ts] => Validation failed for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}, value: ${value}`);
            return false;
        }
        if (String(params.value) === String(data.value)) {
            logger.debug(`[BaseModules.ts] => Value identical to current value after validation for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath} (${params.value} === ${data.value}), skipping API call`);
            return false;
        }
        logger.info(`[BaseModules.ts] => API CALL - setData (reason: action_mqtt_with_dataPointPath='${dataPointPath}') for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}: ${data.value}`);
        logger.debug(`[BaseModules.ts] => API CALL DETAILS - managementPoint: "${def.managementPoint}", dataPoint: "${def.dataPoint}", dataPointPath: "${dataPointPath}", value: "${data.value}" (type: ${typeof data.value})`);
        logger.debug(`[BaseModules.ts] => API CALL DETAILS - Current params value: "${params.value}", settable: ${params.settable}, values: ${params.values ? JSON.stringify(params.values) : 'N/A'}`);
        try {
            const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("../rateLimiter")));
            await rateLimiter.executeWithRetry(async () => {
                logger.debug(`[BaseModules.ts] => Executing setData: deviceD.setData("${def.managementPoint}", "${def.dataPoint}", "${dataPointPath}", ${JSON.stringify(data.value)}, {updateLocalData: true})`);
                await deviceD.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value, { updateLocalData: true });
            }, `setData-${deviceId}-${def.managementPoint}-${def.dataPoint}-${dataPointPath}`, {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 60000
            });
            await cache.set(`device_${deviceId}`, deviceD, 10800000);
            logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath} and cache updated`);
            return true;
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
    if (!values || values.length === 0) {
        return 0;
    }
    let consumption = parseFloat(String(values.reduce((acc, currentValue) => acc + currentValue, 0)));
    return Math.round((consumption + Number.EPSILON) * 100) / 100;
}
function getConsumptionData(values, consumptionT) {
    if (!values) {
        logger.debug(`[BaseModules.ts] => getConsumptionData: values is null or undefined`);
        return [];
    }
    switch (consumptionT) {
        case consumptionEnum.heatingDay:
            if (!values.heating || !values.heating.d) {
                logger.debug(`[BaseModules.ts] => getConsumptionData: heating.d not available`);
                return [];
            }
            return values.heating.d.slice(12);
        case consumptionEnum.heatingWeek:
            if (!values.heating || !values.heating.w) {
                logger.debug(`[BaseModules.ts] => getConsumptionData: heating.w not available`);
                return [];
            }
            return values.heating.w.slice(7);
        case consumptionEnum.heatingMonth:
            if (!values.heating || !values.heating.m) {
                logger.debug(`[BaseModules.ts] => getConsumptionData: heating.m not available`);
                return [];
            }
            return values.heating.m.slice(12);
        case consumptionEnum.coolingDay:
            if (!values.cooling || !values.cooling.d) {
                logger.debug(`[BaseModules.ts] => getConsumptionData: cooling.d not available`);
                return [];
            }
            return values.cooling.d.slice(12);
        case consumptionEnum.coolingWeek:
            if (!values.cooling || !values.cooling.w) {
                logger.debug(`[BaseModules.ts] => getConsumptionData: cooling.w not available`);
                return [];
            }
            return values.cooling.w.slice(7);
        case consumptionEnum.coolingMonth:
            if (!values.cooling || !values.cooling.m) {
                logger.debug(`[BaseModules.ts] => getConsumptionData: cooling.m not available`);
                return [];
            }
            return values.cooling.m.slice(12);
        default:
            logger.debug(`[BaseModules.ts] => getConsumptionData: unknown consumptionT: ${consumptionT}`);
            return [];
    }
}
//# sourceMappingURL=BaseModules.js.map