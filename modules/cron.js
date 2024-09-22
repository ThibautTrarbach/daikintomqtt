"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCron = loadCron;
const node_cron_1 = __importDefault(require("node-cron"));
const daikin_1 = require("./daikin");
async function loadCron() {
    node_cron_1.default.schedule('0 */15 * * * *', async function () {
        logger.debug("Run Polling Daikin");
        await (0, daikin_1.sendDevice)(null, true);
    });
    node_cron_1.default.schedule('*/30 * * * * *', async function () {
        logger.debug("Run refresh after command");
        await (0, daikin_1.timeUpdate)();
    });
}
