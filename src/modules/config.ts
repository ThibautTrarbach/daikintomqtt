import path from "path";
import fs from "fs";
import {Daikin2MQTT} from "../types";
import yaml from "js-yaml";
import {validateConfig, ConfigValidationError} from "./configValidator";


async function loadGlobalConfig() {
	try {
		const settingsPath = path.join(datadir, '/settings.yml');
		
		// Vérifier que le fichier existe
		if (!fs.existsSync(settingsPath)) {
			logger.error(`[config.ts] => Le fichier de configuration n'existe pas: ${settingsPath}`);
			throw new Error(`Fichier de configuration introuvable: ${settingsPath}`);
		}

		// Charger le fichier YAML
		logger.debug(`[config.ts] => Chargement du fichier de configuration: ${settingsPath}`);
		const configContent = fs.readFileSync(settingsPath, 'utf8');
		const loadedConfig = yaml.load(configContent) as Daikin2MQTT;

		if (!loadedConfig) {
			logger.error(`[config.ts] => Le fichier de configuration est vide ou invalide`);
			throw new Error("Le fichier de configuration est vide ou invalide");
		}

		// Valider la configuration
		logger.debug(`[config.ts] => Validation de la configuration`);
		validateConfig(loadedConfig);

		// Assigner la configuration globale
		global.config = loadedConfig;

		// Configurer le niveau de log
		const logLevel = config.system.logLevel.toLowerCase();
		global.logger.level = logLevel;
		logger.info(`[config.ts] => Configuration chargée avec succès (logLevel: ${logLevel})`);

	} catch (e) {
		if (e instanceof ConfigValidationError) {
			logger.error(`[config.ts] => Erreurs de validation de configuration:`);
			e.errors.forEach(err => {
				logger.error(`[config.ts] =>   - ${err.field}: ${err.message}${err.value !== undefined ? ` (valeur: ${JSON.stringify(err.value)})` : ''}`);
			});
			throw e;
		} else if (e instanceof Error) {
			logger.error(`[config.ts] => Erreur lors du chargement de la configuration: ${e.message}`);
			if (e.stack) {
				logger.debug(`[config.ts] => Stack trace: ${e.stack}`);
			}
			throw new Error(`Impossible de charger le fichier de configuration: ${e.message}`);
		} else {
			logger.error(`[config.ts] => Erreur inconnue lors du chargement de la configuration: ${JSON.stringify(e)}`);
			throw new Error("Erreur inconnue lors du chargement de la configuration");
		}
	}
}

export {
	loadGlobalConfig
}
