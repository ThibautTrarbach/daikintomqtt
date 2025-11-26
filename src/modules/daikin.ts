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
	eventValue,
	SystemBridge
} from "./gateway";
import {makeDefineFile} from "./converter";
import {publishToMQTT} from "./mqtt";
import {DaikinCloudController} from "daikin-controller-cloud";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";
import fs from "fs";
import {INSTANCE_ID} from "./instanceId";

async function loadDaikinAPI() {
	if (!config.daikin.clientID || !config.daikin.clientSecret) {
		logger.error('[daikin.ts] => Please set the clientID and clientSecret in the settings files');
		process.exit(0);
	}

	/** Start Daikin Client **/
	const daikinClient = new DaikinCloudController({
		/* OIDC client id */
		oidcClientId: config.daikin.clientID,
		/* OIDC client secret */
		oidcClientSecret: config.daikin.clientSecret,
		/* Network interface that the HTTP server should bind to. Bind to all interfaces for convenience, please limit as needed to single interfaces! */
		oidcCallbackServerBindAddr: '0.0.0.0',
		/* port that the HTTP server should bind to */
		oidcCallbackServerPort: config.daikin.clientPort,
		/* OIDC Redirect URI */
		oidcCallbackServerExternalAddress: config.daikin.clientURL,
		//oidcCallbackServerBaseUrl: 'https://daikin.local:8765', // or use local IP address where server is reachable
		/* path of file used to cache the OIDC tokenset */
		oidcTokenSetFilePath: resolve(datadir, 'daikin-controller-cloud-tokenset'),
		/* time to wait for the user to go through the authorization grant flow before giving up (in seconds) */
		oidcAuthorizationTimeoutS: 120
	});

	daikinClient.on('authorization_request', async (url) => {
		logger.info(`[daikin.ts] =>
			Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
			 
			Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
			 
			Afterwards you are redirected to Daikin to approve the access and then redirected back.`);

		// Update system module with authorization information
		await updateSystemBridge(null, null, {
			authorizationUrl: url,
			authorizationRequest: true,
			authorizationTimeout: false
		});
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
		logger.debug(`[daikin.ts] => EVENT - Token Update - DATA: `)
		logger.debug(JSON.stringify(set))
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
	});

	global.daikinClient = daikinClient;
}

async function startDaikinAPI() {
	try {
		logger.info("[daikin.ts] => Starting Daikin API");
		
		// Load rate limiting information from cache on startup
		const {rateLimiter} = await import("./rateLimiter");
		await rateLimiter.loadRateLimitFromCache();
		
		const devices = await getDevices();
		if (!devices || devices.length === 0) {
			logger.error("[daikin.ts] => No devices found, cannot start API");
			return;
		}
		
		logger.info(`[daikin.ts] => Found ${devices.length} device(s)`);
		
		logger.info("[daikin.ts] => Subscribing to MQTT actions");
		await subscribeDevices(devices);
		
		logger.info("[daikin.ts] => Generating configuration files");
		await generateConfig(devices);
		
		logger.info("[daikin.ts] => Sending initial data values");
		await sendDevice(devices);
		
		logger.info("[daikin.ts] => Initializing system bridge");
		await initializeSystemBridge(devices);
		
		logger.info("[daikin.ts] => Daikin API started successfully");
	} catch (error) {
		logger.error(`[daikin.ts] => Critical error during API startup: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

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

	mqttClient.on('message', async function (topic, message) {
		try {
			const topicString = topic.toString();
			const messageString = message.toString();
			
			logger.debug(`[daikin.ts] => MQTT message received - Topic: ${topicString}, Size: ${messageString.length} bytes`);

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
						await sendDevice(null, true); // Force refresh from cloud
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

			// Process messages for devices
			for (let dev of devices) {
				const deviceId = dev.getId();
				if (!topicString.includes(deviceId)) continue;
				
				logger.debug(`[daikin.ts] => Processing message for device: ${deviceId}`);
				
				let gateway = getModels(dev);
				if (gateway !== undefined) {
					let eventData;
					try {
						eventData = JSON.parse(messageString);
					} catch (parseError) {
						logger.error(`[daikin.ts] => JSON parsing error for device ${deviceId}, topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
						continue;
					}
					
					try {
						await eventValue(dev, gateway, eventData);
						logger.debug(`[daikin.ts] => Command processed successfully for device: ${deviceId}`);
					} catch (eventError) {
						logger.error(`[daikin.ts] => Error processing event for device ${deviceId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
						if (eventError instanceof Error && eventError.stack) {
							logger.debug(`[daikin.ts] => Stack trace: ${eventError.stack}`);
						}
					}
				} else {
					logger.warn(`[daikin.ts] => No gateway found for device ${deviceId}, unsupported model`);
				}
			}
		} catch (error) {
			logger.error(`[daikin.ts] => Unexpected error processing MQTT message: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
			}
		}
	})
}

