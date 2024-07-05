import {ModulesDescriptionMetadata} from "../../types";
import {typeEnum} from "../gateway";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

function generateCMD(data: object, modules: object, device: DaikinCloudDevice) {
	let cmd: any[] = [];
	Object.entries(data).forEach(entry => {
		try {
			let [key, value] = entry;

			if (modules[key] !== undefined && modules[key] !== null) {
				if (value.type == typeEnum.numeric && value.minMaxValue !== undefined) {
					let minmax = getMinMaxValue(value, device)
					value.minValue = minmax.min
					value.maxValue = minmax.max
				}

				let info = generateCMDInfo(key, value);
				cmd.push(info)

				if (value.settable) {
					let actions = generateCMDAction(key, value);
					if (actions != undefined) cmd = cmd.concat(actions)
				}
			}
		} catch (e) {
			console.log(e)
		}
	});

	return cmd;
}

function getMinMaxValue(value: any, device: DaikinCloudDevice) {
	let min: null | number = null
	let max: null | number = null

	if (value.minMaxValue.multiple == true) {
		let multipleValues: any

		if (value.minMaxValue.multipleValue.dataPointPath !== undefined) multipleValues = device.getData(value.minMaxValue.multipleValue.managementPoint, value.minMaxValue.multipleValue.dataPoint, value.minMaxValue.multipleValue.dataPointPath).values
		else multipleValues = device.getData(value.minMaxValue.multipleValue.managementPoint, value.minMaxValue.multipleValue.dataPoint, null).values

		for (let i = 0; i < multipleValues.length; i++) {
			let dataPointPath = value.minMaxValue.dataPointPath.replace("#value#", multipleValues[i]);
			let data = device.getData(value.minMaxValue.managementPoint, value.minMaxValue.dataPoint, dataPointPath)
			if (min !== null && data.minValue < min ) min = data.minValue
			if (max !== null && data.maxValue > max ) max = data.maxValue
		}
	} else {
		let data = device.getData(value.minMaxValue.managementPoint, value.minMaxValue.dataPoint, value.minMaxValue.dataPointPath)
		if (data !== null && data !== undefined) {
			min = data.minValue
			max = data.maxValue
		}
	}
	return {min, max}
}

function generateCMDInfo(
	id: string,
	value: ModulesDescriptionMetadata
) {

	let name = value.name
	let generic_type = ((value.generic_type != undefined) ? value.generic_type : null)
	let minValue = ((value.minValue != undefined) ? value.minValue : null)
	let maxValue = ((value.maxValue != undefined) ? value.maxValue : null)
	let unite = ((value.unite != undefined) ? value.unite : null)
	let type = "";
	switch (value.type) {
		case 0:
			type = "numeric";
			break;
		case 1:
			type = "string"
			break
		case 2:
			type = "binary"
	}


	return {
		name,
		logicalID: id,
		generic_type,
		type: "info",
		subType: type,
		unite,
		isVisible: false,
		minValue,
		maxValue
	};
}

function generateCMDAction(
	id: string,
	value: ModulesDescriptionMetadata
) {
	switch (value.type) {
		case typeEnum.numeric:
			return generateActionNumeric(id, value)
		case typeEnum.string:
			return generateActionSelect(id, value)
		case typeEnum.binary:
			return generateActionBinary(id, value)
	}
}

function generateActionBinary(
	id: string,
	value: ModulesDescriptionMetadata
) {
	let name = value.name

	let cmd_on = {
		name: name + " ON",
		logicalID: id + "_ON",
		generic_type: "ENERGY_ON",
		isHistorized: null,
		type: "action",
		subType: "other",
		unite: null,
		isVisible: true,
		value: id,
		listValue: null,
		minValue: null,
		maxValue: null,
		template: "core::prise"
	}
	let cmd_off = {
		name: name + " OFF",
		logicalID: id + "_OFF",
		generic_type: "ENERGY_OFF",
		isHistorized: null,
		type: "action",
		subType: "other",
		unite: null,
		isVisible: true,
		value: id,
		listValue: null,
		minValue: null,
		maxValue: null,
		template: "core::prise"
	}

	return [cmd_on, cmd_off]
}

function generateActionNumeric(
	id: string,
	value: ModulesDescriptionMetadata
) {
	let name = value.name
	let minValue = ((value.minValue != undefined) ? value.minValue : null)
	let maxValue = ((value.maxValue != undefined) ? value.maxValue : null)

	let cmd_slider = {
		name: name + " Slider",
		logicalID: id + "_Slider",
		type: "action",
		subType: "slider",
		unite: null,
		isVisible: true,
		isHistorized: null,
		value: id,
		listValue: null,
		minValue: minValue,
		maxValue: maxValue,
		template: null
	}

	return [cmd_slider]
}

function generateActionSelect(
	id: string,
	value: ModulesDescriptionMetadata
) {
	let name = value.name
	let values = ((value.values != undefined) ? value.values : null)

	let listValue: any = "" as string;

	if (values !== null) {
		Object.entries(values).forEach(entry => {
			const [key, value] = entry;
			if (listValue != "") listValue = listValue + ";"
			listValue = listValue + value + "|" + value
		})
	} else {
		listValue = null;
	}

	let cmd_slider = {
		name: name + " Select",
		logicalID: id + "_Select",
		type: "action",
		subType: "select",
		unite: null,
		isVisible: true,
		isHistorized: null,
		value: id,
		listValue: listValue,
		minValue: null,
		maxValue: null,
		template: null
	}

	return [cmd_slider]
}

export {
	generateCMD
}
