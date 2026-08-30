import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { CharacteristicDefinition } from './metadataRegistry';
interface DualZoneOptions {
    zone1Extended?: boolean;
}
declare function buildDualZoneCharacteristics(opts: DualZoneOptions): CharacteristicDefinition[];
export declare class BRP069A61 extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export declare class BRP069A62 extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export { buildDualZoneCharacteristics, };
