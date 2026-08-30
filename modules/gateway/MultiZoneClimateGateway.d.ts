import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { CharacteristicDefinition } from './metadataRegistry';
declare function buildMultiZoneCharacteristics(): CharacteristicDefinition[];
export declare class BRP069A78 extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export { buildMultiZoneCharacteristics, };
