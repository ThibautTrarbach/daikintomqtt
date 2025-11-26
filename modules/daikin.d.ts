import { SystemBridge } from "./gateway";
import { DaikinCloudDevice } from "daikin-controller-cloud/dist/device";
declare function loadDaikinAPI(): Promise<void>;
declare function startDaikinAPI(): Promise<void>;
declare function subscribeDevices(devices: DaikinCloudDevice[]): Promise<void>;
declare function sendDevice(devices?: DaikinCloudDevice[] | null, cron?: boolean): Promise<void>;
declare function timeUpdate(): Promise<void>;
declare function generateConfig(devices: DaikinCloudDevice[]): Promise<void>;
declare function getDevices(force?: boolean): Promise<any>;
declare function updateSystemBridge(rateLimitStatus?: any, devices?: DaikinCloudDevice[] | null, authorizationInfo?: {
    authorizationUrl?: string;
    authorizationRequest?: boolean;
    authorizationTimeout?: boolean;
}, existingBridge?: SystemBridge): Promise<void>;
export { loadDaikinAPI, subscribeDevices, generateConfig, sendDevice, startDaikinAPI, getDevices, timeUpdate, updateSystemBridge };
