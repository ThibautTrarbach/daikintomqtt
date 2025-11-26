import {Daikin2MQTT, ConfigSystem, ConfigDaikin, ConfigMQTT, ConfigPolling, ConfigHomeAssistant} from "../types";

export interface ValidationError {
	field: string;
	message: string;
	value?: any;
}

export class ConfigValidationError extends Error {
	constructor(public errors: ValidationError[]) {
		const messages = errors.map(e => `  - ${e.field}: ${e.message}${e.value !== undefined ? ` (value: ${JSON.stringify(e.value)})` : ''}`).join('\n');
		super(`Configuration validation errors:\n${messages}`);
		this.name = 'ConfigValidationError';
	}
}

/**
 * Validates complete configuration at startup
 */
export function validateConfig(config: any): void {
	const errors: ValidationError[] = [];

	// Validate base structure
	if (!config) {
		throw new ConfigValidationError([{
			field: 'config',
			message: 'Configuration is empty or does not exist'
		}]);
	}

	// Validate system section
	if (!config.system) {
		errors.push({
			field: 'system',
			message: 'System section is required'
		});
	} else {
		errors.push(...validateSystemConfig(config.system));
	}

	// Validate daikin section
	if (!config.daikin) {
		errors.push({
			field: 'daikin',
			message: 'Daikin section is required'
		});
	} else {
		errors.push(...validateDaikinConfig(config.daikin));
	}

	// Validate mqtt section
	if (!config.mqtt) {
		errors.push({
			field: 'mqtt',
			message: 'MQTT section is required'
		});
	} else {
		errors.push(...validateMQTTConfig(config.mqtt));
	}

	// Optional validation of homeassistant section
	if (config.homeassistant) {
		errors.push(...validateHomeAssistantConfig(config.homeassistant));
	}

	if (errors.length > 0) {
		throw new ConfigValidationError(errors);
	}
}

/**
 * Validates system configuration
 */
function validateSystemConfig(system: ConfigSystem): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validate logLevel
	const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
	if (!system.logLevel) {
		errors.push({
			field: 'system.logLevel',
			message: 'Log level is required',
			value: system.logLevel
		});
	} else if (!validLogLevels.includes(system.logLevel.toLowerCase())) {
		errors.push({
			field: 'system.logLevel',
			message: `Log level must be one of: ${validLogLevels.join(', ')}`,
			value: system.logLevel
		});
	}

	// Validate jeedom (must be a boolean)
	if (typeof system.jeedom !== 'boolean') {
		errors.push({
			field: 'system.jeedom',
			message: 'Value must be a boolean (true/false)',
			value: system.jeedom
		});
	}

	// Validate polling section if present
	if (system.polling) {
		errors.push(...validatePollingConfig(system.polling));
	}

	return errors;
}

/**
 * Validates polling configuration
 */
function validatePollingConfig(polling: ConfigPolling): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validate dayInterval
	if (polling.dayInterval === undefined || polling.dayInterval === null) {
		errors.push({
			field: 'system.polling.dayInterval',
			message: 'Day polling interval is required',
			value: polling.dayInterval
		});
	} else if (typeof polling.dayInterval !== 'number' || polling.dayInterval <= 0) {
		errors.push({
			field: 'system.polling.dayInterval',
			message: 'Day polling interval must be a positive number (in minutes)',
			value: polling.dayInterval
		});
	} else if (polling.dayInterval < 1 || polling.dayInterval > 1440) {
		errors.push({
			field: 'system.polling.dayInterval',
			message: 'Day polling interval must be between 1 and 1440 minutes (24h)',
			value: polling.dayInterval
		});
	}

	// Validate nightInterval
	if (polling.nightInterval === undefined || polling.nightInterval === null) {
		errors.push({
			field: 'system.polling.nightInterval',
			message: 'Night polling interval is required',
			value: polling.nightInterval
		});
	} else if (typeof polling.nightInterval !== 'number' || polling.nightInterval <= 0) {
		errors.push({
			field: 'system.polling.nightInterval',
			message: 'Night polling interval must be a positive number (in minutes)',
			value: polling.nightInterval
		});
	} else if (polling.nightInterval < 1 || polling.nightInterval > 1440) {
		errors.push({
			field: 'system.polling.nightInterval',
			message: 'Night polling interval must be between 1 and 1440 minutes (24h)',
			value: polling.nightInterval
		});
	}

	// Validate nightStart
	if (polling.nightStart === undefined || polling.nightStart === null) {
		errors.push({
			field: 'system.polling.nightStart',
			message: 'Night period start hour is required',
			value: polling.nightStart
		});
	} else if (typeof polling.nightStart !== 'number' || !Number.isInteger(polling.nightStart)) {
		errors.push({
			field: 'system.polling.nightStart',
			message: 'Night period start hour must be an integer',
			value: polling.nightStart
		});
	} else if (polling.nightStart < 0 || polling.nightStart > 23) {
		errors.push({
			field: 'system.polling.nightStart',
			message: 'Night period start hour must be between 0 and 23',
			value: polling.nightStart
		});
	}

	// Validate nightEnd
	if (polling.nightEnd === undefined || polling.nightEnd === null) {
		errors.push({
			field: 'system.polling.nightEnd',
			message: 'Night period end hour is required',
			value: polling.nightEnd
		});
	} else if (typeof polling.nightEnd !== 'number' || !Number.isInteger(polling.nightEnd)) {
		errors.push({
			field: 'system.polling.nightEnd',
			message: 'Night period end hour must be an integer',
			value: polling.nightEnd
		});
	} else if (polling.nightEnd < 0 || polling.nightEnd > 23) {
		errors.push({
			field: 'system.polling.nightEnd',
			message: 'Night period end hour must be between 0 and 23',
			value: polling.nightEnd
		});
	}

	return errors;
}

