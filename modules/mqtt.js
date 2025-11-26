"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMQTTClient = loadMQTTClient;
exports.publishToMQTT = publishToMQTT;
exports.publishConfig = publishConfig;
const mqtt_1 = require("mqtt");
async function getOptions() {
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    let option = {
        clientId,
        clean: true,
        connectTimeout: config.mqtt.connectTimeout,
        username: (config.mqtt.username != null) ? config.mqtt.username : undefined,
        password: (config.mqtt.password != null) ? config.mqtt.password : undefined,
        reconnectPeriod: config.mqtt.reconnectPeriod,
    };
    return option;
}
async function loadMQTTClient() {
    let options = await getOptions();
    const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
    global.mqttClient = (0, mqtt_1.connect)(mqttHost, options);
}
async function publishToMQTT(topic, data) {
    try {
        const cachedData = await cache.get(topic);
        if (cachedData === data)
            return;
        await cache.set(topic, data);
        return new Promise((resolve, reject) => {
            const fullTopic = config.mqtt.topic + "/" + topic;
            mqttClient.publish(fullTopic, data, { qos: 0, retain: true }, (error) => {
                if (error) {
                    logger.error(`[mqtt.ts] => Error publishing to ${fullTopic}: ${error}`);
                    reject(error);
                }
                else {
                    logger.debug(`[mqtt.ts] => Send Data to MQTT : ${topic}`);
                    resolve();
                }
            });
        });
    }
    catch (error) {
        logger.error(`[mqtt.ts] => Error in publishToMQTT for topic ${topic}: ${error}`);
        throw error;
    }
}
async function publishConfig(key, value) {
    await publishToMQTT('system/bridge/' + key, value.toString());
}
//# sourceMappingURL=mqtt.js.map