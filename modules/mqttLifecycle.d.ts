declare function setMqttRepublishHandler(handler: () => Promise<void>): void;
declare function disconnectMqttClient(force?: boolean): Promise<void>;
declare function triggerMqttRepublish(): Promise<void>;
export { setMqttRepublishHandler, disconnectMqttClient, triggerMqttRepublish, };
