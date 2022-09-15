import {ModuleDeviceMetadata, ModulePropertyMetadata, ModulesDescriptionMetadata} from "../types";

export const PROPERTY_METADATA_CMD = Symbol("PROPERTY_METADATA_CMD");
export const PROPERTY_METADATA_DAIKIN = Symbol("PROPERTY_METADATA_DAIKIN");
export const PROPERTY_METADATA_DAIKIN_DEVICE = Symbol("PROPERTY_METADATA_DAIKIN_DEVICE");

export interface IAllPropertyMetadata {
    [key: string]: ModulesDescriptionMetadata|ModulePropertyMetadata|ModuleDeviceMetadata;
}

export function modulesDataDescription(metadata: ModulesDescriptionMetadata): PropertyDecorator {
    return function (target: Object,
                     propertyKey: string | symbol): void {
        const allMetadata = Reflect.getMetadata(PROPERTY_METADATA_CMD, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key)=>{
            // @ts-ignore
            allMetadata[propertyKey][key] = (metadata as IAllPropertyMetadata)[String(key)];
        });

        Reflect.defineMetadata(
            PROPERTY_METADATA_CMD,
            allMetadata,
            target,
        );
    }
}

export function modulesDaikinAcces(metadata: ModulePropertyMetadata): PropertyDecorator {
    return function (target: Object,
                     propertyKey: string | symbol): void {
        const allMetadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key)=>{
            // @ts-ignore
            allMetadata[propertyKey][key] = (metadata as IAllPropertyMetadata)[String(key)];
        });

        Reflect.defineMetadata(
            PROPERTY_METADATA_DAIKIN,
            allMetadata,
            target,
        );
    }
}

export function modulesDaikinDevice(metadata: ModuleDeviceMetadata): PropertyDecorator {
    return function (target: Object,
                     propertyKey: string | symbol): void {
        const allMetadata = Reflect.getMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, target) || {};
        allMetadata[propertyKey] = allMetadata[propertyKey] || {};
        const ownKeys = Reflect.ownKeys(metadata);
        ownKeys.forEach((key)=>{
            // @ts-ignore
            allMetadata[propertyKey][key] = (metadata as IAllPropertyMetadata)[String(key)];
        });

        Reflect.defineMetadata(
            PROPERTY_METADATA_DAIKIN_DEVICE,
            allMetadata,
            target,
        );
    }
}
