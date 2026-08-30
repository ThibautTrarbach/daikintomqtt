import "reflect-metadata";
import { DaikinCloudDevice } from "../../daikin-cloud";
import { ClassModule, DevicesInformation, ModulePropertyMetadata, ModulesDescriptionMetadata } from "../../types";
export interface DynamicCharacteristicDef {
    key: string;
    managementPoint: string;
    dataPoint: string;
    dataPointPath?: string;
    settable: boolean;
    cmdMeta: ModulesDescriptionMetadata;
    daikinMeta: ModulePropertyMetadata;
}
export declare class DynamicGateway implements ClassModule {
    readonly isDynamic = true;
    _device: DevicesInformation;
    private characteristics;
    constructor(device: DaikinCloudDevice);
    get device(): DevicesInformation;
    set device(value: DevicesInformation);
    getCharacteristicDefs(): DynamicCharacteristicDef[];
    isDynamicGateway(): boolean;
    buildFromDevice(device: DaikinCloudDevice): void;
    private addFirmwareMetadata;
    private addScheduleReadMetadata;
    resolveCharacteristic(key: string): DynamicCharacteristicDef | undefined;
}
