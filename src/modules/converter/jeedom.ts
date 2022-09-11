import {ModulesDescriptionMetadata} from "../../types";

function generateCMD(data: object) {
	let cmd: { name: string; logicalID: string; generic_type: string | null; type: string; subType: string; unite: string | null; minValue: number | null; maxValue: number | null; }[] = [];

	Object.entries(data).forEach(entry => {
		const [key, value] = entry;
		let info = generateCMDInfo(key, value);
		cmd.push(info)

		if (value.settable) {
			let actions = generateCMDAction(key, value);
			if (actions != undefined) cmd = cmd.concat(actions)
		}


	});

	return cmd;
}

function generateCMDInfo(
	id: string,
	value:ModulesDescriptionMetadata
) {

	let name = value.name
	let generic_type = ((value. generic_type != undefined) ? value. generic_type : null)
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
		minValue,
		maxValue
	};
}

function generateCMDAction(
	id: string,
	value:ModulesDescriptionMetadata
) {
	switch (value.type) {
		case 0:
			break;
		case 1:
			break
		case 2:
			 return generateActionBinary(id, value)
	}
}

function generateActionBinary(
	id: string,
	value:ModulesDescriptionMetadata
) {
	let name = value.name

	let cmd_on = {
		name: name + " ON",
		logicalID: id+"_ON",
		generic_type: "ENERGY_ON",
		isHistorized: null,
		type: "action",
		subType: "other",
		unite: null,
		isVisible: true,
		value: id,
		minValue: null,
		maxValue: null,
		template: "core::prise",
		action: "on"
	}
	let cmd_off = {
		name: name + " OFF",
		logicalID: id+"_OFF",
		generic_type: "ENERGY_OFF",
		isHistorized: null,
		type: "action",
		subType: "other",
		unite: null,
		isVisible: true,
		value: id,
		minValue: null,
		maxValue: null,
		template: "core::prise",
		action: "off"
	}

	return [cmd_on, cmd_off]
}


export {
	generateCMD
}
