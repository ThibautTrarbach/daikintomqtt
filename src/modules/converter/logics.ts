import {PROPERTY_METADATA_CMD} from "../decorator";
import {generateCMD} from "./jeedom";
import {generateHADiscovery} from "./homeassistant";
import {publishToMQTT} from "../mqtt";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

async function makeDefineFile(moduleClass: any, device: DaikinCloudDevice | null) {
	try {
		// @ts-ignore
		let id = moduleClass._device?.id;
		
		if (!id) {
			logger.error(`[logics.ts] => Impossible de récupérer l'ID du device depuis moduleClass`);
			return;
		}
		
		let data = Reflect.getMetadata(PROPERTY_METADATA_CMD, moduleClass);
		
		if (!data) {
			logger.warn(`[logics.ts] => Aucune métadonnée trouvée pour le device ${id}`);
			return;
		}
		
		// Génération pour Jeedom
		if (config.system.jeedom) {
			try {
				logger.debug(`[logics.ts] => Génération de la configuration Jeedom pour le device ${id}`);
				let cmd = generateCMD(data, moduleClass, device);
				await publishToMQTT('jeedom/' + id, JSON.stringify(cmd));
				logger.debug(`[logics.ts] => Configuration Jeedom publiée avec succès pour le device ${id}`);
			} catch (jeedomError) {
				logger.error(`[logics.ts] => Erreur lors de la génération de la configuration Jeedom pour ${id}: ${jeedomError instanceof Error ? jeedomError.message : String(jeedomError)}`);
				if (jeedomError instanceof Error && jeedomError.stack) {
					logger.debug(`[logics.ts] => Stack trace: ${jeedomError.stack}`);
				}
			}
		}

		// Génération pour Home Assistant
		if (config.homeassistant?.enabled && device !== null) {
			try {
				const discoveryPrefix = config.homeassistant.discoveryPrefix || "homeassistant";
				logger.debug(`[logics.ts] => Génération de la configuration Home Assistant pour le device ${id} (prefix: ${discoveryPrefix})`);
				const discoveryConfigs = generateHADiscovery(data, moduleClass, device);
				
				// Publier chaque configuration de découverte
				for (const [componentType, configs] of Object.entries(discoveryConfigs)) {
					for (const [objectId, haConfig] of Object.entries(configs)) {
						const topic = `${discoveryPrefix}/${componentType}/${objectId}/config`;
						
						try {
							await new Promise<void>((resolve, reject) => {
								if (!global.mqttClient || !global.mqttClient.connected) {
									reject(new Error("Client MQTT non connecté"));
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
							
							logger.debug(`[logics.ts] => Configuration Home Assistant publiée: ${componentType}/${objectId}`);
						} catch (publishError) {
							logger.error(`[logics.ts] => Erreur lors de la publication de la configuration Home Assistant ${componentType}/${objectId}: ${publishError instanceof Error ? publishError.message : String(publishError)}`);
						}
					}
				}
				logger.debug(`[logics.ts] => Configuration Home Assistant générée avec succès pour le device ${id}`);
			} catch (haError) {
				logger.error(`[logics.ts] => Erreur lors de la génération de la configuration Home Assistant pour ${id}: ${haError instanceof Error ? haError.message : String(haError)}`);
				if (haError instanceof Error && haError.stack) {
					logger.debug(`[logics.ts] => Stack trace: ${haError.stack}`);
				}
			}
		}
	} catch (error) {
		logger.error(`[logics.ts] => Erreur critique dans makeDefineFile: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[logics.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}


export {
	makeDefineFile
}
