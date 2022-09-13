import {PROPERTY_METADATA_DAIKIN, PROPERTY_METADATA_DAIKIN_DEVICE} from "../decorator";
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

function convertDaikinDevice(device: any, moduleClass: object) {
	let data:object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, moduleClass);
	createDeviceInfo(device, moduleClass)
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
				switch (value.converter) {
					case converterEnum.binary:
						daikinValue = convertBinary(daikinValue);
						break;
				}
			}
		} catch (e) {
			daikinValue = undefined;
		}

		// @ts-ignore
		moduleClass[key] = daikinValue;
	})
}

function createDeviceInfo(device: any, moduleClass: object) {
	let data:object = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, moduleClass);
	Object.entries(data).forEach(entry1 => {
		const [key1, value1] = entry1;
		Object.entries(value1 as object).forEach(entry2 => {
			const [key2, value2] = entry2;
			let deviceValue;
			if (value2.dataPointPath !== undefined) {
				deviceValue = device.getData(value2.managementPoint, value2.dataPoint, value2.dataPointPath).value
			} else {
				deviceValue = device.getData(value2.managementPoint, value2.dataPoint).value
			}
			// @ts-ignore
			moduleClass[key1][key2] = deviceValue;
		})
		// @ts-ignore
		moduleClass[key1]['id'] = device.getId();
	})
}

function convertBinary(value: string) {
	switch (value) {
		case 'on':
			return true
		case 'off':
			return false
	}
}

export {
	typeEnum,
	converterEnum,
	convertDaikinDevice
}
