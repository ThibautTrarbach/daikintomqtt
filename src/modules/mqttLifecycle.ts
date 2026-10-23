import { MqttClient } from 'mqtt';

let republishAllState: (() => Promise<void>) | null = null;

function setMqttRepublishHandler(handler: () => Promise<void>): void {
	republishAllState = handler;
}

async function disconnectMqttClient(force = true): Promise<void> {
	if (!global.mqttClient) {
		return;
	}
	const client = global.mqttClient as MqttClient;
	await new Promise<void>((resolvePromise) => {
		client.end(force, {}, () => resolvePromise());
	});
}

async function triggerMqttRepublish(): Promise<void> {
	if (republishAllState) {
		await republishAllState();
	}
}

export {
	setMqttRepublishHandler,
	disconnectMqttClient,
	triggerMqttRepublish,
};
