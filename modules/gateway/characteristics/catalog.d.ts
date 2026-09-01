import { CharacteristicDefinition } from '../metadataRegistry';
import { ModuleDeviceMetadata } from '../../../types';
declare function standardGatewayDeviceInfo(managementPoint: string, nameDataPoint?: string): ModuleDeviceMetadata;
declare function dualZoneDeviceInfo(): ModuleDeviceMetadata;
declare function multiZoneDeviceInfo(): ModuleDeviceMetadata;
declare function consumptionPack(managementPoint: string, prefix: string, suffix?: string): CharacteristicDefinition[];
declare function stateBool(managementPoint: string, dataPoint: string, label: string, opts?: {
    settable?: boolean;
    generic_type?: string;
    propertyKey?: string;
}): CharacteristicDefinition;
declare function stringField(managementPoint: string, dataPoint: string, label: string, opts?: {
    propertyKey?: string;
    settable?: boolean;
    converter?: number;
    values?: string[];
}): CharacteristicDefinition;
declare function sensoryTemperature(managementPoint: string, dataPointPath: string, label: string, propertyKey: string, opts?: {
    minValue?: number;
    maxValue?: number;
}): CharacteristicDefinition;
declare function sensoryHumidity(managementPoint: string, label: string, propertyKey?: string): CharacteristicDefinition;
declare function operationModeClimate(managementPoint: string, values: string[], propertyKey?: string): CharacteristicDefinition;
declare function temperatureControlRoom(managementPoint: string, label: string, propertyKey: string): CharacteristicDefinition;
declare function temperatureControlLeavingWater(managementPoint: string, label: string, propertyKey: string): CharacteristicDefinition;
declare function temperatureControlLeavingWaterOffset(managementPoint: string, label: string, propertyKey: string): CharacteristicDefinition;
declare function temperatureControlDhw(managementPoint: string, label: string, propertyKey: string, opts?: {
    fixedHeatingPath?: boolean;
}): CharacteristicDefinition;
declare function fanClimatePack(managementPoint: string, opts?: {
    horizontal?: boolean;
    vertical?: boolean;
}): CharacteristicDefinition[];
declare function powerfulModeClimate(managementPoint: string): CharacteristicDefinition[];
declare function gatewayDiagnosticsPack(): CharacteristicDefinition[];
declare function auxiliaryUnitPack(managementPoint: string, labelPrefix: string): CharacteristicDefinition[];
declare function auxiliaryUnitInfoPack(managementPoint: string, labelPrefix: string): CharacteristicDefinition[];
declare function zoneStatusPack(managementPoint: string, labelPrefix: string, keySuffix: string): CharacteristicDefinition[];
export { standardGatewayDeviceInfo, dualZoneDeviceInfo, multiZoneDeviceInfo, consumptionPack, stateBool, stringField, sensoryTemperature, sensoryHumidity, operationModeClimate, temperatureControlRoom, temperatureControlLeavingWater, temperatureControlLeavingWaterOffset, temperatureControlDhw, fanClimatePack, powerfulModeClimate, gatewayDiagnosticsPack, auxiliaryUnitPack, auxiliaryUnitInfoPack, zoneStatusPack, };
