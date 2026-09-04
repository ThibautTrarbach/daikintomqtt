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
	auxiliaryUnitInfoPack,
	standardGatewayDeviceInfo,
	multiZoneDeviceInfo,
	fanClimatePack,
	powerfulModeClimate,
	demandControlPack,
	operationModeClimate,
	sensoryTemperature,
	sensoryHumidity,
	temperatureControlRoom,
	consumptionPack,
	stateBool,
	stringField,
	temperatureControlDhw,
	temperatureControlLeavingWater,
	temperatureControlLeavingWaterOffset,
} = require('../../dist/modules/gateway/characteristics/catalog');
const { converterEnum, typeEnum } = require('../../dist/modules/gateway/typeConstants');

function leaf(value, settable = false) {
	return { value, settable };
}

function createDeviceFromManagementPoints(managementPoints) {
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
			daylightSavingTimeEnabled: leaf('on', true),
			ledEnabled: leaf('on', true),
			regionCode: leaf('EU'),
			isFirmwareUpdateSupported: leaf('off'),
			isInErrorState: leaf('off'),
			errorCode: leaf(''),
		},
		climateControl: {
			name: leaf('Thibaut', true),
			errorCode: leaf(''),
			isPowerfulModeActive: leaf('off'),
			operationMode: { value: 'cooling', settable: true, values: ['fanOnly', 'heating', 'cooling', 'auto', 'dry'] },
			onOffMode: leaf('on', true),
			powerfulMode: leaf('off', true),
			intelligentEyeMode: leaf('off', true),
			iconId: leaf(3, true),
			isLockFunctionEnabled: leaf('off', true),
			demandControl: {
				currentMode: { value: 'off', settable: true, values: ['off', 'auto', 'fixed', 'scheduled'] },
				modes: {
					fixed: { value: 100, settable: true, minValue: 40, maxValue: 100, stepValue: 5 },
				},
			},
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
			eepromVersion: leaf('1.2.3'),
			dryKeepSetting: leaf('off', true),
			isInThermoOnState: leaf('off'),
			frontPanelSetting: { value: 'closed', settable: true, values: ['open', 'closed'] },
			installationPosition: leaf('wallMounted'),
		},
		outdoorUnit: {
			modelInfo: leaf('3MXM52A2V1B9'),
			serialNumber: leaf('0000000010528854'),
			softwareVersion: leaf('1.0.0'),
			errorCode: leaf(''),
			isInErrorState: leaf('off'),
			isInWarningState: leaf('off'),
			isInCautionState: leaf('off'),
			isInDefrostState: leaf('off'),
		},
	};

	return createDeviceFromManagementPoints(managementPoints);
}

function createB4xMockDevice() {
	const managementPoints = {
		gateway: {
			modelInfo: leaf('BRP069B4x'),
			serialNumber: leaf(''),
			firmwareVersion: leaf('4_2_303'),
			timeZone: leaf('Europe/Paris'),
			ipAddress: leaf('192.168.1.10'),
			macAddress: leaf('AA:BB:CC:DD:EE:FF'),
			isFirmwareUpdateSupported: leaf('off'),
			isInErrorState: leaf('off'),
			errorCode: leaf(''),
		},
		climateControl: {
			name: leaf('Living Room'),
			isHolidayModeActive: leaf('off'),
			isInErrorState: leaf('off'),
			isInModeConflict: leaf('off'),
			operationMode: { value: 'heating', settable: true, values: ['fanOnly', 'heating', 'cooling', 'auto', 'dry'] },
			onOffMode: leaf('on', true),
			econoMode: leaf('off', true),
			powerfulMode: leaf('off', true),
			isPowerfulModeActive: leaf('off'),
			streamerMode: leaf('off', true),
			sensoryData: {
				'': {
					roomTemperature: leaf(22),
					roomHumidity: leaf(45),
					outdoorTemperature: leaf(10),
				},
			},
			temperatureControl: {
				'': {
					operationModes: {
						heating: { setpoints: { roomTemperature: leaf(20, true) } },
					},
				},
			},
		},
		indoorUnit: {
			modelInfo: leaf('FTXA20C2V1BW'),
			softwareVersion: leaf('1.0.0'),
		},
	};

	return createDeviceFromManagementPoints(managementPoints);
}

