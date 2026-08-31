"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMqttRepublishHandler = setMqttRepublishHandler;
exports.disconnectMqttClient = disconnectMqttClient;
exports.triggerMqttRepublish = triggerMqttRepublish;
let republishAllState = null;
function setMqttRepublishHandler(handler) {
    republishAllState = handler;
}
async function disconnectMqttClient(force = true) {
    if (!global.mqttClient) {
        return;
    }
    const client = global.mqttClient;
    await new Promise((resolvePromise) => {
        client.end(force, {}, () => resolvePromise());
    });
}
async function triggerMqttRepublish() {
    if (republishAllState) {
        await republishAllState();
    }
}
//# sourceMappingURL=mqttLifecycle.js.map