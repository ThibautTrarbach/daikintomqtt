import 'reflect-metadata';
import { DaikinCloudDevice } from '../../daikin-cloud';
import { ClassModule, DevicesInformation } from '../../types';
export declare class UnsupportedGateway implements ClassModule {
    readonly isUnsupported = true;
    _device: DevicesInformation;
    constructor(device: DaikinCloudDevice);
    get device(): DevicesInformation;
    set device(value: DevicesInformation);
    isUnsupportedGateway(): boolean;
}
