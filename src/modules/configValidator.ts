import {Daikin2MQTT, ConfigSystem, ConfigDaikin, ConfigMQTT, ConfigPolling, ConfigHomeAssistant} from "../types";

export interface ValidationError {
	field: string;
	message: string;
	value?: any;
}

export class ConfigValidationError extends Error {
	constructor(public errors: ValidationError[]) {
		const messages = errors.map(e => `  - ${e.field}: ${e.message}${e.value !== undefined ? ` (valeur: ${JSON.stringify(e.value)})` : ''}`).join('\n');
		super(`Erreurs de validation de configuration:\n${messages}`);
		this.name = 'ConfigValidationError';
	}
}

/**
 * Valide la configuration complète au démarrage
 */
export function validateConfig(config: any): void {
	const errors: ValidationError[] = [];

	// Validation de la structure de base
	if (!config) {
		throw new ConfigValidationError([{
			field: 'config',
			message: 'La configuration est vide ou n\'existe pas'
		}]);
	}

	// Validation de la section system
	if (!config.system) {
		errors.push({
			field: 'system',
			message: 'La section system est requise'
		});
	} else {
		errors.push(...validateSystemConfig(config.system));
	}

	// Validation de la section daikin
	if (!config.daikin) {
		errors.push({
			field: 'daikin',
			message: 'La section daikin est requise'
		});
	} else {
		errors.push(...validateDaikinConfig(config.daikin));
	}

	// Validation de la section mqtt
	if (!config.mqtt) {
		errors.push({
			field: 'mqtt',
			message: 'La section mqtt est requise'
		});
	} else {
		errors.push(...validateMQTTConfig(config.mqtt));
	}

	// Validation optionnelle de la section homeassistant
	if (config.homeassistant) {
		errors.push(...validateHomeAssistantConfig(config.homeassistant));
	}

	if (errors.length > 0) {
		throw new ConfigValidationError(errors);
	}
}

/**
 * Valide la configuration système
 */
function validateSystemConfig(system: ConfigSystem): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validation du logLevel
	const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
	if (!system.logLevel) {
		errors.push({
			field: 'system.logLevel',
			message: 'Le niveau de log est requis',
			value: system.logLevel
		});
	} else if (!validLogLevels.includes(system.logLevel.toLowerCase())) {
		errors.push({
			field: 'system.logLevel',
			message: `Le niveau de log doit être l'un des suivants: ${validLogLevels.join(', ')}`,
			value: system.logLevel
		});
	}

	// Validation de jeedom (doit être un booléen)
	if (typeof system.jeedom !== 'boolean') {
		errors.push({
			field: 'system.jeedom',
			message: 'La valeur doit être un booléen (true/false)',
			value: system.jeedom
		});
	}

	// Validation de la section polling si présente
	if (system.polling) {
		errors.push(...validatePollingConfig(system.polling));
	}

	return errors;
}

/**
 * Valide la configuration du polling
 */
function validatePollingConfig(polling: ConfigPolling): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validation de dayInterval
	if (polling.dayInterval === undefined || polling.dayInterval === null) {
		errors.push({
			field: 'system.polling.dayInterval',
			message: 'L\'intervalle de polling en journée est requis',
			value: polling.dayInterval
		});
	} else if (typeof polling.dayInterval !== 'number' || polling.dayInterval <= 0) {
		errors.push({
			field: 'system.polling.dayInterval',
			message: 'L\'intervalle de polling en journée doit être un nombre positif (en minutes)',
			value: polling.dayInterval
		});
	} else if (polling.dayInterval < 1 || polling.dayInterval > 1440) {
		errors.push({
			field: 'system.polling.dayInterval',
			message: 'L\'intervalle de polling en journée doit être entre 1 et 1440 minutes (24h)',
			value: polling.dayInterval
		});
	}

	// Validation de nightInterval
	if (polling.nightInterval === undefined || polling.nightInterval === null) {
		errors.push({
			field: 'system.polling.nightInterval',
			message: 'L\'intervalle de polling la nuit est requis',
			value: polling.nightInterval
		});
	} else if (typeof polling.nightInterval !== 'number' || polling.nightInterval <= 0) {
		errors.push({
			field: 'system.polling.nightInterval',
			message: 'L\'intervalle de polling la nuit doit être un nombre positif (en minutes)',
			value: polling.nightInterval
		});
	} else if (polling.nightInterval < 1 || polling.nightInterval > 1440) {
		errors.push({
			field: 'system.polling.nightInterval',
			message: 'L\'intervalle de polling la nuit doit être entre 1 et 1440 minutes (24h)',
			value: polling.nightInterval
		});
	}

	// Validation de nightStart
	if (polling.nightStart === undefined || polling.nightStart === null) {
		errors.push({
			field: 'system.polling.nightStart',
			message: 'L\'heure de début de la période nuit est requise',
			value: polling.nightStart
		});
	} else if (typeof polling.nightStart !== 'number' || !Number.isInteger(polling.nightStart)) {
		errors.push({
			field: 'system.polling.nightStart',
			message: 'L\'heure de début de la période nuit doit être un entier',
			value: polling.nightStart
		});
	} else if (polling.nightStart < 0 || polling.nightStart > 23) {
		errors.push({
			field: 'system.polling.nightStart',
			message: 'L\'heure de début de la période nuit doit être entre 0 et 23',
			value: polling.nightStart
		});
	}

	// Validation de nightEnd
	if (polling.nightEnd === undefined || polling.nightEnd === null) {
		errors.push({
			field: 'system.polling.nightEnd',
			message: 'L\'heure de fin de la période nuit est requise',
			value: polling.nightEnd
		});
	} else if (typeof polling.nightEnd !== 'number' || !Number.isInteger(polling.nightEnd)) {
		errors.push({
			field: 'system.polling.nightEnd',
			message: 'L\'heure de fin de la période nuit doit être un entier',
			value: polling.nightEnd
		});
	} else if (polling.nightEnd < 0 || polling.nightEnd > 23) {
		errors.push({
			field: 'system.polling.nightEnd',
			message: 'L\'heure de fin de la période nuit doit être entre 0 et 23',
			value: polling.nightEnd
		});
	}

	return errors;
}

