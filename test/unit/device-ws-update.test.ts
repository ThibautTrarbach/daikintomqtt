/**
 * Unit tests for WebSocket merge on nested characteristics.
 * Run: npx ts-node test/unit/device-ws-update.test.ts
 */

import * as assert from 'node:assert/strict';
import { DaikinCloudDevice } from '../../src/daikin-cloud/device';
import type { OnectaClient } from '../../src/daikin-cloud/onecta/oidc-client';

const stubClient = {} as OnectaClient;

function makeDevice(): DaikinCloudDevice {
	const desc = {
		id: 'device-1',
		deviceModel: 'test',
		isCloudConnectionUp: { value: true },
		managementPoints: [
			{
				embeddedId: 'climateControl',
				managementPointType: 'climateControl',
				sensoryData: {
					value: {
						roomTemperature: { value: 21.5, unit: '°C' },
						outdoorTemperature: { value: 8.0, unit: '°C' },
					},
				},
				operationMode: { value: 'heating', settable: true },
				temperatureControl: {
					value: {
						operationModes: {
							heating: {
								setpoints: {
									roomTemperature: { value: 22, minValue: 16, maxValue: 30 },
								},
							},
						},
					},
				},
			},
		],
	};
	return new DaikinCloudDevice(desc, stubClient);
}

function run(): void {
	const device = makeDevice();

	assert.equal(
		device.applyWebSocketUpdate('climateControl', 'operationMode', { value: 'cooling' }),
		true,
	);
	assert.equal(device.getData('climateControl', 'operationMode', undefined).value, 'cooling');

	assert.equal(
		device.applyWebSocketUpdate('climateControl', 'sensoryData', {
			value: {
				roomTemperature: { value: 22.0 },
				outdoorTemperature: { value: 9.5 },
			},
		}),
		true,
	);
	assert.equal(device.getData('climateControl', 'sensoryData', '/roomTemperature').value, 22.0);
	assert.equal(device.getData('climateControl', 'sensoryData', '/outdoorTemperature').value, 9.5);

	assert.equal(
		device.applyWebSocketUpdate('climateControl', 'temperatureControl', {
			value: {
				operationModes: {
					heating: {
						setpoints: {
							roomTemperature: { value: 23 },
						},
					},
				},
			},
		}),
		true,
	);
	assert.equal(
		device.getData(
			'climateControl',
			'temperatureControl',
			'/operationModes/heating/setpoints/roomTemperature',
		).value,
		23,
	);

	assert.equal(
		device.applyWebSocketUpdate('climateControl', 'sensoryData', {
			value: { value: 24.0 },
			ref: '/roomTemperature',
		}),
		true,
	);
	assert.equal(device.getData('climateControl', 'sensoryData', '/roomTemperature').value, 24.0);

	console.log('device-ws-update.test.ts: OK');
}

try {
	run();
} catch (err) {
	console.error(err);
	process.exit(1);
}
