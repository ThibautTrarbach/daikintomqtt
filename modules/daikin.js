"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        logger.debug(`[daikin.ts] => Updating system bridge with authorization URL: ${url}`);
        try {
            await updateSystemBridge(null, [], {
                authorizationUrl: url,
                authorizationRequest: true,
                authorizationTimeout: false
            });
            logger.debug(`[daikin.ts] => System bridge updated with authorization URL`);
        }
        catch (error) {
            logger.error(`[daikin.ts] => Error updating system bridge with authorization URL: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
        logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limit Status - START`);
        await cache.set('rate/limitMinute', rateLimitStatus.limitMinute);
        await cache.set('rate/remainingMinute', rateLimitStatus.remainingMinute);
        await cache.set('rate/limitDay', rateLimitStatus.limitDay);
        await cache.set('rate/remainingDay', rateLimitStatus.remainingDay);
        const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("./rateLimiter")));
        rateLimiter.updateRateLimit(rateLimitStatus);
        await updateSystemBridge(rateLimitStatus, null, {
            authorizationRequest: false,
            authorizationTimeout: false
        });
        logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limit Status - FINISH`);
    });
    daikinClient.on('token_update', async (set) => {
        logger.debug(`[daikin.ts] => EVENT - Token Update - Attempting to save a new token`);
        logger.debug(`[daikin.ts] => EVENT - Token Update - DATA: `);
        logger.debug(JSON.stringify(set));
    });
    daikinClient.on('error', async (error) => {
        logger.error(`[daikin.ts] => EVENT - Daikin client error: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
        if (error instanceof Error && 'code' in error) {
            logger.debug(`[daikin.ts] => Error code: ${error.code}`);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorString = String(error);
        if (errorMessage.includes("Authorization time out") ||
            errorMessage.includes("authorization timeout") ||
            errorString.includes("Authorization time out") ||
            errorString.includes("authorization timeout")) {
            try {
                logger.error('[daikin.ts] => Authorization timeout detected. Shutting down daemon.');
                try {
                    await updateSystemBridge(null, null, {
                        authorizationTimeout: true
                    });
                    logger.info('[daikin.ts] => System bridge updated with timeout state');
                }
                catch (bridgeError) {
                    logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
                }
                logger.error('[daikin.ts] => Please restart DaikinToMQTT and try again.');
            }
            catch (e) {
                logger.error(`[daikin.ts] => Error handling authorization timeout: ${e instanceof Error ? e.message : String(e)}`);
            }
            process.exit(1);
        }
        else if (errorMessage.includes("invalid_grant") || errorString.includes("invalid_grant") || error?.error === "invalid_grant") {
            try {
                logger.error('[daikin.ts] => Invalid token detected (invalid_grant), deleting old token and shutting down');
                const tokenPath = (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset');
                if (fs_1.default.existsSync(tokenPath)) {
                    fs_1.default.unlinkSync(tokenPath);
                    logger.info(`[daikin.ts] => Token file deleted: ${tokenPath}`);
                }
                else {
                    logger.warn(`[daikin.ts] => Token file does not exist: ${tokenPath}`);
                }
                try {
                    await updateSystemBridge(null, [], {
                        authorizationRequest: true,
                        authorizationTimeout: false
                    });
                }
                catch (bridgeError) {
                    logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
                }
                logger.error('[daikin.ts] => Token deleted. Shutting down daemon. Please restart the application to trigger a new authorization request.');
            }
            catch (e) {
                logger.error(`[daikin.ts] => Error deleting token: ${e instanceof Error ? e.message : String(e)}`);
                logger.error(`[daikin.ts] => Please manually delete the file: ${(0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset')}`);
            }
            process.exit(1);
        }
    });
    global.daikinClient = daikinClient;
}
async function startDaikinAPI() {
    let devices = null;
    try {
        logger.info("[daikin.ts] => Starting Daikin API");
        const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("./rateLimiter")));
        await rateLimiter.loadRateLimitFromCache();
        logger.info("[daikin.ts] => Initializing system bridge");
        await initializeSystemBridge([]);
        const tokenPath = (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset');
        const tokenExists = fs_1.default.existsSync(tokenPath);
        if (!tokenExists) {
            logger.info("[daikin.ts] => No token found, making initial request to trigger authorization");
            try {
                await getDevices(false, "authorization_initial_request");
            }
            catch (authError) {
                logger.debug(`[daikin.ts] => Initial request failed (expected if not authorized): ${authError instanceof Error ? authError.message : String(authError)}`);
                return;
            }
        }
        try {
            devices = await getDevices(false, "startup_devices_load");
            if (!devices || devices.length === 0) {
                logger.warn("[daikin.ts] => No devices found");
                await updateSystemBridge(null, []);
                return;
            }
            logger.info(`[daikin.ts] => Found ${devices.length} device(s)`);
            logger.info("[daikin.ts] => Subscribing to MQTT actions");
            await subscribeDevices(devices);
            logger.info("[daikin.ts] => Generating configuration files");
            await generateConfig(devices);
            logger.info("[daikin.ts] => Sending initial data values");
            await sendDevice(devices, false, "startup_initial_send");
            await updateSystemBridge(null, devices);
            logger.info("[daikin.ts] => Daikin API started successfully");
        }
        catch (apiError) {
            logger.error(`[daikin.ts] => Error during API operations: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            if (apiError instanceof Error && apiError.stack) {
                logger.debug(`[daikin.ts] => Stack trace: ${apiError.stack}`);
            }
            await updateSystemBridge(null, devices || []);
        }
    }
    catch (error) {
        logger.error(`[daikin.ts] => Critical error during API startup: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
        try {
            await initializeSystemBridge([]);
        }
        catch (bridgeError) {
            logger.error(`[daikin.ts] => Failed to initialize system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
        }
    }
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
            const topicString = topic.toString();
            const messageString = message.toString();
            logger.debug(`[daikin.ts] => MQTT message received - Topic: ${topicString}, Size: ${messageString.length} bytes`);
            logger.debug(`[daikin.ts] => MQTT message content: ${messageString}`);
            const systemBridgeSetTopicPath = config.mqtt.topic + "/" + instanceId_1.INSTANCE_ID + "/set";
            if (topicString === systemBridgeSetTopicPath) {
                let data;
                try {
                    data = JSON.parse(messageString);
                }
                catch (parseError) {
                    logger.error(`[daikin.ts] => JSON parsing error for system topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
                    return;
                }
                if (data.refreshAllDevices !== undefined || data._refreshAllDevices !== undefined) {
                    logger.info(`[daikin.ts] => Refresh all devices command received from system bridge`);
                    try {
                        await sendDevice(null, true, "system_bridge_refresh_all");
                        await updateSystemBridge();
                        logger.info(`[daikin.ts] => Refresh of all devices completed successfully`);
                    }
                    catch (refreshError) {
                        logger.error(`[daikin.ts] => Error during device refresh: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
                        if (refreshError instanceof Error && refreshError.stack) {
                            logger.debug(`[daikin.ts] => Stack trace: ${refreshError.stack}`);
                        }
                    }
                }
                return;
            }
            for (let dev of devices) {
                const deviceId = dev.getId();
                if (!topicString.includes(deviceId))
                    continue;
                logger.debug(`[daikin.ts] => Processing message for device: ${deviceId}`);
                let gateway = getModels(dev);
                if (gateway !== undefined) {
                    let eventData;
                    try {
                        eventData = JSON.parse(messageString);
                    }
                    catch (parseError) {
                        logger.error(`[daikin.ts] => JSON parsing error for device ${deviceId}, topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
                        continue;
                    }
                    try {
                        await (0, gateway_1.eventValue)(dev, gateway, eventData);
                        logger.debug(`[daikin.ts] => Command processed successfully for device: ${deviceId}`);
                    }
                    catch (eventError) {
                        logger.error(`[daikin.ts] => Error processing event for device ${deviceId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
                        if (eventError instanceof Error && eventError.stack) {
                            logger.debug(`[daikin.ts] => Stack trace: ${eventError.stack}`);
                        }
                    }
                }
                else {
                    logger.warn(`[daikin.ts] => No gateway found for device ${deviceId}, unsupported model`);
                }
            }
        }
        catch (error) {
            logger.error(`[daikin.ts] => Unexpected error processing MQTT message: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
            }
        }
    });
}
async function sendDevice(devices = null, cron = false, reason = "unspecified") {
    try {
        if (devices == null) {
            logger.debug(`[daikin.ts] => Retrieving devices${cron ? ' (forced from cloud)' : ' (from cache if available)'} for sendDevice (reason: ${reason})`);
            devices = await getDevices(cron, reason);
        }
        if (!devices || devices.length === 0) {
            logger.warn(`[daikin.ts] => No devices found for sending`);
            return;
        }
        logger.debug(`[daikin.ts] => Sending ${devices.length} device(s) to MQTT`);
        for (let dev of devices) {
            const deviceId = dev.getId();
            try {
                await cache.set(`device_${deviceId}`, dev, 10800000);
                let gateway = getModels(dev);
                if (gateway === undefined) {
                    logger.warn(`[daikin.ts] => No gateway found for device ${deviceId}, unsupported model`);
                    continue;
                }
                const gatewayJson = JSON.stringify(gateway);
                await (0, mqtt_1.publishToMQTT)(deviceId, gatewayJson);
                logger.debug(`[daikin.ts] => Device ${deviceId} published successfully to MQTT`);
            }
            catch (deviceError) {
                logger.error(`[daikin.ts] => Error sending device ${deviceId}: ${deviceError instanceof Error ? deviceError.message : String(deviceError)}`);
                if (deviceError instanceof Error && deviceError.stack) {
                    logger.debug(`[daikin.ts] => Stack trace: ${deviceError.stack}`);
                }
            }
        }
        try {
            const periodicReasons = ["cron_polling", "cron_forced_23h58_stats", "system_bridge_refresh_all"];
            if (periodicReasons.includes(reason)) {
                const ts = Math.floor(Date.now() / 1000);
                await cache.set('lastPeriodicRefreshTs', ts);
                logger.debug(`[daikin.ts] => Recorded periodic refresh at ${new Date(ts * 1000).toISOString()} (reason=${reason})`);
            }
        }
        catch (periodicError) {
            logger.error(`[daikin.ts] => Error recording periodic refresh timestamp: ${periodicError instanceof Error ? periodicError.message : String(periodicError)}`);
        }
        try {
            await updateSystemBridge(null, devices);
        }
        catch (bridgeError) {
            logger.error(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
        }
    }
    catch (error) {
        logger.error(`[daikin.ts] => Critical error sending devices: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
async function timeUpdate() {
    try {
        logger.debug("[daikin.ts] => Checking refresh after command => START");
        const mode = config.system?.actionRefreshMode ?? 1;
        if (mode === 2) {
            logger.debug("[daikin.ts] => Post-action refresh disabled (mode=2), skipping timeUpdate");
            return;
        }
        const defaultDelay = 45;
        const delaySeconds = config.system?.actionRefreshDelaySeconds ?? defaultDelay;
        const now = Math.floor(Date.now() / 1000);
        logger.debug(`[daikin.ts] => Current timestamp: ${now} (${new Date(now * 1000).toISOString()}) - mode=${mode}, delay=${delaySeconds}s`);
        const lastActionTs = await cache.get('needRefresh');
        if (lastActionTs === undefined || lastActionTs === null) {
            logger.debug("[daikin.ts] => No refresh pending");
            return;
        }
        if (typeof lastActionTs !== "number") {
            logger.warn(`[daikin.ts] => Invalid timestamp type in cache: ${typeof lastActionTs}, removing`);
            await cache.del('needRefresh');
            return;
        }
        logger.debug(`[daikin.ts] => Cached last action timestamp: ${lastActionTs} (${new Date(lastActionTs * 1000).toISOString()})`);
        const lastPeriodicRefreshTs = await cache.get('lastPeriodicRefreshTs');
        if (typeof lastPeriodicRefreshTs === "number") {
            logger.debug(`[daikin.ts] => Last periodic refresh timestamp: ${lastPeriodicRefreshTs} (${new Date(lastPeriodicRefreshTs * 1000).toISOString()})`);
            if (lastPeriodicRefreshTs >= lastActionTs) {
                logger.info("[daikin.ts] => Skipping post-action refresh because a periodic refresh occurred after the last action");
                await cache.del('needRefresh');
                return;
            }
        }
        const elapsed = now - lastActionTs;
        logger.debug(`[daikin.ts] => Elapsed time since last action: ${elapsed}s`);
        if (elapsed >= delaySeconds) {
            logger.info("[daikin.ts] => Refresh needed after command, updating devices");
            await cache.del('needRefresh');
            try {
                await sendDevice(null, true, "post_action_refresh");
                logger.debug("[daikin.ts] => Refresh after command completed successfully");
            }
            catch (refreshError) {
                logger.error(`[daikin.ts] => Error during refresh after command: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
                if (refreshError instanceof Error && refreshError.stack) {
                    logger.debug(`[daikin.ts] => Stack trace: ${refreshError.stack}`);
                }
            }
        }
        else {
            const remainingSeconds = delaySeconds - elapsed;
            logger.debug(`[daikin.ts] => Refresh not yet needed, ${remainingSeconds} second(s) remaining`);
        }
        logger.debug("[daikin.ts] => Checking refresh after command => FINISH");
    }
    catch (error) {
        logger.error(`[daikin.ts] => Error in timeUpdate: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
    }
}
function getModels(devices) {
    try {
        if (!devices) {
            logger.warn(`[daikin.ts] => Device null or undefined in getModels`);
            return undefined;
        }
        let value;
        try {
            const gatewayModelInfo = devices.getData('gateway', 'modelInfo');
            if (gatewayModelInfo !== null && gatewayModelInfo !== undefined) {
                value = gatewayModelInfo.value;
            }
            else {
                const zeroModelInfo = devices.getData('0', 'modelInfo');
                if (zeroModelInfo !== null && zeroModelInfo !== undefined) {
                    value = zeroModelInfo.value;
                }
            }
        }
        catch (error) {
            logger.warn(`[daikin.ts] => Error retrieving modelInfo: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
        if (!value) {
            logger.warn(`[daikin.ts] => No modelInfo found for device ${devices.getId ? devices.getId() : 'unknown'}`);
            (0, gateway_1.anonymise)(devices, 'unknown');
            return undefined;
        }
        logger.debug(`[daikin.ts] => Model detected: ${value} for device ${devices.getId ? devices.getId() : 'unknown'}`);
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
                logger.warn(`[daikin.ts] => Unsupported model: ${value}`);
                (0, gateway_1.anonymise)(devices, value);
                return undefined;
        }
    }
    catch (error) {
        logger.error(`[daikin.ts] => Critical error in getModels: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
        return undefined;
    }
}
async function generateConfig(devices) {
    try {
        if (!devices || devices.length === 0) {
            logger.warn(`[daikin.ts] => No devices provided for configuration generation`);
            return;
        }
        logger.debug(`[daikin.ts] => Generating configuration for ${devices.length} device(s)`);
        for (let device of devices) {
            const deviceId = device.getId();
            try {
                let module = getModels(device);
                if (module) {
                    await (0, converter_1.makeDefineFile)(module, device);
                    logger.debug(`[daikin.ts] => Configuration generated successfully for device ${deviceId}`);
                }
                else {
                    logger.warn(`[daikin.ts] => No module found for device ${deviceId}, configuration not generated`);
                }
            }
            catch (configError) {
                logger.error(`[daikin.ts] => Error generating configuration for device ${deviceId}: ${configError instanceof Error ? configError.message : String(configError)}`);
                if (configError instanceof Error && configError.stack) {
                    logger.debug(`[daikin.ts] => Stack trace: ${configError.stack}`);
                }
            }
        }
        logger.info(`[daikin.ts] => Configuration generation completed for ${devices.length} device(s)`);
    }
    catch (error) {
        logger.error(`[daikin.ts] => Critical error during configuration generation: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
async function getDevices(force = false, reason = "unspecified") {
    try {
        const devices = await cache.get('devices');
        if (devices === undefined || force) {
            logger.info(`[daikin.ts] => API CALL - getDevices (reason: ${reason}) - ${force ? 'forced retrieval' : 'cache invalid or empty'}, retrieving information from Daikin cloud`);
            if (!global.daikinClient) {
                logger.error(`[daikin.ts] => Daikin client is not initialized`);
                throw new Error("Daikin client is not initialized");
            }
            try {
                logger.debug(`[daikin.ts] => API CALL - getDevices (reason: ${reason}) - sending request to Daikin cloud to retrieve devices`);
                const { rateLimiter } = await Promise.resolve().then(() => __importStar(require("./rateLimiter")));
                const refreshReasons = [
                    "cron_polling",
                    "cron_forced_23h58_stats",
                    "system_bridge_refresh_all",
                    "post_action_refresh",
                    "system_bridge_auto_update"
                ];
                const isRefreshReason = refreshReasons.includes(reason);
                const freshDevices = await rateLimiter.executeWithRetry(async () => await daikinClient.getCloudDevices(), `getCloudDevices-${reason}`, isRefreshReason
                    ? {
                        maxRetries: 2,
                        refreshMode: true
                    }
                    : {
                        maxRetries: 3,
                        baseDelay: 2000,
                        maxDelay: 120000
                    });
                if (!Array.isArray(freshDevices)) {
                    logger.error(`[daikin.ts] => Daikin cloud response is not an array: ${typeof freshDevices}`);
                    throw new Error("Invalid response from Daikin cloud");
                }
                logger.info(`[daikin.ts] => ${freshDevices.length} device(s) retrieved from cloud`);
                await cache.set('devices', freshDevices, 10800000);
                if (devices && devices.length) {
                    logger.debug(`[daikin.ts] => Invalidating cache for ${devices.length} previous device(s)`);
                    for (const dev of devices) {
                        await cache.del(`device_${dev.getId()}`);
                    }
                }
                return freshDevices;
            }
            catch (cloudError) {
                const errorMessage = cloudError instanceof Error ? cloudError.message : String(cloudError);
                const errorString = String(cloudError);
                if (errorMessage.includes("Authorization time out") ||
                    errorMessage.includes("authorization timeout") ||
                    errorString.includes("Authorization time out") ||
                    errorString.includes("authorization timeout")) {
                    try {
                        logger.error('[daikin.ts] => Authorization timeout detected in getDevices. Shutting down daemon.');
                        try {
                            await updateSystemBridge(null, null, {
                                authorizationTimeout: true
                            });
                            logger.info('[daikin.ts] => System bridge updated with timeout state');
                        }
                        catch (bridgeError) {
                            logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
                        }
                        logger.error('[daikin.ts] => Please restart DaikinToMQTT and try again.');
                    }
                    catch (e) {
                        logger.error(`[daikin.ts] => Error handling authorization timeout: ${e instanceof Error ? e.message : String(e)}`);
                    }
                    process.exit(1);
                }
                else if (errorMessage.includes("invalid_grant") || errorString.includes("invalid_grant") || cloudError?.error === "invalid_grant") {
                    try {
                        logger.error('[daikin.ts] => Invalid token detected (invalid_grant) in getDevices, deleting old token and shutting down');
                        const tokenPath = (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset');
                        if (fs_1.default.existsSync(tokenPath)) {
                            fs_1.default.unlinkSync(tokenPath);
                            logger.info(`[daikin.ts] => Token file deleted: ${tokenPath}`);
                        }
                        else {
                            logger.warn(`[daikin.ts] => Token file does not exist: ${tokenPath}`);
                        }
                        try {
                            await updateSystemBridge(null, [], {
                                authorizationRequest: true,
                                authorizationTimeout: false
                            });
                        }
                        catch (bridgeError) {
                            logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
                        }
                        logger.error('[daikin.ts] => Token deleted. Shutting down daemon. Please restart the application to trigger a new authorization request.');
                    }
                    catch (deleteError) {
                        logger.error(`[daikin.ts] => Error deleting token: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
                        logger.error(`[daikin.ts] => Please manually delete the file: ${(0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset')}`);
                    }
                    process.exit(1);
                }
                logger.error(`[daikin.ts] => Error retrieving devices from cloud: ${errorMessage}`);
                if (cloudError instanceof Error && cloudError.stack) {
                    logger.debug(`[daikin.ts] => Stack trace: ${cloudError.stack}`);
                }
                if (devices && devices.length > 0 && !force) {
                    logger.warn(`[daikin.ts] => Using cached devices due to cloud error`);
                    return devices;
                }
                throw cloudError;
            }
        }
        else {
            logger.debug(`[daikin.ts] => Using cache (${devices.length} device(s))`);
        }
        return devices || [];
    }
    catch (error) {
        logger.error(`[daikin.ts] => Critical error retrieving devices: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
        }
        throw error;
    }
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
        try {
            const cachedDevices = await cache.get('devices');
            if (cachedDevices && Array.isArray(cachedDevices) && cachedDevices.length > 0) {
                devices = cachedDevices;
            }
            else {
                if (global.daikinClient) {
                    try {
                        devices = await getDevices(false, "system_bridge_auto_update");
                    }
                    catch (getDevicesError) {
                        logger.debug(`[daikin.ts] => Could not retrieve devices for system bridge update: ${getDevicesError instanceof Error ? getDevicesError.message : String(getDevicesError)}`);
                        devices = [];
                    }
                }
                else {
                    devices = [];
                }
            }
        }
        catch (error) {
            logger.debug(`[daikin.ts] => Error retrieving devices for system bridge: ${error instanceof Error ? error.message : String(error)}`);
            devices = [];
        }
    }
    if (devices && devices.length) {
        try {
            const modulesInfo = devices.map(dev => {
                try {
                    const modelInfo = dev.getData('gateway', 'modelInfo', null)?.value || dev.getData('0', 'modelInfo', null)?.value || 'Unknown';
                    return {
                        id: dev.getId(),
                        model: modelInfo,
                        name: dev.getData('climateControl', 'name', null)?.value || dev.getId()
                    };
                }
                catch (devError) {
                    logger.debug(`[daikin.ts] => Error getting device info: ${devError instanceof Error ? devError.message : String(devError)}`);
                    return {
                        id: dev.getId ? dev.getId() : 'unknown',
                        model: 'Unknown',
                        name: dev.getId ? dev.getId() : 'unknown'
                    };
                }
            });
            systemBridge.modulesCount = modulesInfo.length;
            systemBridge.modulesList = JSON.stringify(modulesInfo);
        }
        catch (mapError) {
            logger.debug(`[daikin.ts] => Error mapping devices info: ${mapError instanceof Error ? mapError.message : String(mapError)}`);
            systemBridge.modulesCount = 0;
            systemBridge.modulesList = "[]";
        }
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
    if (config.integration?.jeedom) {
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