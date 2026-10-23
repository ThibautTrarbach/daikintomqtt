import type { LanKeyValue } from './LocalHttpClient';
export type CloudOperationMode = 'auto' | 'dry' | 'cooling' | 'heating' | 'fanOnly';
export type CloudOnOff = 'on' | 'off';
export type CloudFanMode = 'auto' | 'quiet' | 'fixed';
export type CloudSwing = 'stop' | 'swing';
export interface LanClimateState {
    onOffMode: CloudOnOff;
    operationMode: CloudOperationMode;
    targetTemperature: number | null;
    humiditySetpoint: number | null;
    fanMode: CloudFanMode;
    fanFixed: number | null;
    swingVertical: CloudSwing;
    swingHorizontal: CloudSwing;
    roomTemperature: number | null;
    outdoorTemperature: number | null;
    roomHumidity: number | null;
    rawControl: LanKeyValue;
}
export declare function docModeToCloud(mode: string | undefined): CloudOperationMode;
export declare function cloudModeToDoc(mode: CloudOperationMode): string;
export declare function docPowToCloud(pow: string | undefined): CloudOnOff;
export declare function cloudOnOffToDoc(value: CloudOnOff): string;
export declare function docFanToCloud(fRate: string | undefined): {
    mode: CloudFanMode;
    fixed: number | null;
};
export declare function cloudFanToDoc(mode: CloudFanMode, fixed: number | null): string;
export declare function docDirToCloud(fDir: string | undefined): {
    vertical: CloudSwing;
    horizontal: CloudSwing;
};
export declare function cloudDirToDoc(vertical: CloudSwing, horizontal: CloudSwing): string;
export declare function mapLanToClimateState(control: LanKeyValue, sensor?: LanKeyValue): LanClimateState;
export declare function applyCloudWriteToLanControl(current: LanKeyValue, write: {
    managementPoint: string;
    dataPoint: string;
    dataPointPath?: string;
    value: unknown;
}): LanKeyValue | null;
export declare function buildLanDeviceDescription(opts: {
    deviceId: string;
    name: string;
    modelInfo: string;
    macAddress?: string;
    ipAddress: string;
    firmwareVersion?: string;
    climate: LanClimateState;
}): Record<string, unknown>;
export declare function applyClimateStateToManagementPoints(managementPoints: Record<string, any>, climate: LanClimateState): void;
