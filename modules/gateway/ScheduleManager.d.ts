import { DaikinCloudDevice } from "../../daikin-cloud";
declare function requestPut(device: DaikinCloudDevice, path: string, body: object): Promise<void>;
declare function enableSchedule(device: DaikinCloudDevice, embeddedId: string, enabled: boolean): Promise<void>;
declare function setAwayPreset(device: DaikinCloudDevice): Promise<void>;
export { enableSchedule, setAwayPreset, requestPut, };
