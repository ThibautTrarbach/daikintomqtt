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
const cache_manager_1 = require("cache-manager");
const node_path_1 = require("node:path");
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("timers/promises");
(async () => {
    global.cache = (0, cache_manager_1.createCache)();
    global.datadir = process.env.STORE_DIR || process.cwd() + "/config";
    global.logger = (0, modules_1.loadLogger)();
    logger.info("[main.ts] => Starting DaikinToMQTT");
    logger.info("[main.ts] => Load configuration");
    await (0, modules_1.loadGlobalConfig)();
    logger.info("[main.ts] => Connect to MQTT");
    await (0, modules_1.loadMQTTClient)();
    logger.info("[main.ts] => Connect to Daikin");
    await (0, modules_1.loadDaikinAPI)();
    logger.info("[main.ts] => DaikinToMQTT Started !!");
    await (0, modules_1.startDaikinAPI)();
    logger.info("[main.ts] => Load Polling Daikin");
    await (0, cron_1.loadCron)();
})().catch(async (error) => {
    if (error.error == "invalid_grant") {
        try {
            logger.error('====> Token invalid, delete de l ancien token, une reconnection va être necesaire');
            const tokenPath = (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset');
            fs_1.default.unlinkSync(tokenPath);
            process.exit(1);
        }
        catch (e) {
            logger.error(`Merci de delete le fichier : ${(0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset')}`);
            process.exit(1);
        }
    }
    else if (error == 'Error: Authorization time out') {
        console.log('====> Authorization time out, please restart DaikinToMQTT and retry');
        const { updateSystemBridge } = await Promise.resolve().then(() => __importStar(require("./modules/daikin")));
        await updateSystemBridge(null, null, { authorizationTimeout: true });
        await (0, promises_1.setTimeout)(5000);
        process.exit(1);
    }
    else {
        logger.error(`[main.ts] => Unhandled error: ${error}`);
    }
});
//# sourceMappingURL=main.js.map