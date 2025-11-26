import {PROPERTY_METADATA_DAIKIN, PROPERTY_METADATA_DAIKIN_DEVICE} from "../decorator";
import {Gateways, ModulePropertyMetadata} from "../../types";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

const typeEnum = Object.freeze({
	numeric: 0,
	string: 1,
	binary: 2,
});

const converterEnum = Object.freeze({
	numeric: 0,
	string: 1,
	binary: 2,
	consumption: 3
});

const consumptionEnum = Object.freeze({
	heatingDay: 0,
	heatingWeek: 1,
	heatingMonth: 2,
	coolingDay: 3,
	coolingWeek: 4,
	coolingMonth: 5
});

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
						logger.debug("[BaseModules.ts] => Récupération consommation avec dataPointPath")
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
			// Ne logger que si ce n'est pas une erreur "propriété non disponible" (normale pour certains devices)
			const errorMessage = e instanceof Error ? e.message : String(e);
			if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("reading 'value'")) {
				logger.debug(`[BaseModules.ts] => Erreur lors de la récupération de la valeur pour ${key}: ${errorMessage}`);
			}
			daikinValue = undefined;
		}

		// @ts-ignore
		gatewayClass[key] = daikinValue;
	})
}

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
				// Ne logger que si ce n'est pas une erreur "propriété non disponible" (normale pour certains devices)
				const errorMessage = e instanceof Error ? e.message : String(e);
				if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("reading 'value'")) {
					logger.debug(`[BaseModules.ts] => Erreur lors de la récupération de la valeur device pour ${key1}/${key2}: ${errorMessage}`);
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

async function eventValue(device: any, gatewayClass: Gateways, events: object) {
	Object.entries(events).forEach(entry => {
		const [key, value] = entry;
		// @ts-ignore
		gatewayClass[key] = value
	})

	await updateDaikinDevice(device, gatewayClass)
}

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
			logger.error(`[BaseModules.ts] => Erreur lors de la mise à jour du device ${device.getId()} pour la propriété ${key}: ${e instanceof Error ? e.message : String(e)}`);
			if (e instanceof Error && e.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${e.stack}`);
			}
			// Continuer avec les autres propriétés même en cas d'erreur
			continue;
		}
	}
}

async function validateData(device: DaikinCloudDevice, def: ModulePropertyMetadata, value: any) {
	try {
		const deviceId = device.getId();
		let params = device.getData(def.managementPoint, def.dataPoint, null);
		
		if (!params) {
			logger.warn(`[BaseModules.ts] => Paramètres non trouvés pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
			return;
		}

		if (def.converter !== undefined) {
			value = convert(def.converter, value, 1);
		}
		
		let data = checkData(params, value);
		if (!data.isOK) {
			logger.debug(`[BaseModules.ts] => Validation échouée pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}, valeur: ${value}`);
			return;
		}

		if (params.value == data.value) {
			logger.debug(`[BaseModules.ts] => Valeur identique pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}, pas de mise à jour nécessaire`);
			return;
		}

		const deviceD = await cache.get(`device_${deviceId}`) as DaikinCloudDevice | undefined;
		
		if (!deviceD) {
			logger.error(`[BaseModules.ts] => Device ${deviceId} non trouvé dans le cache`);
			return;
		}

		logger.info(`[BaseModules.ts] => Envoi de la requête au cloud pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}: ${data.value}`);
		
		try {
			// Utiliser le rate limiter pour gérer les retries automatiques
			const {rateLimiter} = await import("../rateLimiter");
			await rateLimiter.executeWithRetry(
				async () => {
					await deviceD.setData(def.managementPoint, def.dataPoint, null, data.value);
					await cache.set('needRefresh', Math.floor(Date.now() / 1000));
				},
				`setData-${deviceId}-${def.managementPoint}-${def.dataPoint}`,
				{
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 60000
				}
			);
			logger.debug(`[BaseModules.ts] => Mise à jour réussie pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}`);
		} catch (setError) {
			logger.error(`[BaseModules.ts] => Erreur lors de la mise à jour du cloud pour ${deviceId}: ${setError instanceof Error ? setError.message : String(setError)}`);
			if (setError instanceof Error && setError.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${setError.stack}`);
			}
			throw setError;
		}
	} catch (error) {
		logger.error(`[BaseModules.ts] => Erreur dans validateData: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[BaseModules.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function validateDataPath(device: DaikinCloudDevice, def: ModulePropertyMetadata, dataPointPath: string, value: any) {
	try {
		const deviceId = device.getId();
		let params = device.getData(def.managementPoint, def.dataPoint, dataPointPath);
		
		if (!params) {
			logger.warn(`[BaseModules.ts] => Paramètres non trouvés pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}`);
			return;
		}

		if (def.converter !== undefined) {
			value = convert(def.converter, value, 1);
		}
		
		let data = checkData(params, value);
		if (!data.isOK) {
			logger.debug(`[BaseModules.ts] => Validation échouée pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}, valeur: ${value}`);
			return;
		}

		if (params.value == data.value) {
			logger.debug(`[BaseModules.ts] => Valeur identique pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}, pas de mise à jour nécessaire`);
			return;
		}

		const deviceD = await cache.get(`device_${deviceId}`) as DaikinCloudDevice | undefined;
		
		if (!deviceD) {
			logger.error(`[BaseModules.ts] => Device ${deviceId} non trouvé dans le cache`);
			return;
		}

		logger.info(`[BaseModules.ts] => Envoi de la requête au cloud pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}: ${data.value}`);
		
		try {
			// Utiliser le rate limiter pour gérer les retries automatiques
			const {rateLimiter} = await import("../rateLimiter");
			await rateLimiter.executeWithRetry(
				async () => {
					await deviceD.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value);
					await cache.set('needRefresh', Math.floor(Date.now() / 1000));
				},
				`setData-${deviceId}-${def.managementPoint}-${def.dataPoint}-${dataPointPath}`,
				{
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 60000
				}
			);
			logger.debug(`[BaseModules.ts] => Mise à jour réussie pour ${deviceId} - ${def.managementPoint}/${def.dataPoint}/${dataPointPath}`);
		} catch (setError) {
			logger.error(`[BaseModules.ts] => Erreur lors de la mise à jour du cloud pour ${deviceId}: ${setError instanceof Error ? setError.message : String(setError)}`);
			if (setError instanceof Error && setError.stack) {
				logger.debug(`[BaseModules.ts] => Stack trace: ${setError.stack}`);
			}
			throw setError;
		}
	} catch (error) {
		logger.error(`[BaseModules.ts] => Erreur dans validateDataPath: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[BaseModules.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

function checkData(params: any, value: any) {
	let result = {
		isOK: false,
		value: value
	}

	if (params == null) {
		logger.debug(`[BaseModules.ts] => Paramètres null dans checkData`);
		return result;
	}

	if (!params.settable) {
		logger.debug(`[BaseModules.ts] => Propriété non settable dans checkData`);
		return result;
	}

	if (params.values && !params.values.includes(value)) {
		logger.debug(`[BaseModules.ts] => Valeur ${value} non dans la liste des valeurs autorisées: ${JSON.stringify(params.values)}`);
		return result;
	}

	if (params.minValue !== undefined && value < params.minValue) {
		logger.debug(`[BaseModules.ts] => Valeur ${value} inférieure au minimum ${params.minValue}, ajustement`);
		result.value = params.minValue;
	}

	if (params.maxValue !== undefined && params.maxValue < result.value) {
		logger.debug(`[BaseModules.ts] => Valeur ${result.value} supérieure au maximum ${params.maxValue}, ajustement`);
		result.value = params.maxValue;
	}

	if (result.value === params.value) {
		logger.debug(`[BaseModules.ts] => Valeur identique à la valeur actuelle, pas de changement nécessaire`);
		return result;
	}

	result.isOK = true;
	return result;
}

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

function convertBinary0(value: string) {
	switch (value) {
		case 'on':
			return true
		case 'off':
			return false
	}
}

function convertBinary1(value: boolean) {
	switch (value) {
		case true:
			return 'on'
		case false:
			return 'off'
	}
}

function convertConsumption(values: Array<number>) {
	let consumption =parseFloat(String(values.reduce((acc, currentValue) => acc + currentValue, 0)));
	return Math.round((consumption + Number.EPSILON) * 100) / 100
}

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
