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
	hydroAndUiInfoPack,
	iconIdField,
	standardGatewayDeviceInfo,
	multiZoneDeviceInfo,
	dualZoneDeviceInfo,
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
	zoneStatusPack,
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
			wifiConnectionSSID: leaf('MyWifi'),
			wifiConnectionStrength: leaf(-50),
			isFirmwareUpdateSupported: leaf(false),
			isInErrorState: leaf('off'),
			errorCode: leaf(''),
			name: leaf('Gateway', true),
			iconId: leaf(1, true),
		},
		climateControlMainZone: {
			name: leaf('Main Zone', true),
			iconId: leaf(2, true),
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
			name: leaf('DHW Tank', true),
			iconId: leaf(3, true),
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
			name: leaf('Indoor Hydro', true),
			iconId: leaf(4, true),
			eepromVersion: leaf('1.2.3'),
			demandOperationMode: {
				value: 'heating',
				settable: false,
				values: ['noDemand', 'heating', 'cooling', 'dhw', 'heatingDHW', 'coolingDHW'],
			},
			emergencyMode: leaf('off'),
		},
		outdoorUnit: {
			name: leaf('Outdoor', true),
			iconId: leaf(5, true),
			modelInfo: leaf('OUTDOOR-MODEL'),
			serialNumber: leaf('0000000010528854'),
			softwareVersion: leaf('1.0.0'),
			errorCode: leaf(''),
			isInErrorState: leaf('off'),
			isInWarningState: leaf('off'),
			isInCautionState: leaf('off'),
			isInDefrostState: leaf('off'),
		},
		userInterface: {
			modelInfo: leaf('ELVH12S23EJ6V'),
			softwareVersion: leaf('1.0.0'),
			name: leaf('UI', true),
			iconId: leaf(6, true),
			dateTime: leaf('2026-09-07T12:00:00'),
			firmwareVersion: leaf('4.1.0'),
			miconId: leaf('MICON-1'),
		},
	};

	return createDeviceFromManagementPoints(managementPoints);
}

function createA62MockDevice() {
	const managementPoints = {
		'0': {
			firmwareVersion: leaf(''),
			isFirmwareUpdateSupported: leaf(false),
			serialNumber: leaf('0000000000000001'),
			modelInfo: leaf('BRP069A62'),
			ipAddress: leaf('192.168.1.30'),
			macAddress: leaf('AA:BB:CC:DD:EE:01'),
			errorCode: leaf(''),
			isInErrorState: leaf(false),
		},
		'1': {
			name: leaf('Zone 1', true),
			errorCode: leaf(''),
			isHolidayModeActive: leaf(false),
			isInErrorState: leaf(false),
			isInWarningState: leaf(false),
			isInInstallerState: leaf(false),
			isInEmergencyState: leaf(false),
			onOffMode: { value: 'on', settable: true, values: ['on', 'off'] },
			setpointMode: { value: 'weatherDependent', settable: false, values: ['fixed', 'weatherDependent', 'weatherDependentHeatingFixedCooling'] },
			controlMode: { value: 'leavingWaterTemperature', settable: false, values: ['roomTemperature', 'leavingWaterTemperature', 'externalRoomTemperature'] },
			sensoryData: {
				'': {
					outdoorTemperature: leaf(8),
					leavingWaterTemperature: leaf(35),
				},
			},
			temperatureControl: {
				'': {
					operationModes: {
						heating: {
							setpoints: {
								leavingWaterOffset: { value: 0, settable: true, minValue: -10, maxValue: 10, stepValue: 1 },
							},
						},
					},
				},
			},
			operationMode: { value: 'heating', settable: true, values: ['heating'] },
			targetTemperature: { value: 0, settable: true, minValue: -10, maxValue: 10, stepValue: 1 },
		},
		'2': {
			name: leaf('DHW Tank', true),
			errorCode: leaf(''),
			isHolidayModeActive: leaf(false),
			isInErrorState: leaf(false),
			isInWarningState: leaf(false),
			isInInstallerState: leaf(false),
			isInEmergencyState: leaf(false),
			isPowerfulModeActive: leaf(false),
			onOffMode: { value: 'on', settable: true, values: ['on', 'off'] },
			powerfulMode: { value: 'off', settable: true, values: ['off', 'on'] },
			heatupMode: { value: 'reheatOnly', settable: false, values: ['reheatOnly', 'scheduleOnly', 'reheatSchedule'] },
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
								domesticHotWaterTemperature: { value: 50, settable: false, minValue: 30, maxValue: 65, stepValue: 1 },
							},
						},
					},
				},
			},
			operationMode: { value: 'heating', settable: false, values: ['heating'] },
			setpointMode: { value: 'fixed', settable: false, values: ['fixed', 'weatherDependent'] },
		},
		'3': {
			modelInfo: leaf('ETVZ16S23DA6V'),
			softwareVersion: leaf('1.0.0'),
		},
		'4': {
			softwareVersion: leaf('1.0.0'),
		},
		'5': {
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
		iconIdField(MP, '_iconId'),
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
		iconIdField(MAIN_MP, '_iconIdMain', `${mainPrefix} Icon ID`),
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
		iconIdField(TANK_MP, '_iconIdTank', `${tankPrefix} Icon ID`),
		...gatewayDiagnosticsPack(),
	];
	if ('indoorUnitHydro' in device.managementPoints) {
		chars.push(...hydroAndUiInfoPack('indoorUnitHydro', 'Indoor Unit Hydro'));
	}
	if ('userInterface' in device.managementPoints) {
		chars.push(...hydroAndUiInfoPack('userInterface', 'User Interface'));
	}
	if ('outdoorUnit' in device.managementPoints) {
		chars.push(...auxiliaryUnitPack('outdoorUnit', 'Outdoor Unit'));
	}
	registerCharacteristics(gateway, chars);
	registerDeviceMetadata(gateway, '_device', multiZoneDeviceInfo());
	return gateway;
}

