"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMqttRepublishHandler = void 0;
exports.loadMQTTClient = loadMQTTClient;
exports.publishToMQTT = publishToMQTT;
exports.publishConfig = publishConfig;
exports.cleanStaleMqttTopics = cleanStaleMqttTopics;
const mqtt_1 = require("mqtt");
const mqttLifecycle_1 = require("./mqttLifecycle");
Object.defineProperty(exports, "setMqttRepublishHandler", { enumerable: true, get: function () { return mqttLifecycle_1.setMqttRepublishHandler; } });
const shutdown_1 = require("./shutdown");
async function getOptions() {
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    const baseTopic = config.mqtt.topic;
    let option = {
        clientId,
        clean: true,
        connectTimeout: config.mqtt.connectTimeout,
        username: (config.mqtt.auth === true && config.mqtt.username != null) ? config.mqtt.username : undefined,
        password: (config.mqtt.auth === true && config.mqtt.password != null) ? config.mqtt.password : undefined,
        reconnectPeriod: config.mqtt.reconnectPeriod,
        will: {
            topic: `${baseTopic}/system/bridge/availability`,
            payload: 'offline',
            qos: 0,
            retain: true,
        },
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
            void publishConfig('availability', 'online');
            void (0, mqttLifecycle_1.triggerMqttRepublish)();
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
function shouldSkipPublish(topic, data, cachedData) {
    if (config.system?.publishOnDelta === false) {
        return false;
    }
    return cachedData === data;
}
async function publishToMQTT(topic, data) {
    try {
        if ((0, shutdown_1.isShuttingDown)()) {
            logger.debug(`[mqtt.ts] => Skipping publish to ${topic} during shutdown`);
            return;
        }
        if (!global.mqttClient) {
            throw new Error("MQTT client not initialized");
        }
        if (mqttClient.disconnecting) {
            logger.debug(`[mqtt.ts] => Skipping publish to ${topic}, MQTT client is disconnecting`);
            return;
        }
        if (!mqttClient.connected) {
            logger.warn(`[mqtt.ts] => MQTT client not connected, attempting to publish to topic: ${topic}`);
        }
        const cachedData = await cache.get(topic);
        if (shouldSkipPublish(topic, data, cachedData)) {
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
    await publishToMQTT('system/bridge/' + key, String(value));
}
const STALE_RETAINED_TOPICS = [
    'system/bridge/availability',
];
const LEGACY_RETAINED_TOPICS = [
    'system/bridge/authorization_timeout',
];
async function clearRetainedTopic(relativeTopic) {
    if (!global.mqttClient) {
        throw new Error("MQTT client not initialized");
    }
    const fullTopic = config.mqtt.topic + '/' + relativeTopic;
    logger.debug(`[mqtt.ts] => Clearing retained message on ${fullTopic}`);
    await cache.del(relativeTopic);
    return new Promise((resolve, reject) => {
        const publishTimeout = setTimeout(() => {
            reject(new Error(`Timeout clearing retained message on ${fullTopic}`));
        }, 5000);
        mqttClient.publish(fullTopic, '', { qos: 0, retain: true }, (error) => {
            clearTimeout(publishTimeout);
            if (error) {
                logger.error(`[mqtt.ts] => Error clearing retained message on ${fullTopic}: ${error.message}`);
                reject(error);
                return;
            }
            logger.debug(`[mqtt.ts] => Retained message cleared on ${fullTopic}`);
            resolve();
        });
    });
}
async function cleanStaleMqttTopics() {
    logger.info('[mqtt.ts] => Cleaning stale retained MQTT topics');
    const topicsToClear = [...STALE_RETAINED_TOPICS, ...LEGACY_RETAINED_TOPICS];
    for (const topic of topicsToClear) {
        try {
            await clearRetainedTopic(topic);
        }
        catch (error) {
            logger.warn(`[mqtt.ts] => Could not clear retained topic ${topic}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=mqtt.js.map