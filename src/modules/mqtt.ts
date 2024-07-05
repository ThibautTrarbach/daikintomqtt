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
	global.cache = {}
}

async function publishToMQTT(topic: string, data: string) {
	// @ts-ignore
	if (cache[topic] == data) return;
	// @ts-ignore
	global.cache[topic] = data;

	mqttClient.publish(config.mqtt.topic + "/" + topic, data, {qos: 0, retain: true}, (error) => {
		logger.debug("Send Data to MQTT : " + topic)
		if (error) logger.error(error)
	})
}

async function publishConfig(key: string, value: any) {
	await publishToMQTT('system/bridge/'+key, value.toString())
}
export {
	loadMQTTClient,
	publishToMQTT,
	publishConfig
}
