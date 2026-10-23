import { DaikinCloudDevice } from '../../daikin-cloud';
import type { DeviceAccessMode, DeviceControlPath } from '../../types';
import type { LocalBinding, LocalDeviceRegistry } from './LocalDeviceRegistry';
import { LocalHttpClient, type LanKeyValue } from './LocalHttpClient';
export interface DeviceLocalMeta {
    accessMode: DeviceAccessMode;
    controlPath: DeviceControlPath;
    ip?: string;
    lastControl?: LanKeyValue;
    localOnly: boolean;
}
export declare function getDeviceLocalMeta(device: DaikinCloudDevice): DeviceLocalMeta | undefined;
export declare function setDeviceLocalMeta(device: DaikinCloudDevice, meta: DeviceLocalMeta): void;
export declare function createLocalOnlyDevice(ip: string, client: LocalHttpClient, cloudStub: {
    requestResource: (...args: any[]) => Promise<any>;
}): Promise<DaikinCloudDevice>;
export declare function attachLocalTransport(device: DaikinCloudDevice, client: LocalHttpClient, binding: LocalBinding): void;
export declare function attachLocalToCloudDevices(devices: DaikinCloudDevice[], registry: LocalDeviceRegistry): Promise<void>;
export declare function loadLocalOnlyDevices(registry: LocalDeviceRegistry): Promise<DaikinCloudDevice[]>;
