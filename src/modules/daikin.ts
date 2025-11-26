import { resolve } from 'node:path';
import {
	anonymise,
	BRP069A4x,
	BRP069A61,
	BRP069A62,
	BRP069A78,
	BRP069B4x,
	BRP069C41,
	BRP069C4x, BRP069C8x,
	eventValue,
	SystemBridge
} from "./gateway";
import {makeDefineFile} from "./converter";
import {publishToMQTT} from "./mqtt";
import {DaikinCloudController} from "daikin-controller-cloud";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";
import fs from "fs";
import {INSTANCE_ID} from "./instanceId";

async function loadDaikinAPI() {
	if (!config.daikin.clientID || !config.daikin.clientSecret) {
		logger.error('[daikin.ts] => Please set the clientID and clientSecret in the settings files');
		process.exit(0);
	}

	/** Start Daikin Client **/
	const daikinClient = new DaikinCloudController({
		/* OIDC client id */
		oidcClientId: config.daikin.clientID,
		/* OIDC client secret */
		oidcClientSecret: config.daikin.clientSecret,
		/* Network interface that the HTTP server should bind to. Bind to all interfaces for convenience, please limit as needed to single interfaces! */
		oidcCallbackServerBindAddr: '0.0.0.0',
		/* port that the HTTP server should bind to */
		oidcCallbackServerPort: config.daikin.clientPort,
		/* OIDC Redirect URI */
		oidcCallbackServerExternalAddress: config.daikin.clientURL,
		//oidcCallbackServerBaseUrl: 'https://daikin.local:8765', // or use local IP address where server is reachable
		/* path of file used to cache the OIDC tokenset */
		oidcTokenSetFilePath: resolve(datadir, 'daikin-controller-cloud-tokenset'),
		/* time to wait for the user to go through the authorization grant flow before giving up (in seconds) */
		oidcAuthorizationTimeoutS: 120
	});

	daikinClient.on('authorization_request', async (url) => {
		logger.info(`[daikin.ts] =>
			Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
			 
			Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
			 
			Afterwards you are redirected to Daikin to approve the access and then redirected back.`);

		// Mettre à jour le module système avec les informations d'autorisation
		await updateSystemBridge(null, null, {
			authorizationUrl: url,
			authorizationRequest: true,
			authorizationTimeout: false
		});
	});

	daikinClient.on('rate_limit_status', async (rateLimitStatus) => {
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - START`)
		// Stocker dans le cache pour récupération ultérieure
		await cache.set('rate/limitMinute', rateLimitStatus.limitMinute)
		await cache.set('rate/remainingMinute', rateLimitStatus.remainingMinute)
		await cache.set('rate/limitDay', rateLimitStatus.limitDay)
		await cache.set('rate/remainingDay', rateLimitStatus.remainingDay)
		
		// Mettre à jour le rate limiter
		const {rateLimiter} = await import("./rateLimiter");
		rateLimiter.updateRateLimit(rateLimitStatus);
		
		// Mettre à jour le module système avec les informations de rate limit et d'autorisation
		await updateSystemBridge(rateLimitStatus, null, {
			authorizationRequest: false,
			authorizationTimeout: false
		})
		logger.debug(`[daikin.ts] => EVENT - Daikin Rate Limite Status - FINISH`)
	});

	daikinClient.on('token_update', async (set) => {
		logger.debug(`[daikin.ts] => EVENT - Token Update - Tentative de sauvgarde d'un nouveau token`)
		logger.debug(`[daikin.ts] => EVENT - Token Update - DATA : `)
		logger.debug(JSON.stringify(set))
	});

	daikinClient.on('error', async (error) => {
		logger.error(`[daikin.ts] => EVENT - Erreur du client Daikin: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		// Log des détails supplémentaires si disponibles
		if (error instanceof Error && 'code' in error) {
			logger.debug(`[daikin.ts] => Code d'erreur: ${(error as any).code}`);
		}
	});

	global.daikinClient = daikinClient;
}

