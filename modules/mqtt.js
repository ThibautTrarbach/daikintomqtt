"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishToMQTT = exports.loadMQTTClient = void 0;
const mqtt_1 = require("mqtt");
function getOptions() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function loadMQTTClient() {
    return __awaiter(this, void 0, void 0, function* () {
        let options = yield getOptions();
        const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
        global.mqttClient = (0, mqtt_1.connect)(mqttHost, options);
        global.cache = {};
    });
}
exports.loadMQTTClient = loadMQTTClient;
function publishToMQTT(topic, data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (cache[topic] == data)
            return;
        global.cache[topic] = data;
        mqttClient.publish(config.mqtt.topic + "/" + topic, data, { qos: 0, retain: true }, (error) => {
            logger.debug("Send Data to MQTT : " + topic);
            if (error)
                logger.error(error);
        });
    });
}
exports.publishToMQTT = publishToMQTT;
