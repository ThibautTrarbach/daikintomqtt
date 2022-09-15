import {MqttClient} from "mqtt/types/lib/client";
import {Daikin2MQTT} from "./types";
import {EntityManager, MikroORM} from "@mikro-orm/core";
import NodeCache from "node-cache";

declare global {
    var mqttClient: MqttClient
    var config: Daikin2MQTT
    var logger: winston.Logger
    var orm: MikroORM
    var em: EntityManager
    var datadir: string
	var daikinToken: string|undefined
	var daikinClient: any
	var cache: object
	var test: number
}

