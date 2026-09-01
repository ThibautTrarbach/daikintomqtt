import { Gateways } from "../../types";
import { consumptionEnum, converterEnum, typeEnum } from "./typeConstants";
export { consumptionEnum, converterEnum, typeEnum };
declare function convertDaikinDevice(device: any, gatewayClass: Gateways): void;
declare function eventValue(device: any, gatewayClass: Gateways, events: object): Promise<void>;
export { convertDaikinDevice, eventValue };
