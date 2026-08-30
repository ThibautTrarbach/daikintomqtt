import path from "path";
import fs from "fs";
import {Daikin2MQTT} from "../types";
import yaml from "js-yaml";
import {validateConfig, ConfigValidationError} from "./configValidator";


async function loadGlobalConfig() {
	try {
		const settingsPath = path.join(datadir, '/settings.yml');
		
		// Check that the file exists
		if (!fs.existsSync(settingsPath)) {
			logger.error(`[config.ts] => Configuration file does not exist: ${settingsPath}`);
			throw new Error(`Configuration file not found: ${settingsPath}`);
		}

		// Load YAML file
		logger.debug(`[config.ts] => Loading configuration file: ${settingsPath}`);
		const configContent = fs.readFileSync(settingsPath, 'utf8');
		const loadedConfig = yaml.load(configContent) as Daikin2MQTT;

		if (!loadedConfig) {
			logger.error(`[config.ts] => Configuration file is empty or invalid`);
			throw new Error("Configuration file is empty or invalid");
		}

		// Validate configuration
		logger.debug(`[config.ts] => Validating configuration`);
		validateConfig(loadedConfig);

		// Assign global configuration
		global.config = loadedConfig;

		// Configure log level
		const logLevel = config.system.logLevel.toLowerCase();
		global.logger.level = logLevel;
		logger.info(`[config.ts] => Configuration loaded successfully (logLevel: ${logLevel})`);

	} catch (e) {
		if (e instanceof ConfigValidationError) {
			logger.error(`[config.ts] => Configuration validation errors:`);
			e.errors.forEach(err => {
				logger.error(`[config.ts] =>   - ${err.field}: ${err.message}${err.value !== undefined ? ` (value: ${JSON.stringify(err.value)})` : ''}`);
			});
			throw e;
		} else if (e instanceof Error) {
			logger.error(`[config.ts] => Error loading configuration: ${e.message}`);
			if (e.stack) {
				logger.debug(`[config.ts] => Stack trace: ${e.stack}`);
			}
			throw new Error(`Unable to load configuration file: ${e.message}`);
		} else {
			logger.error(`[config.ts] => Unknown error loading configuration: ${JSON.stringify(e)}`);
			throw new Error("Unknown error loading configuration");
		}
	}
}

export {
	loadGlobalConfig
}
