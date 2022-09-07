import {connect} from "mqtt";
import {IClientOptions, MqttClient} from "mqtt/types/lib/client";

async function getOptions() {
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

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

async function loadMQTTClient() {
    let options:IClientOptions = await getOptions();

    const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`
    global.mqttClient = connect(mqttHost, options);
}

export {
    loadMQTTClient
}
