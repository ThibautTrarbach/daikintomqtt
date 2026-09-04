import {
	consumptionEnum,
	converterEnum,
	typeEnum,
} from '../typeConstants';
import { CharacteristicDefinition } from '../metadataRegistry';
import { ModuleDeviceMetadata, ModulePropertyMetadata } from '../../../types';

function standardGatewayDeviceInfo(
	managementPoint: string,
	nameDataPoint = 'name',
): ModuleDeviceMetadata {
	return {
		name: { managementPoint, dataPoint: nameDataPoint },
		modelInfo: { managementPoint: 'gateway', dataPoint: 'modelInfo' },
		serialNumber: { managementPoint: 'gateway', dataPoint: 'serialNumber' },
		firmwareVersion: { managementPoint: 'gateway', dataPoint: 'firmwareVersion' },
		isInErrorState: { managementPoint, dataPoint: 'isInErrorState' },
		errorCode: { managementPoint, dataPoint: 'errorCode' },
	};
}

function dualZoneDeviceInfo(): ModuleDeviceMetadata {
	return {
		name: { managementPoint: '0', dataPoint: 'name' },
		modelInfo: { managementPoint: '0', dataPoint: 'modelInfo' },
		serialNumber: { managementPoint: '0', dataPoint: 'serialNumber' },
		firmwareVersion: { managementPoint: '0', dataPoint: 'firmwareVersion' },
		isInErrorState: { managementPoint: '0', dataPoint: 'isInErrorState' },
		errorCode: { managementPoint: '1', dataPoint: 'errorCode' },
	};
}

function multiZoneDeviceInfo(): ModuleDeviceMetadata {
	return {
		name: { managementPoint: 'climateControlMainZone', dataPoint: 'name' },
		modelInfo: { managementPoint: 'gateway', dataPoint: 'modelInfo' },
		serialNumber: { managementPoint: 'gateway', dataPoint: 'serialNumber' },
		firmwareVersion: { managementPoint: 'gateway', dataPoint: 'firmwareVersion' },
		isInErrorState: { managementPoint: 'gateway', dataPoint: 'isInErrorState' },
	};
}

function consumptionPack(
	managementPoint: string,
	prefix: string,
	suffix = '',
): CharacteristicDefinition[] {
	const defs: Array<{ key: string; label: string; consumptionT: number }> = [
		{ key: `_heatingConsumptionD${suffix}`, label: `${prefix}Heating Consumption Day`, consumptionT: consumptionEnum.heatingDay },
		{ key: `_heatingConsumptionW${suffix}`, label: `${prefix}Heating Consumption Week`, consumptionT: consumptionEnum.heatingWeek },
		{ key: `_heatingConsumptionM${suffix}`, label: `${prefix}Heating Consumption Month`, consumptionT: consumptionEnum.heatingMonth },
		{ key: `_coolingConsumptionD${suffix}`, label: `${prefix}Cooling Consumption Day`, consumptionT: consumptionEnum.coolingDay },
		{ key: `_coolingConsumptionW${suffix}`, label: `${prefix}Cooling Consumption Week`, consumptionT: consumptionEnum.coolingWeek },
		{ key: `_coolingConsumptionM${suffix}`, label: `${prefix}Cooling Consumption Month`, consumptionT: consumptionEnum.coolingMonth },
	];

	return defs.map(({ key, label, consumptionT }) => ({
		propertyKey: key,
		daikin: {
			managementPoint,
			dataPoint: 'consumptionData',
			dataPointPath: '/electrical',
			consumptionT,
			converter: converterEnum.consumption,
		},
		description: {
			name: label,
			settable: false,
			type: typeEnum.numeric,
			minValue: 0,
			maxValue: 3000,
			unite: 'kWh',
		},
	}));
}

