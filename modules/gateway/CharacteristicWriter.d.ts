import { DaikinCloudDevice } from "../../daikin-cloud";
import { DynamicGateway } from "./DynamicGateway";
import { Gateways } from "../../types";
declare function isDynamicGateway(gateway: Gateways): gateway is DynamicGateway;
declare function applyDynamicEvents(device: DaikinCloudDevice, gateway: DynamicGateway, events: Record<string, unknown>): Promise<void>;
declare function applyGatewayEvents(device: DaikinCloudDevice, gateway: Gateways, events: Record<string, unknown>): Promise<void>;
export { isDynamicGateway, applyDynamicEvents, applyGatewayEvents, };