/**
 * Valide la configuration Daikin
 */
function validateDaikinConfig(daikin: ConfigDaikin): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validation de clientID
	if (!daikin.clientID || typeof daikin.clientID !== 'string' || daikin.clientID.trim().length === 0) {
		errors.push({
			field: 'daikin.clientID',
			message: 'Le clientID Daikin est requis et ne peut pas être vide',
			value: daikin.clientID
		});
	}

	// Validation de clientSecret
	if (!daikin.clientSecret || typeof daikin.clientSecret !== 'string' || daikin.clientSecret.trim().length === 0) {
		errors.push({
			field: 'daikin.clientSecret',
			message: 'Le clientSecret Daikin est requis et ne peut pas être vide',
			value: daikin.clientSecret ? '***' : daikin.clientSecret
		});
	}

	// Validation de clientURL
	if (!daikin.clientURL || typeof daikin.clientURL !== 'string' || daikin.clientURL.trim().length === 0) {
		errors.push({
			field: 'daikin.clientURL',
			message: 'L\'URL du client est requise et ne peut pas être vide',
			value: daikin.clientURL
		});
	} else {
		// Validation du format URL
		try {
			const url = new URL(daikin.clientURL);
			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				errors.push({
					field: 'daikin.clientURL',
					message: 'L\'URL doit utiliser le protocole http ou https',
					value: daikin.clientURL
				});
			}
		} catch (e) {
			errors.push({
				field: 'daikin.clientURL',
				message: 'L\'URL n\'est pas valide',
				value: daikin.clientURL
			});
		}
	}

	// Validation de clientPort
	if (daikin.clientPort === undefined || daikin.clientPort === null) {
		errors.push({
			field: 'daikin.clientPort',
			message: 'Le port du client est requis',
			value: daikin.clientPort
		});
	} else if (typeof daikin.clientPort !== 'number' || !Number.isInteger(daikin.clientPort)) {
		errors.push({
			field: 'daikin.clientPort',
			message: 'Le port du client doit être un entier',
			value: daikin.clientPort
		});
	} else if (daikin.clientPort < 1 || daikin.clientPort > 65535) {
		errors.push({
			field: 'daikin.clientPort',
			message: 'Le port du client doit être entre 1 et 65535',
			value: daikin.clientPort
		});
	}

	return errors;
}

/**
 * Valide la configuration MQTT
 */