/**
 * Validates Daikin configuration
 */
function validateDaikinConfig(daikin: ConfigDaikin): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validate clientID
	if (!daikin.clientID || typeof daikin.clientID !== 'string' || daikin.clientID.trim().length === 0) {
		errors.push({
			field: 'daikin.clientID',
			message: 'Daikin clientID is required and cannot be empty',
			value: daikin.clientID
		});
	}

	// Validate clientSecret
	if (!daikin.clientSecret || typeof daikin.clientSecret !== 'string' || daikin.clientSecret.trim().length === 0) {
		errors.push({
			field: 'daikin.clientSecret',
			message: 'Daikin clientSecret is required and cannot be empty',
			value: daikin.clientSecret ? '***' : daikin.clientSecret
		});
	}

	// Validate clientURL
	if (!daikin.clientURL || typeof daikin.clientURL !== 'string' || daikin.clientURL.trim().length === 0) {
		errors.push({
			field: 'daikin.clientURL',
			message: 'Client URL is required and cannot be empty',
			value: daikin.clientURL
		});
	} else {
		const trimmedUrl = daikin.clientURL.trim();
		let isValid = false;
		
		// Try to parse as full URL (with protocol)
		try {
			const url = new URL(trimmedUrl);
			if (url.protocol === 'http:' || url.protocol === 'https:') {
				isValid = true;
			}
		} catch (e) {
			// If URL parsing fails, check if it's a valid IP address or hostname
			// IP address regex (IPv4)
			const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
			// Hostname regex (letters, numbers, dots, hyphens)
			const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
			// IPv6 regex (simplified)
			const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$|^::1$|^localhost$/;
			
			if (ipv4Regex.test(trimmedUrl) || hostnameRegex.test(trimmedUrl) || ipv6Regex.test(trimmedUrl)) {
				isValid = true;
			}
		}
		
		if (!isValid) {
			errors.push({
				field: 'daikin.clientURL',
				message: 'URL must be a valid IP address, hostname, or full URL (http:// or https://)',
				value: daikin.clientURL
			});
		}
	}

	// Validate clientPort
	if (daikin.clientPort === undefined || daikin.clientPort === null) {
		errors.push({
			field: 'daikin.clientPort',
			message: 'Client port is required',
			value: daikin.clientPort
		});
	} else if (typeof daikin.clientPort !== 'number' || !Number.isInteger(daikin.clientPort)) {
		errors.push({
			field: 'daikin.clientPort',
			message: 'Client port must be an integer',
			value: daikin.clientPort
		});
	} else if (daikin.clientPort < 1 || daikin.clientPort > 65535) {
		errors.push({
			field: 'daikin.clientPort',
			message: 'Client port must be between 1 and 65535',
			value: daikin.clientPort
		});
	}

	return errors;
}

/**
 * Validates MQTT configuration
 */
