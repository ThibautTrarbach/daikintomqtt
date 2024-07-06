import {MqttClient} from "mqtt/types/lib/client";
import {Daikin2MQTT} from "./types";
import NodeCache from "node-cache";

declare global {
	var mqttClient: MqttClient;
	var config: Daikin2MQTT;
	var logger: winston.Logger;
	var datadir: string;
	var daikinClient: any;
	var cache: NodeCache;
}

