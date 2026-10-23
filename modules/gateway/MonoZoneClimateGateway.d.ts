import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { CharacteristicDefinition } from './metadataRegistry';
declare function buildMonoZoneClimateCharacteristics(): CharacteristicDefinition[];
export declare class BRP069C41 extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export declare class BRP069C8x extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export { buildMonoZoneClimateCharacteristics, };