function createA78MockDevice() {
	const managementPoints = {
		gateway: {
			modelInfo: leaf('BRP069A78'),
			serialNumber: leaf('0447855'),
			firmwareVersion: leaf('4.0.1'),
			timeZone: leaf('Europe/Paris'),
			ipAddress: leaf('192.168.1.20'),
			macAddress: leaf('11:22:33:44:55:66'),
			isFirmwareUpdateSupported: leaf('off'),
			isInErrorState: leaf('off'),
			errorCode: leaf(''),
		},
		climateControlMainZone: {
			name: leaf('Main Zone'),
			controlMode: leaf('heating'),
			errorCode: leaf(''),
			isHolidayModeActive: leaf('off'),
			isInEmergencyState: leaf('off'),
			isInErrorState: leaf('off'),
			isInInstallerState: leaf('off'),
			isInWarningState: leaf('off'),
			onOffMode: leaf('on', true),
			operationMode: { value: 'heating', settable: true, values: ['heating'] },
			setpointMode: leaf('fixed'),
			sensoryData: {
				'': {
					roomTemperature: leaf(21),
					outdoorTemperature: leaf(8),
					leavingWaterTemperature: leaf(35),
					leavingWaterOffset: leaf(0),
				},
			},
			temperatureControl: {
				'': {
					operationModes: {
						heating: {
							setpoints: {
								roomTemperature: leaf(20, true),
								leavingWaterTemperature: leaf(35, true),
								leavingWaterOffset: leaf(0, true),
							},
						},
						auto: {
							setpoints: {
								roomTemperature: leaf(20, true),
								leavingWaterTemperature: leaf(35, true),
								leavingWaterOffset: leaf(0, true),
							},
						},
					},
				},
			},
		},
		domesticHotWaterTank: {
			name: leaf('DHW Tank'),
			errorCode: leaf(''),
			heatupMode: leaf('normal'),
			isHolidayModeActive: leaf('off'),
			isInEmergencyState: leaf('off'),
			isInErrorState: leaf('off'),
			isInInstallerState: leaf('off'),
			isInWarningState: leaf('off'),
			onOffMode: leaf('on', true),
			operationMode: { value: 'heating', settable: true, values: ['heating'] },
			powerfulMode: leaf('off', true),
			isPowerfulModeActive: leaf('off'),
			setpointMode: leaf('fixed'),
			sensoryData: {
				'': {
					tankTemperature: leaf(45),
				},
			},
			temperatureControl: {
				'': {
					operationModes: {
						heating: {
							setpoints: {
								domesticHotWaterTemperature: leaf(50, true),
							},
						},
					},
				},
			},
		},
		indoorUnitHydro: {
			modelInfo: leaf('ELVH12S23EJ6V'),
			softwareVersion: leaf('1.0.0'),
		},
		outdoorUnit: {
			modelInfo: leaf('OUTDOOR-MODEL'),
			serialNumber: leaf('0000000010528854'),
			softwareVersion: leaf('1.0.0'),
			errorCode: leaf(''),
			isInErrorState: leaf('off'),
			isInWarningState: leaf('off'),
			isInCautionState: leaf('off'),
		},
		userInterface: {
			modelInfo: leaf('ELVH12S23EJ6V'),
			softwareVersion: leaf('1.0.0'),
		},
	};

	return createDeviceFromManagementPoints(managementPoints);
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
		stateBool(MP, 'intelligentEyeMode', 'Intelligent Eye', { settable: true }),
		sensoryTemperature(MP, '/roomTemperature', 'Room Temperature', '_roomTemperature'),
		sensoryHumidity(MP, 'Room Humidity'),
		sensoryTemperature(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'),
		stateBool(MP, 'outdoorSilentMode', 'Outdoor Silent', { settable: true, propertyKey: '_outdoorSilentMode' }),
		temperatureControlRoom(MP, 'Temperature Control', '_temperatureControl'),
		...fanClimatePack(MP, { horizontal: true, vertical: true }),
		...consumptionPack(MP, ''),
		{
			propertyKey: '_iconId',
			daikin: {
				managementPoint: MP,
				dataPoint: 'iconId',
				converter: converterEnum.numeric,
			},
			description: {
				name: 'Icon ID',
				settable: true,
				type: typeEnum.numeric,
			},
		},
		stateBool(MP, 'isLockFunctionEnabled', 'Lock Function', { settable: true }),
		...demandControlPack(MP),
		...gatewayDiagnosticsPack(),
		...auxiliaryUnitPack('indoorUnit', 'Indoor Unit'),
		...auxiliaryUnitPack('outdoorUnit', 'Outdoor Unit'),
	];
	registerCharacteristics(gateway, chars);
	registerDeviceMetadata(gateway, '_device', standardGatewayDeviceInfo('climateControl'));
	return gateway;
}

