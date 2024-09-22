"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGlobalConfig = loadGlobalConfig;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
async function loadGlobalConfig() {
    try {
        const settingsPatch = path_1.default.join(datadir, '/settings.yml');
        global.config = js_yaml_1.default.load(fs_1.default.readFileSync(settingsPatch, 'utf8'));
        global.logger.level = config.system.logLevel;
    }
    catch (e) {
        console.log(e);
        throw new Error("Not load config files");
    }
}
