"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDaikinAPI = loadDaikinAPI;
exports.subscribeDevices = subscribeDevices;
exports.generateConfig = generateConfig;
exports.sendDevice = sendDevice;
exports.startDaikinAPI = startDaikinAPI;
exports.getDevices = getDevices;
exports.timeUpdate = timeUpdate;
const node_path_1 = require("node:path");
const gateway_1 = require("./gateway");
const converter_1 = require("./converter");
const mqtt_1 = require("./mqtt");
const daikin_controller_cloud_1 = require("daikin-controller-cloud");
async function loadDaikinAPI() {
    if (!config.daikin.clientID || !config.daikin.clientSecret) {
        logger.error('[daikin.ts] => Please set the clientID and clientSecret in the settings files');
        process.exit(0);
    }
    const daikinClient = new daikin_controller_cloud_1.DaikinCloudController({
        oidcClientId: config.daikin.clientID,
        oidcClientSecret: config.daikin.clientSecret,
        oidcCallbackServerBindAddr: '0.0.0.0',
        oidcCallbackServerPort: config.daikin.clientPort,
        oidcCallbackServerExternalAddress: config.daikin.clientURL,
        oidcTokenSetFilePath: (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset'),
        oidcAuthorizationTimeoutS: 120
    });
    daikinClient.on('authorization_request', (url) => {
        logger.info(`[daikin.ts] =>
			Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
			 
			Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
			 
			Afterwards you are redirected to Daikin to approve the access and then redirected back.`);
        (0, mqtt_1.publishConfig)('url', url).then();
        (0, mqtt_1.publishConfig)('authorization_request', true).then();
        (0, mqtt_1.publishConfig)('authorization_timeout', false).then();
    });
    daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
        logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - START`);
        await (0, mqtt_1.publishConfig)('authorization_request', false);
        await (0, mqtt_1.publishConfig)('authorization_timeout', false);
        await (0, mqtt_1.publishConfig)('rate/limitMinute', rateLimitStatus.limitMinute);
        await (0, mqtt_1.publishConfig)('rate/remainingMinute', rateLimitStatus.remainingMinute);
        await (0, mqtt_1.publishConfig)('rate/limitDay', rateLimitStatus.limitDay);
        await (0, mqtt_1.publishConfig)('rate/remainingDay', rateLimitStatus.remainingDay);
        logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - FINISH`);
    });
    global.daikinClient = daikinClient;
}
async function startDaikinAPI() {
    const devices = await getDevices();
    logger.info("[daikin.ts] => Subscribe to MQTT Action");
    await subscribeDevices(devices);
    logger.info("[daikin.ts] => Generate Config Info");
    await generateConfig(devices);
    logger.info("[daikin.ts] => Send First Event Data Value");
    await sendDevice(devices);
}
async function subscribeDevices(devices) {
    for (let dev of devices) {
        let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set";
        mqttClient.subscribe(subscribeTopic, function (err) {
            if (!err)
                logger.info("[daikin.ts] => Subscribe to " + subscribeTopic);
        });
    }
    mqttClient.on('message', async function (topic, message) {
        logger.debug(`[daikin.ts] => Topic : ${topic} \n- Message : ${message.toString()}`);
        const devices = await getDevices();
        for (let dev of devices) {
            if (!topic.toString().includes(dev.getId()))
                continue;
            let gateway = getModels(dev);
            if (gateway !== undefined) {
                await (0, gateway_1.eventValue)(dev, gateway, JSON.parse(message.toString()));
            }
        }
    });
}
async function sendDevice(devices = null, cron = false) {
    if (devices == null)
        devices = await getDevices(cron);
    if (devices && devices.length) {
        for (let dev of devices) {
            global.cache[dev.getId()] = dev;
            let gateway = getModels(dev);
            await (0, mqtt_1.publishToMQTT)(dev.getId(), JSON.stringify(gateway));
        }
    }
}
async function timeUpdate() {
    logger.debug("[daikin.ts] => Refresh After Command => START");
    let time = Math.floor((Date.now() / 1000) - 120);
    logger.debug("[daikin.ts] => Timestamp Minimum : " + time);
    let timerefresh = await cache.get('needRefresh');
    logger.debug("[daikin.ts] => Timestamp Save : " + timerefresh);
    if (timerefresh == undefined)
        return;
    if (typeof (timerefresh) != "number") {
        await cache.del('needRefresh');
        return;
    }
    if (timerefresh <= time) {
        logger.debug("[daikin.ts] => CRON - Updates Daikin devices");
        await cache.del('needRefresh');
        await sendDevice(null, true);
    }
    logger.debug("[daikin.ts] => Refresh After Command => FINISH");
}
function getModels(devices) {
    let value;
    if (devices.getData('gateway', 'modelInfo') !== null)
        value = devices.getData('gateway', 'modelInfo').value;
    else if (devices.getData('0', 'modelInfo') !== null)
        value = devices.getData('0', 'modelInfo').value;
    switch (value) {
        case 'BRP069C4x':
            return new gateway_1.BRP069C4x(devices);
        case 'BRP069A62':
            return new gateway_1.BRP069A62(devices);
        case 'BRP069A78':
            return new gateway_1.BRP069A78(devices);
        case 'BRP069B4x':
            return new gateway_1.BRP069B4x(devices);
        case 'BRP069A4x':
            return new gateway_1.BRP069A4x(devices);
        case 'BRP069A61':
            return new gateway_1.BRP069A61(devices);
        case 'BRP069C41':
            return new gateway_1.BRP069C41(devices);
        case 'BRP069C8x':
            return new gateway_1.BRP069C8x(devices);
        default:
            (0, gateway_1.anonymise)(devices, value);
            return undefined;
    }
}
async function generateConfig(devices) {
    if (devices && devices.length) {
        for (let device of devices) {
            let module = getModels(device);
            if (module)
                await (0, converter_1.makeDefineFile)(module, device);
        }
    }
}
async function getDevices(force = false) {
    const devices = await cache.get('devices');
    if (devices == undefined || force) {
        logger.debug("[daikin.ts] => Cache invalid ou recup forcé, recuperation information sur le cloud");
        logger.debug('[daikin.ts] => Send Request to cloud : Refresh');
        const devices = await daikinClient.getCloudDevices();
        await cache.set('devices', devices);
        return devices;
    }
    else {
        logger.debug("[daikin.ts] => Cache valide");
    }
    return devices;
}
