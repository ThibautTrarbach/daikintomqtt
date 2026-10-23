import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule } from '../../types';
import { AbstractGateway } from './AbstractGateway';
import { CharacteristicDefinition } from './metadataRegistry';
interface ExtendedMonoZoneOptions {
    warningState?: boolean;
    cautionState?: boolean;
    coolHeatMaster?: boolean;
    econoMode?: boolean;
    streamerMode?: boolean;
    intelligentEyeMode?: boolean;
    outdoorSilentMode?: boolean;
    fanHorizontal?: boolean;
    fanVertical?: boolean;
    roomTempFixedRange?: {
        minValue: number;
        maxValue: number;
    };
    humidity?: boolean;
}
declare function buildExtendedMonoZoneCharacteristics(opts: ExtendedMonoZoneOptions): CharacteristicDefinition[];
export declare class BRP069A4x extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export declare class BRP069B4x extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export declare class BRP069C4x extends AbstractGateway implements ClassModule {
    constructor(device: DaikinCloudDevice);
}
export { buildExtendedMonoZoneCharacteristics, };
