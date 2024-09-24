"use strict";
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
    global.cache = (0, cache_manager_1.createCache)((0, cache_manager_1.memoryStore)({
        max: 100,
        ttl: 10 * 60 * 1000,
    }));
    global.datadir = process.env.STORE_DIR || process.cwd() + "/config";
    global.logger = (0, modules_1.loadLogger)();
    console.info("[main.ts] => Starting DaikinToMQTT");
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
            console.log('====> Token invalid, delete de l ancien token, une reconnection va être necesaire');
            let path = (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset');
            fs_1.default.unlinkSync(path);
            process.exit(1);
        }
        catch (e) {
            console.error('Merci de delete le fichier : path');
            process.exit(1);
        }
    }
    else if (error == 'Error: Authorization time out') {
        console.log('====> Authorization time out, please restart DaikinToMQTT and retry');
        await (0, modules_1.publishConfig)('authorization_timeout', true);
        await (0, promises_1.setTimeout)(5000);
        process.exit(1);
    }
    else {
        console.error(error);
    }
});
