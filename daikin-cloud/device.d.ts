import type { OnectaClient } from './onecta/oidc-client';
import { EventEmitter } from "events";
interface DaikinCloudDeviceEvents {
    "updated": [];
}
type SetDataOptions = {
    ignoreWritableCheck?: boolean;
    updateLocalData?: boolean;
};
export declare class DaikinCloudDevice extends EventEmitter<DaikinCloudDeviceEvents> {
    #private;
    desc: any;
    managementPoints: Record<string, any>;
    constructor(deviceDescription: any, client: OnectaClient);
    setDescription(desc: any): void;
    getId(): string;
    getDescription(): any;
    getLastUpdated(): Date;
    isCloudConnectionUp(): boolean;
    getData(managementPoint: any, dataPoint: any, dataPointPath: any): any;
    updateData(): Promise<boolean>;
    applyWebSocketUpdate(embeddedId: string, characteristicName: string, data: {
        value: unknown;
        ref?: string;
    }): boolean;
    setData(managementPoint: any, dataPoint: any, dataPointPath: any, value: any, options?: SetDataOptions | boolean): Promise<boolean>;
    isFirmwareUpdateAvailable(): boolean;
    getFirmwareUpdateDetails(): any;
    getFirmwareUpdateStatus(): string | null;
    updateFirmware(): Promise<void>;
}
export {};
