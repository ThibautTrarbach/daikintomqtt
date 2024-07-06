import {MqttClient} from "mqtt/types/lib/client";
import {Daikin2MQTT} from "./types";
import {caching} from "cache-manager/dist/caching";
import type {MemoryCache} from "cache-manager/dist/stores";

declare global {
	var mqttClient: MqttClient;
	var config: Daikin2MQTT;
	var logger: winston.Logger;
	var datadir: string;
	var daikinClient: any;
	var cache: MemoryCache;
}

