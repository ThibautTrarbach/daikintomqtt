import { setMqttRepublishHandler } from "./mqttLifecycle";
declare function loadMQTTClient(): Promise<void>;
declare function publishToMQTT(topic: string, data: string): Promise<void>;
declare function publishConfig(key: string, value: string | boolean): Promise<void>;
export { loadMQTTClient, publishToMQTT, publishConfig, setMqttRepublishHandler, };
