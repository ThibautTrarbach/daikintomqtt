import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { converterEnum, typeEnum } from './BaseModules';
import { CharacteristicDefinition } from './metadataRegistry';
import {
	consumptionPack,
	sensoryTemperature,
	standardGatewayDeviceInfo,
	stateBool,
} from './characteristics/catalog';

const MP = 'climateControl';

function buildMonoZoneClimateCharacteristics(): CharacteristicDefinition[] {
	const operationModeValues = ['auto', 'dry', 'cooling', 'heating', 'fanOnly'];
	const fanModeValues = ['auto', 'quiet', 'fixed'];

	return [
		stateBool(MP, 'isHolidayModeActive', 'Holiday Mode'),
		stateBool(MP, 'isInErrorState', 'Error State'),
		stateBool(MP, 'isInModeConflict', 'Conflict State'),
		{
			propertyKey: '_operationMode',
			daikin: { managementPoint: MP, dataPoint: 'operationMode' },
			description: {
				name: 'Operation Mode',
				settable: true,
				type: typeEnum.string,
				values: operationModeValues,
			},
		},
		stateBool(MP, 'onOffMode', 'State', { settable: true, generic_type: 'ENERGY_STATE' }),
		sensoryTemperature(MP, '/roomTemperature', 'Room Temperature', '_roomTemperature'),
		sensoryTemperature(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'),
		{
			propertyKey: '_temperatureControl',
			daikin: {
				managementPoint: MP,
				dataPoint: 'temperatureControl',
				dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
				multiple: true,
				converter: converterEnum.numeric,
				multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
			},
			description: {
				name: 'Temperature Control',
				settable: true,
				type: typeEnum.numeric,
				unite: '°C',
				minMaxValue: {
					managementPoint: MP,
					dataPoint: 'temperatureControl',
					dataPointPath: '/operationModes/#value#/setpoints/roomTemperature',
					multiple: true,
					multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
				},
			},
		},
		{
			propertyKey: '_fanCurrentMode',
			daikin: {
				managementPoint: MP,
				dataPoint: 'fanControl',
				dataPointPath: '/operationModes/#value#/fanSpeed/currentMode',
				multiple: true,
				multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
			},
			description: {
				name: 'Fan Current Mode',
				settable: true,
				type: typeEnum.string,
				values: fanModeValues,
			},
		},
		{
			propertyKey: '_fanFixed',
			daikin: {
				managementPoint: MP,
				dataPoint: 'fanControl',
				dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
				multiple: true,
				converter: converterEnum.numeric,
				multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
			},
			description: {
				name: 'Fan Fixed',
				settable: true,
				type: typeEnum.numeric,
				minMaxValue: {
					managementPoint: MP,
					dataPoint: 'fanControl',
					dataPointPath: '/operationModes/#value#/fanSpeed/modes/fixed',
					multiple: true,
					multipleValue: { managementPoint: MP, dataPoint: 'operationMode' },
				},
			},
		},
		stateBool(MP, 'powerfulMode', 'Powerful Mode', { settable: true, generic_type: 'ENERGY_STATE' }),
		...consumptionPack(MP, ''),
	];
}

export class BRP069C41 extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildMonoZoneClimateCharacteristics(), standardGatewayDeviceInfo(MP));
	}
}

export class BRP069C8x extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildMonoZoneClimateCharacteristics(), standardGatewayDeviceInfo(MP));
	}
}

export {
	buildMonoZoneClimateCharacteristics,
};