function createB4xGatewayMock(device) {
	const gateway = {};
	const MP = 'climateControl';
	const chars = [
		stateBool(MP, 'isHolidayModeActive', 'Holiday Mode'),
		stateBool(MP, 'isInErrorState', 'Error State'),
		stateBool(MP, 'isInModeConflict', 'Conflict State'),
		operationModeClimate(MP, ['fanOnly', 'heating', 'cooling', 'auto', 'dry']),
		stateBool(MP, 'onOffMode', 'State', { settable: true }),
		stateBool(MP, 'econoMode', 'Eco Mode', { settable: true }),
		...powerfulModeClimate(MP),
		stateBool(MP, 'streamerMode', 'Streamer Mode', { settable: true }),
		sensoryTemperature(MP, '/roomTemperature', 'Room Temperature', '_roomTemperature'),
		sensoryHumidity(MP, 'Room Humidity'),
		sensoryTemperature(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'),
		temperatureControlRoom(MP, 'Temperature Control', '_temperatureControl'),
		...fanClimatePack(MP, { horizontal: true, vertical: true }),
		...consumptionPack(MP, ''),
		...gatewayDiagnosticsPack(),
	];
	if ('indoorUnit' in device.managementPoints) {
		chars.push(...auxiliaryUnitPack('indoorUnit', 'Indoor Unit'));
	}
	registerCharacteristics(gateway, chars);
	registerDeviceMetadata(gateway, '_device', standardGatewayDeviceInfo(MP));
	return gateway;
}

function createA78GatewayMock(device) {
	const gateway = {};
	const MAIN_MP = 'climateControlMainZone';
	const TANK_MP = 'domesticHotWaterTank';
	const mainPrefix = 'Main Zone -';
	const tankPrefix = 'Water Tank -';
	const chars = [
		stringField(MAIN_MP, 'controlMode', `${mainPrefix} controlMode`, { propertyKey: '_controlModeMain' }),
		stringField(MAIN_MP, 'errorCode', `${mainPrefix} Error Code`, { propertyKey: '_errorCodeMain' }),
		stateBool(MAIN_MP, 'isHolidayModeActive', `${mainPrefix}Holiday Mode`, { propertyKey: '_isHolidayModeActiveMain' }),
		stateBool(MAIN_MP, 'isInEmergencyState', `${mainPrefix} Emergency State`, { propertyKey: '_isInEmergencyStateMain' }),
		stateBool(MAIN_MP, 'isInErrorState', `${mainPrefix} Error State`, { propertyKey: '_isInErrorStateMain' }),
		stateBool(MAIN_MP, 'isInInstallerState', `${mainPrefix} Installer State`, { propertyKey: '_isInInstallerStateMain' }),
		stateBool(MAIN_MP, 'isInWarningState', `${mainPrefix} Warning State`, { propertyKey: '_isInWarningStateMain' }),
		stateBool(MAIN_MP, 'onOffMode', `${mainPrefix} State`, { settable: true, generic_type: 'ENERGY_STATE', propertyKey: '_onOffModeMain' }),
		stringField(MAIN_MP, 'operationMode', `${mainPrefix} Operation Mode`, { propertyKey: '_operationModeMain', settable: true, values: ['heating'] }),
		sensoryTemperature(MAIN_MP, '/roomTemperature', `${mainPrefix} Room Temperature`, '_roomTemperatureMain'),
		sensoryTemperature(MAIN_MP, '/outdoorTemperature', `${mainPrefix} Outdoor Temperature`, '_outdoorTemperatureMain'),
		sensoryTemperature(MAIN_MP, '/leavingWaterTemperature', `${mainPrefix} Leaving Water Temperature`, '_leavingWaterTemperatureMain'),
		sensoryTemperature(MAIN_MP, '/leavingWaterOffset', `${mainPrefix} Leaving Water Offset`, '_leavingWaterOffsetMain'),
		stringField(MAIN_MP, 'setpointMode', `${mainPrefix} Setpoint Mode`, { propertyKey: '_setpointModeMain' }),
		temperatureControlRoom(MAIN_MP, `${mainPrefix} Temperature Control`, '_temperatureControlMain'),
		temperatureControlLeavingWater(MAIN_MP, `${mainPrefix} Leaving Water Control`, '_temperatureControlWaterMain'),
		temperatureControlLeavingWaterOffset(MAIN_MP, `${mainPrefix} Leaving Water Offset Control`, '_temperatureControlWaterOffsetMain'),
		...consumptionPack(MAIN_MP, `${mainPrefix} `, 'Main'),
		stringField(TANK_MP, 'name', `${tankPrefix} Name`, { propertyKey: '_nameTank' }),
		stringField(TANK_MP, 'errorCode', `${tankPrefix} Error Code`, { propertyKey: '_errorCodeTank' }),
		stringField(TANK_MP, 'heatupMode', 'Main Zone - Heatup Code', { propertyKey: '_heatupModeTank' }),
		stateBool(TANK_MP, 'isHolidayModeActive', `${tankPrefix} Holiday Mode`, { propertyKey: '_isHolidayModeActiveTank' }),
		stateBool(TANK_MP, 'isInEmergencyState', `${tankPrefix} Emergency State`, { propertyKey: '_isInEmergencyStatTank' }),
		stateBool(TANK_MP, 'isInErrorState', `${tankPrefix} Error State`, { propertyKey: '_isInErrorStateTank' }),
		stateBool(TANK_MP, 'isInInstallerState', `${tankPrefix} Installer State`, { propertyKey: '_isInInstallerStateTank' }),
		stateBool(TANK_MP, 'isInWarningState', `${tankPrefix} Warning State`, { propertyKey: '_isInWarningStateTank' }),
		stateBool(TANK_MP, 'onOffMode', `${tankPrefix} State`, { settable: true, generic_type: 'ENERGY_STATE', propertyKey: '_onOffModeTank' }),
		stringField(TANK_MP, 'operationMode', `${tankPrefix} Operation Mode`, { propertyKey: '_operationModeTank', settable: true, values: ['heating'] }),
		stateBool(TANK_MP, 'powerfulMode', `${tankPrefix} Powerful Mode`, { settable: true, generic_type: 'ENERGY_STATE', propertyKey: '_powerfulModeTank' }),
		stateBool(TANK_MP, 'isPowerfulModeActive', `${tankPrefix} Powerful Mode Active`, { propertyKey: '_isPowerfulModeActiveTank' }),
		sensoryTemperature(TANK_MP, '/tankTemperature', `${tankPrefix} Tank Temperature`, '_tankTemperatureTank'),
		stringField(TANK_MP, 'setpointMode', `${tankPrefix} Setpoint Mode`, { propertyKey: '_setpointModeTank' }),
		temperatureControlDhw(TANK_MP, `${tankPrefix} Domestic Water Temperature`, '_domesticHotWaterTemperatureTank', { fixedHeatingPath: true }),
		...gatewayDiagnosticsPack(),
	];
	if ('indoorUnitHydro' in device.managementPoints) {
		chars.push(...auxiliaryUnitInfoPack('indoorUnitHydro', 'Indoor Unit Hydro'));
	}
	if ('userInterface' in device.managementPoints) {
		chars.push(...auxiliaryUnitInfoPack('userInterface', 'User Interface'));
	}
	if ('outdoorUnit' in device.managementPoints) {
		chars.push(...auxiliaryUnitPack('outdoorUnit', 'Outdoor Unit'));
	}
	registerCharacteristics(gateway, chars);
	registerDeviceMetadata(gateway, '_device', multiZoneDeviceInfo());
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

const b4xDevice = createB4xMockDevice();
const b4xGateway = createB4xGatewayMock(b4xDevice);
const b4xCoverage = auditApiCoverage(b4xDevice, b4xGateway);
assert.equal(
	b4xCoverage.configCoverage,
	'complete',
	`BRP069B4x expected complete coverage, unmapped: ${b4xCoverage.unmappedDatapoints.join(', ')}`,
);

const a78Device = createA78MockDevice();
const a78Gateway = createA78GatewayMock(a78Device);
const a78Coverage = auditApiCoverage(a78Device, a78Gateway);
assert.equal(
	a78Coverage.configCoverage,
	'complete',
	`BRP069A78 expected complete coverage, unmapped: ${a78Coverage.unmappedDatapoints.join(', ')}; settableMismatches: ${JSON.stringify(a78Coverage.settableMismatches)}`,
);

console.log('apiCoverageAudit.test.js: all tests passed');
