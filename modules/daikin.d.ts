import { SystemBridge } from "./gateway";
import { DaikinCloudDevice } from "../daikin-cloud";
import { Gateways } from "../types";
declare function clearPendingCommands(): void;
declare function clearGatewayCache(): void;
declare function loadDaikinAPI(): Promise<void>;
declare function startDaikinAPI(): Promise<void>;
declare function subscribeDevices(devices: DaikinCloudDevice[]): Promise<void>;
declare function sendDevice(devices?: DaikinCloudDevice[] | null, cron?: boolean, reason?: string, onlyDeviceIds?: string[]): Promise<void>;
declare function getModels(devices: DaikinCloudDevice): Gateways | undefined;
declare function generateConfig(devices: DaikinCloudDevice[]): Promise<void>;
declare function getDevices(force?: boolean, reason?: string): Promise<DaikinCloudDevice[]>;
declare function updateSystemBridge(rateLimitStatus?: any, devices?: DaikinCloudDevice[] | null, authorizationInfo?: {
    authorizationUrl?: string;
    authorizationRequest?: boolean;
    authorizationTimeout?: boolean;
}, existingBridge?: SystemBridge): Promise<void>;
export { loadDaikinAPI, subscribeDevices, generateConfig, sendDevice, startDaikinAPI, getDevices, updateSystemBridge, getModels, disableDaikinWebSocket, clearPendingCommands, clearGatewayCache, };
declare function disableDaikinWebSocket(): Promise<void>;