function stateBool(
	managementPoint: string,
	dataPoint: string,
	label: string,
	opts: { settable?: boolean; generic_type?: string; propertyKey?: string } = {},
): CharacteristicDefinition {
	const propertyKey = opts.propertyKey ?? `_${dataPoint}`;
	return {
		propertyKey,
		daikin: {
			managementPoint,
			dataPoint,
			...(opts.settable ? { converter: converterEnum.binary } : {}),
		},
		description: {
			name: label,
			settable: opts.settable ?? false,
			type: typeEnum.binary,
			...(opts.generic_type ? { generic_type: opts.generic_type } : {}),
		},
	};
}

function stringField(
	managementPoint: string,
	dataPoint: string,
	label: string,
	opts: {
		propertyKey?: string;
		settable?: boolean;
		converter?: number;
		values?: string[];
	} = {},
): CharacteristicDefinition {
	const propertyKey = opts.propertyKey ?? `_${dataPoint}`;
	return {
		propertyKey,
		daikin: {
			managementPoint,
			dataPoint,
			...(opts.converter !== undefined ? { converter: opts.converter } : {}),
		},
		description: {
			name: label,
			settable: opts.settable ?? false,
			type: typeEnum.string,
			...(opts.values ? { values: opts.values } : {}),
		},
	};
}

function sensoryTemperature(
	managementPoint: string,
	dataPointPath: string,
	label: string,
	propertyKey: string,
	opts: { minValue?: number; maxValue?: number } = {},
): CharacteristicDefinition {
	return {
		propertyKey,
		daikin: {
			managementPoint,
			dataPoint: 'sensoryData',
			dataPointPath,
		},
		description: {
			name: label,
			settable: false,
			type: typeEnum.numeric,
			unite: '°C',
			...(opts.minValue !== undefined && opts.maxValue !== undefined
				? { minValue: opts.minValue, maxValue: opts.maxValue }
				: {
					minMaxValue: {
						managementPoint,
						dataPoint: 'sensoryData',
						dataPointPath,
					},
				}),
		},
	};
}

function sensoryHumidity(
	managementPoint: string,
	label: string,
	propertyKey = '_roomHumidity',
): CharacteristicDefinition {
	const dataPointPath = '/roomHumidity';
	return {
		propertyKey,
		daikin: {
			managementPoint,
			dataPoint: 'sensoryData',
			dataPointPath,
		},
		description: {
			name: label,
			settable: false,
			type: typeEnum.numeric,
			unite: '%',
			minMaxValue: {
				managementPoint,
				dataPoint: 'sensoryData',
				dataPointPath,
			},
		},
	};
}

function operationModeClimate(
	managementPoint: string,
	values: string[],
	propertyKey = '_operationMode',
): CharacteristicDefinition {
	return stringField(managementPoint, 'operationMode', 'Operation Mode', {
		propertyKey,
		settable: true,
		values,
	});
}

function temperatureControlRoom(
	managementPoint: string,
	label: string,
	propertyKey: string,
): CharacteristicDefinition {
	const daikin: ModulePropertyMetadata = {
		managementPoint,
		dataPoint: 'temperatureControl',
		dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: { managementPoint, dataPoint: 'operationMode' },
	};
	return {
		propertyKey,
		daikin,
		description: {
			name: label,
			settable: true,
			type: typeEnum.numeric,
			unite: '°C',
			minMaxValue: {
				managementPoint,
				dataPoint: 'temperatureControl',
				dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
				multiple: true,
				multipleValue: { managementPoint, dataPoint: 'operationMode' },
			},
		},
	};
}

function temperatureControlLeavingWater(
	managementPoint: string,
	label: string,
	propertyKey: string,
): CharacteristicDefinition {
	const daikin: ModulePropertyMetadata = {
		managementPoint,
		dataPoint: 'temperatureControl',
		dataPointPath: '/operationModes/#value#/setpoints/leavingWaterTemperature',
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: { managementPoint, dataPoint: 'operationMode' },
	};
	return {
		propertyKey,
		daikin,
		description: {
			name: label,
			settable: true,
			type: typeEnum.numeric,
			unite: '°C',
			minMaxValue: {
				managementPoint,
				dataPoint: 'temperatureControl',
				dataPointPath: '/operationModes/#value#/setpoints/leavingWaterTemperature',
				multiple: true,
				multipleValue: { managementPoint, dataPoint: 'operationMode' },
			},
		},
	};
}

