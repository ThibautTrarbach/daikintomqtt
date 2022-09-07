import {MqttClient} from "mqtt/types/lib/client";
import {Config} from "./types";
import {EntityManager, MikroORM} from "@mikro-orm/core";

declare global {
    var mqttClient: MqttClient
    var config: Config
    var logger: winston.Logger
    var orm: MikroORM
    var em: EntityManager
    var datadir: string
	var daikinToken: string|undefined
}

export {};
