import { resolve } from 'node:path';
import {
	anonymise,
	BRP069A4x,
	BRP069A61,
	BRP069A62,
	BRP069A78,
	BRP069B4x,
	BRP069C41,
	BRP069C4x, BRP069C8x,
	DynamicGateway,
	applyGatewayEvents,
	convertDaikinDevice,
	eventValue,
	SystemBridge
} from "./gateway";
import {makeDefineFile} from "./converter";
import {publishToMQTT} from "./mqtt";
import {DaikinCloudController, DaikinCloudDevice} from "../daikin-cloud";
import fs from "fs";
import {Gateways} from "../types";
import {INSTANCE_ID} from "./instanceId";
import {canRefresh, getBudgetStatus, getSkippedRefreshCount, getDefaultDailyQuotaLimit, getConfiguredAuthMode} from "./requestBudget";
import { AUTH_MODE_MOBILE_APP } from "../daikin-cloud/constants";
import { getTokenFilePath } from "./tokenPaths";
import { getNewConfigDir } from "./paths";
import { DEVICE_CACHE_TTL_MS } from "./constants";
import { publishConfig, setMqttRepublishHandler } from "./mqtt";
import { AuthenticationError } from "./errorHandler";

function isAuthFailure(error: unknown): boolean {
	if (error instanceof AuthenticationError) {
		return true;
	}
	const message = error instanceof Error ? error.message : String(error);
	return /invalid_grant|not authenticated|unauthorized \(401\)|login failed|token refresh failed|token expired|authentication failed|registration completion failed|failed to get authorization code|failed to get oidc context|authorization error/i.test(message);
}

function failAuthStartup(message: string): never {
	logger.error(message);
	logger.error('[daikin.ts] => Shutting down daemon due to authentication failure.');
	throw new AuthenticationError(message);
}

interface PendingCommand {
	payload: Record<string, unknown>;
	timer: NodeJS.Timeout;
}

const pendingCommands = new Map<string, PendingCommand>();
const gatewayCache = new Map<string, { model: string; gateway: Gateways }>();

function clearPendingCommands(): void {
	for (const pending of pendingCommands.values()) {
		if (pending.timer) {
			clearTimeout(pending.timer);
		}
	}
	pendingCommands.clear();
}

function clearGatewayCache(): void {
	gatewayCache.clear();
}

function getCommandCoalesceMs(): number {
	return config.system?.commandCoalesceMs ?? 400;
}

function maskTokenSetForLog(set: unknown): string {
	if (!set || typeof set !== 'object') {
		return String(set);
	}
	const masked = { ...(set as Record<string, unknown>) };
	for (const key of ['access_token', 'refresh_token', 'id_token']) {
		if (typeof masked[key] === 'string') {
			masked[key] = '[REDACTED]';
		}
	}
	return JSON.stringify(masked);
}

