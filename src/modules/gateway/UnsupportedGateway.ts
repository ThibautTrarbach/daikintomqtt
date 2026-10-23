import 'reflect-metadata';
import {DaikinCloudDevice} from '../../daikin-cloud';
import {ClassModule, DevicesInformation} from '../../types';
import {PROPERTY_METADATA_CMD, PROPERTY_METADATA_DAIKIN} from '../decorator';
import {registerDeviceMetadata} from './metadataRegistry';
import {standardGatewayDeviceInfo} from './characteristics/catalog';

function buildDeviceInfo(device: DaikinCloudDevice): DevicesInformation {
	const readField = (managementPoint: string, field: string): string => {
		try {
			const data = device.getData(managementPoint, field, undefined);
			return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
		} catch {
			return '';
		}
	};
	const readGateway = (field: string): string => readField('gateway', field);
	const wifiSsid = readGateway('wifiConnectionSSID') || readGateway('ssid');

	return {
		id: device.getId(),
		name: readGateway('name') || device.getId(),
		modelInfo: readGateway('modelInfo'),
		serialNumber: readGateway('serialNumber'),
		firmwareVersion: readGateway('firmwareVersion'),
		isInErrorState: readGateway('isInErrorState'),
		errorCode: '',
		timeZone: readGateway('timeZone'),
		wifiConnectionSSID: wifiSsid,
		wifiConnectionStrength: readGateway('wifiConnectionStrength'),
		ipAddress: readGateway('ipAddress'),
		macAddress: readGateway('macAddress'),
		indoorUnitSoftwareVersion: readField('indoorUnit', 'softwareVersion'),
		isCloudConnectionUp: device.isCloudConnectionUp() ? 'true' : 'false',
	};
}

export class UnsupportedGateway implements ClassModule {
	readonly isUnsupported = true;
	_device: DevicesInformation;

	constructor(device: DaikinCloudDevice) {
		this._device = buildDeviceInfo(device);
		registerDeviceMetadata(this, '_device', standardGatewayDeviceInfo('gateway'));
		Reflect.defineMetadata(PROPERTY_METADATA_CMD, {}, this);
		Reflect.defineMetadata(PROPERTY_METADATA_DAIKIN, {}, this);
	}

	get device(): DevicesInformation {
		return this._device;
	}

	set device(value: DevicesInformation) {
		this._device = value;
	}

	isUnsupportedGateway(): boolean {
		return true;
	}
}
