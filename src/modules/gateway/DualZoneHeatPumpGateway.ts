import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { converterEnum, typeEnum } from './typeConstants';
import { CharacteristicDefinition } from './metadataRegistry';
import {
	auxiliaryUnitInfoPack,
	consumptionPack,
	dualZoneDeviceInfo,
	sensoryTemperature,
	stateBool,
	stringField,
	temperatureControlDhw,
	temperatureControlLeavingWaterOffset,
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
		stringField(MP, 'name', `${prefix}Name`, {
			propertyKey: '_name1',
		}),
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
			temperatureControlLeavingWaterOffset(MP, `${prefix}Leaving Water Offset Control`, '_temperatureControlWaterOffset1'),
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
		stringField(MP, 'name', `${prefix}Name`, {
			propertyKey: '_name2',
		}),
		stringField(MP, 'errorCode', `${prefix}Error Code`, {
			propertyKey: '_errorCode2',
		}),
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
		stateBool(MP, 'isPowerfulModeActive', `${prefix}Powerful Mode Active`, {
			propertyKey: '_isPowerfulModeActive2',
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

function appendDualZoneDeviceSpecificCharacteristics(
	device: DaikinCloudDevice,
	chars: CharacteristicDefinition[],
): void {
	const GATEWAY_MP = '0';
	chars.push(
		stateBool(GATEWAY_MP, 'isFirmwareUpdateSupported', 'Firmware Update Supported', {
			propertyKey: '_gatewayFirmwareUpdateSupported',
		}),
		stringField(GATEWAY_MP, 'errorCode', 'Gateway Error Code', {
			propertyKey: '_gatewayErrorCode',
		}),
	);

	const infoUnits: Array<[string, string]> = [
		['3', 'Unit 3'],
		['4', 'Unit 4'],
		['5', 'Unit 5'],
	];
	for (const [managementPoint, label] of infoUnits) {
		if (managementPoint in device.managementPoints) {
			chars.push(...auxiliaryUnitInfoPack(managementPoint, label));
		}
	}
}

export class BRP069A61 extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		const chars = buildDualZoneCharacteristics({ zone1Extended: false });
		appendDualZoneDeviceSpecificCharacteristics(device, chars);
		super(device, chars, dualZoneDeviceInfo());
	}
}

export class BRP069A62 extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		const chars = buildDualZoneCharacteristics({ zone1Extended: true });
		appendDualZoneDeviceSpecificCharacteristics(device, chars);
		super(device, chars, dualZoneDeviceInfo());
	}
}

export {
	buildDualZoneCharacteristics,
};
