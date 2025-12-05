import {PROPERTY_METADATA_DAIKIN, PROPERTY_METADATA_DAIKIN_DEVICE} from "../decorator";
import {Gateways, ModulePropertyMetadata} from "../../types";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";
import {publishToMQTT} from "../mqtt";

// Generic type information for module properties
const typeEnum = Object.freeze({
	numeric: 0,
	string: 1,
	binary: 2,
});

// Converters used to translate between Daikin values and internal representation
const converterEnum = Object.freeze({
	numeric: 0,
	string: 1,
	binary: 2,
	consumption: 3
});

// Indices used to select specific energy consumption periods
const consumptionEnum = Object.freeze({
	heatingDay: 0,
	heatingWeek: 1,
	heatingMonth: 2,
	coolingDay: 3,
	coolingWeek: 4,
	coolingMonth: 5
});

/**
 * Populates a gateway class instance with values from a DaikinCloudDevice
 * using metadata declared via decorators.
 */
function convertDaikinDevice(device: any, gatewayClass: Gateways) {
	let data: object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gatewayClass);
	createDeviceInfo(device, gatewayClass)
	Object.entries(data).forEach(entry => {
		const [key, value] = entry;
		let daikinValue;

		try {
			if (value.multiple !== true) {
				if (value.dataPointPath !== undefined) {
					if (value.dataPoint == "consumptionData") {
						logger.debug("[BaseModules.ts] => Retrieving consumption with dataPointPath")
						logger.debug(value.dataPointPath)
						let datavalue = device.getData(value.managementPoint, value.dataPoint, value.dataPointPath)
						if (datavalue && datavalue.value) {
							daikinValue = getConsumptionData(datavalue.value, value.consumptionT)
							// Ensure we always have an array for convertConsumption
							if (!Array.isArray(daikinValue)) {
								daikinValue = [];
							}
						} else {
							logger.debug(`[BaseModules.ts] => Consumption data not available for ${key} at path ${value.dataPointPath}`);
							daikinValue = [];
						}
					} else {
						daikinValue = device.getData(value.managementPoint, value.dataPoint, value.dataPointPath).value
					}
				}
				else daikinValue = device.getData(value.managementPoint, value.dataPoint).value

			} else if (value.multiple === true) {
				let multipleValue;

				if (value.multipleValue.dataPointPath !== undefined) multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value
				else multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint).value

				let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
				daikinValue = device.getData(value.managementPoint, value.dataPoint, dataPointPath).value || "auto"
			}

			if (value.converter != undefined) {
				daikinValue = convert(value.converter, daikinValue, 0)
			}
		} catch (e) {
			// Only log if it's not a "property not available" error (normal for some devices)
			const errorMessage = e instanceof Error ? e.message : String(e);
			if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("reading 'value'")) {
				logger.debug(`[BaseModules.ts] => Error retrieving value for ${key}: ${errorMessage}`);
			}
			daikinValue = undefined;
		}

		// @ts-ignore
		gatewayClass[key] = daikinValue;
	})
}

/**
 * Populates gatewayClass._device with identification information from the device
 * (model, serial, firmware, error state, etc.).
 */
function createDeviceInfo(device: any, gatewayClass: Gateways) {
	let data: object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, gatewayClass);
	Object.entries(data).forEach(entry1 => {
		const [key1, value1] = entry1;
		Object.entries(value1 as object).forEach(entry2 => {
			const [key2, value2] = entry2;
			let deviceValue;

			try {
				if (value2.dataPointPath !== undefined) {
					deviceValue = device.getData(value2.managementPoint, value2.dataPoint, value2.dataPointPath).value
				} else {
					deviceValue = device.getData(value2.managementPoint, value2.dataPoint).value
				}
			} catch (e) {
				// Only log if it's not a "property not available" error (normal for some devices)
				const errorMessage = e instanceof Error ? e.message : String(e);
				if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("reading 'value'")) {
					logger.debug(`[BaseModules.ts] => Error retrieving device value for ${key1}/${key2}: ${errorMessage}`);
				}
				deviceValue = undefined;
			}
			// @ts-ignore
			gatewayClass[key1][key2] = deviceValue;
		})
		// @ts-ignore
		gatewayClass[key1]['id'] = device.getId();
	})
}

/**
 * Applies incoming MQTT event values to the gateway instance,
 * pushes the changes to the cloud, then handles post-action behavior
 * (optimistic update and/or delayed refresh) based on configuration.
 */
