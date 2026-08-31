import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { converterEnum, typeEnum } from './BaseModules';
import { CharacteristicDefinition } from './metadataRegistry';
import {
	consumptionPack,
	dualZoneDeviceInfo,
	sensoryTemperature,
	stateBool,
	stringField,
	temperatureControlDhw,
	temperatureControlRoom,
	zoneStatusPack,
} from './characteristics/catalog';

interface DualZoneOptions {
	zone1Extended?: boolean;
}

function buildHeatPumpZone1Characteristics(extended: boolean): CharacteristicDefinition[] {
	const MP = '1';
	const prefix = '1 - ';
	const chars: CharacteristicDefinition[] = [
		...zoneStatusPack(MP, prefix.trim(), '1'),
	];

	if (extended) {
		chars.push(
			stringField(MP, 'operationMode', `${prefix}Operation Mode`, {
				propertyKey: '_operationMode1',
				settable: true,
				values: ['heating'],
			}),
		);
	}

	chars.push(
		stateBool(MP, 'onOffMode', `${prefix}State`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_onOffMode1',
		}),
		stringField(MP, 'setpointMode', `${prefix}Setpoint Mode`, {
			propertyKey: '_setpointMode1',
			converter: converterEnum.string,
		}),
		stringField(MP, 'controlMode', `${prefix}Control Mode`, {
			propertyKey: '_controlMode1',
			converter: converterEnum.string,
		}),
	);

	if (extended) {
		chars.push(
			sensoryTemperature(MP, '/roomTemperature', `${prefix}Room Temperature`, '_roomTemperature1'),
			sensoryTemperature(MP, '/outdoorTemperature', `${prefix}Outdoor Temperature`, '_outdoorTemperature1'),
			sensoryTemperature(MP, '/leavingWaterTemperature', `${prefix}Leaving Water Temperature`, '_leavingWaterTemperature1'),
			sensoryTemperature(MP, '/leavingWaterOffset', `${prefix}Leaving Water Offset`, '_leavingWaterOffset1'),
			temperatureControlRoom(MP, `${prefix}Temperature Control`, '_temperatureControl1'),
			{
				propertyKey: '_targetTemperature1',
				daikin: {
					managementPoint: MP,
					dataPoint: 'targetTemperature',
					converter: converterEnum.numeric,
				},
				description: {
					name: `${prefix}Target Temperature`,
					settable: true,
					type: typeEnum.numeric,
					unite: '°C',
					minMaxValue: {
						managementPoint: MP,
						dataPoint: 'targetTemperature',
					},
				},
			},
		);
	} else {
		chars.push(
			sensoryTemperature(MP, '/outdoorTemperature', `${prefix}Outdoor Temperature`, '_outdoorTemperature1'),
		);
	}

	return chars;
}

function buildDhwZone2Characteristics(): CharacteristicDefinition[] {
	const MP = '2';
	const prefix = '2 - ';
	return [
		...zoneStatusPack(MP, prefix.trim(), '2'),
		stateBool(MP, 'onOffMode', `${prefix}State`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_onOffMode2',
		}),
		stringField(MP, 'operationMode', `${prefix}Operation Mode`, {
			propertyKey: '_operationMode2',
		}),
		stateBool(MP, 'powerfulMode', `${prefix}Powerful Mode`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_powerfulMode',
		}),
		stringField(MP, 'heatupMode', ' 2 - Heatup Mode', {
			propertyKey: '_heatupMode2',
		}),
		sensoryTemperature(MP, '/tankTemperature', `${prefix}Tank Temperature`, '_tankTemperature2'),
		temperatureControlDhw(MP, `${prefix}Temperature Control`, '_temperatureControl'),
		stringField(MP, 'setpointMode', `${prefix}Setpoint Mode`, {
			propertyKey: '_setpointMode2',
			converter: converterEnum.string,
		}),
		...consumptionPack(MP, prefix, '2'),
	];
}

function buildDualZoneCharacteristics(opts: DualZoneOptions): CharacteristicDefinition[] {
	return [
		...buildHeatPumpZone1Characteristics(opts.zone1Extended ?? false),
		...buildDhwZone2Characteristics(),
	];
}

export class BRP069A61 extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildDualZoneCharacteristics({ zone1Extended: false }), dualZoneDeviceInfo());
	}
}

export class BRP069A62 extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildDualZoneCharacteristics({ zone1Extended: true }), dualZoneDeviceInfo());
	}
}

export {
	buildDualZoneCharacteristics,
};
