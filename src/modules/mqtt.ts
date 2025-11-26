import {connect} from "mqtt";
import {IClientOptions} from "mqtt/types/lib/client";

async function getOptions() {
	const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

	let option: IClientOptions = {
		clientId,
		clean: true,
		connectTimeout: config.mqtt.connectTimeout,
		username: (config.mqtt.username != null) ? config.mqtt.username : undefined,
		password: (config.mqtt.password != null) ? config.mqtt.password : undefined,
		reconnectPeriod: config.mqtt.reconnectPeriod,
	};

	return option;
}

async function loadMQTTClient() {
	try {
		if (!config.mqtt) {
			throw new Error("Configuration MQTT non trouvée");
		}

		let options: IClientOptions = await getOptions();
		const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`;
		
		logger.info(`[mqtt.ts] => Connexion au broker MQTT: ${config.mqtt.host}:${config.mqtt.port}`);
		logger.debug(`[mqtt.ts] => Options de connexion: clientId=${options.clientId}, clean=${options.clean}, timeout=${options.connectTimeout}ms`);
		
		global.mqttClient = connect(mqttHost, options);

		// Gestion des événements MQTT
		mqttClient.on('connect', () => {
			logger.info(`[mqtt.ts] => Connecté au broker MQTT: ${mqttHost}`);
		});

		mqttClient.on('error', (error) => {
			logger.error(`[mqtt.ts] => Erreur de connexion MQTT: ${error.message}`);
			if (error.stack) {
				logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
			}
		});

		mqttClient.on('close', () => {
			logger.warn(`[mqtt.ts] => Connexion MQTT fermée`);
		});

		mqttClient.on('reconnect', () => {
			logger.info(`[mqtt.ts] => Reconnexion au broker MQTT en cours...`);
		});

		mqttClient.on('offline', () => {
			logger.warn(`[mqtt.ts] => Client MQTT hors ligne`);
		});

		// Attendre la connexion avant de continuer
		return new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Timeout de connexion MQTT après ${config.mqtt.connectTimeout}ms`));
			}, config.mqtt.connectTimeout);

			mqttClient.once('connect', () => {
				clearTimeout(timeout);
				logger.info(`[mqtt.ts] => Connexion MQTT établie avec succès`);
				resolve();
			});

			mqttClient.once('error', (error) => {
				clearTimeout(timeout);
				reject(error);
			});
		});
	} catch (error) {
		logger.error(`[mqtt.ts] => Erreur lors de l'initialisation du client MQTT: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function publishToMQTT(topic: string, data: string): Promise<void> {
	try {
		if (!global.mqttClient) {
			throw new Error("Client MQTT non initialisé");
		}

		if (!mqttClient.connected) {
			logger.warn(`[mqtt.ts] => Client MQTT non connecté, tentative de publication pour le topic: ${topic}`);
		}

		// Vérifier le cache pour éviter les publications inutiles
		const cachedData = await cache.get(topic);
		if (cachedData === data) {
			logger.debug(`[mqtt.ts] => Données identiques en cache pour ${topic}, publication ignorée`);
			return;
		}
		
		// Mettre à jour le cache
		await cache.set(topic, data);

		const fullTopic = config.mqtt.topic + "/" + topic;
		const dataSize = Buffer.byteLength(data, 'utf8');
		
		logger.debug(`[mqtt.ts] => Publication vers ${fullTopic} (${dataSize} bytes)`);

		return new Promise<void>((resolve, reject) => {
			const publishTimeout = setTimeout(() => {
				reject(new Error(`Timeout lors de la publication vers ${fullTopic}`));
			}, 5000); // 5 secondes de timeout

			mqttClient.publish(fullTopic, data, {qos: 0, retain: true}, (error) => {
				clearTimeout(publishTimeout);
				
				if (error) {
					logger.error(`[mqtt.ts] => Erreur lors de la publication vers ${fullTopic}: ${error.message}`);
					if (error.stack) {
						logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
					}
					reject(error);
				} else {
					logger.debug(`[mqtt.ts] => Données publiées avec succès vers ${fullTopic}`);
					resolve();
				}
			});
		});
	} catch (error) {
		logger.error(`[mqtt.ts] => Erreur dans publishToMQTT pour le topic ${topic}: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[mqtt.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function publishConfig(key: string, value: any) {
	await publishToMQTT('system/bridge/'+key, value.toString())
}
export {
	loadMQTTClient,
	publishToMQTT,
	publishConfig
}
