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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGlobalConfig = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
function loadGlobalConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settingsPatch = path_1.default.join(datadir, '/settings.yml');
            global.config = js_yaml_1.default.load(fs_1.default.readFileSync(settingsPatch, 'utf8'));
            global.logger.level = config.system.logLevel;
        }
        catch (e) {
            console.log(e);
            throw new Error("Not load config files");
        }
    });
}
exports.loadGlobalConfig = loadGlobalConfig;
