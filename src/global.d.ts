import {MqttClient} from "mqtt/types/lib/client";
import {Daikin2MQTT} from "./types";

declare global {
	var mqttClient: MqttClient
	var config: Daikin2MQTT
	var logger: winston.Logger
	var datadir: string
	var daikinClient: any
	var cache: object
}

