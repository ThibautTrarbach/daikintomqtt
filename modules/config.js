"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGlobalConfig = loadGlobalConfig;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const configValidator_1 = require("./configValidator");
async function loadGlobalConfig() {
    try {
        const settingsPath = path_1.default.join(datadir, '/settings.yml');
        if (!fs_1.default.existsSync(settingsPath)) {
            logger.error(`[config.ts] => Configuration file does not exist: ${settingsPath}`);
            throw new Error(`Configuration file not found: ${settingsPath}`);
        }
        logger.debug(`[config.ts] => Loading configuration file: ${settingsPath}`);
        const configContent = fs_1.default.readFileSync(settingsPath, 'utf8');
        const loadedConfig = js_yaml_1.default.load(configContent);
        if (!loadedConfig) {
            logger.error(`[config.ts] => Configuration file is empty or invalid`);
            throw new Error("Configuration file is empty or invalid");
        }
        logger.debug(`[config.ts] => Validating configuration`);
        (0, configValidator_1.validateConfig)(loadedConfig);
        global.config = loadedConfig;
        const logLevel = config.system.logLevel.toLowerCase();
        global.logger.level = logLevel;
        logger.info(`[config.ts] => Configuration loaded successfully (logLevel: ${logLevel})`);
    }
    catch (e) {
        if (e instanceof configValidator_1.ConfigValidationError) {
            logger.error(`[config.ts] => Configuration validation errors:`);
            e.errors.forEach(err => {
                logger.error(`[config.ts] =>   - ${err.field}: ${err.message}${err.value !== undefined ? ` (value: ${JSON.stringify(err.value)})` : ''}`);
            });
            throw e;
        }
        else if (e instanceof Error) {
            logger.error(`[config.ts] => Error loading configuration: ${e.message}`);
            if (e.stack) {
                logger.debug(`[config.ts] => Stack trace: ${e.stack}`);
            }
            throw new Error(`Unable to load configuration file: ${e.message}`);
        }
        else {
            logger.error(`[config.ts] => Unknown error loading configuration: ${JSON.stringify(e)}`);
            throw new Error("Unknown error loading configuration");
        }
    }
}
//# sourceMappingURL=config.js.map