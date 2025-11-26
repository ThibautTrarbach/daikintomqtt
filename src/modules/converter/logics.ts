import {PROPERTY_METADATA_CMD} from "../decorator";
import {generateCMD} from "./jeedom";
import {generateHADiscovery} from "./homeassistant";
import {publishToMQTT} from "../mqtt";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

async function makeDefineFile(moduleClass: any, device: DaikinCloudDevice | null) {
	// @ts-ignore
	let id = moduleClass._device.id;
	let data = Reflect.getMetadata(PROPERTY_METADATA_CMD, moduleClass);
	
	// Génération pour Jeedom
	if (config.system.jeedom) {
		let cmd = generateCMD(data, moduleClass, device)
		await publishToMQTT('jeedom/' + id, JSON.stringify(cmd))

	}

	// Génération pour Home Assistant
	if (config.homeassistant?.enabled) {
		const discoveryPrefix = config.homeassistant.discoveryPrefix || "homeassistant";
		const discoveryConfigs = generateHADiscovery(data, moduleClass, device);
		
		// Publier chaque configuration de découverte
		for (const [componentType, configs] of Object.entries(discoveryConfigs)) {
			for (const [objectId, haConfig] of Object.entries(configs)) {
				const topic = `${discoveryPrefix}/${componentType}/${objectId}/config`;
				global.mqttClient.publish(topic, JSON.stringify(haConfig), {qos: 0, retain: true}, (error) => {
					if (error) {
						logger.error(`[logics.ts] => Error publishing ${componentType} discovery for ${objectId}: ${error}`);
					} else {
						logger.debug(`[logics.ts] => Published ${componentType} discovery for ${objectId}`);
					}
				});
			}
		}
	}
}


export {
	makeDefineFile
}
