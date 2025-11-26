"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = void 0;
exports.validateConfig = validateConfig;
exports.validateSystemConfig = validateSystemConfig;
exports.validateDaikinConfig = validateDaikinConfig;
exports.validateMQTTConfig = validateMQTTConfig;
exports.validateHomeAssistantConfig = validateHomeAssistantConfig;
exports.validatePollingConfig = validatePollingConfig;
class ConfigValidationError extends Error {
    errors;
    constructor(errors) {
        const messages = errors.map(e => `  - ${e.field}: ${e.message}${e.value !== undefined ? ` (value: ${JSON.stringify(e.value)})` : ''}`).join('\n');
        super(`Configuration validation errors:\n${messages}`);
        this.errors = errors;
        this.name = 'ConfigValidationError';
    }
}
exports.ConfigValidationError = ConfigValidationError;
function validateConfig(config) {
    const errors = [];
    if (!config) {
        throw new ConfigValidationError([{
                field: 'config',
                message: 'Configuration is empty or does not exist'
            }]);
    }
    if (!config.system) {
        errors.push({
            field: 'system',
            message: 'System section is required'
        });
    }
    else {
        errors.push(...validateSystemConfig(config.system));
    }
    if (!config.daikin) {
        errors.push({
            field: 'daikin',
            message: 'Daikin section is required'
        });
    }
    else {
        errors.push(...validateDaikinConfig(config.daikin));
    }
    if (!config.mqtt) {
        errors.push({
            field: 'mqtt',
            message: 'MQTT section is required'
        });
    }
    else {
        errors.push(...validateMQTTConfig(config.mqtt));
    }
    if (config.homeassistant) {
        errors.push(...validateHomeAssistantConfig(config.homeassistant));
    }
    if (errors.length > 0) {
        throw new ConfigValidationError(errors);
    }
}
function validateSystemConfig(system) {
    const errors = [];
    const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
    if (!system.logLevel) {
        errors.push({
            field: 'system.logLevel',
            message: 'Log level is required',
            value: system.logLevel
        });
    }
    else if (!validLogLevels.includes(system.logLevel.toLowerCase())) {
        errors.push({
            field: 'system.logLevel',
            message: `Log level must be one of: ${validLogLevels.join(', ')}`,
            value: system.logLevel
        });
    }
    if (typeof system.jeedom !== 'boolean') {
        errors.push({
            field: 'system.jeedom',
            message: 'Value must be a boolean (true/false)',
            value: system.jeedom
        });
    }
    if (system.polling) {
        errors.push(...validatePollingConfig(system.polling));
    }
    return errors;
}
function validatePollingConfig(polling) {
    const errors = [];
    if (polling.dayInterval === undefined || polling.dayInterval === null) {
        errors.push({
            field: 'system.polling.dayInterval',
            message: 'Day polling interval is required',
            value: polling.dayInterval
        });
    }
    else if (typeof polling.dayInterval !== 'number' || polling.dayInterval <= 0) {
        errors.push({
            field: 'system.polling.dayInterval',
            message: 'Day polling interval must be a positive number (in minutes)',
            value: polling.dayInterval
        });
    }
    else if (polling.dayInterval < 1 || polling.dayInterval > 1440) {
        errors.push({
            field: 'system.polling.dayInterval',
            message: 'Day polling interval must be between 1 and 1440 minutes (24h)',
            value: polling.dayInterval
        });
    }
    if (polling.nightInterval === undefined || polling.nightInterval === null) {
        errors.push({
            field: 'system.polling.nightInterval',
            message: 'Night polling interval is required',
            value: polling.nightInterval
        });
    }
    else if (typeof polling.nightInterval !== 'number' || polling.nightInterval <= 0) {
        errors.push({
            field: 'system.polling.nightInterval',
            message: 'Night polling interval must be a positive number (in minutes)',
            value: polling.nightInterval
        });
    }
    else if (polling.nightInterval < 1 || polling.nightInterval > 1440) {
        errors.push({
            field: 'system.polling.nightInterval',
            message: 'Night polling interval must be between 1 and 1440 minutes (24h)',
            value: polling.nightInterval
        });
    }
    if (polling.nightStart === undefined || polling.nightStart === null) {
        errors.push({
            field: 'system.polling.nightStart',
            message: 'Night period start hour is required',
            value: polling.nightStart
        });
    }
    else if (typeof polling.nightStart !== 'number' || !Number.isInteger(polling.nightStart)) {
        errors.push({
            field: 'system.polling.nightStart',
            message: 'Night period start hour must be an integer',
            value: polling.nightStart
        });
    }
    else if (polling.nightStart < 0 || polling.nightStart > 23) {
        errors.push({
            field: 'system.polling.nightStart',
            message: 'Night period start hour must be between 0 and 23',
            value: polling.nightStart
        });
    }
    if (polling.nightEnd === undefined || polling.nightEnd === null) {
        errors.push({
            field: 'system.polling.nightEnd',
            message: 'Night period end hour is required',
            value: polling.nightEnd
        });
    }
    else if (typeof polling.nightEnd !== 'number' || !Number.isInteger(polling.nightEnd)) {
        errors.push({
            field: 'system.polling.nightEnd',
            message: 'Night period end hour must be an integer',
            value: polling.nightEnd
        });
    }
    else if (polling.nightEnd < 0 || polling.nightEnd > 23) {
        errors.push({
            field: 'system.polling.nightEnd',
            message: 'Night period end hour must be between 0 and 23',
            value: polling.nightEnd
        });
    }
    return errors;
}
function validateDaikinConfig(daikin) {
    const errors = [];
    if (!daikin.clientID || typeof daikin.clientID !== 'string' || daikin.clientID.trim().length === 0) {
        errors.push({
            field: 'daikin.clientID',
            message: 'Daikin clientID is required and cannot be empty',
            value: daikin.clientID
        });
    }
    if (!daikin.clientSecret || typeof daikin.clientSecret !== 'string' || daikin.clientSecret.trim().length === 0) {
        errors.push({
            field: 'daikin.clientSecret',
            message: 'Daikin clientSecret is required and cannot be empty',
            value: daikin.clientSecret ? '***' : daikin.clientSecret
        });
    }
    if (!daikin.clientURL || typeof daikin.clientURL !== 'string' || daikin.clientURL.trim().length === 0) {
        errors.push({
            field: 'daikin.clientURL',
            message: 'Client URL is required and cannot be empty',
            value: daikin.clientURL
        });
    }
    else {
        try {
            const url = new URL(daikin.clientURL);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                errors.push({
                    field: 'daikin.clientURL',
                    message: 'URL must use http or https protocol',
                    value: daikin.clientURL
                });
            }
        }
        catch (e) {
            errors.push({
                field: 'daikin.clientURL',
                message: 'URL is not valid',
                value: daikin.clientURL
            });
        }
    }
    if (daikin.clientPort === undefined || daikin.clientPort === null) {
        errors.push({
            field: 'daikin.clientPort',
            message: 'Client port is required',
            value: daikin.clientPort
        });
    }
    else if (typeof daikin.clientPort !== 'number' || !Number.isInteger(daikin.clientPort)) {
        errors.push({
            field: 'daikin.clientPort',
            message: 'Client port must be an integer',
            value: daikin.clientPort
        });
    }
    else if (daikin.clientPort < 1 || daikin.clientPort > 65535) {
        errors.push({
            field: 'daikin.clientPort',
            message: 'Client port must be between 1 and 65535',
            value: daikin.clientPort
        });
    }
    return errors;
}
function validateMQTTConfig(mqtt) {
    const errors = [];
    if (!mqtt.host || typeof mqtt.host !== 'string' || mqtt.host.trim().length === 0) {
        errors.push({
            field: 'mqtt.host',
            message: 'MQTT broker IP address or hostname is required',
            value: mqtt.host
        });
    }
    else {
        const hostRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^\[([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}\]$/;
        if (!hostRegex.test(mqtt.host)) {
            errors.push({
                field: 'mqtt.host',
                message: 'IP address or hostname format is not valid',
                value: mqtt.host
            });
        }
    }
    if (mqtt.port === undefined || mqtt.port === null) {
        errors.push({
            field: 'mqtt.port',
            message: 'MQTT broker port is required',
            value: mqtt.port
        });
    }
    else if (typeof mqtt.port !== 'number' || !Number.isInteger(mqtt.port)) {
        errors.push({
            field: 'mqtt.port',
            message: 'MQTT broker port must be an integer',
            value: mqtt.port
        });
    }
    else if (mqtt.port < 1 || mqtt.port > 65535) {
        errors.push({
            field: 'mqtt.port',
            message: 'MQTT broker port must be between 1 and 65535',
            value: mqtt.port
        });
    }
    if (typeof mqtt.auth !== 'boolean') {
        errors.push({
            field: 'mqtt.auth',
            message: 'Auth value must be a boolean (true/false)',
            value: mqtt.auth
        });
    }
    if (mqtt.auth === true) {
        if (!mqtt.username || typeof mqtt.username !== 'string' || mqtt.username.trim().length === 0) {
            errors.push({
                field: 'mqtt.username',
                message: 'MQTT username is required when auth is enabled',
                value: mqtt.username
            });
        }
        if (!mqtt.password || typeof mqtt.password !== 'string' || mqtt.password.trim().length === 0) {
            errors.push({
                field: 'mqtt.password',
                message: 'MQTT password is required when auth is enabled',
                value: mqtt.password ? '***' : mqtt.password
            });
        }
    }
    if (mqtt.connectTimeout === undefined || mqtt.connectTimeout === null) {
        errors.push({
            field: 'mqtt.connectTimeout',
            message: 'Connection timeout is required',
            value: mqtt.connectTimeout
        });
    }
    else if (typeof mqtt.connectTimeout !== 'number' || mqtt.connectTimeout <= 0) {
        errors.push({
            field: 'mqtt.connectTimeout',
            message: 'Connection timeout must be a positive number (in milliseconds)',
            value: mqtt.connectTimeout
        });
    }
    else if (mqtt.connectTimeout < 1000 || mqtt.connectTimeout > 60000) {
        errors.push({
            field: 'mqtt.connectTimeout',
            message: 'Connection timeout must be between 1000 and 60000 milliseconds',
            value: mqtt.connectTimeout
        });
    }
    if (mqtt.reconnectPeriod === undefined || mqtt.reconnectPeriod === null) {
        errors.push({
            field: 'mqtt.reconnectPeriod',
            message: 'Reconnection period is required',
            value: mqtt.reconnectPeriod
        });
    }
    else if (typeof mqtt.reconnectPeriod !== 'number' || mqtt.reconnectPeriod < 0) {
        errors.push({
            field: 'mqtt.reconnectPeriod',
            message: 'Reconnection period must be a positive number or zero (in milliseconds)',
            value: mqtt.reconnectPeriod
        });
    }
    else if (mqtt.reconnectPeriod > 300000) {
        errors.push({
            field: 'mqtt.reconnectPeriod',
            message: 'Reconnection period should not exceed 300000 milliseconds (5 minutes)',
            value: mqtt.reconnectPeriod
        });
    }
    if (!mqtt.topic || typeof mqtt.topic !== 'string' || mqtt.topic.trim().length === 0) {
        errors.push({
            field: 'mqtt.topic',
            message: 'Base MQTT topic is required and cannot be empty',
            value: mqtt.topic
        });
    }
    else {
        const topicRegex = /^[^#+$]+$/;
        if (!topicRegex.test(mqtt.topic)) {
            errors.push({
                field: 'mqtt.topic',
                message: 'MQTT topic cannot contain characters #, + or $',
                value: mqtt.topic
            });
        }
    }
    return errors;
}
function validateHomeAssistantConfig(homeassistant) {
    const errors = [];
    if (typeof homeassistant.enabled !== 'boolean') {
        errors.push({
            field: 'homeassistant.enabled',
            message: 'Enabled value must be a boolean (true/false)',
            value: homeassistant.enabled
        });
    }
    if (homeassistant.discoveryPrefix !== undefined) {
        if (typeof homeassistant.discoveryPrefix !== 'string' || homeassistant.discoveryPrefix.trim().length === 0) {
            errors.push({
                field: 'homeassistant.discoveryPrefix',
                message: 'Discovery prefix must be a non-empty string',
                value: homeassistant.discoveryPrefix
            });
        }
        else {
            const prefixRegex = /^[a-zA-Z0-9_-]+$/;
            if (!prefixRegex.test(homeassistant.discoveryPrefix)) {
                errors.push({
                    field: 'homeassistant.discoveryPrefix',
                    message: 'Discovery prefix can only contain letters, numbers, dashes and underscores',
                    value: homeassistant.discoveryPrefix
                });
            }
        }
    }
    return errors;
}
//# sourceMappingURL=configValidator.js.map