async function startDaikinAPI() {
	try {
		logger.info("[daikin.ts] => Démarrage de l'API Daikin");
		
		// Charger les informations de rate limiting depuis le cache au démarrage
		const {rateLimiter} = await import("./rateLimiter");
		await rateLimiter.loadRateLimitFromCache();
		
		const devices = await getDevices();
		if (!devices || devices.length === 0) {
			logger.error("[daikin.ts] => Aucun device trouvé, impossible de démarrer l'API");
			return;
		}
		
		logger.info(`[daikin.ts] => ${devices.length} device(s) trouvé(s)`);
		
		logger.info("[daikin.ts] => Abonnement aux actions MQTT");
		await subscribeDevices(devices);
		
		logger.info("[daikin.ts] => Génération des fichiers de configuration");
		await generateConfig(devices);
		
		logger.info("[daikin.ts] => Envoi des premières valeurs de données");
		await sendDevice(devices);
		
		logger.info("[daikin.ts] => Initialisation du système bridge");
		await initializeSystemBridge(devices);
		
		logger.info("[daikin.ts] => API Daikin démarrée avec succès");
	} catch (error) {
		logger.error(`[daikin.ts] => Erreur critique lors du démarrage de l'API: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function subscribeDevices(devices: DaikinCloudDevice[]) {
	for (let dev of devices) {
		let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set"
		mqttClient.subscribe(subscribeTopic, function (err) {
			if (!err) logger.info("[daikin.ts] => Subscribe to " + subscribeTopic)
		})
	}

	// Subscribe to Daikin2MQTT bridge set topic
	const systemBridgeSetTopic = config.mqtt.topic + "/" + INSTANCE_ID + "/set"
	mqttClient.subscribe(systemBridgeSetTopic, function (err) {
		if (!err) logger.info("[daikin.ts] => Subscribe to " + systemBridgeSetTopic)
	})

	mqttClient.on('message', async function (topic, message) {
		try {
			const topicString = topic.toString();
			const messageString = message.toString();
			
			logger.debug(`[daikin.ts] => Message MQTT reçu - Topic: ${topicString}, Taille: ${messageString.length} bytes`);

			const systemBridgeSetTopicPath = config.mqtt.topic + "/" + INSTANCE_ID + "/set";

			// Handle system bridge actions
			if (topicString === systemBridgeSetTopicPath) {
				let data;
				try {
					data = JSON.parse(messageString);
				} catch (parseError) {
					logger.error(`[daikin.ts] => Erreur de parsing JSON pour le topic système: ${topicString}. Message: ${messageString.substring(0, 100)}`);
					return;
				}

				if (data.refreshAllDevices !== undefined || data._refreshAllDevices !== undefined) {
					logger.info(`[daikin.ts] => Commande de rafraîchissement de tous les devices reçue depuis le système bridge`);
					try {
						await sendDevice(null, true); // Force refresh from cloud
						await updateSystemBridge(); // Mettre à jour le module système après refresh
						logger.info(`[daikin.ts] => Rafraîchissement de tous les devices terminé avec succès`);
					} catch (refreshError) {
						logger.error(`[daikin.ts] => Erreur lors du rafraîchissement des devices: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
						if (refreshError instanceof Error && refreshError.stack) {
							logger.debug(`[daikin.ts] => Stack trace: ${refreshError.stack}`);
						}
					}
				}
				return;
			}

			// Traiter les messages pour les devices
			for (let dev of devices) {
				const deviceId = dev.getId();
				if (!topicString.includes(deviceId)) continue;
				
				logger.debug(`[daikin.ts] => Traitement du message pour le device: ${deviceId}`);
				
				let gateway = getModels(dev);
				if (gateway !== undefined) {
					let eventData;
					try {
						eventData = JSON.parse(messageString);
					} catch (parseError) {
						logger.error(`[daikin.ts] => Erreur de parsing JSON pour le device ${deviceId}, topic: ${topicString}. Message: ${messageString.substring(0, 100)}`);
						continue;
					}
					
					try {
						await eventValue(dev, gateway, eventData);
						logger.debug(`[daikin.ts] => Commande traitée avec succès pour le device: ${deviceId}`);
					} catch (eventError) {
						logger.error(`[daikin.ts] => Erreur lors du traitement de l'événement pour le device ${deviceId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
						if (eventError instanceof Error && eventError.stack) {
							logger.debug(`[daikin.ts] => Stack trace: ${eventError.stack}`);
						}
					}
				} else {
					logger.warn(`[daikin.ts] => Aucun gateway trouvé pour le device ${deviceId}, modèle non supporté`);
				}
			}
		} catch (error) {
			logger.error(`[daikin.ts] => Erreur inattendue lors du traitement du message MQTT: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
			}
		}
	})
}

