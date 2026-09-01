/**
 * Unit tests for API coverage audit and datapoint discovery.
 * Run: npm run build && node test/unit/apiCoverageAudit.test.js
 */

'use strict';

require('reflect-metadata');

const assert = require('node:assert/strict');

global.config = { system: { exposeReadOnly: true } };

const { makeDatapointKey, normalizeDatapointPath, discoverApiDatapoints } = require('../../dist/modules/gateway/apiDiscovery');
const { auditApiCoverage } = require('../../dist/modules/gateway/apiCoverageAudit');
const { registerCharacteristics, registerDeviceMetadata } = require('../../dist/modules/gateway/metadataRegistry');
const {
	gatewayDiagnosticsPack,
	auxiliaryUnitPack,
	standardGatewayDeviceInfo,
	fanClimatePack,
	powerfulModeClimate,
	operationModeClimate,
	sensoryTemperature,
	sensoryHumidity,
	temperatureControlRoom,
	consumptionPack,
	stateBool,
} = require('../../dist/modules/gateway/characteristics/catalog');

function leaf(value, settable = false) {
	return { value, settable };
}

function createMockDevice() {
	const managementPoints = {
		gateway: {
			modelInfo: leaf('BRP069C42'),
			serialNumber: leaf('0000000002659131'),
			firmwareVersion: leaf('2_6_2'),
			timeZone: leaf('Europe/Paris'),
			ssid: leaf('MyWifi'),
			ipAddress: leaf('192.168.1.10'),
			macAddress: leaf('AA:BB:CC:DD:EE:FF'),
			isFirmwareUpdateSupported: leaf('off'),
			isInErrorState: leaf('off'),
			errorCode: leaf(''),
		},
		climateControl: {
			name: leaf('Thibaut'),
			errorCode: leaf(''),
			isPowerfulModeActive: leaf('off'),
			operationMode: { value: 'cooling', settable: true, values: ['fanOnly', 'heating', 'cooling', 'auto', 'dry'] },
			onOffMode: leaf('on', true),
			powerfulMode: leaf('off', true),
			sensoryData: {
				'': {
					roomTemperature: leaf(22),
					outdoorTemperature: leaf(30),
				},
			},
			fanControl: {
				'': {
					operationModes: {
						heating: {
							fanSpeed: {
								currentMode: leaf('auto', true),
								modes: { fixed: leaf(3, true) },
							},
							fanDirection: {
								horizontal: { currentMode: leaf('stop', true) },
								vertical: { currentMode: leaf('swing', true) },
							},
						},
						cooling: {
							fanSpeed: {
								currentMode: leaf('auto', true),
								modes: { fixed: leaf(3, true) },
							},
							fanDirection: {
								horizontal: { currentMode: leaf('stop', true) },
								vertical: { currentMode: leaf('swing', true) },
							},
						},
						auto: {
							fanSpeed: {
								currentMode: leaf('auto', true),
								modes: { fixed: leaf(3, true) },
							},
							fanDirection: {
								horizontal: { currentMode: leaf('stop', true) },
								vertical: { currentMode: leaf('swing', true) },
							},
						},
						dry: {
							fanSpeed: { currentMode: leaf('auto', true) },
							fanDirection: {
								horizontal: { currentMode: leaf('stop', true) },
								vertical: { currentMode: leaf('swing', true) },
							},
						},
						fanOnly: {
							fanSpeed: {
								currentMode: leaf('auto', true),
								modes: { fixed: leaf(3, true) },
							},
							fanDirection: {
								horizontal: { currentMode: leaf('stop', true) },
								vertical: { currentMode: leaf('swing', true) },
							},
						},
					},
				},
			},
			temperatureControl: {
				'': {
					operationModes: {
						heating: { setpoints: { roomTemperature: leaf(20, true) } },
						cooling: { setpoints: { roomTemperature: leaf(24, true) } },
						auto: { setpoints: { roomTemperature: leaf(22, true) } },
					},
				},
			},
		},
		indoorUnit: {
			modelInfo: leaf('FTXA20C2V1BW'),
			serialNumber: leaf('0000000010528853'),
			softwareVersion: leaf('1.0.0'),
		},
		outdoorUnit: {
			modelInfo: leaf('3MXM52A2V1B9'),
			serialNumber: leaf('0000000010528854'),
			softwareVersion: leaf('1.0.0'),
			errorCode: leaf(''),
			isInErrorState: leaf('off'),
			isInWarningState: leaf('off'),
			isInCautionState: leaf('off'),
		},
	};

	return {
		getId: () => 'test-device-id',
		isCloudConnectionUp: () => true,
		managementPoints,
		getData: (mp, dp, path) => {
			let current = managementPoints[mp]?.[dp];
			if (!current) {
				throw new Error(`missing ${mp}/${dp}`);
			}
			if (path) {
				for (const segment of path.split('/').filter(Boolean)) {
					current = current[segment];
					if (!current) {
						throw new Error(`missing path ${path}`);
					}
				}
			}
			return current;
		},
	};
}

