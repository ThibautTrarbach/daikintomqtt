"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDefineFile = makeDefineFile;
const decorator_1 = require("../decorator");
const jeedom_1 = require("./jeedom");
const mqtt_1 = require("../mqtt");
async function makeDefineFile(moduleClass, device) {
    let id = moduleClass._device.id;
    if (config.system.jeedom) {
        let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, moduleClass);
        let cmd = (0, jeedom_1.generateCMD)(data, moduleClass, device);
        await (0, mqtt_1.publishToMQTT)('system/jeedom/' + id, JSON.stringify(cmd));
    }
}