async function eventValue(device: any, gatewayClass: Gateways, events: object) {
	Object.entries(events).forEach(entry => {
		const [key, value] = entry;
		// @ts-ignore
		gatewayClass[key] = value
	})

	const updateResult = await updateDaikinDevice(device as DaikinCloudDevice, gatewayClass);

	// Handle post-action behavior based on the configured refresh mode
	try {
		const mode = config.system?.actionRefreshMode ?? 1;
		const now = Math.floor(Date.now() / 1000);
		const deviceId = (device as DaikinCloudDevice).getId();

		// Modes 2 and 3: immediate optimistic update (cache + MQTT) - ONLY if all API updates succeeded
		if ((mode === 2 || mode === 3) && updateResult.success) {
			try {
				await cache.set(`device_${deviceId}`, device, 10800000);
				const payload = JSON.stringify(gatewayClass);
				await publishToMQTT(deviceId, payload);
				logger.debug(`[BaseModules.ts] => Post-action optimistic update published for device ${deviceId} (mode=${mode})`);
			} catch (e) {
				logger.error(`[BaseModules.ts] => Error during optimistic post-action update for device ${deviceId}: ${e instanceof Error ? e.message : String(e)}`);
			}
		} else if ((mode === 2 || mode === 3) && !updateResult.success) {
			if (updateResult.hasErrors) {
				logger.warn(`[BaseModules.ts] => Skipping optimistic update for device ${deviceId} (mode=${mode}) because API update failed`);
			} else if (!updateResult.hasUpdates) {
				// No updates were necessary (all values identical), so no need for optimistic update
				logger.debug(`[BaseModules.ts] => Skipping optimistic update for device ${deviceId} (mode=${mode}) because no updates were necessary`);
			}
		}

		// Modes 1 and 3: schedule a delayed full refresh via timeUpdate
		if (mode === 1 || mode === 3) {
			await cache.set('needRefresh', now);
			logger.debug(`[BaseModules.ts] => Post-action refresh scheduled (mode=${mode}) at ${new Date(now * 1000).toISOString()}`);
		} else {
			// Mode 2: ensure there is no pending delayed refresh
			await cache.del('needRefresh');
			logger.debug("[BaseModules.ts] => Post-action refresh disabled (mode=2), any pending refresh cleared");
		}
	} catch (postActionError) {
		logger.error(`[BaseModules.ts] => Error handling post-action behavior: ${postActionError instanceof Error ? postActionError.message : String(postActionError)}`);
	}
}

/**
 * Result of updateDaikinDevice operation
 */
interface UpdateResult {
	success: boolean; // true if at least one update was made successfully
	hasUpdates: boolean; // true if at least one update was attempted
	hasErrors: boolean; // true if any update failed
}

/**
 * Iterates over all mapped properties and pushes updated values
 * from the gateway instance back to the Daikin cloud device.
 * Returns an UpdateResult object indicating the outcome.
 * 
 * Note: operationMode is processed before onOffMode to ensure proper API ordering.
 */
