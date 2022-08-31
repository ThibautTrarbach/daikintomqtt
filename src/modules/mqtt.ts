import {loadConfig} from "./config";
import {connect} from "mqtt";
import {IClientOptions, MqttClient} from "mqtt/types/lib/client";

async function getOptions() {
    let config = await loadConfig();

    let option:IClientOptions = {
        clientId,
        clean: true,
        connectTimeout: config.mqtt.connectTimeout,
        username: (config.mqtt.username != null) ? config.mqtt.username : undefined,
        password: (config.mqtt.password != null) ? config.mqtt.password : undefined,
        reconnectPeriod: config.mqtt.reconnectPeriod,
    };

    return option;
}

async function getMqttClient() {
    let config = await loadConfig();
    let options:IClientOptions = await getOptions();

    const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`
    return connect(mqttHost, options);
}

export {
    getMqttClient
}