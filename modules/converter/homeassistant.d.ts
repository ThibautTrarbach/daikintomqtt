import { DaikinCloudDevice } from "daikin-controller-cloud/dist/device";
interface HomeAssistantDevice {
    identifiers: string[];
    name: string;
    manufacturer?: string;
    model?: string;
    sw_version?: string;
    via_device?: string;
}
interface HomeAssistantOrigin {
    name: string;
    sw: string;
    url?: string;
}
interface HomeAssistantDiscoveryConfig {
    device: HomeAssistantDevice;
    origin?: HomeAssistantOrigin;
    availability?: Array<{
        topic: string;
        payload_available?: string;
        payload_not_available?: string;
    }>;
    [key: string]: any;
}
declare function generateHADiscovery(data: object, modules: object, device: DaikinCloudDevice): {
    [componentType: string]: {
        [objectId: string]: HomeAssistantDiscoveryConfig;
    };
};
export { generateHADiscovery };
