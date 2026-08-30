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
const modules_1 = require("./modules");
const cron_1 = require("./modules/cron");
const actionRefresh_1 = require("./modules/actionRefresh");
const cron_2 = require("./modules/cron");
const daikin_1 = require("./modules/daikin");
const cache_manager_1 = require("cache-manager");
const node_path_1 = require("node:path");
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("timers/promises");
(async () => {
    try {
        global.cache = (0, cache_manager_1.createCache)();
        global.datadir = process.env.STORE_DIR || process.cwd() + "/config";
        global.logger = (0, modules_1.loadLogger)();
        global.logger.debug("[main.ts] => Cache initialized");
        global.logger.debug(`[main.ts] => Data directory: ${global.datadir}`);
        global.logger.info("[main.ts] => Starting DaikinToMQTT");
        global.logger.info("[main.ts] => Loading configuration");
        await (0, modules_1.loadGlobalConfig)();
        global.logger.info("[main.ts] => Connecting to MQTT broker");
        await (0, modules_1.loadMQTTClient)();
        global.logger.info("[main.ts] => Connecting to Daikin API");
        await (0, modules_1.loadDaikinAPI)();
        global.logger.info("[main.ts] => Starting Daikin API");
        await (0, modules_1.startDaikinAPI)();
        global.logger.info("[main.ts] => Loading polling system");
        await (0, cron_1.loadCron)();
        global.logger.info("[main.ts] => DaikinToMQTT started successfully!");
        const shutdown = async (signal) => {
            global.logger.info(`[main.ts] => ${signal} received, shutting down gracefully...`);
            (0, actionRefresh_1.clearPostActionTimer)();
            (0, cron_2.pausePolling)();
            try {
                await (0, daikin_1.disableDaikinWebSocket)();
            }
            catch (e) {
                global.logger.debug(`[main.ts] => WebSocket shutdown: ${e instanceof Error ? e.message : String(e)}`);
            }
            process.exit(0);
        };
        process.on('SIGINT', () => { void shutdown('SIGINT'); });
        process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
    }
    catch (error) {
        if (!global.logger) {
            console.error(`[main.ts] => Critical error before logger initialization: ${error instanceof Error ? error.message : String(error)}`);
        }
        else {
            global.logger.error(`[main.ts] => Error during startup: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                global.logger.debug(`[main.ts] => Stack trace: ${error.stack}`);
            }
        }
        throw error;
    }
})().catch(async (error) => {
    const log = global.logger || {
        error: (msg) => console.error(msg),
        info: (msg) => console.log(msg),
        warn: (msg) => console.warn(msg),
        debug: (msg) => console.log(msg)
    };
    log.error(`[main.ts] => Unhandled error during startup: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
        log.debug(`[main.ts] => Stack trace: ${error.stack}`);
    }
    if (error?.error === "invalid_grant" || (error instanceof Error && error.message.includes("invalid_grant"))) {
        try {
            log.error('[main.ts] => Invalid token detected, deleting old token. A reconnection will be required.');
            const tokenPath = (0, node_path_1.resolve)(global.datadir || process.cwd() + "/config", 'daikin-controller-cloud-tokenset');
            if (fs_1.default.existsSync(tokenPath)) {
                fs_1.default.unlinkSync(tokenPath);
                log.info(`[main.ts] => Token file deleted: ${tokenPath}`);
            }
            else {
                log.warn(`[main.ts] => Token file does not exist: ${tokenPath}`);
            }
            process.exit(1);
        }
        catch (e) {
            log.error(`[main.ts] => Error deleting token: ${e instanceof Error ? e.message : String(e)}`);
            log.error(`[main.ts] => Please manually delete the file: ${(0, node_path_1.resolve)(global.datadir || process.cwd() + "/config", 'daikin-controller-cloud-tokenset')}`);
            process.exit(1);
        }
    }
    else if ((error instanceof Error && error.message.includes("Authorization time out")) ||
        (error instanceof Error && error.message.includes("authorization timeout")) ||
        String(error).includes("Authorization time out")) {
        log.error('[main.ts] => Authorization timeout detected. Please restart DaikinToMQTT and try again.');
        try {
            const { updateSystemBridge } = await Promise.resolve().then(() => __importStar(require("./modules/daikin")));
            await updateSystemBridge(null, null, { authorizationTimeout: true });
            log.info('[main.ts] => System module updated with timeout state');
        }
        catch (updateError) {
            log.error(`[main.ts] => Error updating system bridge: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
        }
        log.error('[main.ts] => Please restart DaikinToMQTT and try again.');
        await (0, promises_1.setTimeout)(5000);
        process.exit(1);
    }
    else {
        log.error(`[main.ts] => Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
        if (error && typeof error === 'object') {
            Object.keys(error).forEach(key => {
                if (key !== 'message' && key !== 'stack') {
                    log.debug(`[main.ts] => ${key}: ${JSON.stringify(error[key])}`);
                }
            });
        }
        process.exit(1);
    }
});
//# sourceMappingURL=main.js.map