function temperatureControlLeavingWaterOffset(
	managementPoint: string,
	label: string,
	propertyKey: string,
): CharacteristicDefinition {
	const daikin: ModulePropertyMetadata = {
		managementPoint,
		dataPoint: 'temperatureControl',
		dataPointPath: '/operationModes/#value#/setpoints/leavingWaterOffset',
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: { managementPoint, dataPoint: 'operationMode' },
	};
	return {
		propertyKey,
		daikin,
		description: {
			name: label,
			settable: true,
			type: typeEnum.numeric,
			unite: '°C',
			minMaxValue: {
				managementPoint,
				dataPoint: 'temperatureControl',
				dataPointPath: '/operationModes/#value#/setpoints/leavingWaterOffset',
				multiple: true,
				multipleValue: { managementPoint, dataPoint: 'operationMode' },
			},
		},
	};
}

function temperatureControlDhw(
	managementPoint: string,
	label: string,
	propertyKey: string,
	opts: { fixedHeatingPath?: boolean } = {},
): CharacteristicDefinition {
	if (opts.fixedHeatingPath) {
		const dataPointPath = '/operationModes/heating/setpoints/domesticHotWaterTemperature';
		return {
			propertyKey,
			daikin: {
				managementPoint,
				dataPoint: 'temperatureControl',
				dataPointPath,
				converter: converterEnum.numeric,
			},
			description: {
				name: label,
				settable: true,
				type: typeEnum.numeric,
				unite: '°C',
				minMaxValue: {
					managementPoint,
					dataPoint: 'temperatureControl',
					dataPointPath,
				},
			},
		};
	}

	const daikin: ModulePropertyMetadata = {
		managementPoint,
		dataPoint: 'temperatureControl',
		dataPointPath: '/operationModes/#value#/setpoints/domesticHotWaterTemperature',
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: { managementPoint, dataPoint: 'operationMode' },
	};
	return {
		propertyKey,
		daikin,
		description: {
			name: label,
			settable: false,
			type: typeEnum.numeric,
			unite: '°C',
			minMaxValue: {
				managementPoint,
				dataPoint: 'temperatureControl',
				dataPointPath: '/operationModes/#value#/setpoints/domesticHotWaterTemperature',
				multiple: true,
				multipleValue: { managementPoint, dataPoint: 'operationMode' },
			},
		},
	};
}

function fanClimatePack(
	managementPoint: string,
	opts: { horizontal?: boolean; vertical?: boolean } = {},
): CharacteristicDefinition[] {
	const multipleValue = { managementPoint, dataPoint: 'operationMode' };
	const defs: CharacteristicDefinition[] = [
		{
			propertyKey: '_fanCurrentMode',
			daikin: {
				managementPoint,
				dataPoint: 'fanControl',
				dataPointPath: '/operationModes/#value#/fanSpeed/currentMode',
				multiple: true,
				multipleValue,
			},
			description: {
				name: 'Fan Current Mode',
				settable: true,
				type: typeEnum.string,
				values: ['auto', 'quiet', 'fixed'],
			},
		},
		{
			propertyKey: '_fanFixed',
			daikin: {
				managementPoint,
				dataPoint: 'fanControl',
				dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
				multiple: true,
				converter: converterEnum.numeric,
				multipleValue,
			},
			description: {
				name: 'Fan Fixed',
				settable: true,
				type: typeEnum.numeric,
				minMaxValue: {
					managementPoint,
					dataPoint: 'fanControl',
					dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
					multiple: true,
					multipleValue,
				},
			},
		},
	];

	if (opts.horizontal) {
		defs.push({
			propertyKey: '_fanHorizontal',
			daikin: {
				managementPoint,
				dataPoint: 'fanControl',
				dataPointPath: '/operationModes/#value#/fanDirection/horizontal/currentMode',
				multiple: true,
				multipleValue,
			},
			description: {
				name: 'Fan Horizontal',
				settable: true,
				type: typeEnum.string,
				values: ['stop', 'swing'],
			},
		});
	}

	if (opts.vertical) {
		defs.push({
			propertyKey: '_fanVertical',
			daikin: {
				managementPoint,
				dataPoint: 'fanControl',
				dataPointPath: '/operationModes/#value#/fanDirection/vertical/currentMode',
				multiple: true,
				multipleValue,
			},
			description: {
				name: 'Fan Vertical',
				settable: true,
				type: typeEnum.string,
				values: ['stop', 'swing', 'windNice'],
			},
		});
	}

	return defs;
}

