"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueWriteForDevice = enqueueWriteForDevice;
const writeQueues = new Map();
function getWriteInterRequestDelayMs() {
    return config.system?.commandCoalesceMs ?? 400;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function enqueueWriteForDevice(deviceId, fn) {
    const current = writeQueues.get(deviceId) ?? Promise.resolve();
    const queued = current
        .catch(() => { })
        .then(() => fn())
        .then(async (value) => {
        await sleep(getWriteInterRequestDelayMs());
        return value;
    });
    writeQueues.set(deviceId, queued.catch(() => { }));
    return queued;
}
//# sourceMappingURL=writeQueue.js.map