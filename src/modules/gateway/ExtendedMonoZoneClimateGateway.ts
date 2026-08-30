import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { CharacteristicDefinition } from './metadataRegistry';
import {
	consumptionPack,
	fanClimatePack,
	operationModeClimate,
	sensoryHumidity,
	sensoryTemperature,
	standardGatewayDeviceInfo,
	stateBool,
	temperatureControlRoom,
} from './characteristics/catalog';

const MP = 'climateControl';
const OPERATION_MODES = ['fanOnly', 'heating', 'cooling', 'auto', 'dry'];

interface ExtendedMonoZoneOptions {
	warningState?: boolean;
	cautionState?: boolean;
	coolHeatMaster?: boolean;
	econoMode?: boolean;
	streamerMode?: boolean;
	outdoorSilentMode?: boolean;
	fanHorizontal?: boolean;
	fanVertical?: boolean;
	roomTempFixedRange?: { minValue: number; maxValue: number };
	humidity?: boolean;
}

function buildExtendedMonoZoneCharacteristics(opts: ExtendedMonoZoneOptions): CharacteristicDefinition[] {
	const chars: CharacteristicDefinition[] = [
		stateBool(MP, 'isHolidayModeActive', 'Holiday Mode'),
		stateBool(MP, 'isInErrorState', 'Error State'),
	];

	if (opts.warningState) {
		chars.push(stateBool(MP, 'isInWarningState', 'Warning State'));
	}

	chars.push(stateBool(MP, 'isInModeConflict', 'Conflict State'));

	if (opts.cautionState) {
		chars.push(stateBool(MP, 'isInCautionState', 'Caution State'));
	}

	if (opts.coolHeatMaster) {
		chars.push(stateBool(MP, 'isCoolHeatMaster', 'Master'));
	}

	chars.push(
		operationModeClimate(MP, OPERATION_MODES),
		stateBool(MP, 'onOffMode', 'State', { settable: true, generic_type: 'ENERGY_STATE' }),
	);

	if (opts.econoMode) {
		chars.push(stateBool(MP, 'econoMode', 'Eco Mode', { settable: true, generic_type: 'ENERGY_STATE' }));
	}

	chars.push(stateBool(MP, 'powerfulMode', 'Powerful Mode', { settable: true, generic_type: 'ENERGY_STATE' }));

	if (opts.streamerMode) {
		chars.push(stateBool(MP, 'streamerMode', 'Streamer Mode', { settable: true, generic_type: 'ENERGY_STATE' }));
	}

	chars.push(
		sensoryTemperature(
			MP,
			'/roomTemperature',
			'Room Temperature',
			'_roomTemperature',
			opts.roomTempFixedRange ?? {},
		),
	);

	if (opts.humidity !== false) {
		chars.push(sensoryHumidity(MP, 'Room Humidity'));
	}

	chars.push(sensoryTemperature(MP, '/outdoorTemperature', 'Outdoor Temperature', '_outdoorTemperature'));

	if (opts.outdoorSilentMode) {
		chars.push(stateBool(MP, 'outdoorSilentMode', 'Outdoor Silent', {
			settable: true,
			generic_type: 'ENERGY_STATE',
			propertyKey: '_outdoorSilentMode',
		}));
	}

	chars.push(temperatureControlRoom(MP, 'Temperature Control', '_temperatureControl'));

	if (opts.fanHorizontal || opts.fanVertical) {
		chars.push(...fanClimatePack(MP, { horizontal: opts.fanHorizontal, vertical: opts.fanVertical }));
	}

	chars.push(...consumptionPack(MP, ''));

	return chars;
}

const A4X_OPTS: ExtendedMonoZoneOptions = {
	warningState: true,
	cautionState: true,
	fanVertical: true,
	roomTempFixedRange: { minValue: 10, maxValue: 30 },
};

const B4X_OPTS: ExtendedMonoZoneOptions = {
	econoMode: true,
	streamerMode: true,
	fanHorizontal: true,
	fanVertical: true,
};

const C4X_OPTS: ExtendedMonoZoneOptions = {
	warningState: true,
	cautionState: true,
	coolHeatMaster: true,
	econoMode: true,
	streamerMode: true,
	outdoorSilentMode: true,
	fanHorizontal: true,
	fanVertical: true,
};

export class BRP069A4x extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildExtendedMonoZoneCharacteristics(A4X_OPTS), standardGatewayDeviceInfo(MP));
	}
}

export class BRP069B4x extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildExtendedMonoZoneCharacteristics(B4X_OPTS), standardGatewayDeviceInfo(MP));
	}
}

export class BRP069C4x extends AbstractGateway implements ClassModule {
	constructor(device: DaikinCloudDevice) {
		super(device, buildExtendedMonoZoneCharacteristics(C4X_OPTS), standardGatewayDeviceInfo(MP));
	}
}

export {
	buildExtendedMonoZoneCharacteristics,
};
