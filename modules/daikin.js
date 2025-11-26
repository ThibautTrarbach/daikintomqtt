"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDaikinAPI = loadDaikinAPI;
exports.subscribeDevices = subscribeDevices;
exports.generateConfig = generateConfig;
exports.sendDevice = sendDevice;
exports.startDaikinAPI = startDaikinAPI;
exports.getDevices = getDevices;
exports.timeUpdate = timeUpdate;
exports.updateSystemBridge = updateSystemBridge;
const node_path_1 = require("node:path");
const gateway_1 = require("./gateway");
const converter_1 = require("./converter");
const mqtt_1 = require("./mqtt");
const daikin_controller_cloud_1 = require("daikin-controller-cloud");
const fs_1 = __importDefault(require("fs"));
const instanceId_1 = require("./instanceId");
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
    daikinClient.on('authorization_request', async (url) => {
        logger.info(`[daikin.ts] =>
			Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
			 
			Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
			 
			Afterwards you are redirected to Daikin to approve the access and then redirected back.`);
        await updateSystemBridge(null, null, {
            authorizationUrl: url,
            authorizationRequest: true,
            authorizationTimeout: false
        });
    });
    daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
        logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - START`);
        await cache.set('rate/limitMinute', rateLimitStatus.limitMinute);
        await cache.set('rate/remainingMinute', rateLimitStatus.remainingMinute);
        await cache.set('rate/limitDay', rateLimitStatus.limitDay);
        await cache.set('rate/remainingDay', rateLimitStatus.remainingDay);
        await updateSystemBridge(rateLimitStatus, null, {
            authorizationRequest: false,
            authorizationTimeout: false
        });
        logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - FINISH`);
    });
    daikinClient.on('token_update', async (set) => {
        logger.debug(`[daikin.ts] => EVENT - Token Update - Tentative de sauvgarde d'un nouveau token`);
        logger.debug(`[daikin.ts] => EVENT - Token Update - DATA : `);
        logger.debug(JSON.stringify(set));
    });
    daikinClient.on('error', async (error) => {
        logger.error(`[daikin.ts] => EVENT - ERROR - : ` + error);
    });
    global.daikinClient = daikinClient;
}
async function startDaikinAPI() {
    const devices = await getDevices();
    if (!devices) {
        logger.error("[daikin.ts] => No devices found, cannot start API");
        return;
    }
    logger.debug(`[daikin.ts] => Found ${devices.length} device(s)`);
    logger.info("[daikin.ts] => Subscribe to MQTT Action");
    await subscribeDevices(devices);
    logger.info("[daikin.ts] => Generate Config Info");
    await generateConfig(devices);
    logger.info("[daikin.ts] => Send First Event Data Value");
    await sendDevice(devices);
    logger.info("[daikin.ts] => Initialize System Bridge");
    await initializeSystemBridge(devices);
}
async function subscribeDevices(devices) {
    for (let dev of devices) {
        let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set";
        mqttClient.subscribe(subscribeTopic, function (err) {
            if (!err)
                logger.info("[daikin.ts] => Subscribe to " + subscribeTopic);
        });
    }
    const systemBridgeSetTopic = config.mqtt.topic + "/" + instanceId_1.INSTANCE_ID + "/set";
    mqttClient.subscribe(systemBridgeSetTopic, function (err) {
        if (!err)
            logger.info("[daikin.ts] => Subscribe to " + systemBridgeSetTopic);
    });
    mqttClient.on('message', async function (topic, message) {
        try {
            logger.debug(`[daikin.ts] => Topic : ${topic} \n- Message : ${message.toString()}`);
            const topicString = topic.toString();
            const systemBridgeSetTopicPath = config.mqtt.topic + "/" + instanceId_1.INSTANCE_ID + "/set";
            if (topicString === systemBridgeSetTopicPath) {
                const data = JSON.parse(message.toString());
                if (data.refreshAllDevices !== undefined || data._refreshAllDevices !== undefined) {
                    logger.info("[daikin.ts] => Refresh all devices command from system bridge");
                    await sendDevice(null, true);
                    await updateSystemBridge();
                }
                return;
            }
            for (let dev of devices) {
                if (!topicString.includes(dev.getId()))
                    continue;
                let gateway = getModels(dev);
                if (gateway !== undefined) {
                    await (0, gateway_1.eventValue)(dev, gateway, JSON.parse(message.toString()));
                }
            }
        }
        catch (error) {
            logger.error(`[daikin.ts] => Error processing MQTT message: ${error}`);
        }
    });
}
async function sendDevice(devices = null, cron = false) {
    if (devices == null)
        devices = await getDevices(cron);
    if (devices && devices.length) {
        for (let dev of devices) {
            await cache.set(`device_${dev.getId()}`, dev, 600000);
            let gateway = getModels(dev);
            await (0, mqtt_1.publishToMQTT)(dev.getId(), JSON.stringify(gateway));
        }
        await updateSystemBridge(null, devices);
    }
}
async function timeUpdate() {
    logger.debug("[daikin.ts] => Refresh After Command => START");
    let time = Math.floor((Date.now() / 1000) - 60);
    logger.debug("[daikin.ts] => Timestamp Minimum : " + time);
    let timerefresh = await cache.get('needRefresh');
    logger.debug("[daikin.ts] => Timestamp Save : " + timerefresh);
    if (timerefresh == undefined)
        return;
    if (typeof timerefresh !== "number") {
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
        const freshDevices = await daikinClient.getCloudDevices();
        await cache.set('devices', freshDevices, 600000);
        if (devices && devices.length) {
            for (const dev of devices) {
                await cache.del(`device_${dev.getId()}`);
            }
        }
        return freshDevices;
    }
    else {
        logger.debug("[daikin.ts] => Cache valide");
    }
    return devices;
}
async function initializeSystemBridge(devices) {
    const systemBridge = new gateway_1.SystemBridge();
    systemBridge.device.id = instanceId_1.INSTANCE_ID;
    systemBridge.device.serialNumber = instanceId_1.INSTANCE_ID;
    await updateSystemBridge(null, devices, undefined, systemBridge);
}
async function updateSystemBridge(rateLimitStatus, devices, authorizationInfo, existingBridge) {
    const systemBridge = existingBridge || new gateway_1.SystemBridge();
    if (!existingBridge) {
        systemBridge.device.id = instanceId_1.INSTANCE_ID;
        systemBridge.device.serialNumber = instanceId_1.INSTANCE_ID;
    }
    if (rateLimitStatus) {
        systemBridge.rateLimitMinute = rateLimitStatus.limitMinute;
        systemBridge.rateRemainingMinute = rateLimitStatus.remainingMinute;
        systemBridge.rateLimitDay = rateLimitStatus.limitDay;
        systemBridge.rateRemainingDay = rateLimitStatus.remainingDay;
    }
    else {
        const [limitMinute, remainingMinute, limitDay, remainingDay] = await Promise.all([
            cache.get('rate/limitMinute'),
            cache.get('rate/remainingMinute'),
            cache.get('rate/limitDay'),
            cache.get('rate/remainingDay')
        ]);
        if (limitMinute !== undefined)
            systemBridge.rateLimitMinute = Number(limitMinute);
        if (remainingMinute !== undefined)
            systemBridge.rateRemainingMinute = Number(remainingMinute);
        if (limitDay !== undefined)
            systemBridge.rateLimitDay = Number(limitDay);
        if (remainingDay !== undefined)
            systemBridge.rateRemainingDay = Number(remainingDay);
    }
    if (authorizationInfo) {
        if (authorizationInfo.authorizationUrl !== undefined) {
            systemBridge.authorizationUrl = authorizationInfo.authorizationUrl;
            await cache.set('authorizationUrl', authorizationInfo.authorizationUrl);
        }
        if (authorizationInfo.authorizationRequest !== undefined) {
            systemBridge.authorizationRequest = authorizationInfo.authorizationRequest;
            await cache.set('authorizationRequest', authorizationInfo.authorizationRequest);
        }
        if (authorizationInfo.authorizationTimeout !== undefined) {
            systemBridge.authorizationTimeout = authorizationInfo.authorizationTimeout;
            await cache.set('authorizationTimeout', authorizationInfo.authorizationTimeout);
        }
    }
    else {
        const [authUrl, authRequest, authTimeout] = await Promise.all([
            cache.get('authorizationUrl'),
            cache.get('authorizationRequest'),
            cache.get('authorizationTimeout')
        ]);
        if (authUrl !== undefined)
            systemBridge.authorizationUrl = String(authUrl);
        if (authRequest !== undefined)
            systemBridge.authorizationRequest = Boolean(authRequest);
        if (authTimeout !== undefined)
            systemBridge.authorizationTimeout = Boolean(authTimeout);
    }
    if (devices === null || devices === undefined) {
        devices = await getDevices();
    }
    if (devices && devices.length) {
        const modulesInfo = devices.map(dev => {
            const modelInfo = dev.getData('gateway', 'modelInfo', null)?.value || dev.getData('0', 'modelInfo', null)?.value || 'Unknown';
            return {
                id: dev.getId(),
                model: modelInfo,
                name: dev.getData('climateControl', 'name', null)?.value || dev.getId()
            };
        });
        systemBridge.modulesCount = modulesInfo.length;
        systemBridge.modulesList = JSON.stringify(modulesInfo);
    }
    else {
        systemBridge.modulesCount = 0;
        systemBridge.modulesList = "[]";
    }
    const unsupportedModules = getUnsupportedModules();
    systemBridge.unsupportedModulesCount = unsupportedModules.length;
    systemBridge.unsupportedModulesList = JSON.stringify(unsupportedModules);
    await publishSystemBridge(systemBridge);
}
async function publishSystemBridge(systemBridge) {
    await (0, mqtt_1.publishToMQTT)(instanceId_1.INSTANCE_ID, JSON.stringify(systemBridge));
    if (config.system.jeedom) {
        await (0, converter_1.makeDefineFile)(systemBridge, null);
    }
}
function getUnsupportedModules() {
    const configFolder = (0, node_path_1.resolve)(datadir, '/newConfig');
    const unsupportedModules = [];
    if (!fs_1.default.existsSync(configFolder)) {
        return unsupportedModules;
    }
    const files = fs_1.default.readdirSync(configFolder);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const fileName = file.replace('.json', '');
            try {
                const filePath = (0, node_path_1.resolve)(configFolder, file);
                const content = fs_1.default.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                const model = data?.gateway?.modelInfo?.value || data?.['0']?.modelInfo?.value || fileName;
                unsupportedModules.push({ fileName, model });
            }
            catch (e) {
                unsupportedModules.push({ fileName });
            }
        }
    });
    return unsupportedModules;
}
//# sourceMappingURL=daikin.js.map