function createA62GatewayMock(device) {
	const gateway = {};
	const MP1 = '1';
	const MP2 = '2';
	const prefix1 = '1 - ';
	const prefix2 = '2 - ';
	const chars = [
		stringField(MP1, 'name', `${prefix1}Name`, { propertyKey: '_name1' }),
		...zoneStatusPack(MP1, prefix1.trim(), '1'),
		stringField(MP1, 'operationMode', `${prefix1}Operation Mode`, {
			propertyKey: '_operationMode1',
			settable: true,
			values: ['heating'],
		}),
		stateBool(MP1, 'onOffMode', `${prefix1}State`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_onOffMode1',
		}),
		stringField(MP1, 'setpointMode', `${prefix1}Setpoint Mode`, {
			propertyKey: '_setpointMode1',
			converter: converterEnum.string,
		}),
		stringField(MP1, 'controlMode', `${prefix1}Control Mode`, {
			propertyKey: '_controlMode1',
			converter: converterEnum.string,
		}),
		sensoryTemperature(MP1, '/roomTemperature', `${prefix1}Room Temperature`, '_roomTemperature1'),
		sensoryTemperature(MP1, '/outdoorTemperature', `${prefix1}Outdoor Temperature`, '_outdoorTemperature1'),
		sensoryTemperature(MP1, '/leavingWaterTemperature', `${prefix1}Leaving Water Temperature`, '_leavingWaterTemperature1'),
		sensoryTemperature(MP1, '/leavingWaterOffset', `${prefix1}Leaving Water Offset`, '_leavingWaterOffset1'),
		temperatureControlRoom(MP1, `${prefix1}Temperature Control`, '_temperatureControl1'),
		temperatureControlLeavingWaterOffset(MP1, `${prefix1}Leaving Water Offset Control`, '_temperatureControlWaterOffset1'),
		{
			propertyKey: '_targetTemperature1',
			daikin: {
				managementPoint: MP1,
				dataPoint: 'targetTemperature',
				converter: converterEnum.numeric,
			},
			description: {
				name: `${prefix1}Target Temperature`,
				settable: true,
				type: typeEnum.numeric,
				unite: '°C',
				minMaxValue: {
					managementPoint: MP1,
					dataPoint: 'targetTemperature',
				},
			},
		},
		stringField(MP2, 'name', `${prefix2}Name`, { propertyKey: '_name2' }),
		stringField(MP2, 'errorCode', `${prefix2}Error Code`, { propertyKey: '_errorCode2' }),
		...zoneStatusPack(MP2, prefix2.trim(), '2'),
		stateBool(MP2, 'onOffMode', `${prefix2}State`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_onOffMode2',
		}),
		stringField(MP2, 'operationMode', `${prefix2}Operation Mode`, { propertyKey: '_operationMode2' }),
		stateBool(MP2, 'powerfulMode', `${prefix2}Powerful Mode`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_powerfulMode',
		}),
		stateBool(MP2, 'isPowerfulModeActive', `${prefix2}Powerful Mode Active`, {
			propertyKey: '_isPowerfulModeActive2',
		}),
		stringField(MP2, 'heatupMode', ' 2 - Heatup Mode', { propertyKey: '_heatupMode2' }),
		sensoryTemperature(MP2, '/tankTemperature', `${prefix2}Tank Temperature`, '_tankTemperature2'),
		temperatureControlDhw(MP2, `${prefix2}Temperature Control`, '_temperatureControl'),
		stringField(MP2, 'setpointMode', `${prefix2}Setpoint Mode`, {
			propertyKey: '_setpointMode2',
			converter: converterEnum.string,
		}),
		...consumptionPack(MP2, prefix2, '2'),
		stateBool('0', 'isFirmwareUpdateSupported', 'Firmware Update Supported', {
			propertyKey: '_gatewayFirmwareUpdateSupported',
		}),
		stringField('0', 'errorCode', 'Gateway Error Code', {
			propertyKey: '_gatewayErrorCode',
		}),
	];
	for (const [managementPoint, label] of [['3', 'Unit 3'], ['4', 'Unit 4'], ['5', 'Unit 5']]) {
		if (managementPoint in device.managementPoints) {
			chars.push(...auxiliaryUnitInfoPack(managementPoint, label));
		}
	}
	registerCharacteristics(gateway, chars);
	registerDeviceMetadata(gateway, '_device', dualZoneDeviceInfo());
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

const a62Device = createA62MockDevice();
const a62Gateway = createA62GatewayMock(a62Device);
const a62Coverage = auditApiCoverage(a62Device, a62Gateway);
assert.equal(
	a62Coverage.configCoverage,
	'complete',
	`BRP069A62 expected complete coverage, unmapped: ${a62Coverage.unmappedDatapoints.join(', ')}; settableMismatches: ${JSON.stringify(a62Coverage.settableMismatches)}`,
);

console.log('apiCoverageAudit.test.js: all tests passed');
