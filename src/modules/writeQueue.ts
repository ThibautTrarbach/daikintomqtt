/**
 * Sequential write queue per device (inspired by mp-consulting homebridge-daikin-cloud daikin-api.ts).
 * Ensures PATCH requests for the same deviceId are not sent in parallel bursts.
 */

const writeQueues = new Map<string, Promise<unknown>>();

function getWriteInterRequestDelayMs(): number {
	return config.system?.commandCoalesceMs ?? 400;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enqueues a write operation for a device. Operations on the same deviceId run sequentially
 * with a configurable delay between successful writes.
 */
function enqueueWriteForDevice<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
	const current = writeQueues.get(deviceId) ?? Promise.resolve();
	const queued = current
		.catch(() => {})
		.then(() => fn())
		.then(async (value) => {
			await sleep(getWriteInterRequestDelayMs());
			return value;
		});

	writeQueues.set(deviceId, queued.catch(() => {}));
	return queued;
}

export {
	enqueueWriteForDevice,
};
