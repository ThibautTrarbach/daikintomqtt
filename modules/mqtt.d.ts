declare function loadMQTTClient(): Promise<void>;
declare function publishToMQTT(topic: string, data: string): Promise<void>;
declare function publishConfig(key: string, value: any): Promise<void>;
export { loadMQTTClient, publishToMQTT, publishConfig };
