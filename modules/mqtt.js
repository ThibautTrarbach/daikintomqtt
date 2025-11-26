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
    try {
        if (!config.mqtt) {
            throw new Error("MQTT configuration not found");
        }
        let options = await getOptions();
        const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
        logger.info(`[mqtt.ts] => Connecting to MQTT broker: ${config.mqtt.host}:${config.mqtt.port}`);
        logger.debug(`[mqtt.ts] => Connection options: clientId=${options.clientId}, clean=${options.clean}, timeout=${options.connectTimeout}ms`);
        global.mqttClient = (0, mqtt_1.connect)(mqttHost, options);
        mqttClient.on('connect', () => {
            logger.info(`[mqtt.ts] => Connected to MQTT broker: ${mqttHost}`);
        });
        mqttClient.on('error', (error) => {
            logger.error(`[mqtt.ts] => MQTT connection error: ${error.message}`);
            if (error.stack) {
                logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
            }
        });
        mqttClient.on('close', () => {
            logger.warn(`[mqtt.ts] => MQTT connection closed`);
        });
        mqttClient.on('reconnect', () => {
            logger.info(`[mqtt.ts] => Reconnecting to MQTT broker...`);
        });
        mqttClient.on('offline', () => {
            logger.warn(`[mqtt.ts] => MQTT client offline`);
        });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`MQTT connection timeout after ${config.mqtt.connectTimeout}ms`));
            }, config.mqtt.connectTimeout);
            mqttClient.once('connect', () => {
                clearTimeout(timeout);
                logger.info(`[mqtt.ts] => MQTT connection established successfully`);
                resolve();
            });
            mqttClient.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    catch (error) {
        logger.error(`[mqtt.ts] => Error initializing MQTT client: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
async function publishToMQTT(topic, data) {
    try {
        if (!global.mqttClient) {
            throw new Error("MQTT client not initialized");
        }
        if (!mqttClient.connected) {
            logger.warn(`[mqtt.ts] => MQTT client not connected, attempting to publish to topic: ${topic}`);
        }
        const cachedData = await cache.get(topic);
        if (cachedData === data) {
            logger.debug(`[mqtt.ts] => Identical data in cache for ${topic}, publication skipped`);
            return;
        }
        await cache.set(topic, data);
        const fullTopic = config.mqtt.topic + "/" + topic;
        const dataSize = Buffer.byteLength(data, 'utf8');
        logger.debug(`[mqtt.ts] => Publishing to ${fullTopic} (${dataSize} bytes)`);
        return new Promise((resolve, reject) => {
            const publishTimeout = setTimeout(() => {
                reject(new Error(`Timeout publishing to ${fullTopic}`));
            }, 5000);
            mqttClient.publish(fullTopic, data, { qos: 0, retain: true }, (error) => {
                clearTimeout(publishTimeout);
                if (error) {
                    logger.error(`[mqtt.ts] => Error publishing to ${fullTopic}: ${error.message}`);
                    if (error.stack) {
                        logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
                    }
                    reject(error);
                }
                else {
                    logger.debug(`[mqtt.ts] => Data published successfully to ${fullTopic}`);
                    resolve();
                }
            });
        });
    }
    catch (error) {
        logger.error(`[mqtt.ts] => Error in publishToMQTT for topic ${topic}: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
async function publishConfig(key, value) {
    await publishToMQTT('system/bridge/' + key, value.toString());
}
//# sourceMappingURL=mqtt.js.map