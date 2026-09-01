import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { converterEnum } from './typeConstants';
import { CharacteristicDefinition } from './metadataRegistry';
import {
	auxiliaryUnitInfoPack,
	auxiliaryUnitPack,
	consumptionPack,
	gatewayDiagnosticsPack,
	multiZoneDeviceInfo,
	sensoryTemperature,
	stateBool,
	stringField,
	temperatureControlDhw,
	temperatureControlLeavingWater,
	temperatureControlLeavingWaterOffset,
	temperatureControlRoom,
} from './characteristics/catalog';

const MAIN_MP = 'climateControlMainZone';
const TANK_MP = 'domesticHotWaterTank';

function buildMainZoneCharacteristics(): CharacteristicDefinition[] {
	const prefix = 'Main Zone -';
	return [
		stringField(MAIN_MP, 'controlMode', `${prefix} controlMode`, {
			propertyKey: '_controlModeMain',
		}),
		stringField(MAIN_MP, 'errorCode', `${prefix} Error Code`, {
			propertyKey: '_errorCodeMain',
		}),
		stateBool(MAIN_MP, 'isHolidayModeActive', `${prefix}Holiday Mode`, {
			propertyKey: '_isHolidayModeActiveMain',
		}),
		stateBool(MAIN_MP, 'isInEmergencyState', `${prefix} Emergency State`, {
			propertyKey: '_isInEmergencyStateMain',
		}),
		stateBool(MAIN_MP, 'isInErrorState', `${prefix} Error State`, {
			propertyKey: '_isInErrorStateMain',
		}),
		stateBool(MAIN_MP, 'isInInstallerState', `${prefix} Installer State`, {
			propertyKey: '_isInInstallerStateMain',
		}),
		stateBool(MAIN_MP, 'isInWarningState', `${prefix} Warning State`, {
			propertyKey: '_isInWarningStateMain',
		}),
		stateBool(MAIN_MP, 'onOffMode', `${prefix} State`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_onOffModeMain',
		}),
		stringField(MAIN_MP, 'operationMode', `${prefix} Operation Mode`, {
			propertyKey: '_operationModeMain',
			values: ['heating'],
		}),
		sensoryTemperature(MAIN_MP, '/roomTemperature', `${prefix} Room Temperature`, '_roomTemperatureMain'),
		sensoryTemperature(MAIN_MP, '/outdoorTemperature', `${prefix} Outdoor Temperature`, '_outdoorTemperatureMain'),
		sensoryTemperature(MAIN_MP, '/leavingWaterTemperature', `${prefix} Leaving Water Temperature`, '_leavingWaterTemperatureMain'),
		sensoryTemperature(MAIN_MP, '/leavingWaterOffset', `${prefix} Leaving Water Offset`, '_leavingWaterOffsetMain'),
		stringField(MAIN_MP, 'setpointMode', `${prefix} Setpoint Mode`, {
			propertyKey: '_setpointModeMain',
			converter: converterEnum.string,
		}),
		temperatureControlRoom(MAIN_MP, `${prefix} Temperature Control`, '_temperatureControlMain'),
		temperatureControlLeavingWater(MAIN_MP, `${prefix} Leaving Water Control`, '_temperatureControlWaterMain'),
		temperatureControlLeavingWaterOffset(MAIN_MP, `${prefix} Leaving Water Offset Control`, '_temperatureControlWaterOffsetMain'),
		...consumptionPack(MAIN_MP, `${prefix} `, 'Main'),
	];
}

function buildTankZoneCharacteristics(): CharacteristicDefinition[] {
	const prefix = 'Water Tank -';
	return [
		stringField(TANK_MP, 'name', `${prefix} Name`, {
			propertyKey: '_nameTank',
		}),
		stringField(TANK_MP, 'errorCode', `${prefix} Error Code`, {
			propertyKey: '_errorCodeTank',
		}),
		stringField(TANK_MP, 'heatupMode', 'Main Zone - Heatup Code', {
			propertyKey: '_heatupModeTank',
		}),
		stateBool(TANK_MP, 'isHolidayModeActive', `${prefix} Holiday Mode`, {
			propertyKey: '_isHolidayModeActiveTank',
		}),
		stateBool(TANK_MP, 'isInEmergencyState', `${prefix} Emergency State`, {
			propertyKey: '_isInEmergencyStatTank',
		}),
		stateBool(TANK_MP, 'isInErrorState', `${prefix} Error State`, {
			propertyKey: '_isInErrorStateTank',
		}),
		stateBool(TANK_MP, 'isInInstallerState', `${prefix} Installer State`, {
			propertyKey: '_isInInstallerStateTank',
		}),
		stateBool(TANK_MP, 'isInWarningState', `${prefix} Warning State`, {
			propertyKey: '_isInWarningStateTank',
		}),
		stateBool(TANK_MP, 'onOffMode', `${prefix} State`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_onOffModeTank',
		}),
		stringField(TANK_MP, 'operationMode', `${prefix} Operation Mode`, {
			propertyKey: '_operationModeTank',
			values: ['heating'],
		}),
		stateBool(TANK_MP, 'powerfulMode', `${prefix} Powerful Mode`, {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_powerfulModeTank',
		}),
		stateBool(TANK_MP, 'isPowerfulModeActive', `${prefix} Powerful Mode Active`, {
			propertyKey: '_isPowerfulModeActiveTank',
		}),
		sensoryTemperature(TANK_MP, '/tankTemperature', `${prefix} Tank Temperature`, '_tankTemperatureTank'),
		stringField(TANK_MP, 'setpointMode', `${prefix} Setpoint Mode`, {
			propertyKey: '_setpointModeTank',
			converter: converterEnum.string,
		}),
		temperatureControlDhw(TANK_MP, `${prefix} Domestic Water Temperature`, '_domesticHotWaterTemperatureTank', {
			fixedHeatingPath: true,
		}),
	];
}

function buildMultiZoneCharacteristics(): CharacteristicDefinition[] {
	return [
		...buildMainZoneCharacteristics(),
		...buildTankZoneCharacteristics(),
	];
}

function appendMultiZoneDeviceSpecificCharacteristics(device: DaikinCloudDevice, chars: CharacteristicDefinition[]): void {
	chars.push(...gatewayDiagnosticsPack());

	const infoOnlyUnits: Array<[string, string]> = [
		['indoorUnitHydro', 'Indoor Unit Hydro'],
		['userInterface', 'User Interface'],
	];
	for (const [managementPoint, label] of infoOnlyUnits) {
		if (managementPoint in device.managementPoints) {
			chars.push(...auxiliaryUnitInfoPack(managementPoint, label));
		}
	}

	if ('outdoorUnit' in device.managementPoints) {
		chars.push(...auxiliaryUnitPack('outdoorUnit', 'Outdoor Unit'));
	}
}

export class BRP069A78 extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		const chars = buildMultiZoneCharacteristics();
		appendMultiZoneDeviceSpecificCharacteristics(device, chars);
		super(device, chars, multiZoneDeviceInfo());
	}
}

export {
	buildMultiZoneCharacteristics,
};