function powerfulModeClimate(managementPoint: string): CharacteristicDefinition[] {
	return [
		stateBool(managementPoint, 'powerfulMode', 'Powerful Mode', { settable: true, generic_type: 'ENERGY_STATE' }),
		stateBool(managementPoint, 'isPowerfulModeActive', 'Powerful Mode Active', { propertyKey: '_isPowerfulModeActive' }),
	];
}

function gatewayDiagnosticsPack(): CharacteristicDefinition[] {
	const MP = 'gateway';
	return [
		stateBool(MP, 'daylightSavingTimeEnabled', 'Daylight Saving', { settable: true, propertyKey: '_gatewayDaylightSaving' }),
		stateBool(MP, 'ledEnabled', 'LED Enabled', { settable: true, propertyKey: '_gatewayLedEnabled' }),
		stringField(MP, 'regionCode', 'Region Code', { propertyKey: '_gatewayRegionCode' }),
		stateBool(MP, 'isFirmwareUpdateSupported', 'Firmware Update Supported', { propertyKey: '_gatewayFirmwareUpdateSupported' }),
		stateBool(MP, 'isInErrorState', 'Gateway Error State', { propertyKey: '_gatewayIsInErrorState' }),
		stringField(MP, 'errorCode', 'Gateway Error Code', { propertyKey: '_gatewayErrorCode' }),
	];
}

function demandControlPack(managementPoint: string): CharacteristicDefinition[] {
	return [
		{
			propertyKey: '_demandControlCurrentMode',
			daikin: {
				managementPoint,
				dataPoint: 'demandControl',
				dataPointPath: '/currentMode',
			},
			description: {
				name: 'Demand Control Mode',
				settable: true,
				type: typeEnum.string,
				values: ['off', 'auto', 'fixed', 'scheduled'],
			},
		},
		{
			propertyKey: '_demandControlFixed',
			daikin: {
				managementPoint,
				dataPoint: 'demandControl',
				dataPointPath: '/modes/fixed',
				converter: converterEnum.numeric,
			},
			description: {
				name: 'Demand Control Fixed',
				settable: true,
				type: typeEnum.numeric,
				minMaxValue: {
					managementPoint,
					dataPoint: 'demandControl',
					dataPointPath: '/modes/fixed',
				},
			},
		},
	];
}

