import {PROPERTY_METADATA_CMD} from "../decorator";
import {generateCMD} from "./jeedom";
import {generateHADiscovery} from "./homeassistant";
import {publishToMQTT} from "../mqtt";
import {DaikinCloudDevice} from "../../daikin-cloud";

async function makeDefineFile(moduleClass: any, device: DaikinCloudDevice | null) {
	try {
		// @ts-ignore
		let id = moduleClass._device?.id;
		
		if (!id) {
			logger.error(`[logics.ts] => Unable to retrieve device ID from moduleClass`);
			return;
		}
		
		let data = Reflect.getMetadata(PROPERTY_METADATA_CMD, moduleClass);
		
		if (!data) {
			logger.warn(`[logics.ts] => No metadata found for device ${id}`);
			return;
		}
		
		// Generation for Jeedom
		if (config.integration?.jeedom) {
			try {
				logger.debug(`[logics.ts] => Generating Jeedom configuration for device ${id}`);
				let cmd = generateCMD(data, moduleClass, device);
				await publishToMQTT('jeedom/' + id, JSON.stringify(cmd));
				logger.debug(`[logics.ts] => Jeedom configuration published successfully for device ${id}`);
			} catch (jeedomError) {
				logger.error(`[logics.ts] => Error generating Jeedom configuration for ${id}: ${jeedomError instanceof Error ? jeedomError.message : String(jeedomError)}`);
				if (jeedomError instanceof Error && jeedomError.stack) {
					logger.debug(`[logics.ts] => Stack trace: ${jeedomError.stack}`);
				}
			}
		}

		// Generation for Home Assistant
		if (config.integration?.homeassistant?.enabled && device !== null) {
			try {
				const discoveryPrefix = config.integration.homeassistant.discoveryPrefix || "homeassistant";
				logger.debug(`[logics.ts] => Generating Home Assistant configuration for device ${id} (prefix: ${discoveryPrefix})`);
				const discoveryConfigs = generateHADiscovery(data, moduleClass, device);
				
				// Publish each discovery configuration
				for (const [componentType, configs] of Object.entries(discoveryConfigs)) {
					for (const [objectId, haConfig] of Object.entries(configs)) {
						const topic = `${discoveryPrefix}/${componentType}/${objectId}/config`;
						
						try {
							await new Promise<void>((resolve, reject) => {
								if (!global.mqttClient || !global.mqttClient.connected) {
									reject(new Error("MQTT client not connected"));
									return;
								}
								
								global.mqttClient.publish(topic, JSON.stringify(haConfig), {qos: 0, retain: true}, (error) => {
									if (error) {
										reject(error);
									} else {
										resolve();
									}
								});
							});
							
							logger.debug(`[logics.ts] => Home Assistant configuration published: ${componentType}/${objectId}`);
						} catch (publishError) {
							logger.error(`[logics.ts] => Error publishing Home Assistant configuration ${componentType}/${objectId}: ${publishError instanceof Error ? publishError.message : String(publishError)}`);
						}
					}
				}
				logger.debug(`[logics.ts] => Home Assistant configuration generated successfully for device ${id}`);
			} catch (haError) {
				logger.error(`[logics.ts] => Error generating Home Assistant configuration for ${id}: ${haError instanceof Error ? haError.message : String(haError)}`);
				if (haError instanceof Error && haError.stack) {
					logger.debug(`[logics.ts] => Stack trace: ${haError.stack}`);
				}
			}
		}
	} catch (error) {
		logger.error(`[logics.ts] => Critical error in makeDefineFile: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[logics.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}


export {
	makeDefineFile
}
