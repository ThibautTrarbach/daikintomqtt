import {
	loadDaikinAPI,
	loadGlobalConfig,
	loadLogger,
	loadMQTTClient,
	startDaikinAPI,
} from "./modules";
import {loadCron} from "./modules/cron";
import {createCache} from "cache-manager";
import {resolve} from "node:path";
import fs from "fs";
import { setTimeout } from "timers/promises";


(async () => {
	try {
		// Initialisation du cache
		global.cache = createCache();

		// Configuration du répertoire de données
		global.datadir = process.env.STORE_DIR || process.cwd() + "/config";

		// Initialisation du logger
		global.logger = loadLogger();
		global.logger.debug("[main.ts] => Cache initialisé");
		global.logger.debug(`[main.ts] => Répertoire de données: ${global.datadir}`);
		global.logger.info("[main.ts] => Démarrage de DaikinToMQTT");

		// Chargement de la configuration
		global.logger.info("[main.ts] => Chargement de la configuration");
		await loadGlobalConfig();

		// Connexion MQTT
		global.logger.info("[main.ts] => Connexion au broker MQTT");
		await loadMQTTClient();

		// Connexion Daikin
		global.logger.info("[main.ts] => Connexion à l'API Daikin");
		await loadDaikinAPI();

		// Démarrage de l'API Daikin
		global.logger.info("[main.ts] => Démarrage de l'API Daikin");
		await startDaikinAPI();

		// Chargement du polling
		global.logger.info("[main.ts] => Chargement du système de polling");
		await loadCron();

		global.logger.info("[main.ts] => DaikinToMQTT démarré avec succès !");
	} catch (error) {
		// Si le logger n'est pas encore initialisé, utiliser console
		if (!global.logger) {
			console.error(`[main.ts] => Erreur critique avant l'initialisation du logger: ${error instanceof Error ? error.message : String(error)}`);
		} else {
			global.logger.error(`[main.ts] => Erreur lors du démarrage: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				global.logger.debug(`[main.ts] => Stack trace: ${error.stack}`);
			}
		}
		throw error;
	}
})().catch(async error => {
	// Utiliser global.logger ou console si le logger n'est pas encore initialisé
	const log = global.logger || {
		error: (msg: string) => console.error(msg),
		info: (msg: string) => console.log(msg),
		warn: (msg: string) => console.warn(msg),
		debug: (msg: string) => console.log(msg)
	};

	log.error(`[main.ts] => Erreur non gérée lors du démarrage: ${error instanceof Error ? error.message : String(error)}`);
	
	if (error instanceof Error && error.stack) {
		log.debug(`[main.ts] => Stack trace: ${error.stack}`);
	}

	// Gestion de l'erreur invalid_grant (token invalide)
	if ((error as any)?.error === "invalid_grant" || (error instanceof Error && error.message.includes("invalid_grant"))) {
		try {
			log.error('[main.ts] => Token invalide détecté, suppression de l\'ancien token. Une reconnexion sera nécessaire.');
			const tokenPath = resolve(global.datadir || process.cwd() + "/config", 'daikin-controller-cloud-tokenset');
			
			if (fs.existsSync(tokenPath)) {
				fs.unlinkSync(tokenPath);
				log.info(`[main.ts] => Fichier token supprimé: ${tokenPath}`);
			} else {
				log.warn(`[main.ts] => Le fichier token n'existe pas: ${tokenPath}`);
			}
			
			process.exit(1);
		} catch (e) {
			log.error(`[main.ts] => Erreur lors de la suppression du token: ${e instanceof Error ? e.message : String(e)}`);
			log.error(`[main.ts] => Veuillez supprimer manuellement le fichier: ${resolve(global.datadir || process.cwd() + "/config", 'daikin-controller-cloud-tokenset')}`);
			process.exit(1);
		}
	} 
	// Gestion du timeout d'autorisation
	else if ((error instanceof Error && error.message.includes("Authorization time out")) || 
	         (error instanceof Error && error.message.includes("authorization timeout")) ||
	         String(error).includes("Authorization time out")) {
		log.error('[main.ts] => Timeout d\'autorisation détecté. Veuillez redémarrer DaikinToMQTT et réessayer.');
		
		try {
			// Mettre à jour le module système avec le timeout
			const {updateSystemBridge} = await import("./modules/daikin");
			await updateSystemBridge(null, null, {authorizationTimeout: true});
			log.info('[main.ts] => Module système mis à jour avec l\'état de timeout');
		} catch (updateError) {
			log.error(`[main.ts] => Erreur lors de la mise à jour du système bridge: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
		}
		
		await setTimeout(5000);
		process.exit(1);
	} 
	// Autres erreurs
	else {
		log.error(`[main.ts] => Erreur non gérée: ${error instanceof Error ? error.message : String(error)}`);
		
		// Log des détails supplémentaires si disponibles
		if (error && typeof error === 'object') {
			Object.keys(error).forEach(key => {
				if (key !== 'message' && key !== 'stack') {
					log.debug(`[main.ts] => ${key}: ${JSON.stringify((error as any)[key])}`);
				}
			});
		}
		
		process.exit(1);
	}
})



