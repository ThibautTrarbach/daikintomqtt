import { BRP069A4x, BRP069A61, BRP069A62, BRP069A78, BRP069B4x, BRP069C41, BRP069C4x, BRP069C8x, DynamicGateway, SystemBridge } from "./gateway";
import { DaikinCloudDevice } from "../daikin-cloud";
declare function loadDaikinAPI(): Promise<void>;
declare function startDaikinAPI(): Promise<void>;
declare function subscribeDevices(devices: DaikinCloudDevice[]): Promise<void>;
declare function sendDevice(devices?: DaikinCloudDevice[] | null, cron?: boolean, reason?: string, onlyDeviceIds?: string[]): Promise<void>;
declare function getModels(devices: any): BRP069C4x | BRP069A62 | BRP069A78 | BRP069B4x | BRP069A4x | BRP069C41 | BRP069A61 | BRP069C8x | DynamicGateway | undefined;
declare function generateConfig(devices: DaikinCloudDevice[]): Promise<void>;
declare function getDevices(force?: boolean, reason?: string): Promise<DaikinCloudDevice[]>;
declare function updateSystemBridge(rateLimitStatus?: any, devices?: DaikinCloudDevice[] | null, authorizationInfo?: {
    authorizationUrl?: string;
    authorizationRequest?: boolean;
    authorizationTimeout?: boolean;
}, existingBridge?: SystemBridge): Promise<void>;
export { loadDaikinAPI, subscribeDevices, generateConfig, sendDevice, startDaikinAPI, getDevices, updateSystemBridge, getModels, disableDaikinWebSocket, };
declare function disableDaikinWebSocket(): Promise<void>;