async function sendDevice(devices: DaikinCloudDevice[] | null = null, cron: boolean = false) {
	try {
		if (devices == null) {
			logger.debug(`[daikin.ts] => Retrieving devices${cron ? ' (forced from cloud)' : ' (from cache if available)'}`);
			devices = await getDevices(cron);
		}

		if (!devices || devices.length === 0) {
			logger.warn(`[daikin.ts] => No devices found for sending`);
			return;
		}

		logger.debug(`[daikin.ts] => Sending ${devices.length} device(s) to MQTT`);
		
		for (let dev of devices) {
			const deviceId = dev.getId();
			try {
				// Use cache.set() instead of direct indexing
				// TTL of 10 minutes to match the device list cache
				await cache.set(`device_${deviceId}`, dev, 600000);
				
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

async function timeUpdate() {
	try {
		logger.debug("[daikin.ts] => Checking refresh after command => START");
		
		// Minimum timestamp (60 seconds ago)
		const time = Math.floor((Date.now() / 1000) - 60);
		logger.debug(`[daikin.ts] => Minimum timestamp required: ${time} (${new Date(time * 1000).toISOString()})`);
		
		const timerefresh = await cache.get('needRefresh');
		
		if (timerefresh === undefined || timerefresh === null) {
			logger.debug("[daikin.ts] => No refresh pending");
			return;
		}
		
		if (typeof timerefresh !== "number") {
			logger.warn(`[daikin.ts] => Invalid timestamp type in cache: ${typeof timerefresh}, removing`);
			await cache.del('needRefresh');
			return;
		}
		
		logger.debug(`[daikin.ts] => Cached timestamp: ${timerefresh} (${new Date(timerefresh * 1000).toISOString()})`);
		
		if (timerefresh <= time) {
			logger.info("[daikin.ts] => Refresh needed after command, updating devices");
			await cache.del('needRefresh');
			
			try {
				await sendDevice(null, true);
				logger.debug("[daikin.ts] => Refresh after command completed successfully");
			} catch (refreshError) {
				logger.error(`[daikin.ts] => Error during refresh after command: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
				if (refreshError instanceof Error && refreshError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${refreshError.stack}`);
				}
			}
		} else {
			const remainingSeconds = timerefresh - time;
			logger.debug(`[daikin.ts] => Refresh not yet needed, ${remainingSeconds} second(s) remaining`);
		}
		
		logger.debug("[daikin.ts] => Checking refresh after command => FINISH");
	} catch (error) {
		logger.error(`[daikin.ts] => Error in timeUpdate: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
	}
}

function getModels(devices: any) {
	try {
		if (!devices) {
			logger.warn(`[daikin.ts] => Device null or undefined in getModels`);
			return undefined;
		}

		let value: string | undefined;
		
		try {
			const gatewayModelInfo = devices.getData('gateway', 'modelInfo');
			if (gatewayModelInfo !== null && gatewayModelInfo !== undefined) {
				value = gatewayModelInfo.value;
			} else {
				const zeroModelInfo = devices.getData('0', 'modelInfo');
				if (zeroModelInfo !== null && zeroModelInfo !== undefined) {
					value = zeroModelInfo.value;
				}
			}
		} catch (error) {
			logger.warn(`[daikin.ts] => Error retrieving modelInfo: ${error instanceof Error ? error.message : String(error)}`);
			return undefined;
		}

		if (!value) {
			logger.warn(`[daikin.ts] => No modelInfo found for device ${devices.getId ? devices.getId() : 'unknown'}`);
			anonymise(devices, value || 'unknown');
			return undefined;
		}

		logger.debug(`[daikin.ts] => Model detected: ${value} for device ${devices.getId ? devices.getId() : 'unknown'}`);

		switch (value) {
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
			logger.warn(`[daikin.ts] => Unsupported model: ${value}`);
			anonymise(devices, value);
			return undefined;
		}
	} catch (error) {
		logger.error(`[daikin.ts] => Critical error in getModels: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		return undefined;
	}
}

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

async function getDevices(force: boolean = false): Promise<DaikinCloudDevice[]> {
	try {
		const devices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
		
		if (devices === undefined || force) {
			logger.info(`[daikin.ts] => ${force ? 'Forced retrieval' : 'Cache invalid'}, retrieving information from Daikin cloud`);
			
			if (!global.daikinClient) {
				logger.error(`[daikin.ts] => Daikin client is not initialized`);
				throw new Error("Daikin client is not initialized");
			}
			
			try {
				logger.debug('[daikin.ts] => Sending request to Daikin cloud to retrieve devices');
				
				// Use rate limiter to handle automatic retries
				const {rateLimiter} = await import("./rateLimiter");
				const freshDevices = await rateLimiter.executeWithRetry(
					async () => await daikinClient.getCloudDevices(),
					'getCloudDevices',
					{
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
				
				// Cache with TTL of 10 minutes (600000 milliseconds = 600 seconds)
				await cache.set('devices', freshDevices, 600000);
				
				// Invalidate individual device caches to ensure consistency
				if (devices && devices.length) {
					logger.debug(`[daikin.ts] => Invalidating cache for ${devices.length} previous device(s)`);
					for (const dev of devices) {
						await cache.del(`device_${dev.getId()}`);
					}
				}
				
				return freshDevices;
			} catch (cloudError) {
				logger.error(`[daikin.ts] => Error retrieving devices from cloud: ${cloudError instanceof Error ? cloudError.message : String(cloudError)}`);
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

async function initializeSystemBridge(devices: DaikinCloudDevice[]) {
	const systemBridge = new SystemBridge();
	systemBridge.device.id = INSTANCE_ID;
	systemBridge.device.serialNumber = INSTANCE_ID;
	await updateSystemBridge(null, devices, undefined, systemBridge);
}

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
	} else {
		systemBridge.modulesCount = 0;
		systemBridge.modulesList = "[]";
	}

	// Update unsupported modules information
	const unsupportedModules = getUnsupportedModules();
	systemBridge.unsupportedModulesCount = unsupportedModules.length;
	systemBridge.unsupportedModulesList = JSON.stringify(unsupportedModules);

	// Publish system module
	await publishSystemBridge(systemBridge);
}

async function publishSystemBridge(systemBridge: SystemBridge) {
	// Publish complete object like other devices (includes device)
	await publishToMQTT(INSTANCE_ID, JSON.stringify(systemBridge));
	
	if (config.system.jeedom) {
		await makeDefineFile(systemBridge, null);
	}
}

function getUnsupportedModules(): Array<{fileName: string, model?: string}> {
	const configFolder = resolve(datadir, '/newConfig');
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
	timeUpdate,
	updateSystemBridge
}
