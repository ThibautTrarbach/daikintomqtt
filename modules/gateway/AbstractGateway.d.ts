import { DaikinCloudDevice } from '../../daikin-cloud';
import { DevicesInformation } from '../../types';
import { CharacteristicDefinition } from './metadataRegistry';
import { ModuleDeviceMetadata } from '../../types';
declare abstract class AbstractGateway {
    _device: DevicesInformation;
    protected constructor(device: DaikinCloudDevice, characteristics: CharacteristicDefinition[], deviceMetadata: ModuleDeviceMetadata, deviceKey?: string);
    set device(value: DevicesInformation);
    get device(): DevicesInformation;
}
export { AbstractGateway, };
