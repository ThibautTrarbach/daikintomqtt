"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const modules_1 = require("./modules");
const cron_1 = require("./modules/cron");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        global.datadir = process.env.STORE_DIR || process.cwd() + "/config";
        global.logger = (0, modules_1.loadLogger)();
        console.info("Starting DaikinToMQTT");
        logger.info("=> Load configuration");
        yield (0, modules_1.loadGlobalConfig)();
        logger.info("=> Connect to MQTT");
        yield (0, modules_1.loadMQTTClient)();
        logger.info("=> Connect to Daikin");
        yield (0, modules_1.loadDaikinAPI)();
        logger.info("=> Subscribe to MQTT Action");
        yield (0, modules_1.subscribeDevices)();
        logger.info("DaikinToMQTT Started !!");
        logger.info("Generate Config Info");
        yield (0, modules_1.generateConfig)();
        logger.info("Load Polling Daikin");
        yield (0, cron_1.loadCron)();
        logger.info("Send First Event Data Value");
        yield (0, modules_1.sendDevice)();
    });
}
main().then();