function createC4xGatewayMock() {
	const gateway = {};
	const MP = 'climateControl';
	const chars = [
		stateBool(MP, 'isHolidayModeActive', 'Holiday Mode'),
		stateBool(MP, 'isInErrorState', 'Error State'),
		stateBool(MP, 'isInWarningState', 'Warning State'),
		stateBool(MP, 'isInModeConflict', 'Conflict State'),
		stateBool(MP, 'isInCautionState', 'Caution State'),
		stateBool(MP, 'isCoolHeatMaster', 'Master'),
		operationModeClimate(MP, ['fanOnly', 'heating', 'cooling', 'auto', 'dry']),
		stateBool(MP, 'onOffMode', 'State', { settable: true }),
		stateBool(MP, 'econoMode', 'Eco Mode', { settable: true }),
		...powerfulModeClimate(MP),
		stateBool(MP, 'streamerMode', 'Streamer Mode', { settable: true }),
		sensoryTemperature(MP, '/roomTemperature', 'Room Temperature', '_roomTemperature'),
		sensoryHumidity(MP, 'Room Humidity'),
		sensoryTemperature(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'),
		stateBool(MP, 'outdoorSilentMode', 'Outdoor Silent', { settable: true, propertyKey: '_outdoorSilentMode' }),
		temperatureControlRoom(MP, 'Temperature Control', '_temperatureControl'),
		...fanClimatePack(MP, { horizontal: true, vertical: true }),
		...consumptionPack(MP, ''),
		...gatewayDiagnosticsPack(),
		...auxiliaryUnitPack('indoorUnit', 'Indoor Unit'),
		...auxiliaryUnitPack('outdoorUnit', 'Outdoor Unit'),
	];
	registerCharacteristics(gateway, chars);
	registerDeviceMetadata(gateway, '_device', standardGatewayDeviceInfo('climateControl'));
	return gateway;
}

assert.equal(normalizeDatapointPath('//operationModes/heating'), '/operationModes/heating');
assert.equal(
	makeDatapointKey('climateControl', 'fanControl', '//operationModes/heating/fanSpeed/currentMode'),
	'climateControl/fanControl/operationModes/heating/fanSpeed/currentMode',
);

const mockDevice = createMockDevice();
const apiDatapoints = discoverApiDatapoints(mockDevice);
assert.ok(apiDatapoints.some((ref) =>
	makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath)
	=== 'climateControl/fanControl/operationModes/heating/fanSpeed/currentMode',
));

const gateway = createC4xGatewayMock();
const coverage = auditApiCoverage(mockDevice, gateway);

assert.equal(coverage.configCoverage, 'complete', `expected complete coverage, unmapped: ${coverage.unmappedDatapoints.join(', ')}`);
assert.equal(coverage.mappedCount, coverage.apiCount);

console.log('apiCoverageAudit.test.js: all tests passed');
