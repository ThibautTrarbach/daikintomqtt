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
						daikinValue = getConsumptionData(datavalue, value.consumptionT)
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

	await updateDaikinDevice(device as DaikinCloudDevice, gatewayClass);

	// Handle post-action behavior based on the configured refresh mode
	try {
		const mode = config.system?.actionRefreshMode ?? 1;
		const now = Math.floor(Date.now() / 1000);
		const deviceId = (device as DaikinCloudDevice).getId();

		// Modes 2 and 3: immediate optimistic update (cache + MQTT)
		if (mode === 2 || mode === 3) {
			try {
				await cache.set(`device_${deviceId}`, device, 10800000);
				const payload = JSON.stringify(gatewayClass);
				await publishToMQTT(deviceId, payload);
				logger.debug(`[BaseModules.ts] => Post-action optimistic update published for device ${deviceId} (mode=${mode})`);
			} catch (e) {
				logger.error(`[BaseModules.ts] => Error during optimistic post-action update for device ${deviceId}: ${e instanceof Error ? e.message : String(e)}`);
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
 * Iterates over all mapped properties and pushes updated values
 * from the gateway instance back to the Daikin cloud device.
 */
async function updateDaikinDevice(device: DaikinCloudDevice, gatewayClass: Gateways) {
	let data: object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gatewayClass);
	
	for (const entry of Object.entries(data)) {
		const [key, value] = entry;

		try {
			if (value.multiple !== true) {
				if (value.dataPointPath !== undefined) {
					await validateDataPath(device, value, value.dataPointPath, gatewayClass[key])
				} else {
					await validateData(device, value, gatewayClass[key])
				}
			} else if (value.multiple === true) {
				let multipleValue: any;
				if (value.multipleValue.dataPointPath !== undefined) multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value
				else multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, null).value

				let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
				await validateDataPath(device, value, dataPointPath, gatewayClass[key])
			}
		} catch (e) {
			logger.error(`[BaseModules.ts] => Error updating device ${device.getId()} for property ${key}: ${e instanceof Error ? e.message : String(e)}`);
			if (e instanceof Error && e.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${e.stack}`);
			}
			// Continue with other properties even on error
			continue;
		}
	}
}

/**
 * Validates and sends a single value to the cloud for a simple datapoint
 * (without dataPointPath), using rate-limited retries.
 */
async function validateData(device: DaikinCloudDevice, def: ModulePropertyMetadata, value: any) {
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

		const deviceD = await cache.get(`device_${deviceId}`) as DaikinCloudDevice | undefined;
		
		if (!deviceD) {
			logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
			return;
		}

		logger.info(`[BaseModules.ts] => API CALL - setData (reason: action_mqtt_no_dataPointPath) for ${deviceId} - ${def.managementPoint}/${def.dataPoint}: ${data.value}`);
		
		try {
			// Use rate limiter to handle automatic retries (max total duration enforced by RateLimiter)
			const {rateLimiter} = await import("../rateLimiter");
			await rateLimiter.executeWithRetry(
				async () => {
					await deviceD.setData(def.managementPoint, def.dataPoint, null, data.value);
				},
				`setData-${deviceId}-${def.managementPoint}-${def.dataPoint}`,
				{
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 60000
				}
			);
			logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
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
 */
async function validateDataPath(device: DaikinCloudDevice, def: ModulePropertyMetadata, dataPointPath: string, value: any) {
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

		const deviceD = await cache.get(`device_${deviceId}`) as DaikinCloudDevice | undefined;
		
		if (!deviceD) {
			logger.error(`[BaseModules.ts] => Device ${deviceId} not found in cache`);
			return;
		}

		logger.info(`[BaseModules.ts] => API CALL - setData (reason: action_mqtt_with_dataPointPath='${dataPointPath}') for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}: ${data.value}`);
		
		try {
			// Use rate limiter to handle automatic retries (action valable max 1h via rateLimiter)
			const {rateLimiter} = await import("../rateLimiter");
			await rateLimiter.executeWithRetry(
				async () => {
					await deviceD.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value);
				},
				`setData-${deviceId}-${def.managementPoint}-${def.dataPoint}-${dataPointPath}`,
				{
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 60000
				}
			);
			logger.debug(`[BaseModules.ts] => Update successful for ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}`);
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
	let consumption =parseFloat(String(values.reduce((acc, currentValue) => acc + currentValue, 0)));
	return Math.round((consumption + Number.EPSILON) * 100) / 100
}

/**
 * Extracts a specific consumption bucket (day/week/month, heating/cooling)
 * from the raw Daikin consumption object.
 */
function getConsumptionData(values : any, consumptionT: number) {
	switch (consumptionT) {
		case consumptionEnum.heatingDay:
			return values.heating.d
		case consumptionEnum.heatingWeek:
			return values.heating.w
		case consumptionEnum.heatingMonth:
			return values.heating.m
		case consumptionEnum.coolingDay:
			return values.cooling.d
		case consumptionEnum.coolingWeek:
			return values.cooling.w
		case consumptionEnum.coolingMonth:
			return values.cooling.m
	}
}

export {
	typeEnum,
	converterEnum,
	consumptionEnum,
	convertDaikinDevice,
	eventValue
}
