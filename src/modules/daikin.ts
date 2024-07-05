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
import {publishStatus, publishToMQTT} from "./mqtt";
import {DaikinCloudController} from "daikin-controller-cloud";

async function loadDaikinAPI() {
	/** Start Daikin Client **/
	// @ts-ignore
		console.log(resolve(datadir, 'daikin-controller-cloud-tokenset'))
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

	// @ts-ignore
	daikinClient.on('authorization_request', (url) => {
		console.log(`
			Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
			 
			Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
			 
			Afterwards you are redirected to Daikin to approve the access and then redirected back.`);
	});

	// @ts-ignore
	daikinClient.on('rate_limit_status', (rateLimitStatus) => {
		console.log(rateLimitStatus);
	});

	global.daikinClient = daikinClient;
}

async function subscribeDevices() {
	const devices = await daikinClient.getCloudDevices();
	for (let dev of devices) {
		let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set"
		mqttClient.subscribe(subscribeTopic, function (err) {
			if (!err) logger.info("Subscribe to " + subscribeTopic)
		})
	}

	mqttClient.on('message', async function (topic, message) {
		logger.debug(`Topic : ${topic} \n- Message : ${message.toString()}`)

		const devices = await daikinClient.getCloudDevices();
		for (let dev of devices) {
			if (!topic.toString().includes(dev.getId())) continue;
			let gateway = getModels(dev);
			if (gateway !== undefined) {
				await eventValue(dev, gateway, JSON.parse(message.toString()))
			}
		}
	})
}

async function sendDevice() {
	const devices = await daikinClient.getCloudDevices();
	if (devices && devices.length) {
		for (let dev of devices) {
			let gateway = getModels(dev);
			await publishToMQTT(dev.getId(), JSON.stringify(gateway))
		}
	}

	return devices;
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

async function generateConfig() {
	const devices = await daikinClient.getCloudDevices();
	if (devices && devices.length) {
		for (let dev of devices) {
			let module = getModels(dev);
			if (module) await makeDefineFile(module);
		}
	}
}

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export {
	loadDaikinAPI,
	subscribeDevices,
	generateConfig,
	sendDevice
}
