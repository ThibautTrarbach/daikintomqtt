import {PROPERTY_METADATA_DAIKIN, PROPERTY_METADATA_DAIKIN_DEVICE} from "../decorator";
import {Gateways, ModulePropertyMetadata} from "../../types";

const typeEnum = Object.freeze({
	numeric: 0,
	string: 1,
	binary: 2,
});

const converterEnum = Object.freeze({
	numeric: 0,
	string: 1,
	binary: 2,
});

function convertDaikinDevice(device: any, gatewayClass: Gateways) {
	let data: object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gatewayClass);
	createDeviceInfo(device, gatewayClass)
	Object.entries(data).forEach(entry => {
		const [key, value] = entry;
		let daikinValue;

		try {
			if (value.multiple == undefined && value.multiple !== true) {
				if (value.dataPointPath !== undefined) daikinValue = device.getData(value.managementPoint, value.dataPoint, value.dataPointPath).value
				else daikinValue = device.getData(value.managementPoint, value.dataPoint).value
			} else if (value.multiple == true) {
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

async function updateDaikinDevice(device: any, gatewayClass: Gateways) {
	let data: object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gatewayClass);
	Object.entries(data).forEach(entry => {
		const [key, value] = entry;

		try {
			if (value.multiple == undefined && value.multiple !== true) {
				if (value.dataPointPath !== undefined) {
					// @ts-ignore
					validateDataPath(device, value, value.dataPointPath, gatewayClass[key])
				} else {
					// @ts-ignore
					validateData(device, value, gatewayClass[key])
				}
			} else if (value.multiple == true) {
				let multipleValue;
				if (value.multipleValue.dataPointPath !== undefined) multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint, value.multipleValue.dataPointPath).value
				else multipleValue = device.getData(value.multipleValue.managementPoint, value.multipleValue.dataPoint).value

				let dataPointPath = value.dataPointPath.replace("#value#", multipleValue);
				// @ts-ignore
				validateDataPath(device, value, dataPointPath, gatewayClass[key])
			}
		} catch (e) {
			logger.error(e)
			return
		}
	})
	await device.updateData();
}

async function validateData(device: any, def: ModulePropertyMetadata, value: any) {
	let params = device.getData(def.managementPoint, def.dataPoint);
	if (def.converter !== undefined) value = convert(def.converter, value, 1)
	let data = checkData(params, value)
	if (!data.isOK) return;

	await device.setData(def.managementPoint, def.dataPoint, data.value);
}

async function validateDataPath(device: any, def: ModulePropertyMetadata, dataPointPath: string, value: any) {

	let params = device.getData(def.managementPoint, def.dataPoint, dataPointPath);
	if (def.converter !== undefined) value = convert(def.converter, value, 1)
	let data = checkData(params, value)
	if (!data.isOK) return;

	await device.setData(def.managementPoint, def.dataPoint, dataPointPath, data.value)
}

function checkData(params: any, value: any) {
	let result = {
		isOK: false,
		value: value
	}

	if (params == null) return result;

	if (!params.settable) return result;
	if (params.values && !params.values.includes(value)) return result;
	if (value < params.minValue) result.value = params.minValue;
	if (params.maxValue < value) result.value = params.maxValue;
	if (result.value === params.value) return result;

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

export {
	typeEnum,
	converterEnum,
	convertDaikinDevice,
	eventValue
}