function auxiliaryUnitPack(managementPoint: string, labelPrefix: string): CharacteristicDefinition[] {
	const chars: CharacteristicDefinition[] = [];

	if (managementPoint === 'indoorUnit') {
		chars.push(
			stringField(managementPoint, 'modelInfo', `${labelPrefix} Model`, { propertyKey: '_indoorUnitModelInfo' }),
			stringField(managementPoint, 'serialNumber', `${labelPrefix} Serial Number`, { propertyKey: '_indoorUnitSerialNumber' }),
			stringField(managementPoint, 'eepromVersion', `${labelPrefix} EEPROM Version`, {
				propertyKey: '_indoorUnitEepromVersion',
			}),
			stateBool(managementPoint, 'dryKeepSetting', `${labelPrefix} Dry Keep`, {
				settable: true,
				propertyKey: '_indoorUnitDryKeepSetting',
			}),
			stateBool(managementPoint, 'isInThermoOnState', `${labelPrefix} Thermo On State`, {
				propertyKey: '_indoorUnitIsInThermoOnState',
			}),
			stringField(managementPoint, 'frontPanelSetting', `${labelPrefix} Front Panel Setting`, {
				settable: true,
				propertyKey: '_indoorUnitFrontPanelSetting',
			}),
			stringField(managementPoint, 'installationPosition', `${labelPrefix} Installation Position`, {
				propertyKey: '_indoorUnitInstallationPosition',
			}),
		);
	}

	if (managementPoint === 'outdoorUnit') {
		chars.push(
			stringField(managementPoint, 'modelInfo', `${labelPrefix} Model`, { propertyKey: '_outdoorUnitModelInfo' }),
			stringField(managementPoint, 'serialNumber', `${labelPrefix} Serial Number`, { propertyKey: '_outdoorUnitSerialNumber' }),
			stringField(managementPoint, 'softwareVersion', `${labelPrefix} Software Version`, {
				propertyKey: '_outdoorUnitSoftwareVersion',
			}),
			stringField(managementPoint, 'errorCode', `${labelPrefix} Error Code`, { propertyKey: '_outdoorUnitErrorCode' }),
			stateBool(managementPoint, 'isInErrorState', `${labelPrefix} Error State`, { propertyKey: '_outdoorUnitIsInErrorState' }),
			stateBool(managementPoint, 'isInWarningState', `${labelPrefix} Warning State`, { propertyKey: '_outdoorUnitIsInWarningState' }),
			stateBool(managementPoint, 'isInCautionState', `${labelPrefix} Caution State`, { propertyKey: '_outdoorUnitIsInCautionState' }),
			stateBool(managementPoint, 'isInDefrostState', `${labelPrefix} Defrost State`, { propertyKey: '_outdoorUnitIsInDefrostState' }),
		);
	}

	return chars;
}

function auxiliaryUnitInfoPack(managementPoint: string, labelPrefix: string): CharacteristicDefinition[] {
	const suffix = managementPoint.replace(/[^a-zA-Z0-9]/g, '');
	return [
		stringField(managementPoint, 'modelInfo', `${labelPrefix} Model`, { propertyKey: `_aux${suffix}ModelInfo` }),
		stringField(managementPoint, 'softwareVersion', `${labelPrefix} Software Version`, {
			propertyKey: `_aux${suffix}SoftwareVersion`,
		}),
	];
}

function zoneStatusPack(
	managementPoint: string,
	labelPrefix: string,
	keySuffix: string,
): CharacteristicDefinition[] {
	return [
		stateBool(managementPoint, 'isHolidayModeActive', `${labelPrefix} Holiday Mode`, {
			propertyKey: `_isHolidayModeActive${keySuffix}`,
		}),
		stateBool(managementPoint, 'isInErrorState', `${labelPrefix} Error State`, {
			propertyKey: `_isInErrorState${keySuffix}`,
		}),
		stateBool(managementPoint, 'isInWarningState', `${labelPrefix} Warning State`, {
			propertyKey: `_isInWarningState${keySuffix}`,
		}),
		stateBool(managementPoint, 'isInInstallerState', `${labelPrefix} Installer State`, {
			propertyKey: `_isInInstallerState${keySuffix}`,
		}),
		stateBool(managementPoint, 'isInEmergencyState', `${labelPrefix} Emergency State`, {
			propertyKey: `_isInEmergencyState${keySuffix}`,
		}),
	];
}

export {
	standardGatewayDeviceInfo,
	dualZoneDeviceInfo,
	multiZoneDeviceInfo,
	consumptionPack,
	stateBool,
	stringField,
	sensoryTemperature,
	sensoryHumidity,
	operationModeClimate,
	temperatureControlRoom,
	temperatureControlLeavingWater,
	temperatureControlLeavingWaterOffset,
	temperatureControlDhw,
	fanClimatePack,
	powerfulModeClimate,
	demandControlPack,
	gatewayDiagnosticsPack,
	auxiliaryUnitPack,
	auxiliaryUnitInfoPack,
	zoneStatusPack,
};
