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
import {DaikinCloudController, OnectaMockDevice} from "daikin-controller-cloud";
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

		// Mettre à jour le module système avec les informations d'autorisation
		await updateSystemBridge(null, null, {
			authorizationUrl: url,
			authorizationRequest: true,
			authorizationTimeout: false
		});
	});

	daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - START`)
		// Stocker dans le cache pour récupération ultérieure
		await cache.set('rate/limitMinute', rateLimitStatus.limitMinute)
		await cache.set('rate/remainingMinute', rateLimitStatus.remainingMinute)
		await cache.set('rate/limitDay', rateLimitStatus.limitDay)
		await cache.set('rate/remainingDay', rateLimitStatus.remainingDay)
		// Mettre à jour le module système avec les informations de rate limit et d'autorisation
		await updateSystemBridge(rateLimitStatus, null, {
			authorizationRequest: false,
			authorizationTimeout: false
		})
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - FINISH`)
	});

	daikinClient.on('token_update', async (set) => {
		logger.debug(`[daikin.ts] => EVENT - Token Update - Tentative de sauvgarde d'un nouveau token`)
		logger.debug(`[daikin.ts] => EVENT - Token Update - DATA : `)
		logger.debug(JSON.stringify(set))
	});

	daikinClient.on('error', async (error) => {
		logger.error(`[daikin.ts] => EVENT - ERROR - : ` +error)
	});

	global.daikinClient = daikinClient;
}

async function startDaikinAPI() {
	const devices = await getDevices();
	console.log(devices);
	logger.info("[daikin.ts] => Subscribe to MQTT Action")
	await subscribeDevices(devices)
	logger.info("[daikin.ts] => Generate Config Info")
	await generateConfig(devices)
	logger.info("[daikin.ts] => Send First Event Data Value")
	await sendDevice(devices)
	logger.info("[daikin.ts] => Initialize System Bridge")
	await initializeSystemBridge(devices)
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
		logger.debug(`[daikin.ts] => Topic : ${topic} \n- Message : ${message.toString()}`)

		const topicString = topic.toString();
		const systemBridgeSetTopicPath = config.mqtt.topic + "/" + INSTANCE_ID + "/set";

		// Handle system bridge actions
		if (topicString === systemBridgeSetTopicPath) {
			const data = JSON.parse(message.toString());
			if (data.refreshAllDevices !== undefined || data._refreshAllDevices !== undefined) {
				logger.info("[daikin.ts] => Refresh all devices command from system bridge")
				await sendDevice(null, true) // Force refresh from cloud
				await updateSystemBridge() // Mettre à jour le module système après refresh
			}
			return
		}

		const devices = await getDevices();
		for (let dev of devices) {
			if (!topicString.includes(dev.getId())) continue;
			let gateway = getModels(dev);
			if (gateway !== undefined) {
				await eventValue(dev, gateway, JSON.parse(message.toString()))
			}
		}
	})
}

async function sendDevice(devices: DaikinCloudDevice[] | null = null, cron: boolean = false) {
	if (devices == null) devices = await getDevices(cron);

	if (devices && devices.length) {
		for (let dev of devices) {
			global.cache[dev.getId()] = dev;
			let gateway = getModels(dev);
			await publishToMQTT(dev.getId(), JSON.stringify(gateway))
		}
		// Mettre à jour le module système après envoi des devices
		await updateSystemBridge(null, devices)
	}
}

async function timeUpdate() {
	logger.debug("[daikin.ts] => Refresh After Command => START")
	let time = Math.floor((Date.now() / 1000) - 60)
	logger.debug("[daikin.ts] => Timestamp Minimum : " + time)
	let timerefresh = await cache.get('needRefresh')
	logger.debug("[daikin.ts] => Timestamp Save : " + timerefresh)
	if (timerefresh == undefined) return;
	if (typeof(timerefresh) != "number") {
		await cache.del('needRefresh');
		return;
	}
	if (timerefresh <= time) {
		logger.debug("[daikin.ts] => CRON - Updates Daikin devices")
		await cache.del('needRefresh');
		await sendDevice(null, true)
	}
	logger.debug("[daikin.ts] => Refresh After Command => FINISH")
}

function getModels(devices: any) {
	let value;
	if (devices.getData('gateway', 'modelInfo') !== null) value = devices.getData('gateway', 'modelInfo').value
	else if (devices.getData('0', 'modelInfo') !== null) value = devices.getData('0', 'modelInfo').value

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
			anonymise(devices, value)
			return undefined;
	}
}

async function generateConfig(devices: DaikinCloudDevice[]) {
	if (devices && devices.length) {
		for (let device of devices) {
			let module = getModels(device);
			if (module) await makeDefineFile(module, device);
		}
	}
}

async function getDevices(force: boolean = false) {
	const devices = await cache.get('devices')
	if (devices == undefined || force)  {
		logger.debug("[daikin.ts] => Cache invalid ou recup forcé, recuperation information sur le cloud")
		logger.debug('[daikin.ts] => Send Request to cloud : Refresh')
		const devices = await daikinClient.getCloudDevices();
		await cache.set('devices', devices);
		return devices
	} else {
		logger.debug("[daikin.ts] => Cache valide")
	}
	return devices
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
	
	// Mettre à jour les informations de rate limit
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

	// Mettre à jour les informations d'autorisation
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

	// Mettre à jour les informations sur les modules
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

	// Mettre à jour les informations sur les modules non gérés
	const unsupportedModules = getUnsupportedModules();
	systemBridge.unsupportedModulesCount = unsupportedModules.length;
	systemBridge.unsupportedModulesList = JSON.stringify(unsupportedModules);

	// Publier le module système
	await publishSystemBridge(systemBridge);
}

async function publishSystemBridge(systemBridge: SystemBridge) {
	// Publier l'objet complet comme les autres devices (inclut device)
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
				// Essayer d'extraire le modelInfo si disponible
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
