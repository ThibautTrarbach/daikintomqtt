import {PROPERTY_METADATA_CMD} from "../decorator";
import {generateCMD} from "./jeedom";
import {publishToMQTT} from "../mqtt";

async function makeDefineFile(moduleClass: object) {
	// @ts-ignore
	let id = moduleClass._device.id;
	if (config.system.jeedom) {
		let data = Reflect.getMetadata(PROPERTY_METADATA_CMD, moduleClass);
		let cmd = generateCMD(data, moduleClass)

		await publishToMQTT( 'system/jeedom/'+id, JSON.stringify(cmd))
	}
}


export {
	makeDefineFile
}
