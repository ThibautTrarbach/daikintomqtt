import DaikinCloudController from "daikin-controller-cloud";
import ip from "ip";
import path from "path";
import fs from "fs";
import {anonymise, BRP069A4x, BRP069A62, BRP069A78, BRP069B4x, BRP069C4x, eventValue} from "./gateway";
import {makeDefineFile} from "./converter";
import {publishToMQTT} from "./mqtt";
import {BRP069A61} from "./gateway/BRP069A61";

async function getOptions() {
	return {
		logger: logger,
		logLevel: config.system.logLevel,
		proxyOwnIp: ip.address(),
		proxyPort: config.daikin.proxyPort,
		proxyWebPort: config.daikin.proxyWebPort,
		proxyListenBind: '0.0.0.0',
		proxyDataDir: datadir,
		communicationTimeout: config.daikin.communicationTimeout,
		communicationRetries: config.daikin.communicationRetries
	};
}

async function loadDaikinAPI() {
	let startError = false;
	const tokenFile = path.join(datadir, '/tokenset.json');

	let daikinOptions = await getOptions();
	/** Setup Daikin API */
	if (fs.existsSync(tokenFile)) global.daikinToken = JSON.parse(fs.readFileSync(tokenFile).toString())
	else global.daikinToken = undefined;

	/** Start Daikin Client **/
		// @ts-ignore
	let daikinClient = new DaikinCloudController(daikinToken, daikinOptions);

	daikinClient.on('token_update', (tokenSet: any) => {
		fs.writeFileSync(tokenFile, JSON.stringify(tokenSet));
	});

	try {
		await daikinClient.getCloudDeviceDetails();
	} catch (e) {
		startError = true;
	}

	if (daikinToken == undefined || startError) {
		if (config.daikin.modeProxy) {
			await daikinClient.initProxyServer();
			/*  clientOptions.message = `Please visit http://${daikinOptions.proxyOwnIp}:${daikinOptions.proxyWebPort} and Login to Daikin Cloud please.`
			  await updateSystemInfo()
			  await daikinClient.waitForTokenFromProxy();
			  console.log('Retrieved tokens. Saved to ' + tokenFile);
			  await delay(1000);
			  await daikinCloud.stopProxyServer();
			  clientOptions.message = "Connection Success"
			  await updateSystemInfo(); */
		} else {
			await daikinClient.login(config.daikin.username, config.daikin.password);
		}

		global.daikinToken = JSON.parse(fs.readFileSync(tokenFile).toString());

		logger.debug('Use Token with the following claims: ' + JSON.stringify(daikinClient.getTokenSet().claims()));
	}
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

export {
	loadDaikinAPI,
	subscribeDevices,
	generateConfig,
	sendDevice
}
