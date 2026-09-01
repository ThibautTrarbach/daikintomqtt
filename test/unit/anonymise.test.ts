/**
 * Unit tests for anonymised config export (must not mutate live device).
 * Run: npx ts-node test/unit/anonymise.test.ts
 */

/// <reference path="../../src/global.d.ts" />

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

(global as typeof globalThis).logger = {
	debug: () => undefined,
	info: () => undefined,
	warn: () => undefined,
	error: () => undefined,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DaikinCloudDevice } = require('../../src/daikin-cloud/device') as typeof import('../../src/daikin-cloud/device');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { anonymise } = require('../../src/modules/gateway/Anonymise') as typeof import('../../src/modules/gateway/Anonymise');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getNewConfigDir } = require('../../src/modules/paths') as typeof import('../../src/modules/paths');

const DEVICE_UUID = 'ba2deeed-8ac0-4e72-ab8f-a275d58bd0d6';
const stubClient = {};

function makeDevice(): InstanceType<typeof DaikinCloudDevice> {
	const desc = {
		id: DEVICE_UUID,
		deviceModel: 'BRP069A78',
		isCloudConnectionUp: { value: true },
		managementPoints: [
			{
				embeddedId: 'gateway',
				managementPointType: 'gateway',
				modelInfo: { value: 'BRP069A78' },
				name: { value: 'Test Gateway' },
				firmwareVersion: { value: '1.0.0' },
				serialNumber: { value: 'SN123456' },
			},
		],
	};
	return new DaikinCloudDevice(desc, stubClient as never);
}

function run(): void {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daikintomqtt-anonymise-'));
	(global as typeof globalThis).datadir = tempDir;

	try {
		const device = makeDevice();
		const beforeId = device.getId();
		const beforeDesc = structuredClone(device.getDescription());
		const beforeModelInfo = device.getData('gateway', 'modelInfo', null);
		const beforeCloudUp = device.isCloudConnectionUp();

		anonymise(device, 'BRP069A78');

		assert.equal(device.getId(), beforeId, 'getId() must remain unchanged');
		assert.deepEqual(device.getDescription(), beforeDesc, 'getDescription() must remain unchanged');
		assert.deepEqual(device.getData('gateway', 'modelInfo', null), beforeModelInfo, 'modelInfo must remain unchanged');
		assert.equal(device.isCloudConnectionUp(), beforeCloudUp, 'isCloudConnectionUp() must remain unchanged');

		const configFile = path.join(getNewConfigDir(), 'BRP069A78.json');
		assert.ok(fs.existsSync(configFile), 'anonymised config file must be created');

		const exported = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Record<string, unknown>;
		const cloudConnection = exported.isCloudConnectionUp as { value: string };
		assert.equal(cloudConnection.value, 'anonymizeValue (boolean)', 'exported isCloudConnectionUp must be anonymised');

		const managementPoints = exported.managementPoints as Array<Record<string, unknown>>;
		const gateway = managementPoints[0];
		const modelInfo = gateway.modelInfo as { value: string };
		assert.equal(modelInfo.value, 'anonymizeValue (string)', 'exported modelInfo must be anonymised');

		const deviceWithMissingCloud = new DaikinCloudDevice({ id: DEVICE_UUID, managementPoints: [] }, stubClient as never);
		assert.equal(deviceWithMissingCloud.isCloudConnectionUp(), false, 'missing isCloudConnectionUp must return false');

		console.log('anonymise.test.ts: all tests passed');
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
}

try {
	run();
} catch (err) {
	console.error(err);
	process.exit(1);
}
