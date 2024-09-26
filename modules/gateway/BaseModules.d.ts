import { Gateways } from "../../types";
declare const typeEnum: Readonly<{
    numeric: 0;
    string: 1;
    binary: 2;
}>;
declare const converterEnum: Readonly<{
    numeric: 0;
    string: 1;
    binary: 2;
    consumption: 3;
}>;
declare const consumptionEnum: Readonly<{
    heatingDay: 0;
    heatingWeek: 1;
    heatingMonth: 2;
    coolingDay: 3;
    coolingWeek: 4;
    coolingMonth: 5;
}>;
declare function convertDaikinDevice(device: any, gatewayClass: Gateways): void;
declare function eventValue(device: any, gatewayClass: Gateways, events: object): Promise<void>;
export { typeEnum, converterEnum, consumptionEnum, convertDaikinDevice, eventValue };
