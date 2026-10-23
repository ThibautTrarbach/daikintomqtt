import type { ConfigDaikinLocal, DeviceAccessMode, DeviceControlPath } from '../../types';
import { LocalHttpClient } from './LocalHttpClient';
export interface LocalBinding {
    ip: string;
    deviceId?: string;
    accessMode: DeviceAccessMode;
    controlPath: DeviceControlPath;
    lastProbeOk?: boolean;
    lastProbeAt?: number;
    mac?: string;
    modelInfo?: string;
    fromOverride?: boolean;
}
export declare class LocalDeviceRegistry {
    readonly client: LocalHttpClient;
    readonly enabled: boolean;
    readonly probeIntervalMs: number;
    private hybrid;
    private localOnly;
    private pendingLocalIps;
    constructor(localConfig: ConfigDaikinLocal | undefined);
    hasOverride(deviceId: string): boolean;
    getPendingLocalIps(): string[];
    clearPendingLocalIp(ip: string): void;
    registerLocalOnly(binding: LocalBinding): void;
    getLocalOnlyDevices(): LocalBinding[];
    getHybridBinding(deviceId: string): LocalBinding | undefined;
    getBinding(deviceId: string): LocalBinding | undefined;
    resolveHybridIp(deviceId: string, modelInfo: string | null | undefined, cloudIp: string | null | undefined): string | null;
    ensureHybridBinding(deviceId: string, ip: string, modelInfo?: string): LocalBinding;
    markProbe(deviceId: string, ok: boolean): void;
    shouldReprobe(deviceId: string): boolean;
    isLocalOnlyId(deviceId: string): boolean;
}
export declare function initLocalDeviceRegistry(localConfig: ConfigDaikinLocal | undefined): LocalDeviceRegistry;
export declare function getLocalDeviceRegistry(): LocalDeviceRegistry | null;