async function updateDaikinDevice(device: DaikinCloudDevice, gatewayClass: Gateways): Promise<UpdateResult> {
	let data: object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gatewayClass);
	let allSucceeded = true;
	let atLeastOneUpdate = false; // Track if at least one API call was made
	
	// Separate entries into operationMode, onOffMode, and others
	const entries = Object.entries(data);
	const operationModeEntry = entries.find(([key, value]) => value.dataPoint === "operationMode" && !value.dataPointPath);
	const onOffModeEntry = entries.find(([key, value]) => value.dataPoint === "onOffMode" && !value.dataPointPath);
	const otherEntries = entries.filter(([key, value]) => {
		const isOperationMode = value.dataPoint === "operationMode" && !value.dataPointPath;
		const isOnOffMode = value.dataPoint === "onOffMode" && !value.dataPointPath;
		return !isOperationMode && !isOnOffMode;
	});
	
	// Process in order: operationMode first, then onOffMode, then others
	const orderedEntries: Array<[string, any]> = [];
	if (operationModeEntry) orderedEntries.push(operationModeEntry);
	if (onOffModeEntry) orderedEntries.push(onOffModeEntry);
	orderedEntries.push(...otherEntries);
	
	for (const entry of orderedEntries) {
		const [key, value] = entry;

		try {
			let updateMade = false;
			if (value.multiple !== true) {
				if (value.dataPointPath !== undefined) {
					updateMade = await validateDataPath(device, value, value.dataPointPath, gatewayClass[key])
				} else {
					updateMade = await validateData(device, value, gatewayClass[key])
				}
			} else if (value.multiple === true) {
				let multipleValue: any;
				if (value.multipleValue.dataPointPath !== undefined) multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value
				else multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, undefined).value

				let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
				updateMade = await validateDataPath(device, value, dataPointPath, gatewayClass[key])
			}
			
			if (updateMade) {
				atLeastOneUpdate = true;
			}
		} catch (e) {
			logger.error(`[BaseModules.ts] => Error updating device ${device.getId()} for property ${key}: ${e instanceof Error ? e.message : String(e)}`);
			if (e instanceof Error && e.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${e.stack}`);
			}
			allSucceeded = false;
			// Continue with other properties even on error
			continue;
		}
	}
	
	// Return result object with detailed information
	return {
		success: atLeastOneUpdate && allSucceeded,
		hasUpdates: atLeastOneUpdate,
		hasErrors: !allSucceeded
	};
}

/**
 * Validates and sends a single value to the cloud for a simple datapoint
 * (without dataPointPath), using rate-limited retries.
 * Returns true if an API call was made, false if skipped (identical value or validation failed).
 */
async function validateData(device: DaikinCloudDevice, def: ModulePropertyMetadata, value: any): Promise<boolean> {
	try {
		const deviceId = device.getId();
		
		// Get device from cache to ensure we have the latest state
		const deviceD = await cache.get(`device_${deviceId}`) as DaikinCloudDevice | undefined;
		
		if (!deviceD) {
			logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
			return false;
		}
		
		// Use deviceD (from cache) to get params, as it has the latest state after previous updates
		let params = deviceD.getData(def.managementPoint, def.dataPoint, undefined);
		
		if (!params) {
			logger.warn(`[BaseModules.ts] => Parameters not found for ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
			return false;
		}

		if (def.converter !== undefined) {
			value = convert(def.converter, value, 1);
		}
		
		// Check if value is identical BEFORE validation (to avoid unnecessary API calls)
		// Use loose comparison to handle type differences (string vs number, etc.)
		if (String(params.value) === String(value)) {
			logger.debug(`[BaseModules.ts] => Value identical to current value for ${deviceId} - ${def.managementPoint}/${def.dataPoint} (${params.value} === ${value}), skipping API call`);
			return false;
		}
		
		let data = checkData(params, value);
		if (!data.isOK) {
			logger.debug(`[BaseModules.ts] => Validation failed for ${deviceId} - ${def.managementPoint}/${def.dataPoint}, value: ${value}`);
			return false;
		}

		// Double check after validation (in case checkData adjusted the value)
		if (String(params.value) === String(data.value)) {
			logger.debug(`[BaseModules.ts] => Value identical to current value after validation for ${deviceId} - ${def.managementPoint}/${def.dataPoint} (${params.value} === ${data.value}), skipping API call`);
			return false;
		}

		// Special check: if setting onOffMode to "on", ensure operationMode is valid and settable
		// AND explicitly set operationMode first (even if unchanged) as API may require it
		if (def.dataPoint === "onOffMode" && data.value === "on") {
			logger.debug(`[BaseModules.ts] => Pre-activation check: Verifying and setting operationMode before setting onOffMode to "on" for ${deviceId}`);
			const operationModeParams = deviceD.getData(def.managementPoint, "operationMode", undefined);
			if (!operationModeParams) {
				logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: operationMode parameters not found`);
				return false;
			}
			
			logger.debug(`[BaseModules.ts] => Pre-activation check - operationMode params: settable=${operationModeParams.settable}, value="${operationModeParams.value}", values=${operationModeParams.values ? JSON.stringify(operationModeParams.values) : 'N/A'}`);
			
			// Check if operationMode is settable
			if (!operationModeParams.settable) {
				logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: operationMode is not settable`);
				return false;
			}
			
			// Check if operationMode has a valid value
			if (!operationModeParams.value) {
				logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: operationMode is not set`);
				return false;
			}
			
			// Check if current operationMode value is in the allowed values list
			if (operationModeParams.values && !operationModeParams.values.includes(operationModeParams.value)) {
				logger.warn(`[BaseModules.ts] => Cannot set onOffMode to "on" for ${deviceId}: current operationMode "${operationModeParams.value}" is not in allowed values ${JSON.stringify(operationModeParams.values)}`);
				return false;
			}
			
			// Note: We don't pre-set operationMode if it's already the current value
			// because the API rejects identical values with 422 error.
			// The API should accept onOffMode activation if operationMode is already set correctly.
			logger.debug(`[BaseModules.ts] => operationMode is already set to "${operationModeParams.value}", no need to pre-set it`);
			
			logger.debug(`[BaseModules.ts] => Pre-activation check PASSED: operationMode is valid, allowing onOffMode activation`);
		}

		logger.info(`[BaseModules.ts] => API CALL - setData (reason: action_mqtt_no_dataPointPath) for ${deviceId} - ${def.managementPoint}/${def.dataPoint}: ${data.value}`);
		logger.debug(`[BaseModules.ts] => API CALL DETAILS - managementPoint: "${def.managementPoint}", dataPoint: "${def.dataPoint}", dataPointPath: null, value: "${data.value}" (type: ${typeof data.value})`);
		logger.debug(`[BaseModules.ts] => API CALL DETAILS - Current params value: "${params.value}", settable: ${params.settable}, values: ${params.values ? JSON.stringify(params.values) : 'N/A'}`);
		
		try {
			// Use rate limiter to handle automatic retries (max total duration enforced by RateLimiter)
			const {rateLimiter} = await import("../rateLimiter");
			await rateLimiter.executeWithRetry(
				async () => {
					logger.debug(`[BaseModules.ts] => Executing setData: deviceD.setData("${def.managementPoint}", "${def.dataPoint}", undefined, ${JSON.stringify(data.value)}, {updateLocalData: true})`);
					await deviceD.setData(def.managementPoint, def.dataPoint, undefined, data.value, {updateLocalData: true});
				},
				`setData-${deviceId}-${def.managementPoint}-${def.dataPoint}`,
				{
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 60000
				}
			);
			// Update cache with the device that has local data updated
			await cache.set(`device_${deviceId}`, deviceD, 10800000);
			logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint} and cache updated`);
			return true; // API call was made successfully
		} catch (setError) {
			logger.error(`[BaseModules.ts] => Error updating cloud for ${deviceId}: ${setError instanceof Error ? setError.message : String(setError)}`);
			if (setError instanceof Error && setError.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${setError.stack}`);
			}
			throw setError;
		}
	} catch (error) {
		logger.error(`[BaseModules.ts] => Error in validateData: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[BaseModules.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

/**
 * Validates and sends a single value to the cloud for a datapoint
 * with a specific dataPointPath, using rate-limited retries.
 * Returns true if an API call was made, false if skipped (identical value or validation failed).
 */
async function validateDataPath(device: DaikinCloudDevice, def: ModulePropertyMetadata, dataPointPath: string, value: any): Promise<boolean> {
	try {
		const deviceId = device.getId();
		
		// Get device from cache to ensure we have the latest state
		const deviceD = await cache.get(`device_${deviceId}`) as DaikinCloudDevice | undefined;
		
		if (!deviceD) {
			logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
			return false;
		}
		
		// Use deviceD (from cache) to get params, as it has the latest state after previous updates
		let params = deviceD.getData(def.managementPoint, def.dataPoint, dataPointPath);
		
		if (!params) {
			// Normalize the path for logging (remove double slashes)
			const normalizedPath = dataPointPath.startsWith('/') ? dataPointPath : `/${dataPointPath}`;
			logger.warn(`[BaseModules.ts] => Parameters not found for ${deviceId} - ${def.managementPoint}/${def.dataPoint}${normalizedPath}`);
			return false;
		}

		if (def.converter !== undefined) {
			value = convert(def.converter, value, 1);
		}
		
		// Check if value is identical BEFORE validation (to avoid unnecessary API calls)
		// Use loose comparison to handle type differences (string vs number, etc.)
		if (String(params.value) === String(value)) {
			logger.debug(`[BaseModules.ts] => Value identical to current value for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath} (${params.value} === ${value}), skipping API call`);
			return false;
		}
		
		let data = checkData(params, value);
		if (!data.isOK) {
			logger.debug(`[BaseModules.ts] => Validation failed for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}, value: ${value}`);
			return false;
		}

		// Double check after validation (in case checkData adjusted the value)
		if (String(params.value) === String(data.value)) {
			logger.debug(`[BaseModules.ts] => Value identical to current value after validation for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath} (${params.value} === ${data.value}), skipping API call`);
			return false;
		}

		logger.info(`[BaseModules.ts] => API CALL - setData (reason: action_mqtt_with_dataPointPath='${dataPointPath}') for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}: ${data.value}`);
		logger.debug(`[BaseModules.ts] => API CALL DETAILS - managementPoint: "${def.managementPoint}", dataPoint: "${def.dataPoint}", dataPointPath: "${dataPointPath}", value: "${data.value}" (type: ${typeof data.value})`);
		logger.debug(`[BaseModules.ts] => API CALL DETAILS - Current params value: "${params.value}", settable: ${params.settable}, values: ${params.values ? JSON.stringify(params.values) : 'N/A'}`);
		
		try {
			// Use rate limiter to handle automatic retries (action valable max 1h via rateLimiter)
			const {rateLimiter} = await import("../rateLimiter");
			await rateLimiter.executeWithRetry(
				async () => {
					logger.debug(`[BaseModules.ts] => Executing setData: deviceD.setData("${def.managementPoint}", "${def.dataPoint}", "${dataPointPath}", ${JSON.stringify(data.value)}, {updateLocalData: true})`);
					await deviceD.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value, {updateLocalData: true});
				},
				`setData-${deviceId}-${def.managementPoint}-${def.dataPoint}-${dataPointPath}`,
				{
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 60000
				}
			);
			// Update cache with the device that has local data updated
			await cache.set(`device_${deviceId}`, deviceD, 10800000);
			logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath} and cache updated`);
			return true; // API call was made successfully
		} catch (setError) {
			logger.error(`[BaseModules.ts] => Error updating cloud for ${deviceId}: ${setError instanceof Error ? setError.message : String(setError)}`);
			if (setError instanceof Error && setError.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${setError.stack}`);
			}
			throw setError;
		}
	} catch (error) {
		logger.error(`[BaseModules.ts] => Error in validateDataPath: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[BaseModules.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

/**
 * Validates a candidate value against the constraints of a Daikin datapoint
 * (settable flag, allowed values, min/max) and adjusts it if needed.
 */
function checkData(params: any, value: any) {
	let result = {
		isOK: false,
		value: value
	}

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

/**
 * Generic conversion helper used by decorators to translate values
 * between internal representation and Daikin API representation.
 */
function convert(converter: number, value: any, to: number) {
	switch (converter) {
		case converterEnum.binary:
			if (to == 0) return convertBinary0(value);
			if (to == 1) return convertBinary1(value);
			break;
		case converterEnum.numeric:
			return parseFloat(value);
		case converterEnum.consumption:
			if (to != 0) return 0;
			return convertConsumption(value);
	}
}

// Converts "on"/"off" into boolean
function convertBinary0(value: string) {
	switch (value) {
		case 'on':
			return true
		case 'off':
			return false
	}
}

// Converts boolean into "on"/"off"
function convertBinary1(value: boolean) {
	switch (value) {
		case true:
			return 'on'
		case false:
			return 'off'
	}
}

/**
 * Aggregates an array of consumption samples and rounds the result.
 */
function convertConsumption(values: Array<number>) {
	if (!values || values.length === 0) {
		return 0;
	}
	let consumption =parseFloat(String(values.reduce((acc, currentValue) => acc + currentValue, 0)));
	return Math.round((consumption + Number.EPSILON) * 100) / 100
}

/**
 * Extracts a specific consumption bucket (day/week/month, heating/cooling)
 * from the raw Daikin consumption object.
 */
function getConsumptionData(values : any, consumptionT: number) {
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
			return values.heating.d.slice(12)
		case consumptionEnum.heatingWeek:
			if (!values.heating || !values.heating.w) {
				logger.debug(`[BaseModules.ts] => getConsumptionData: heating.w not available`);
				return [];
			}
			return values.heating.w.slice(7)
		case consumptionEnum.heatingMonth:
			if (!values.heating || !values.heating.m) {
				logger.debug(`[BaseModules.ts] => getConsumptionData: heating.m not available`);
				return [];
			}
			return values.heating.m.slice(12)
		case consumptionEnum.coolingDay:
			if (!values.cooling || !values.cooling.d) {
				logger.debug(`[BaseModules.ts] => getConsumptionData: cooling.d not available`);
				return [];
			}
			return values.cooling.d.slice(12)
		case consumptionEnum.coolingWeek:
			if (!values.cooling || !values.cooling.w) {
				logger.debug(`[BaseModules.ts] => getConsumptionData: cooling.w not available`);
				return [];
			}
			return values.cooling.w.slice(7)
		case consumptionEnum.coolingMonth:
			if (!values.cooling || !values.cooling.m) {
				logger.debug(`[BaseModules.ts] => getConsumptionData: cooling.m not available`);
				return [];
			}
			return values.cooling.m.slice(12)
		default:
			logger.debug(`[BaseModules.ts] => getConsumptionData: unknown consumptionT: ${consumptionT}`);
			return [];
	}
}

export {
	typeEnum,
	converterEnum,
	consumptionEnum,
	convertDaikinDevice,
	eventValue
}
