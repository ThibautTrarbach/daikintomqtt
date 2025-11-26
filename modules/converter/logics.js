"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDefineFile = makeDefineFile;
const decorator_1 = require("../decorator");
const jeedom_1 = require("./jeedom");
const homeassistant_1 = require("./homeassistant");
const mqtt_1 = require("../mqtt");
async function makeDefineFile(moduleClass, device) {
    try {
        let id = moduleClass._device?.id;
        if (!id) {
            logger.error(`[logics.ts] => Unable to retrieve device ID from moduleClass`);
            return;
        }
        let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, moduleClass);
        if (!data) {
            logger.warn(`[logics.ts] => No metadata found for device ${id}`);
            return;
        }
        if (config.system.jeedom) {
            try {
                logger.debug(`[logics.ts] => Generating Jeedom configuration for device ${id}`);
                let cmd = (0, jeedom_1.generateCMD)(data, moduleClass, device);
                await (0, mqtt_1.publishToMQTT)('jeedom/' + id, JSON.stringify(cmd));
                logger.debug(`[logics.ts] => Jeedom configuration published successfully for device ${id}`);
            }
            catch (jeedomError) {
                logger.error(`[logics.ts] => Error generating Jeedom configuration for ${id}: ${jeedomError instanceof Error ? jeedomError.message : String(jeedomError)}`);
                if (jeedomError instanceof Error && jeedomError.stack) {
                    logger.debug(`[logics.ts] => Stack trace: ${jeedomError.stack}`);
                }
            }
        }
        if (config.homeassistant?.enabled && device !== null) {
            try {
                const discoveryPrefix = config.homeassistant.discoveryPrefix || "homeassistant";
                logger.debug(`[logics.ts] => Generating Home Assistant configuration for device ${id} (prefix: ${discoveryPrefix})`);
                const discoveryConfigs = (0, homeassistant_1.generateHADiscovery)(data, moduleClass, device);
                for (const [componentType, configs] of Object.entries(discoveryConfigs)) {
                    for (const [objectId, haConfig] of Object.entries(configs)) {
                        const topic = `${discoveryPrefix}/${componentType}/${objectId}/config`;
                        try {
                            await new Promise((resolve, reject) => {
                                if (!global.mqttClient || !global.mqttClient.connected) {
                                    reject(new Error("MQTT client not connected"));
                                    return;
                                }
                                global.mqttClient.publish(topic, JSON.stringify(haConfig), { qos: 0, retain: true }, (error) => {
                                    if (error) {
                                        reject(error);
                                    }
                                    else {
                                        resolve();
                                    }
                                });
                            });
                            logger.debug(`[logics.ts] => Home Assistant configuration published: ${componentType}/${objectId}`);
                        }
                        catch (publishError) {
                            logger.error(`[logics.ts] => Error publishing Home Assistant configuration ${componentType}/${objectId}: ${publishError instanceof Error ? publishError.message : String(publishError)}`);
                        }
                    }
                }
                logger.debug(`[logics.ts] => Home Assistant configuration generated successfully for device ${id}`);
            }
            catch (haError) {
                logger.error(`[logics.ts] => Error generating Home Assistant configuration for ${id}: ${haError instanceof Error ? haError.message : String(haError)}`);
                if (haError instanceof Error && haError.stack) {
                    logger.debug(`[logics.ts] => Stack trace: ${haError.stack}`);
                }
            }
        }
    }
    catch (error) {
        logger.error(`[logics.ts] => Critical error in makeDefineFile: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[logics.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
//# sourceMappingURL=logics.js.map