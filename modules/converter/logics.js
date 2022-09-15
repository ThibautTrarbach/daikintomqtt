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
exports.makeDefineFile = void 0;
const decorator_1 = require("../decorator");
const jeedom_1 = require("./jeedom");
const mqtt_1 = require("../mqtt");
function makeDefineFile(moduleClass) {
    return __awaiter(this, void 0, void 0, function* () {
        let id = moduleClass._device.id;
        if (config.system.jeedom) {
            let data = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, moduleClass);
            let cmd = (0, jeedom_1.generateCMD)(data, moduleClass);
            yield (0, mqtt_1.publishToMQTT)('system/jeedom/' + id, JSON.stringify(cmd));
        }
    });
}
exports.makeDefineFile = makeDefineFile;
