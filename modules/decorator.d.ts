import { ModuleDeviceMetadata, ModulePropertyMetadata, ModulesDescriptionMetadata } from "../types";
export declare const PROPERTY_METADATA_CMD: unique symbol;
export declare const PROPERTY_METADATA_DAIKIN: unique symbol;
export declare const PROPERTY_METADATA_DAIKIN_DEVICE: unique symbol;
export interface IAllPropertyMetadata {
    [key: string]: ModulesDescriptionMetadata | ModulePropertyMetadata | ModuleDeviceMetadata;
}
export declare function modulesDataDescription(metadata: ModulesDescriptionMetadata): PropertyDecorator;
export declare function modulesDaikinAcces(metadata: ModulePropertyMetadata): PropertyDecorator;
export declare function modulesDaikinDevice(metadata: ModuleDeviceMetadata): PropertyDecorator;
