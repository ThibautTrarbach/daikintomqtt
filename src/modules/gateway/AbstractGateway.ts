import { DaikinCloudDevice } from '../../daikin-cloud';
import { DevicesInformation } from '../../types';
import { convertDaikinDevice } from './BaseModules';
import {
	CharacteristicDefinition,
	installGatewayProperties,
	registerCharacteristics,
	registerDeviceMetadata,
} from './metadataRegistry';
import { ModuleDeviceMetadata } from '../../types';

abstract class AbstractGateway {
	_device!: DevicesInformation;

	protected constructor(
		device: DaikinCloudDevice,
		characteristics: CharacteristicDefinition[],
		deviceMetadata: ModuleDeviceMetadata,
		deviceKey = '_device',
	) {
		registerCharacteristics(this, characteristics);
		registerDeviceMetadata(this, deviceKey, deviceMetadata);
		installGatewayProperties(this, characteristics);
		convertDaikinDevice(device, this as never);
	}

	set device(value: DevicesInformation) {
		this._device = value;
	}

	get device(): DevicesInformation {
		return this._device;
	}
}

export {
	AbstractGateway,
};
