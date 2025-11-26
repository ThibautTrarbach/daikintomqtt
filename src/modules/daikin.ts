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
	eventValue
} from "./gateway";
import {makeDefineFile} from "./converter";
import {publishConfig, publishToMQTT} from "./mqtt";
import {DaikinCloudController, OnectaMockDevice} from "daikin-controller-cloud";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

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

		try {
			await publishConfig('url', url);
			await publishConfig('authorization_request', true);
			await publishConfig('authorization_timeout', false);
		} catch (error) {
			logger.error(`[daikin.ts] => Error publishing authorization config: ${error}`);
		}
	});

	daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - START`)
		await publishConfig('authorization_request', false)
		await publishConfig('authorization_timeout', false)
		await publishConfig('rate/limitMinute', rateLimitStatus.limitMinute)
		await publishConfig('rate/remainingMinute', rateLimitStatus.remainingMinute)
		await publishConfig('rate/limitDay', rateLimitStatus.limitDay)
		await publishConfig('rate/remainingDay', rateLimitStatus.remainingDay)
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
	if (!devices) {
		logger.error("[daikin.ts] => No devices found, cannot start API");
		return;
	}
	logger.debug(`[daikin.ts] => Found ${devices.length} device(s)`);
	logger.info("[daikin.ts] => Subscribe to MQTT Action")
	await subscribeDevices(devices)
	logger.info("[daikin.ts] => Generate Config Info")
	await generateConfig(devices)
	logger.info("[daikin.ts] => Send First Event Data Value")
	await sendDevice(devices)
}

async function subscribeDevices(devices: DaikinCloudDevice[]) {
	for (let dev of devices) {
		let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set"
		mqttClient.subscribe(subscribeTopic, function (err) {
			if (!err) logger.info("[daikin.ts] => Subscribe to " + subscribeTopic)
		})
	}

	mqttClient.on('message', async function (topic, message) {
		try {
			logger.debug(`[daikin.ts] => Topic : ${topic} \n- Message : ${message.toString()}`)

			// Utiliser le cache des devices au lieu de les récupérer à chaque fois
			const cachedDevices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
			// Vérifier explicitement null/undefined pour distinguer "pas de cache" de "cache avec tableau vide"
			const devices = (cachedDevices !== undefined && cachedDevices !== null) ? cachedDevices : await getDevices();
			
			const topicStr = topic.toString();
			let parsedMessage: any;
			
			try {
				parsedMessage = JSON.parse(message.toString());
			} catch (parseError) {
				logger.error(`[daikin.ts] => Error parsing MQTT message: ${parseError}`);
				return;
			}

			for (let dev of devices) {
				if (!topicStr.includes(dev.getId())) continue;
				let gateway = getModels(dev);
				if (gateway !== undefined) {
					await eventValue(dev, gateway, parsedMessage);
				}
			}
		} catch (error) {
			logger.error(`[daikin.ts] => Error processing MQTT message: ${error}`);
		}
	})
}

async function sendDevice(devices: DaikinCloudDevice[] | null = null, cron: boolean = false) {
	if (devices == null) devices = await getDevices(cron);

	if (devices && devices.length) {
		for (let dev of devices) {
			// Utiliser cache.set() au lieu de l'indexation directe
			// TTL de 10 minutes pour correspondre au cache de la liste des devices
			await cache.set(`device_${dev.getId()}`, dev, 600000);
			let gateway = getModels(dev);
			await publishToMQTT(dev.getId(), JSON.stringify(gateway))
		}
	}
}

async function timeUpdate() {
	logger.debug("[daikin.ts] => Refresh After Command => START")
	let time = Math.floor((Date.now() / 1000) - 120)
	logger.debug("[daikin.ts] => Timestamp Minimum : " + time)
	let timerefresh = await cache.get('needRefresh')
	logger.debug("[daikin.ts] => Timestamp Save : " + timerefresh)
	if (timerefresh == undefined) return;
	if (typeof timerefresh !== "number") {
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
	const devices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
	if (devices == undefined || force)  {
		logger.debug("[daikin.ts] => Cache invalid ou recup forcé, recuperation information sur le cloud")
		logger.debug('[daikin.ts] => Send Request to cloud : Refresh')
		const freshDevices = await daikinClient.getCloudDevices();
		// Mettre en cache avec TTL de 10 minutes (600000 millisecondes = 600 secondes)
		await cache.set('devices', freshDevices, 600000);
		
		// Invalider les devices individuels en cache pour garantir la cohérence
		if (devices && devices.length) {
			for (const dev of devices) {
				await cache.del(`device_${dev.getId()}`);
			}
		}
		
		return freshDevices;
	} else {
		logger.debug("[daikin.ts] => Cache valide")
	}
	return devices;
}

export {
	loadDaikinAPI,
	subscribeDevices,
	generateConfig,
	sendDevice,
	startDaikinAPI,
	getDevices,
	timeUpdate
}