async function queueDeviceCommand(device: DaikinCloudDevice, eventData: Record<string, unknown>): Promise<void> {
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
			await applyGatewayEvents(device, gateway, merged);
			logger.debug(`[daikin.ts] => Coalesced command processed for device: ${deviceId}`);
		} catch (eventError) {
			logger.error(`[daikin.ts] => Error processing coalesced event for device ${deviceId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
		}
	}, getCommandCoalesceMs());

	pendingCommands.set(deviceId, { payload: merged, timer });
	logger.debug(`[daikin.ts] => Command queued for device ${deviceId} (${getCommandCoalesceMs()}ms coalesce)`);
}

/**
 * Initializes the Daikin Cloud client (OIDC) and registers core event handlers
 * for authorization, rate limiting, token updates and errors.
 */
async function loadDaikinAPI() {
	const authMode = config.daikin.authMode ?? 'developer_portal';

	if (authMode === AUTH_MODE_MOBILE_APP) {
		if (!config.daikin.email || !config.daikin.password) {
			logger.error('[daikin.ts] => Please set daikin.email and daikin.password for mobile_app auth mode');
			process.exit(0);
		}
	} else if (!config.daikin.clientID || !config.daikin.clientSecret) {
		logger.error('[daikin.ts] => Please set the clientID and clientSecret in the settings files');
		process.exit(0);
	}

	/** Start Daikin Client **/
	const daikinClient = new DaikinCloudController({
		authMode,
		oidcClientId: config.daikin.clientID,
		oidcClientSecret: config.daikin.clientSecret,
		oidcCallbackServerBindAddr: '0.0.0.0',
		oidcCallbackServerPort: config.daikin.clientPort ?? 8765,
		oidcCallbackServerExternalAddress: config.daikin.clientURL,
		oidcTokenSetFilePath: resolve(datadir, 'daikin-controller-cloud-tokenset'),
		mobileEmail: config.daikin.email ?? undefined,
		mobilePassword: config.daikin.password ?? undefined,
		mobileTokenFilePath: resolve(datadir, 'daikin-mobile-tokenset'),
		enableWebSocket: config.daikin.enableWebSocket ?? true,
		httpTransport: config.daikin.httpTransport,
		oidcAuthorizationTimeoutS: 120,
		useMock: config.daikin.useMock ?? false,
		mockId: config.daikin.mockId ?? undefined,
	});

	(daikinClient as unknown as { on(event: 'log', listener: (message: string) => void): void }).on('log', (message: string) => {
		logger.info(`[daikin.ts] => ${message}`);
	});

	daikinClient.on('authorization_request', async (url) => {
		logger.info(`[daikin.ts] =>
			Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
			 
			Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
			 
			Afterwards you are redirected to Daikin to approve the access and then redirected back.`);

		// Update system module with authorization information
		logger.debug(`[daikin.ts] => Updating system bridge with authorization URL: ${url}`);
		try {
			await updateSystemBridge(null, [], {
				authorizationUrl: url,
				authorizationRequest: true,
				authorizationTimeout: false
			});
			logger.debug(`[daikin.ts] => System bridge updated with authorization URL`);
		} catch (error) {
			logger.error(`[daikin.ts] => Error updating system bridge with authorization URL: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limit Status - START`)
		// Store in cache for later retrieval
		await cache.set('rate/limitMinute', rateLimitStatus.limitMinute)
		await cache.set('rate/remainingMinute', rateLimitStatus.remainingMinute)
		await cache.set('rate/limitDay', rateLimitStatus.limitDay)
		await cache.set('rate/remainingDay', rateLimitStatus.remainingDay)
		
		// Update the rate limiter
		const {rateLimiter} = await import("./rateLimiter");
		rateLimiter.updateRateLimit(rateLimitStatus);
		
		// Update system module with rate limit and authorization information
		await updateSystemBridge(rateLimitStatus, null, {
			authorizationRequest: false,
			authorizationTimeout: false
		})
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limit Status - FINISH`)
	});

	daikinClient.on('token_update', async (set) => {
		logger.debug(`[daikin.ts] => EVENT - Token Update - Attempting to save a new token`)
		logger.debug(`[daikin.ts] => EVENT - Token Update - DATA: ${maskTokenSetForLog(set)}`)
	});

	daikinClient.on('websocket_connected', async () => {
		logger.info('[daikin.ts] => WebSocket connected - receiving real-time updates');
		await cache.set('ws/connected', true);
		await updateSystemBridge();
	});

	daikinClient.on('websocket_disconnected', async (info) => {
		logger.info(`[daikin.ts] => WebSocket disconnected${info?.reconnecting ? ' (reconnecting)' : ''}`);
		await cache.set('ws/connected', false);
		await updateSystemBridge();
	});

	daikinClient.on('websocket_device_update', async (update) => {
		try {
			const { handleWebSocketDeviceUpdate } = await import('./wsUpdateMapper');
			await handleWebSocketDeviceUpdate(update);
		} catch (error) {
			logger.error(`[daikin.ts] => WebSocket update handler error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	daikinClient.on('error', async (error) => {
		logger.error(`[daikin.ts] => EVENT - Daikin client error: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		// Log additional details if available
		if (error instanceof Error && 'code' in error) {
			logger.debug(`[daikin.ts] => Error code: ${(error as any).code}`);
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorString = String(error);
		
		// Handle authorization timeout - exit daemon immediately
		if (errorMessage.includes("Authorization time out") || 
		    errorMessage.includes("authorization timeout") ||
		    errorString.includes("Authorization time out") ||
		    errorString.includes("authorization timeout")) {
			try {
				logger.error('[daikin.ts] => Authorization timeout detected. Shutting down daemon.');
				
				// Update system bridge to indicate timeout
				try {
					await updateSystemBridge(null, null, {
						authorizationTimeout: true
					});
					logger.info('[daikin.ts] => System bridge updated with timeout state');
				} catch (bridgeError) {
					logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
				}
				
				logger.error('[daikin.ts] => Please restart DaikinToMQTT and try again.');
			} catch (e) {
				logger.error(`[daikin.ts] => Error handling authorization timeout: ${e instanceof Error ? e.message : String(e)}`);
			}
			
			// Exit the daemon immediately
			process.exit(1);
		}
		// Handle invalid_grant error (invalid token) - delete token and exit
		else if (errorMessage.includes("invalid_grant") || errorString.includes("invalid_grant") || (error as any)?.error === "invalid_grant") {
			try {
				logger.error('[daikin.ts] => Invalid token detected (invalid_grant), deleting old token and shutting down');
				const tokenPath = getTokenFilePath();
				
				if (fs.existsSync(tokenPath)) {
					fs.unlinkSync(tokenPath);
					logger.info(`[daikin.ts] => Token file deleted: ${tokenPath}`);
				} else {
					logger.warn(`[daikin.ts] => Token file does not exist: ${tokenPath}`);
				}
				
				// Update system bridge to indicate token was deleted
				try {
					await updateSystemBridge(null, [], {
						authorizationRequest: true,
						authorizationTimeout: false
					});
				} catch (bridgeError) {
					logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
				}
				
				logger.error('[daikin.ts] => Token deleted. Shutting down daemon. Please restart the application to trigger a new authorization request.');
			} catch (e) {
				logger.error(`[daikin.ts] => Error deleting token: ${e instanceof Error ? e.message : String(e)}`);
				logger.error(`[daikin.ts] => Please manually delete the file: ${getTokenFilePath()}`);
			}
			
			// Exit the daemon
			process.exit(1);
		} else if (isAuthFailure(error)) {
			logger.error(`[daikin.ts] => Daikin client authentication error: ${errorMessage}`);
			logger.error('[daikin.ts] => Shutting down daemon due to authentication failure.');
			process.exit(1);
		}
	});

	global.daikinClient = daikinClient;
}

/**
 * Starts the Daikin integration:
 *  - loads rate limit info
 *  - initializes the system bridge
 *  - triggers authorization if no token is present
 *  - loads devices, subscribes to MQTT, generates configs and publishes initial state.
 */
async function startDaikinAPI() {
	let devices: DaikinCloudDevice[] | null = null;
	
	try {
		logger.info("[daikin.ts] => Starting Daikin API");
		
		// Load rate limiting information from cache on startup
		const {rateLimiter} = await import("./rateLimiter");
		await rateLimiter.loadRateLimitFromCache();
		
		// Always initialize system bridge first, even if API is not connected
		logger.info("[daikin.ts] => Initializing system bridge");
		await initializeSystemBridge([]);
		
		// Check if token exists / authenticate mobile app
		const tokenPath = getTokenFilePath();
		const tokenExists = fs.existsSync(tokenPath);
		const authMode = config.daikin.authMode ?? 'developer_portal';

		if (authMode === AUTH_MODE_MOBILE_APP) {
			if (!daikinClient.isAuthenticated()) {
				logger.info('[daikin.ts] => Mobile App auth: authenticating with Onecta credentials...');
				try {
					await daikinClient.authenticateMobile();
					logger.info('[daikin.ts] => Mobile App authentication successful');
				} catch (authError) {
					failAuthStartup(
						`[daikin.ts] => Mobile App authentication failed: ${authError instanceof Error ? authError.message : String(authError)}`,
					);
				}
			}
		} else if (!tokenExists) {
			logger.info("[daikin.ts] => No token found, making initial request to trigger authorization");
			// Make a first request to trigger the authorization_request event
			// This will cause the API to request authorization and emit the authorization_request event
			try {
				await getDevices(false, "authorization_initial_request");
			} catch (authError) {
				// Expected error when not authorized - the authorization_request event will be triggered
				logger.debug(`[daikin.ts] => Initial request failed (expected if not authorized): ${authError instanceof Error ? authError.message : String(authError)}`);
				// The authorization_request event will update the system bridge with the URL
				return;
			}
		}
		
		try {
			devices = await getDevices(false, "startup_devices_load");
			if (!devices || devices.length === 0) {
				logger.warn("[daikin.ts] => No devices found");
				// Update system bridge with empty devices list
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
			
			// Update system bridge with devices
			await updateSystemBridge(null, devices);

			if (authMode === AUTH_MODE_MOBILE_APP && (config.daikin.enableWebSocket ?? true)) {
				try {
					await daikinClient.enableWebSocket();
				} catch (wsError) {
					logger.warn(`[daikin.ts] => WebSocket enable failed, falling back to polling: ${wsError instanceof Error ? wsError.message : String(wsError)}`);
				}
			}
			
			logger.info("[daikin.ts] => Daikin API started successfully");

			setMqttRepublishHandler(async () => {
				const cachedDevices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
				if (cachedDevices?.length) {
					await sendDevice(cachedDevices, false, 'mqtt_reconnect_republish');
				}
				await updateSystemBridge();
			});
		} catch (apiError) {
			if (isAuthFailure(apiError)) {
				failAuthStartup(
					`[daikin.ts] => Authentication failed during API startup: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
				);
			}
			logger.error(`[daikin.ts] => Error during API operations: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
			if (apiError instanceof Error && apiError.stack) {
				logger.debug(`[daikin.ts] => Stack trace: ${apiError.stack}`);
			}
			// Update system bridge even on error
			await updateSystemBridge(null, devices || []);
			// Don't throw, allow system to continue with system bridge initialized
		}
	} catch (error) {
		if (isAuthFailure(error)) {
			failAuthStartup(
				`[daikin.ts] => Critical authentication error during API startup: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		logger.error(`[daikin.ts] => Critical error during API startup: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		// Try to initialize system bridge even on critical error
		try {
			await initializeSystemBridge([]);
		} catch (bridgeError) {
			logger.error(`[daikin.ts] => Failed to initialize system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
		}
		// Don't throw to allow system to continue
	}
}

/**
 * Subscribes to MQTT topics for each Daikin device and for the system bridge,
 * and routes incoming MQTT messages to the appropriate handlers.
 */
async function subscribeDevices(devices: DaikinCloudDevice[]) {
	for (let dev of devices) {
		let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set"
		mqttClient.subscribe(subscribeTopic, function (err) {
			if (!err) logger.info("[daikin.ts] => Subscribe to " + subscribeTopic)
		})
	}

	// Subscribe to Daikin2MQTT bridge set topic
	const systemBridgeSetTopic = config.mqtt.topic + "/" + INSTANCE_ID + "/set"
	mqttClient.subscribe(systemBridgeSetTopic, function (err) {
		if (!err) logger.info("[daikin.ts] => Subscribe to " + systemBridgeSetTopic)
	})

	const refreshTopicPath = config.mqtt.topic + "/system/bridge/refresh/set";
	mqttClient.subscribe(refreshTopicPath, function (err) {
		if (!err) logger.info("[daikin.ts] => Subscribe to " + refreshTopicPath)
	})

	mqttClient.on('message', async function (topic, message) {
		try {
			const topicString = topic.toString();
			const messageString = message.toString();
			
			logger.debug(`[daikin.ts] => MQTT message received - Topic: ${topicString}, Size: ${messageString.length} bytes`);
			logger.debug(`[daikin.ts] => MQTT message content: ${messageString}`);

			const systemBridgeSetTopicPath = config.mqtt.topic + "/" + INSTANCE_ID + "/set";

			// Handle system bridge actions
			if (topicString === systemBridgeSetTopicPath) {
				let data;
				try {
					data = JSON.parse(messageString);
				} catch (parseError) {
					logger.error(`[daikin.ts] => JSON parsing error for system topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
					return;
				}

				if (data.refreshAllDevices !== undefined || data._refreshAllDevices !== undefined) {
					logger.info(`[daikin.ts] => Refresh all devices command received from system bridge`);
					try {
						await sendDevice(null, true, "system_bridge_refresh_all"); // Force refresh from cloud
						await updateSystemBridge(); // Update system module after refresh
						logger.info(`[daikin.ts] => Refresh of all devices completed successfully`);
					} catch (refreshError) {
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
				} catch (refreshError) {
					logger.error(`[daikin.ts] => Error during legacy refresh: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
				}
				return;
			}

			const cachedDevices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
			const devicesList = (cachedDevices !== undefined && cachedDevices !== null)
				? cachedDevices
				: await getDevices();

			// Process messages for devices (exact topic match)
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
					} catch (parseError) {
						logger.error(`[daikin.ts] => JSON parsing error for device ${deviceId}, topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
						break;
					}
					
					try {
						await queueDeviceCommand(dev, eventData);
					} catch (eventError) {
						logger.error(`[daikin.ts] => Error processing event for device ${deviceId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
						if (eventError instanceof Error && eventError.stack) {
							logger.debug(`[daikin.ts] => Stack trace: ${eventError.stack}`);
						}
					}
				} else {
					logger.warn(`[daikin.ts] => No gateway found for device ${deviceId}, unsupported model`);
				}
				break;
			}
		} catch (error) {
			logger.error(`[daikin.ts] => Unexpected error processing MQTT message: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
			}
		}
	})
}

/**
 * Refreshes a single device from cloud (GET /v1/gateway-devices/{id}) and publishes MQTT state.
 */
async function refreshSingleDevice(deviceId: string, reason: string): Promise<boolean> {
	try {
		const devices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
		if (!devices?.length) {
			return false;
		}

		const device = devices.find((dev) => dev.getId() === deviceId);
		if (!device) {
			return false;
		}

		if (!(await canRefresh(reason))) {
			return false;
		}

		logger.info(`[daikin.ts] => Partial refresh for device ${deviceId} (reason: ${reason})`);
		await device.updateData();
		await cache.set('devices', devices, DEVICE_CACHE_TTL_MS);
		await cache.set(`device_${deviceId}`, device, 10800000);

		const gateway = getModels(device);
		if (gateway === undefined) {
			return false;
		}

		await publishToMQTT(deviceId, JSON.stringify(gateway));
		await updateSystemBridge(null, devices);
		return true;
	} catch (error) {
		logger.warn(`[daikin.ts] => Partial refresh failed for ${deviceId}, falling back to full refresh: ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
}

/**
 * Publishes the full state of all devices to MQTT.
 * If devices are not provided, they are retrieved via getDevices (cache or cloud).
 * Also records periodic refresh timestamps and updates the system bridge.
 */
async function sendDevice(
	devices: DaikinCloudDevice[] | null = null,
	cron: boolean = false,
	reason: string = "unspecified",
	onlyDeviceIds?: string[]
) {
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
				// Use cache.set() instead of direct indexing
				// TTL of 3 hours to match the device list cache
				await cache.set(`device_${deviceId}`, dev, DEVICE_CACHE_TTL_MS);
				
				let gateway = getModels(dev);
				if (gateway === undefined) {
					logger.warn(`[daikin.ts] => No gateway found for device ${deviceId}, unsupported model`);
					continue;
				}
				
				const gatewayJson = JSON.stringify(gateway);
				await publishToMQTT(deviceId, gatewayJson);
				logger.debug(`[daikin.ts] => Device ${deviceId} published successfully to MQTT`);
			} catch (deviceError) {
				logger.error(`[daikin.ts] => Error sending device ${deviceId}: ${deviceError instanceof Error ? deviceError.message : String(deviceError)}`);
				if (deviceError instanceof Error && deviceError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${deviceError.stack}`);
				}
				// Continue with other devices even on error
			}
		}
		
		// Mark last periodic refresh (to avoid an unnecessary post-action refresh)
		try {
			const periodicReasons = ["cron_polling", "cron_forced_23h58_stats", "system_bridge_refresh_all"];
			if (periodicReasons.includes(reason)) {
				const ts = Math.floor(Date.now() / 1000);
				await cache.set('lastPeriodicRefreshTs', ts);
				logger.debug(`[daikin.ts] => Recorded periodic refresh at ${new Date(ts * 1000).toISOString()} (reason=${reason})`);
			}
		} catch (periodicError) {
			logger.error(`[daikin.ts] => Error recording periodic refresh timestamp: ${periodicError instanceof Error ? periodicError.message : String(periodicError)}`);
		}
		
		// Update system module after sending devices
		try {
			await updateSystemBridge(null, devices);
		} catch (bridgeError) {
			logger.error(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
		}
	} catch (error) {
		logger.error(`[daikin.ts] => Critical error sending devices: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

/**
 * Detects gateway model string from device data.
 */
function detectGatewayModel(devices: DaikinCloudDevice): string | undefined {
	try {
		const gatewayModelInfo = devices.getData('gateway', 'modelInfo', null);
		if (gatewayModelInfo !== null && gatewayModelInfo !== undefined) {
			return gatewayModelInfo.value as string;
		}
		const zeroModelInfo = devices.getData('0', 'modelInfo', null);
		if (zeroModelInfo !== null && zeroModelInfo !== undefined) {
			return zeroModelInfo.value as string;
		}
	} catch (error) {
		logger.warn(`[daikin.ts] => Error retrieving modelInfo: ${error instanceof Error ? error.message : String(error)}`);
	}
	return undefined;
}

function createGatewayInstance(devices: DaikinCloudDevice, model: string): Gateways | undefined {
	switch (model) {
		case 'BRP069C4x':
			return new BRP069C4x(devices);
		case 'BRP069A62':
			return new BRP069A62(devices);
		case 'BRP069A78':
			return new BRP069A78(devices);
		case 'BRP069B4x':
			return new BRP069B4x(devices);
		case 'BRP069A4x':
			return new BRP069A4x(devices);
		case 'BRP069A61':
			return new BRP069A61(devices);
		case 'BRP069C41':
			return new BRP069C41(devices);
		case 'BRP069C8x':
			return new BRP069C8x(devices);
		default:
			if (config.system?.dynamicFallback !== false) {
				logger.info(`[daikin.ts] => Using DynamicGateway for model: ${model}`);
				return new DynamicGateway(devices);
			}
			logger.warn(`[daikin.ts] => Unsupported model: ${model}`);
			anonymise(devices, model);
			return undefined;
	}
}

/**
 * Detects the gateway model for a given Daikin device and instantiates
 * the corresponding gateway class, or returns undefined if unsupported.
 */
function getModels(devices: DaikinCloudDevice): Gateways | undefined {
	try {
		if (!devices) {
			logger.warn(`[daikin.ts] => Device null or undefined in getModels`);
			return undefined;
		}

		const deviceId = devices.getId();
		const model = detectGatewayModel(devices);
		let cacheKey: string;

		if (!model) {
			if (config.system?.dynamicFallback === false) {
				logger.warn(`[daikin.ts] => No modelInfo found for device ${deviceId}`);
				anonymise(devices, 'unknown');
				return undefined;
			}
			cacheKey = 'DynamicGateway';
			logger.info(`[daikin.ts] => Using DynamicGateway for device without modelInfo`);
		} else {
			cacheKey = model;
			logger.debug(`[daikin.ts] => Model detected: ${model} for device ${deviceId}`);
		}

		const cached = gatewayCache.get(deviceId);
		if (cached && cached.model === cacheKey) {
			convertDaikinDevice(devices, cached.gateway);
			return cached.gateway;
		}

		let gateway: Gateways | undefined;
		if (cacheKey === 'DynamicGateway') {
			gateway = new DynamicGateway(devices);
		} else {
			gateway = createGatewayInstance(devices, cacheKey);
		}

		if (gateway) {
			gatewayCache.set(deviceId, { model: cacheKey, gateway });
		}
		return gateway;
	} catch (error) {
		logger.error(`[daikin.ts] => Critical error in getModels: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		return undefined;
	}
}

/**
 * Generates integration configuration files (e.g. Jeedom / Home Assistant)
 * for the provided list of devices.
 */
async function generateConfig(devices: DaikinCloudDevice[]) {
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
					await makeDefineFile(module, device);
					logger.debug(`[daikin.ts] => Configuration generated successfully for device ${deviceId}`);
				} else {
					logger.warn(`[daikin.ts] => No module found for device ${deviceId}, configuration not generated`);
				}
			} catch (configError) {
				logger.error(`[daikin.ts] => Error generating configuration for device ${deviceId}: ${configError instanceof Error ? configError.message : String(configError)}`);
				if (configError instanceof Error && configError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${configError.stack}`);
				}
				// Continue with other devices even on error
			}
		}
		
		logger.info(`[daikin.ts] => Configuration generation completed for ${devices.length} device(s)`);
	} catch (error) {
		logger.error(`[daikin.ts] => Critical error during configuration generation: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

/**
 * Returns the list of Daikin cloud devices, using the cache when possible.
 * When force=true or the cache is missing, it calls the Daikin cloud API
 * and updates the cache, with rate-limit aware retry logic.
 */
async function getDevices(force: boolean = false, reason: string = "unspecified"): Promise<DaikinCloudDevice[]> {
	try {
		const devices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
		
		if (devices === undefined || force) {
			if (force && !(await canRefresh(reason))) {
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
				
				// Use rate limiter to handle automatic retries
				const {rateLimiter} = await import("./rateLimiter");
				
				// "Refresh" reasons have a special behavior:
				// - 3 attempts maximum spaced by 60s
				// - retry only on connectivity issues or minute rate limit
				// - no retry when daily rate limit is reached
				const refreshReasons = [
					"cron_polling",
					"cron_forced_23h58_stats",
					"system_bridge_refresh_all",
					"post_action_refresh",
					"system_bridge_auto_update"
				];
				const isRefreshReason = refreshReasons.includes(reason);
				
				const freshDevices = await rateLimiter.executeWithRetry(
					async () => await daikinClient.getCloudDevices(),
					`getCloudDevices-${reason}`,
					isRefreshReason
						? {
							// Refresh mode: 3 attempts (0 + 2 retries), every 60s,
							// only for connectivity errors / minute rate limit (handled in rateLimiter.refreshMode)
							maxRetries: 2,
							refreshMode: true
						}
						: {
							// Structural calls (startup, auth, etc.): keep reasonable retries,
							// but limited in total duration by rateLimiter (1h maxTotalDurationMs).
							maxRetries: 3,
							baseDelay: 2000, // 2 seconds base
							maxDelay: 120000 // 2 minutes maximum
						}
				);
				
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
							const hasElectrical = Object.values(mp).some((point: any) =>
								point && (point.consumptionData || point.electrical)
							);
							if (hasElectrical) electricalCount++;
						} catch {
							// ignore per-device parse errors
						}
					}
					logger.info(`[daikin.ts] => Energy stats refresh: ${electricalCount}/${freshDevices.length} device(s) with electrical data`);
				}
				
				// Cache with TTL of 3 hours (10800000 milliseconds)
				await cache.set('devices', freshDevices, DEVICE_CACHE_TTL_MS);
				
				// Invalidate individual device caches to ensure consistency
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
			} catch (cloudError) {
				const errorMessage = cloudError instanceof Error ? cloudError.message : String(cloudError);
				const errorString = String(cloudError);
				
				// Handle authorization timeout - exit daemon immediately
				if (errorMessage.includes("Authorization time out") || 
				    errorMessage.includes("authorization timeout") ||
				    errorString.includes("Authorization time out") ||
				    errorString.includes("authorization timeout")) {
					try {
						logger.error('[daikin.ts] => Authorization timeout detected in getDevices. Shutting down daemon.');
						
						// Update system bridge to indicate timeout
						try {
							await updateSystemBridge(null, null, {
								authorizationTimeout: true
							});
							logger.info('[daikin.ts] => System bridge updated with timeout state');
						} catch (bridgeError) {
							logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
						}
						
						logger.error('[daikin.ts] => Please restart DaikinToMQTT and try again.');
					} catch (e) {
						logger.error(`[daikin.ts] => Error handling authorization timeout: ${e instanceof Error ? e.message : String(e)}`);
					}
					
					// Exit the daemon immediately
					process.exit(1);
				}
				// Handle invalid_grant error (invalid token) - delete token and exit
				else if (errorMessage.includes("invalid_grant") || errorString.includes("invalid_grant") || (cloudError as any)?.error === "invalid_grant") {
					try {
						logger.error('[daikin.ts] => Invalid token detected (invalid_grant) in getDevices, deleting old token and shutting down');
						const tokenPath = getTokenFilePath();
						
						if (fs.existsSync(tokenPath)) {
							fs.unlinkSync(tokenPath);
							logger.info(`[daikin.ts] => Token file deleted: ${tokenPath}`);
						} else {
							logger.warn(`[daikin.ts] => Token file does not exist: ${tokenPath}`);
						}
						
						// Update system bridge to indicate token was deleted
						try {
							await updateSystemBridge(null, [], {
								authorizationRequest: true,
								authorizationTimeout: false
							});
						} catch (bridgeError) {
							logger.debug(`[daikin.ts] => Error updating system bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
						}
						
						logger.error('[daikin.ts] => Token deleted. Shutting down daemon. Please restart the application to trigger a new authorization request.');
					} catch (deleteError) {
						logger.error(`[daikin.ts] => Error deleting token: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
						logger.error(`[daikin.ts] => Please manually delete the file: ${getTokenFilePath()}`);
					}
					
					// Exit the daemon
					process.exit(1);
				}
				
				logger.error(`[daikin.ts] => Error retrieving devices from cloud: ${errorMessage}`);
				if (cloudError instanceof Error && cloudError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${cloudError.stack}`);
				}
				// If we have cached devices and it's not a forced refresh, return cache
				if (devices && devices.length > 0 && !force) {
					logger.warn(`[daikin.ts] => Using cached devices due to cloud error`);
					return devices;
				}
				throw cloudError;
			}
		} else {
			logger.debug(`[daikin.ts] => Using cache (${devices.length} device(s))`);
		}
		
		return devices || [];
	} catch (error) {
		logger.error(`[daikin.ts] => Critical error retrieving devices: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

/**
 * Creates and publishes the initial SystemBridge object with the current instance id
 * and the list of devices (if available).
 */
async function initializeSystemBridge(devices: DaikinCloudDevice[]) {
	const systemBridge = new SystemBridge();
	systemBridge.device.id = INSTANCE_ID;
	systemBridge.device.serialNumber = INSTANCE_ID;
	await updateSystemBridge(null, devices, undefined, systemBridge);
}

/**
 * Updates and publishes the SystemBridge object using:
 *  - latest rate limit information
 *  - current devices (from argument, cache or cloud)
 *  - authorization state (URL, request flag, timeout flag).
 */
async function updateSystemBridge(rateLimitStatus?: any, devices?: DaikinCloudDevice[] | null, authorizationInfo?: {authorizationUrl?: string, authorizationRequest?: boolean, authorizationTimeout?: boolean}, existingBridge?: SystemBridge) {
	const systemBridge = existingBridge || new SystemBridge();
	
	if (!existingBridge) {
		systemBridge.device.id = INSTANCE_ID;
		systemBridge.device.serialNumber = INSTANCE_ID;
	}
	
	// Update rate limit information
	if (rateLimitStatus) {
		systemBridge.rateLimitMinute = rateLimitStatus.limitMinute;
		systemBridge.rateRemainingMinute = rateLimitStatus.remainingMinute;
		systemBridge.rateLimitDay = rateLimitStatus.limitDay;
		systemBridge.rateRemainingDay = rateLimitStatus.remainingDay;
	} else {
		const [limitMinute, remainingMinute, limitDay, remainingDay] = await Promise.all([
			cache.get('rate/limitMinute'),
			cache.get('rate/remainingMinute'),
			cache.get('rate/limitDay'),
			cache.get('rate/remainingDay')
		]);
		if (limitMinute !== undefined) systemBridge.rateLimitMinute = Number(limitMinute);
		if (remainingMinute !== undefined) systemBridge.rateRemainingMinute = Number(remainingMinute);
		if (limitDay !== undefined) systemBridge.rateLimitDay = Number(limitDay);
		if (remainingDay !== undefined) systemBridge.rateRemainingDay = Number(remainingDay);
	}

	// Update authorization information
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
	} else {
		const [authUrl, authRequest, authTimeout] = await Promise.all([
			cache.get('authorizationUrl'),
			cache.get('authorizationRequest'),
			cache.get('authorizationTimeout')
		]);
		if (authUrl !== undefined) systemBridge.authorizationUrl = String(authUrl);
		if (authRequest !== undefined) systemBridge.authorizationRequest = Boolean(authRequest);
		if (authTimeout !== undefined) systemBridge.authorizationTimeout = Boolean(authTimeout);
	}

	// Update module information
	// Only try to get devices if not provided and API is available, otherwise use empty array
	if (devices === null || devices === undefined) {
		try {
			// Try to get from cache first without forcing API call
			const cachedDevices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
			if (cachedDevices && Array.isArray(cachedDevices) && cachedDevices.length > 0) {
				devices = cachedDevices;
			} else {
				// If no cache and API client exists, try to get devices (but don't block)
				if (global.daikinClient) {
					try {
						devices = await getDevices(false, "system_bridge_auto_update"); // Use cache if available, don't force
					} catch (getDevicesError) {
						logger.debug(`[daikin.ts] => Could not retrieve devices for system bridge update: ${getDevicesError instanceof Error ? getDevicesError.message : String(getDevicesError)}`);
						devices = [];
					}
				} else {
					devices = [];
				}
			}
		} catch (error) {
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
				} catch (devError) {
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
		} catch (mapError) {
			logger.debug(`[daikin.ts] => Error mapping devices info: ${mapError instanceof Error ? mapError.message : String(mapError)}`);
			systemBridge.modulesCount = 0;
			systemBridge.modulesList = "[]";
		}
	} else {
		systemBridge.modulesCount = 0;
		systemBridge.modulesList = "[]";
	}

	// Update unsupported modules information
	const unsupportedModules = getUnsupportedModules();
	systemBridge.unsupportedModulesCount = unsupportedModules.length;
	systemBridge.unsupportedModulesList = JSON.stringify(unsupportedModules);

	systemBridge.apiBudgetStatus = await getBudgetStatus();
	systemBridge.skippedRefreshCount = await getSkippedRefreshCount();
	systemBridge.authMode = getConfiguredAuthMode();
	systemBridge.dailyQuotaLimit = getDefaultDailyQuotaLimit();
	systemBridge.webSocketConnected = global.daikinClient?.isWebSocketConnected?.() ?? Boolean(await cache.get('ws/connected'));
	const { getNextPollingAt } = await import('./cron');
	systemBridge.nextPollingAt = getNextPollingAt();

	// Publish system module
	await publishSystemBridge(systemBridge);

	await publishConfig('authorization_timeout', systemBridge.authorizationTimeout ? 'true' : 'false');
}

async function publishSystemBridge(systemBridge: SystemBridge) {
	// Publish complete object like other devices (includes device)
	await publishToMQTT(INSTANCE_ID, JSON.stringify(systemBridge));
	
	if (config.integration?.jeedom) {
		await makeDefineFile(systemBridge, null);
	}
}

/**
 * Returns the list of unsupported module JSON definitions found in the
 * generated configuration directory, with best-effort extraction of model info.
 */
function getUnsupportedModules(): Array<{fileName: string, model?: string}> {
	const configFolder = getNewConfigDir();
	const unsupportedModules: Array<{fileName: string, model?: string}> = [];

	if (!fs.existsSync(configFolder)) {
		return unsupportedModules;
	}

	const files = fs.readdirSync(configFolder);
	files.forEach(file => {
		if (file.endsWith('.json')) {
			const fileName = file.replace('.json', '');
			try {
				const filePath = resolve(configFolder, file);
				const content = fs.readFileSync(filePath, 'utf8');
				const data = JSON.parse(content);
				// Try to extract modelInfo if available
				const model = data?.gateway?.modelInfo?.value || data?.['0']?.modelInfo?.value || fileName;
				unsupportedModules.push({ fileName, model });
			} catch (e) {
				unsupportedModules.push({ fileName });
			}
		}
	});

	return unsupportedModules;
}

export {
	loadDaikinAPI,
	subscribeDevices,
	generateConfig,
	sendDevice,
	startDaikinAPI,
	getDevices,
	updateSystemBridge,
	getModels,
	disableDaikinWebSocket,
	clearPendingCommands,
	clearGatewayCache,
}

async function disableDaikinWebSocket(): Promise<void> {
	global.daikinClient?.disableWebSocket();
}

