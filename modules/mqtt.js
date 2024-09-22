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
    if (await cache.get(topic) == data)
        return;
    await cache.set(topic, data);
    mqttClient.publish(config.mqtt.topic + "/" + topic, data, { qos: 0, retain: true }, (error) => {
        logger.debug("Send Data to MQTT : " + topic);
        if (error)
            logger.error(error);
    });
}
async function publishConfig(key, value) {
    await publishToMQTT('system/bridge/' + key, value.toString());
}
