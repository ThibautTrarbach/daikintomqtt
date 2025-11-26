import {connect} from "mqtt";
import {IClientOptions} from "mqtt/types/lib/client";

async function getOptions() {
	const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

	let option: IClientOptions = {
		clientId,
		clean: true,
		connectTimeout: config.mqtt.connectTimeout,
		username: (config.mqtt.username != null) ? config.mqtt.username : undefined,
		password: (config.mqtt.password != null) ? config.mqtt.password : undefined,
		reconnectPeriod: config.mqtt.reconnectPeriod,
	};

	return option;
}

async function loadMQTTClient() {
	let options: IClientOptions = await getOptions();

	const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`
	global.mqttClient = connect(mqttHost, options);
}

async function publishToMQTT(topic: string, data: string): Promise<void> {
	try {
		const cachedData = await cache.get(topic);
		if (cachedData === data) return;
		
		await cache.set(topic, data);

		return new Promise<void>((resolve, reject) => {
			const fullTopic = config.mqtt.topic + "/" + topic;
			mqttClient.publish(fullTopic, data, {qos: 0, retain: true}, (error) => {
				if (error) {
					logger.error(`[mqtt.ts] => Error publishing to ${fullTopic}: ${error}`);
					reject(error);
				} else {
					logger.debug(`[mqtt.ts] => Send Data to MQTT : ${topic}`);
					resolve();
				}
			});
		});
	} catch (error) {
		logger.error(`[mqtt.ts] => Error in publishToMQTT for topic ${topic}: ${error}`);
		throw error;
	}
}

async function publishConfig(key: string, value: any) {
	await publishToMQTT('system/bridge/'+key, value.toString())
}
export {
	loadMQTTClient,
	publishToMQTT,
	publishConfig
}