function validateMQTTConfig(mqtt: ConfigMQTT): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validate host
	if (!mqtt.host || typeof mqtt.host !== 'string' || mqtt.host.trim().length === 0) {
		errors.push({
			field: 'mqtt.host',
			message: 'MQTT broker IP address or hostname is required',
			value: mqtt.host
		});
	} else {
		// Basic validation of IP address or hostname
		const hostRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^\[([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}\]$/;
		if (!hostRegex.test(mqtt.host)) {
			errors.push({
				field: 'mqtt.host',
				message: 'IP address or hostname format is not valid',
				value: mqtt.host
			});
		}
	}

	// Validate port
	if (mqtt.port === undefined || mqtt.port === null) {
		errors.push({
			field: 'mqtt.port',
			message: 'MQTT broker port is required',
			value: mqtt.port
		});
	} else if (typeof mqtt.port !== 'number' || !Number.isInteger(mqtt.port)) {
		errors.push({
			field: 'mqtt.port',
			message: 'MQTT broker port must be an integer',
			value: mqtt.port
		});
	} else if (mqtt.port < 1 || mqtt.port > 65535) {
		errors.push({
			field: 'mqtt.port',
			message: 'MQTT broker port must be between 1 and 65535',
			value: mqtt.port
		});
	}

	// Validate auth
	if (typeof mqtt.auth !== 'boolean') {
		errors.push({
			field: 'mqtt.auth',
			message: 'Auth value must be a boolean (true/false)',
			value: mqtt.auth
		});
	}

	// Validate username and password if auth is true
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

	// Validate connectTimeout
	if (mqtt.connectTimeout === undefined || mqtt.connectTimeout === null) {
		errors.push({
			field: 'mqtt.connectTimeout',
			message: 'Connection timeout is required',
			value: mqtt.connectTimeout
		});
	} else if (typeof mqtt.connectTimeout !== 'number' || mqtt.connectTimeout <= 0) {
		errors.push({
			field: 'mqtt.connectTimeout',
			message: 'Connection timeout must be a positive number (in milliseconds)',
			value: mqtt.connectTimeout
		});
	} else if (mqtt.connectTimeout < 1000 || mqtt.connectTimeout > 60000) {
		errors.push({
			field: 'mqtt.connectTimeout',
			message: 'Connection timeout must be between 1000 and 60000 milliseconds',
			value: mqtt.connectTimeout
		});
	}

	// Validate reconnectPeriod
	if (mqtt.reconnectPeriod === undefined || mqtt.reconnectPeriod === null) {
		errors.push({
			field: 'mqtt.reconnectPeriod',
			message: 'Reconnection period is required',
			value: mqtt.reconnectPeriod
		});
	} else if (typeof mqtt.reconnectPeriod !== 'number' || mqtt.reconnectPeriod < 0) {
		errors.push({
			field: 'mqtt.reconnectPeriod',
			message: 'Reconnection period must be a positive number or zero (in milliseconds)',
			value: mqtt.reconnectPeriod
		});
	} else if (mqtt.reconnectPeriod > 300000) {
		errors.push({
			field: 'mqtt.reconnectPeriod',
			message: 'Reconnection period should not exceed 300000 milliseconds (5 minutes)',
			value: mqtt.reconnectPeriod
		});
	}

	// Validate topic
	if (!mqtt.topic || typeof mqtt.topic !== 'string' || mqtt.topic.trim().length === 0) {
		errors.push({
			field: 'mqtt.topic',
			message: 'Base MQTT topic is required and cannot be empty',
			value: mqtt.topic
		});
	} else {
		// Validate MQTT topic format
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

/**
 * Validates Home Assistant configuration
 */
function validateHomeAssistantConfig(homeassistant: ConfigHomeAssistant): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validate enabled
	if (typeof homeassistant.enabled !== 'boolean') {
		errors.push({
			field: 'homeassistant.enabled',
			message: 'Enabled value must be a boolean (true/false)',
			value: homeassistant.enabled
		});
	}

	// Validate discoveryPrefix if present
	if (homeassistant.discoveryPrefix !== undefined) {
		if (typeof homeassistant.discoveryPrefix !== 'string' || homeassistant.discoveryPrefix.trim().length === 0) {
			errors.push({
				field: 'homeassistant.discoveryPrefix',
				message: 'Discovery prefix must be a non-empty string',
				value: homeassistant.discoveryPrefix
			});
		} else {
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

export {
	validateSystemConfig,
	validateDaikinConfig,
	validateMQTTConfig,
	validateHomeAssistantConfig,
	validatePollingConfig
};