function validateMQTTConfig(mqtt: ConfigMQTT): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validation de host
	if (!mqtt.host || typeof mqtt.host !== 'string' || mqtt.host.trim().length === 0) {
		errors.push({
			field: 'mqtt.host',
			message: 'L\'adresse IP ou le nom d\'hôte du broker MQTT est requis',
			value: mqtt.host
		});
	} else {
		// Validation basique de l'adresse IP ou du nom d'hôte
		const hostRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(\d{1,3}\.){3}\d{1,3}$|^localhost$|^\[([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}\]$/;
		if (!hostRegex.test(mqtt.host)) {
			errors.push({
				field: 'mqtt.host',
				message: 'Le format de l\'adresse IP ou du nom d\'hôte n\'est pas valide',
				value: mqtt.host
			});
		}
	}

	// Validation de port
	if (mqtt.port === undefined || mqtt.port === null) {
		errors.push({
			field: 'mqtt.port',
			message: 'Le port du broker MQTT est requis',
			value: mqtt.port
		});
	} else if (typeof mqtt.port !== 'number' || !Number.isInteger(mqtt.port)) {
		errors.push({
			field: 'mqtt.port',
			message: 'Le port du broker MQTT doit être un entier',
			value: mqtt.port
		});
	} else if (mqtt.port < 1 || mqtt.port > 65535) {
		errors.push({
			field: 'mqtt.port',
			message: 'Le port du broker MQTT doit être entre 1 et 65535',
			value: mqtt.port
		});
	}

	// Validation de auth
	if (typeof mqtt.auth !== 'boolean') {
		errors.push({
			field: 'mqtt.auth',
			message: 'La valeur auth doit être un booléen (true/false)',
			value: mqtt.auth
		});
	}

	// Validation de username et password si auth est true
	if (mqtt.auth === true) {
		if (!mqtt.username || typeof mqtt.username !== 'string' || mqtt.username.trim().length === 0) {
			errors.push({
				field: 'mqtt.username',
				message: 'Le nom d\'utilisateur MQTT est requis lorsque auth est activé',
				value: mqtt.username
			});
		}
		if (!mqtt.password || typeof mqtt.password !== 'string' || mqtt.password.trim().length === 0) {
			errors.push({
				field: 'mqtt.password',
				message: 'Le mot de passe MQTT est requis lorsque auth est activé',
				value: mqtt.password ? '***' : mqtt.password
			});
		}
	}

	// Validation de connectTimeout
	if (mqtt.connectTimeout === undefined || mqtt.connectTimeout === null) {
		errors.push({
			field: 'mqtt.connectTimeout',
			message: 'Le timeout de connexion est requis',
			value: mqtt.connectTimeout
		});
	} else if (typeof mqtt.connectTimeout !== 'number' || mqtt.connectTimeout <= 0) {
		errors.push({
			field: 'mqtt.connectTimeout',
			message: 'Le timeout de connexion doit être un nombre positif (en millisecondes)',
			value: mqtt.connectTimeout
		});
	} else if (mqtt.connectTimeout < 1000 || mqtt.connectTimeout > 60000) {
		errors.push({
			field: 'mqtt.connectTimeout',
			message: 'Le timeout de connexion doit être entre 1000 et 60000 millisecondes',
			value: mqtt.connectTimeout
		});
	}

	// Validation de reconnectPeriod
	if (mqtt.reconnectPeriod === undefined || mqtt.reconnectPeriod === null) {
		errors.push({
			field: 'mqtt.reconnectPeriod',
			message: 'La période de reconnexion est requise',
			value: mqtt.reconnectPeriod
		});
	} else if (typeof mqtt.reconnectPeriod !== 'number' || mqtt.reconnectPeriod < 0) {
		errors.push({
			field: 'mqtt.reconnectPeriod',
			message: 'La période de reconnexion doit être un nombre positif ou nul (en millisecondes)',
			value: mqtt.reconnectPeriod
		});
	} else if (mqtt.reconnectPeriod > 300000) {
		errors.push({
			field: 'mqtt.reconnectPeriod',
			message: 'La période de reconnexion ne devrait pas dépasser 300000 millisecondes (5 minutes)',
			value: mqtt.reconnectPeriod
		});
	}

	// Validation de topic
	if (!mqtt.topic || typeof mqtt.topic !== 'string' || mqtt.topic.trim().length === 0) {
		errors.push({
			field: 'mqtt.topic',
			message: 'Le topic MQTT de base est requis et ne peut pas être vide',
			value: mqtt.topic
		});
	} else {
		// Validation du format du topic MQTT
		const topicRegex = /^[^#+$]+$/;
		if (!topicRegex.test(mqtt.topic)) {
			errors.push({
				field: 'mqtt.topic',
				message: 'Le topic MQTT ne peut pas contenir les caractères #, + ou $',
				value: mqtt.topic
			});
		}
	}

	return errors;
}

/**
 * Valide la configuration Home Assistant
 */
function validateHomeAssistantConfig(homeassistant: ConfigHomeAssistant): ValidationError[] {
	const errors: ValidationError[] = [];

	// Validation de enabled
	if (typeof homeassistant.enabled !== 'boolean') {
		errors.push({
			field: 'homeassistant.enabled',
			message: 'La valeur enabled doit être un booléen (true/false)',
			value: homeassistant.enabled
		});
	}

	// Validation de discoveryPrefix si présent
	if (homeassistant.discoveryPrefix !== undefined) {
		if (typeof homeassistant.discoveryPrefix !== 'string' || homeassistant.discoveryPrefix.trim().length === 0) {
			errors.push({
				field: 'homeassistant.discoveryPrefix',
				message: 'Le préfixe de découverte doit être une chaîne non vide',
				value: homeassistant.discoveryPrefix
			});
		} else {
			const prefixRegex = /^[a-zA-Z0-9_-]+$/;
			if (!prefixRegex.test(homeassistant.discoveryPrefix)) {
				errors.push({
					field: 'homeassistant.discoveryPrefix',
					message: 'Le préfixe de découverte ne peut contenir que des lettres, chiffres, tirets et underscores',
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

