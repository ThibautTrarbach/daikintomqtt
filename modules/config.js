"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGlobalConfig = loadGlobalConfig;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const yaml = __importStar(require("js-yaml"));
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
        const loadedConfig = yaml.load(configContent);
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