import 'reflect-metadata';
import { ModuleDeviceMetadata, ModulePropertyMetadata, ModulesDescriptionMetadata } from '../../types';
interface CharacteristicDefinition {
    propertyKey: string;
    daikin: ModulePropertyMetadata;
    description: ModulesDescriptionMetadata;
}
declare function registerCharacteristic(target: object, def: CharacteristicDefinition): void;
declare function registerCharacteristics(target: object, defs: CharacteristicDefinition[]): void;
declare function registerDeviceMetadata(target: object, deviceKey: string, metadata: ModuleDeviceMetadata): void;
declare function installGatewayProperties(target: object, defs: CharacteristicDefinition[]): void;
export type { CharacteristicDefinition, };
export { registerCharacteristic, registerCharacteristics, registerDeviceMetadata, installGatewayProperties, };
