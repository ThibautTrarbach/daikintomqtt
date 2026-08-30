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
exports.updateSystemBridge = updateSystemBridge;
exports.getModels = getModels;
exports.disableDaikinWebSocket = disableDaikinWebSocket;
exports.clearPendingCommands = clearPendingCommands;
exports.clearGatewayCache = clearGatewayCache;
const node_path_1 = require("node:path");
const gateway_1 = require("./gateway");
const converter_1 = require("./converter");
const mqtt_1 = require("./mqtt");
const daikin_cloud_1 = require("../daikin-cloud");
const fs_1 = __importDefault(require("fs"));
const instanceId_1 = require("./instanceId");
const requestBudget_1 = require("./requestBudget");
const constants_1 = require("../daikin-cloud/constants");
const tokenPaths_1 = require("./tokenPaths");
const paths_1 = require("./paths");
const constants_2 = require("./constants");
const mqtt_2 = require("./mqtt");
const errorHandler_1 = require("./errorHandler");
const shutdown_1 = require("./shutdown");
function isAuthFailure(error) {
    if (error instanceof errorHandler_1.AuthenticationError) {
        return true;
    }
    const message = error instanceof Error ? error.message : String(error);
    return /invalid_grant|not authenticated|unauthorized \(401\)|login failed|token refresh failed|token expired|authentication failed|registration completion failed|failed to get authorization code|failed to get oidc context|authorization error/i.test(message);
}
function failAuthStartup(message) {
    logger.error(message);
    logger.error('[daikin.ts] => Shutting down daemon due to authentication failure.');
    throw new errorHandler_1.AuthenticationError(message);
}
const pendingCommands = new Map();
const gatewayCache = new Map();
function clearPendingCommands() {
    for (const pending of pendingCommands.values()) {
        if (pending.timer) {
            clearTimeout(pending.timer);
        }
    }
    pendingCommands.clear();
}
function clearGatewayCache() {
    gatewayCache.clear();
}
function getCommandCoalesceMs() {
    return config.system?.commandCoalesceMs ?? 400;
}
function maskTokenSetForLog(set) {
    if (!set || typeof set !== 'object') {
        return String(set);
    }
    const masked = { ...set };
    for (const key of ['access_token', 'refresh_token', 'id_token']) {
        if (typeof masked[key] === 'string') {
            masked[key] = '[REDACTED]';
        }
    }
    return JSON.stringify(masked);
}
async function queueDeviceCommand(device, eventData) {
    const deviceId = device.getId();
    const existing = pendingCommands.get(deviceId);
    const merged = existing ? { ...existing.payload, ...eventData } : { ...eventData };
    if (existing?.timer) {
        clearTimeout(existing.timer);
    }
    const timer = setTimeout(async () => {
        pendingCommands.delete(deviceId);
        const gateway = getModels(device);
        if (gateway === undefined) {
            logger.warn(`[daikin.ts] => No gateway found for coalesced command on device ${deviceId}`);
            return;
        }
        try {
            await (0, gateway_1.applyGatewayEvents)(device, gateway, merged);
            logger.debug(`[daikin.ts] => Coalesced command processed for device: ${deviceId}`);
        }
        catch (eventError) {
            logger.error(`[daikin.ts] => Error processing coalesced event for device ${deviceId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
        }
    }, getCommandCoalesceMs());
    pendingCommands.set(deviceId, { payload: merged, timer });
    logger.debug(`[daikin.ts] => Command queued for device ${deviceId} (${getCommandCoalesceMs()}ms coalesce)`);
}
async function loadDaikinAPI() {
    const authMode = config.daikin.authMode ?? 'developer_portal';
    if (authMode === constants_1.AUTH_MODE_MOBILE_APP) {
        if (!config.daikin.email || !config.daikin.password) {
            logger.error('[daikin.ts] => Please set daikin.email and daikin.password for mobile_app auth mode');
            process.exit(0);
        }
    }
    else if (!config.daikin.clientID || !config.daikin.clientSecret) {
        logger.error('[daikin.ts] => Please set the clientID and clientSecret in the settings files');
        process.exit(0);
    }
    const daikinClient = new daikin_cloud_1.DaikinCloudController({
        authMode,
        oidcClientId: config.daikin.clientID,
        oidcClientSecret: config.daikin.clientSecret,
        oidcCallbackServerBindAddr: '0.0.0.0',
        oidcCallbackServerPort: config.daikin.clientPort ?? 8765,
        oidcCallbackServerExternalAddress: config.daikin.clientURL,
        oidcTokenSetFilePath: (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset'),
        mobileEmail: config.daikin.email ?? undefined,
        mobilePassword: config.daikin.password ?? undefined,
        mobileTokenFilePath: (0, node_path_1.resolve)(datadir, 'daikin-mobile-tokenset'),
        enableWebSocket: config.daikin.enableWebSocket ?? true,
        httpTransport: config.daikin.httpTransport,
        oidcAuthorizationTimeoutS: 120,
        useMock: config.daikin.useMock ?? false,
        mockId: config.daikin.mockId ?? undefined,
    });
    daikinClient.on('log', (message) => {
        logger.info(`[daikin.ts] => ${message}`);
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
        logger.debug(`[daikin.ts] => EVENT - Token Update - DATA: ${maskTokenSetForLog(set)}`);
    });
    daikinClient.on('websocket_connected', async () => {
        logger.info('[daikin.ts] => WebSocket connected - receiving real-time updates');
        await cache.set('ws/connected', true);
        if (!(0, shutdown_1.isShuttingDown)()) {
            await updateSystemBridge();
        }
    });
    daikinClient.on('websocket_disconnected', async (info) => {
        logger.info(`[daikin.ts] => WebSocket disconnected${info?.reconnecting ? ' (reconnecting)' : ''}`);
        await cache.set('ws/connected', false);
        if (!(0, shutdown_1.isShuttingDown)()) {
            await updateSystemBridge();
        }
    });
    daikinClient.on('websocket_device_update', async (update) => {
        try {
            const { handleWebSocketDeviceUpdate } = await Promise.resolve().then(() => __importStar(require('./wsUpdateMapper')));
            await handleWebSocketDeviceUpdate(update);
        }
        catch (error) {
            logger.error(`[daikin.ts] => WebSocket update handler error: ${error instanceof Error ? error.message : String(error)}`);
        }
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
                const tokenPath = (0, tokenPaths_1.getTokenFilePath)();
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
                logger.error(`[daikin.ts] => Please manually delete the file: ${(0, tokenPaths_1.getTokenFilePath)()}`);
            }
            process.exit(1);
        }
        else if (isAuthFailure(error)) {
            logger.error(`[daikin.ts] => Daikin client authentication error: ${errorMessage}`);
            logger.error('[daikin.ts] => Shutting down daemon due to authentication failure.');
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
        const tokenPath = (0, tokenPaths_1.getTokenFilePath)();
        const tokenExists = fs_1.default.existsSync(tokenPath);
        const authMode = config.daikin.authMode ?? 'developer_portal';
        if (authMode === constants_1.AUTH_MODE_MOBILE_APP) {
            if (!daikinClient.isAuthenticated()) {
                logger.info('[daikin.ts] => Mobile App auth: authenticating with Onecta credentials...');
                try {
                    await daikinClient.authenticateMobile();
                    logger.info('[daikin.ts] => Mobile App authentication successful');
                }
                catch (authError) {
                    failAuthStartup(`[daikin.ts] => Mobile App authentication failed: ${authError instanceof Error ? authError.message : String(authError)}`);
                }
            }
        }
        else if (!tokenExists) {
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
            if (authMode === constants_1.AUTH_MODE_MOBILE_APP && (config.daikin.enableWebSocket ?? true)) {
                try {
                    await daikinClient.enableWebSocket();
                }
                catch (wsError) {
                    logger.warn(`[daikin.ts] => WebSocket enable failed, falling back to polling: ${wsError instanceof Error ? wsError.message : String(wsError)}`);
                }
            }
            logger.info("[daikin.ts] => Daikin API started successfully");
            (0, mqtt_2.setMqttRepublishHandler)(async () => {
                const cachedDevices = await cache.get('devices');
                if (cachedDevices?.length) {
                    await sendDevice(cachedDevices, false, 'mqtt_reconnect_republish');
                }
                await updateSystemBridge();
            });
        }
        catch (apiError) {
            if (isAuthFailure(apiError)) {
                failAuthStartup(`[daikin.ts] => Authentication failed during API startup: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            }
            logger.error(`[daikin.ts] => Error during API operations: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            if (apiError instanceof Error && apiError.stack) {
                logger.debug(`[daikin.ts] => Stack trace: ${apiError.stack}`);
            }
            await updateSystemBridge(null, devices || []);
        }
    }
    catch (error) {
        if (isAuthFailure(error)) {
            failAuthStartup(`[daikin.ts] => Critical authentication error during API startup: ${error instanceof Error ? error.message : String(error)}`);
        }
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
    const refreshTopicPath = config.mqtt.topic + "/system/bridge/refresh/set";
    mqttClient.subscribe(refreshTopicPath, function (err) {
        if (!err)
            logger.info("[daikin.ts] => Subscribe to " + refreshTopicPath);
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
            if (topicString === refreshTopicPath) {
                logger.info("[daikin.ts] => Refresh command received, updating all devices");
                try {
                    await sendDevice(null, true, "mqtt_refresh_legacy");
                    await updateSystemBridge();
                }
                catch (refreshError) {
                    logger.error(`[daikin.ts] => Error during legacy refresh: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
                }
                return;
            }
            const cachedDevices = await cache.get('devices');
            const devicesList = (cachedDevices !== undefined && cachedDevices !== null)
                ? cachedDevices
                : await getDevices();
            for (let dev of devicesList) {
                const deviceId = dev.getId();
                const deviceSetTopic = `${config.mqtt.topic}/${deviceId}/set`;
                if (topicString !== deviceSetTopic) {
                    continue;
                }
                logger.debug(`[daikin.ts] => Processing message for device: ${deviceId}`);
                let gateway = getModels(dev);
                if (gateway !== undefined) {
                    let eventData;
                    try {
                        eventData = JSON.parse(messageString);
                    }
                    catch (parseError) {
                        logger.error(`[daikin.ts] => JSON parsing error for device ${deviceId}, topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
                        break;
                    }
                    try {
                        await queueDeviceCommand(dev, eventData);
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
                break;
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
async function refreshSingleDevice(deviceId, reason) {
    try {
        const devices = await cache.get('devices');
        if (!devices?.length) {
            return false;
        }
        const device = devices.find((dev) => dev.getId() === deviceId);
        if (!device) {
            return false;
        }
        if (!(await (0, requestBudget_1.canRefresh)(reason))) {
            return false;
        }
        logger.info(`[daikin.ts] => Partial refresh for device ${deviceId} (reason: ${reason})`);
        await device.updateData();
        await cache.set('devices', devices, constants_2.DEVICE_CACHE_TTL_MS);
        await cache.set(`device_${deviceId}`, device, 10800000);
        const gateway = getModels(device);
        if (gateway === undefined) {
            return false;
        }
        await (0, mqtt_1.publishToMQTT)(deviceId, JSON.stringify(gateway));
        await updateSystemBridge(null, devices);
        return true;
    }
    catch (error) {
        logger.warn(`[daikin.ts] => Partial refresh failed for ${deviceId}, falling back to full refresh: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
async function sendDevice(devices = null, cron = false, reason = "unspecified", onlyDeviceIds) {
    try {
        if (reason === 'post_action_refresh' && onlyDeviceIds?.length === 1) {
            const partialOk = await refreshSingleDevice(onlyDeviceIds[0], reason);
            if (partialOk) {
                return;
            }
        }
        if (devices == null) {
            logger.debug(`[daikin.ts] => Retrieving devices${cron ? ' (forced from cloud)' : ' (from cache if available)'} for sendDevice (reason: ${reason})`);
            devices = await getDevices(cron, reason);
        }
        if (!devices || devices.length === 0) {
            logger.warn(`[daikin.ts] => No devices found for sending`);
            return;
        }
        const devicesToPublish = onlyDeviceIds?.length
            ? devices.filter((dev) => onlyDeviceIds.includes(dev.getId()))
            : devices;
        logger.debug(`[daikin.ts] => Sending ${devicesToPublish.length} device(s) to MQTT (reason: ${reason})`);
        for (let dev of devicesToPublish) {
            const deviceId = dev.getId();
            try {
                await cache.set(`device_${deviceId}`, dev, constants_2.DEVICE_CACHE_TTL_MS);
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
function detectGatewayModel(devices) {
    try {
        const gatewayModelInfo = devices.getData('gateway', 'modelInfo', null);
        if (gatewayModelInfo !== null && gatewayModelInfo !== undefined) {
            return gatewayModelInfo.value;
        }
        const zeroModelInfo = devices.getData('0', 'modelInfo', null);
        if (zeroModelInfo !== null && zeroModelInfo !== undefined) {
            return zeroModelInfo.value;
        }
    }
    catch (error) {
        logger.warn(`[daikin.ts] => Error retrieving modelInfo: ${error instanceof Error ? error.message : String(error)}`);
    }
    return undefined;
}
function createGatewayInstance(devices, model) {
    switch (model) {
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
            if (config.system?.dynamicFallback !== false) {
                logger.info(`[daikin.ts] => Using DynamicGateway for model: ${model}`);
                return new gateway_1.DynamicGateway(devices);
            }
            logger.warn(`[daikin.ts] => Unsupported model: ${model}`);
            (0, gateway_1.anonymise)(devices, model);
            return undefined;
    }
}
function getModels(devices) {
    try {
        if (!devices) {
            logger.warn(`[daikin.ts] => Device null or undefined in getModels`);
            return undefined;
        }
        const deviceId = devices.getId();
        const model = detectGatewayModel(devices);
        let cacheKey;
        if (!model) {
            if (config.system?.dynamicFallback === false) {
                logger.warn(`[daikin.ts] => No modelInfo found for device ${deviceId}`);
                (0, gateway_1.anonymise)(devices, 'unknown');
                return undefined;
            }
            cacheKey = 'DynamicGateway';
            logger.info(`[daikin.ts] => Using DynamicGateway for device without modelInfo`);
        }
        else {
            cacheKey = model;
            logger.debug(`[daikin.ts] => Model detected: ${model} for device ${deviceId}`);
        }
        const cached = gatewayCache.get(deviceId);
        if (cached && cached.model === cacheKey) {
            (0, gateway_1.convertDaikinDevice)(devices, cached.gateway);
            return cached.gateway;
        }
        let gateway;
        if (cacheKey === 'DynamicGateway') {
            gateway = new gateway_1.DynamicGateway(devices);
        }
        else {
            gateway = createGatewayInstance(devices, cacheKey);
        }
        if (gateway) {
            gatewayCache.set(deviceId, { model: cacheKey, gateway });
        }
        return gateway;
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
            if (force && !(await (0, requestBudget_1.canRefresh)(reason))) {
                if (devices && devices.length > 0) {
                    logger.warn(`[daikin.ts] => Refresh blocked by API budget (${reason}), using cache (${devices.length} device(s))`);
                    return devices;
                }
                throw new Error(`API refresh blocked by budget (${reason})`);
            }
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
                if (reason === 'cron_forced_23h58_stats') {
                    let electricalCount = 0;
                    for (const dev of freshDevices) {
                        try {
                            const mp = dev.managementPoints;
                            const hasElectrical = Object.values(mp).some((point) => point && (point.consumptionData || point.electrical));
                            if (hasElectrical)
                                electricalCount++;
                        }
                        catch {
                        }
                    }
                    logger.info(`[daikin.ts] => Energy stats refresh: ${electricalCount}/${freshDevices.length} device(s) with electrical data`);
                }
                await cache.set('devices', freshDevices, constants_2.DEVICE_CACHE_TTL_MS);
                if (devices && devices.length) {
                    logger.debug(`[daikin.ts] => Invalidating cache for ${devices.length} previous device(s)`);
                    for (const dev of devices) {
                        await cache.del(`device_${dev.getId()}`);
                        gatewayCache.delete(dev.getId());
                    }
                }
                const freshIds = new Set(freshDevices.map((d) => d.getId()));
                for (const cachedId of gatewayCache.keys()) {
                    if (!freshIds.has(cachedId)) {
                        gatewayCache.delete(cachedId);
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
                        const tokenPath = (0, tokenPaths_1.getTokenFilePath)();
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
                        logger.error(`[daikin.ts] => Please manually delete the file: ${(0, tokenPaths_1.getTokenFilePath)()}`);
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
    systemBridge.apiBudgetStatus = await (0, requestBudget_1.getBudgetStatus)();
    systemBridge.skippedRefreshCount = await (0, requestBudget_1.getSkippedRefreshCount)();
    systemBridge.authMode = (0, requestBudget_1.getConfiguredAuthMode)();
    systemBridge.dailyQuotaLimit = (0, requestBudget_1.getDefaultDailyQuotaLimit)();
    systemBridge.webSocketConnected = global.daikinClient?.isWebSocketConnected?.() ?? Boolean(await cache.get('ws/connected'));
    const { getNextPollingAt } = await Promise.resolve().then(() => __importStar(require('./cron')));
    systemBridge.nextPollingAt = getNextPollingAt();
    await publishSystemBridge(systemBridge);
    await (0, mqtt_2.publishConfig)('authorization_timeout', systemBridge.authorizationTimeout ? 'true' : 'false');
}
async function publishSystemBridge(systemBridge) {
    try {
        await (0, mqtt_1.publishToMQTT)(instanceId_1.INSTANCE_ID, JSON.stringify(systemBridge));
        if (config.integration?.jeedom) {
            await (0, converter_1.makeDefineFile)(systemBridge, null);
        }
    }
    catch (error) {
        if ((0, shutdown_1.isShuttingDown)()) {
            logger.debug(`[daikin.ts] => Skipping system bridge publish during shutdown`);
            return;
        }
        throw error;
    }
}
function getUnsupportedModules() {
    const configFolder = (0, paths_1.getNewConfigDir)();
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
async function disableDaikinWebSocket() {
    global.daikinClient?.disableWebSocket();
}
//# sourceMappingURL=daikin.js.map