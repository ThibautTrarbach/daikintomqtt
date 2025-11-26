"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDefineFile = makeDefineFile;
const decorator_1 = require("../decorator");
const jeedom_1 = require("./jeedom");
const homeassistant_1 = require("./homeassistant");
const mqtt_1 = require("../mqtt");
async function makeDefineFile(moduleClass, device) {
    let id = moduleClass._device.id;
    let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, moduleClass);
    if (config.system.jeedom) {
        let cmd = (0, jeedom_1.generateCMD)(data, moduleClass, device);
        await (0, mqtt_1.publishToMQTT)('system/jeedom/' + id, JSON.stringify(cmd));
    }
    if (config.homeassistant?.enabled) {
        const discoveryPrefix = config.homeassistant.discoveryPrefix || "homeassistant";
        const discoveryConfigs = (0, homeassistant_1.generateHADiscovery)(data, moduleClass, device);
        for (const [componentType, configs] of Object.entries(discoveryConfigs)) {
            for (const [objectId, haConfig] of Object.entries(configs)) {
                const topic = `${discoveryPrefix}/${componentType}/${objectId}/config`;
                global.mqttClient.publish(topic, JSON.stringify(haConfig), { qos: 0, retain: true }, (error) => {
                    if (error) {
                        logger.error(`[logics.ts] => Error publishing ${componentType} discovery for ${objectId}: ${error}`);
                    }
                    else {
                        logger.debug(`[logics.ts] => Published ${componentType} discovery for ${objectId}`);
                    }
                });
            }
        }
    }
}
//# sourceMappingURL=logics.js.map