async function sendDevice(devices: DaikinCloudDevice[] | null = null, cron: boolean = false) {
	try {
		if (devices == null) {
			logger.debug(`[daikin.ts] => Récupération des devices${cron ? ' (forcé depuis le cloud)' : ' (depuis le cache si disponible)'}`);
			devices = await getDevices(cron);
		}

		if (!devices || devices.length === 0) {
			logger.warn(`[daikin.ts] => Aucun device trouvé pour l'envoi`);
			return;
		}

		logger.debug(`[daikin.ts] => Envoi de ${devices.length} device(s) vers MQTT`);
		
		for (let dev of devices) {
			const deviceId = dev.getId();
			try {
				// Utiliser cache.set() au lieu de l'indexation directe
				// TTL de 10 minutes pour correspondre au cache de la liste des devices
				await cache.set(`device_${deviceId}`, dev, 600000);
				
				let gateway = getModels(dev);
				if (gateway === undefined) {
					logger.warn(`[daikin.ts] => Aucun gateway trouvé pour le device ${deviceId}, modèle non supporté`);
					continue;
				}
				
				const gatewayJson = JSON.stringify(gateway);
				await publishToMQTT(deviceId, gatewayJson);
				logger.debug(`[daikin.ts] => Device ${deviceId} publié avec succès vers MQTT`);
			} catch (deviceError) {
				logger.error(`[daikin.ts] => Erreur lors de l'envoi du device ${deviceId}: ${deviceError instanceof Error ? deviceError.message : String(deviceError)}`);
				if (deviceError instanceof Error && deviceError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${deviceError.stack}`);
				}
				// Continuer avec les autres devices même en cas d'erreur
			}
		}
		
		// Mettre à jour le module système après envoi des devices
		try {
			await updateSystemBridge(null, devices);
		} catch (bridgeError) {
			logger.error(`[daikin.ts] => Erreur lors de la mise à jour du système bridge: ${bridgeError instanceof Error ? bridgeError.message : String(bridgeError)}`);
		}
	} catch (error) {
		logger.error(`[daikin.ts] => Erreur critique lors de l'envoi des devices: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function timeUpdate() {
	try {
		logger.debug("[daikin.ts] => Vérification du refresh après commande => START");
		
		// Timestamp minimum (il y a 60 secondes)
		const time = Math.floor((Date.now() / 1000) - 60);
		logger.debug(`[daikin.ts] => Timestamp minimum requis: ${time} (${new Date(time * 1000).toISOString()})`);
		
		const timerefresh = await cache.get('needRefresh');
		
		if (timerefresh === undefined || timerefresh === null) {
			logger.debug("[daikin.ts] => Aucun refresh en attente");
			return;
		}
		
		if (typeof timerefresh !== "number") {
			logger.warn(`[daikin.ts] => Type de timestamp invalide dans le cache: ${typeof timerefresh}, suppression`);
			await cache.del('needRefresh');
			return;
		}
		
		logger.debug(`[daikin.ts] => Timestamp en cache: ${timerefresh} (${new Date(timerefresh * 1000).toISOString()})`);
		
		if (timerefresh <= time) {
			logger.info("[daikin.ts] => Refresh nécessaire après commande, mise à jour des devices");
			await cache.del('needRefresh');
			
			try {
				await sendDevice(null, true);
				logger.debug("[daikin.ts] => Refresh après commande terminé avec succès");
			} catch (refreshError) {
				logger.error(`[daikin.ts] => Erreur lors du refresh après commande: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
				if (refreshError instanceof Error && refreshError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${refreshError.stack}`);
				}
			}
		} else {
			const remainingSeconds = timerefresh - time;
			logger.debug(`[daikin.ts] => Refresh pas encore nécessaire, ${remainingSeconds} seconde(s) restante(s)`);
		}
		
		logger.debug("[daikin.ts] => Vérification du refresh après commande => FINISH");
	} catch (error) {
		logger.error(`[daikin.ts] => Erreur dans timeUpdate: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
	}
}

function getModels(devices: any) {
	try {
		if (!devices) {
			logger.warn(`[daikin.ts] => Device null ou undefined dans getModels`);
			return undefined;
		}

		let value: string | undefined;
		
		try {
			const gatewayModelInfo = devices.getData('gateway', 'modelInfo');
			if (gatewayModelInfo !== null && gatewayModelInfo !== undefined) {
				value = gatewayModelInfo.value;
			} else {
				const zeroModelInfo = devices.getData('0', 'modelInfo');
				if (zeroModelInfo !== null && zeroModelInfo !== undefined) {
					value = zeroModelInfo.value;
				}
			}
		} catch (error) {
			logger.warn(`[daikin.ts] => Erreur lors de la récupération du modelInfo: ${error instanceof Error ? error.message : String(error)}`);
			return undefined;
		}

		if (!value) {
			logger.warn(`[daikin.ts] => Aucun modelInfo trouvé pour le device ${devices.getId ? devices.getId() : 'unknown'}`);
			anonymise(devices, value || 'unknown');
			return undefined;
		}

		logger.debug(`[daikin.ts] => Modèle détecté: ${value} pour le device ${devices.getId ? devices.getId() : 'unknown'}`);

		switch (value) {
			case 'BRP069C4x':
				return new BRP069C4x(devices);
			case 'BRP069A62':
				return new BRP069A62(devices);
			case 'BRP069A78':
				return new BRP069A78(devices);
			case 'BRP069B4x':
				return new BRP069B4x(devices);
			case 'BRP069A4x':
				return new BRP069A4x(devices);
			case 'BRP069A61':
				return new BRP069A61(devices);
			case 'BRP069C41':
				return new BRP069C41(devices);
			case 'BRP069C8x':
				return new BRP069C8x(devices);
			default:
				logger.warn(`[daikin.ts] => Modèle non supporté: ${value}`);
				anonymise(devices, value);
				return undefined;
		}
	} catch (error) {
		logger.error(`[daikin.ts] => Erreur critique dans getModels: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		return undefined;
	}
}

async function generateConfig(devices: DaikinCloudDevice[]) {
	try {
		if (!devices || devices.length === 0) {
			logger.warn(`[daikin.ts] => Aucun device fourni pour la génération de configuration`);
			return;
		}

		logger.debug(`[daikin.ts] => Génération de la configuration pour ${devices.length} device(s)`);
		
		for (let device of devices) {
			const deviceId = device.getId();
			try {
				let module = getModels(device);
				if (module) {
					await makeDefineFile(module, device);
					logger.debug(`[daikin.ts] => Configuration générée avec succès pour le device ${deviceId}`);
				} else {
					logger.warn(`[daikin.ts] => Aucun module trouvé pour le device ${deviceId}, configuration non générée`);
				}
			} catch (configError) {
				logger.error(`[daikin.ts] => Erreur lors de la génération de la configuration pour le device ${deviceId}: ${configError instanceof Error ? configError.message : String(configError)}`);
				if (configError instanceof Error && configError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${configError.stack}`);
				}
				// Continuer avec les autres devices même en cas d'erreur
			}
		}
		
		logger.info(`[daikin.ts] => Génération de configuration terminée pour ${devices.length} device(s)`);
	} catch (error) {
		logger.error(`[daikin.ts] => Erreur critique lors de la génération de configuration: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function getDevices(force: boolean = false): Promise<DaikinCloudDevice[]> {
	try {
		const devices = await cache.get('devices') as DaikinCloudDevice[] | undefined;
		
		if (devices === undefined || force) {
			logger.info(`[daikin.ts] => ${force ? 'Récupération forcée' : 'Cache invalide'}, récupération des informations depuis le cloud Daikin`);
			
			if (!global.daikinClient) {
				logger.error(`[daikin.ts] => Le client Daikin n'est pas initialisé`);
				throw new Error("Le client Daikin n'est pas initialisé");
			}
			
			try {
				logger.debug('[daikin.ts] => Envoi de la requête au cloud Daikin pour récupérer les devices');
				
				// Utiliser le rate limiter pour gérer les retries automatiques
				const {rateLimiter} = await import("./rateLimiter");
				const freshDevices = await rateLimiter.executeWithRetry(
					async () => await daikinClient.getCloudDevices(),
					'getCloudDevices',
					{
						maxRetries: 3,
						baseDelay: 2000, // 2 secondes de base
						maxDelay: 120000 // 2 minutes maximum
					}
				);
				
				if (!Array.isArray(freshDevices)) {
					logger.error(`[daikin.ts] => La réponse du cloud Daikin n'est pas un tableau: ${typeof freshDevices}`);
					throw new Error("Réponse invalide du cloud Daikin");
				}
				
				logger.info(`[daikin.ts] => ${freshDevices.length} device(s) récupéré(s) depuis le cloud`);
				
				// Mettre en cache avec TTL de 10 minutes (600000 millisecondes = 600 secondes)
				await cache.set('devices', freshDevices, 600000);
				
				// Invalider les devices individuels en cache pour garantir la cohérence
				if (devices && devices.length) {
					logger.debug(`[daikin.ts] => Invalidation du cache des ${devices.length} device(s) précédent(s)`);
					for (const dev of devices) {
						await cache.del(`device_${dev.getId()}`);
					}
				}
				
				return freshDevices;
			} catch (cloudError) {
				logger.error(`[daikin.ts] => Erreur lors de la récupération des devices depuis le cloud: ${cloudError instanceof Error ? cloudError.message : String(cloudError)}`);
				if (cloudError instanceof Error && cloudError.stack) {
					logger.debug(`[daikin.ts] => Stack trace: ${cloudError.stack}`);
				}
				// Si on a des devices en cache et que ce n'est pas un refresh forcé, retourner le cache
				if (devices && devices.length > 0 && !force) {
					logger.warn(`[daikin.ts] => Utilisation des devices en cache en raison de l'erreur cloud`);
					return devices;
				}
				throw cloudError;
			}
		} else {
			logger.debug(`[daikin.ts] => Utilisation du cache (${devices.length} device(s))`);
		}
		
		return devices || [];
	} catch (error) {
		logger.error(`[daikin.ts] => Erreur critique lors de la récupération des devices: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[daikin.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

async function initializeSystemBridge(devices: DaikinCloudDevice[]) {
	const systemBridge = new SystemBridge();
	systemBridge.device.id = INSTANCE_ID;
	systemBridge.device.serialNumber = INSTANCE_ID;
	await updateSystemBridge(null, devices, undefined, systemBridge);
}

async function updateSystemBridge(rateLimitStatus?: any, devices?: DaikinCloudDevice[] | null, authorizationInfo?: {authorizationUrl?: string, authorizationRequest?: boolean, authorizationTimeout?: boolean}, existingBridge?: SystemBridge) {
	const systemBridge = existingBridge || new SystemBridge();
	
	if (!existingBridge) {
		systemBridge.device.id = INSTANCE_ID;
		systemBridge.device.serialNumber = INSTANCE_ID;
	}
	
	// Mettre à jour les informations de rate limit
	if (rateLimitStatus) {
		systemBridge.rateLimitMinute = rateLimitStatus.limitMinute;
		systemBridge.rateRemainingMinute = rateLimitStatus.remainingMinute;
		systemBridge.rateLimitDay = rateLimitStatus.limitDay;
		systemBridge.rateRemainingDay = rateLimitStatus.remainingDay;
	} else {
		const [limitMinute, remainingMinute, limitDay, remainingDay] = await Promise.all([
			cache.get('rate/limitMinute'),
			cache.get('rate/remainingMinute'),
			cache.get('rate/limitDay'),
			cache.get('rate/remainingDay')
		]);
		if (limitMinute !== undefined) systemBridge.rateLimitMinute = Number(limitMinute);
		if (remainingMinute !== undefined) systemBridge.rateRemainingMinute = Number(remainingMinute);
		if (limitDay !== undefined) systemBridge.rateLimitDay = Number(limitDay);
		if (remainingDay !== undefined) systemBridge.rateRemainingDay = Number(remainingDay);
	}

	// Mettre à jour les informations d'autorisation
	if (authorizationInfo) {
		if (authorizationInfo.authorizationUrl !== undefined) {
			systemBridge.authorizationUrl = authorizationInfo.authorizationUrl;
			await cache.set('authorizationUrl', authorizationInfo.authorizationUrl);
		}
		if (authorizationInfo.authorizationRequest !== undefined) {
			systemBridge.authorizationRequest = authorizationInfo.authorizationRequest;
			await cache.set('authorizationRequest', authorizationInfo.authorizationRequest);
		}
		if (authorizationInfo.authorizationTimeout !== undefined) {
			systemBridge.authorizationTimeout = authorizationInfo.authorizationTimeout;
			await cache.set('authorizationTimeout', authorizationInfo.authorizationTimeout);
		}
	} else {
		const [authUrl, authRequest, authTimeout] = await Promise.all([
			cache.get('authorizationUrl'),
			cache.get('authorizationRequest'),
			cache.get('authorizationTimeout')
		]);
		if (authUrl !== undefined) systemBridge.authorizationUrl = String(authUrl);
		if (authRequest !== undefined) systemBridge.authorizationRequest = Boolean(authRequest);
		if (authTimeout !== undefined) systemBridge.authorizationTimeout = Boolean(authTimeout);
	}

	// Mettre à jour les informations sur les modules
	if (devices === null || devices === undefined) {
		devices = await getDevices();
	}
	
	if (devices && devices.length) {
		const modulesInfo = devices.map(dev => {
			const modelInfo = dev.getData('gateway', 'modelInfo', null)?.value || dev.getData('0', 'modelInfo', null)?.value || 'Unknown';
			return {
				id: dev.getId(),
				model: modelInfo,
				name: dev.getData('climateControl', 'name', null)?.value || dev.getId()
			};
		});
		
		systemBridge.modulesCount = modulesInfo.length;
		systemBridge.modulesList = JSON.stringify(modulesInfo);
	} else {
		systemBridge.modulesCount = 0;
		systemBridge.modulesList = "[]";
	}

	// Mettre à jour les informations sur les modules non gérés
	const unsupportedModules = getUnsupportedModules();
	systemBridge.unsupportedModulesCount = unsupportedModules.length;
	systemBridge.unsupportedModulesList = JSON.stringify(unsupportedModules);

	// Publier le module système
	await publishSystemBridge(systemBridge);
}

async function publishSystemBridge(systemBridge: SystemBridge) {
	// Publier l'objet complet comme les autres devices (inclut device)
	await publishToMQTT(INSTANCE_ID, JSON.stringify(systemBridge));
	
	if (config.system.jeedom) {
		await makeDefineFile(systemBridge, null);
	}
}

function getUnsupportedModules(): Array<{fileName: string, model?: string}> {
	const configFolder = resolve(datadir, '/newConfig');
	const unsupportedModules: Array<{fileName: string, model?: string}> = [];

	if (!fs.existsSync(configFolder)) {
		return unsupportedModules;
	}

	const files = fs.readdirSync(configFolder);
	files.forEach(file => {
		if (file.endsWith('.json')) {
			const fileName = file.replace('.json', '');
			try {
				const filePath = resolve(configFolder, file);
				const content = fs.readFileSync(filePath, 'utf8');
				const data = JSON.parse(content);
				// Essayer d'extraire le modelInfo si disponible
				const model = data?.gateway?.modelInfo?.value || data?.['0']?.modelInfo?.value || fileName;
				unsupportedModules.push({ fileName, model });
			} catch (e) {
				unsupportedModules.push({ fileName });
			}
		}
	});

	return unsupportedModules;
}

export {
	loadDaikinAPI,
	subscribeDevices,
	generateConfig,
	sendDevice,
	startDaikinAPI,
	getDevices,
	timeUpdate,
	updateSystemBridge
}
