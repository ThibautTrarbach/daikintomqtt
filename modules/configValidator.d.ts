import { ConfigSystem, ConfigDaikin, ConfigMQTT, ConfigPolling, ConfigHomeAssistant } from "../types";
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export declare class ConfigValidationError extends Error {
    errors: ValidationError[];
    constructor(errors: ValidationError[]);
}
export declare function validateConfig(config: any): void;
declare function validateSystemConfig(system: ConfigSystem): ValidationError[];
declare function validatePollingConfig(polling: ConfigPolling): ValidationError[];
declare function validateDaikinConfig(daikin: ConfigDaikin): ValidationError[];
declare function validateMQTTConfig(mqtt: ConfigMQTT): ValidationError[];
declare function validateHomeAssistantConfig(homeassistant: ConfigHomeAssistant): ValidationError[];
export { validateSystemConfig, validateDaikinConfig, validateMQTTConfig, validateHomeAssistantConfig, validatePollingConfig };
