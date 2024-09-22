"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anonymise = anonymise;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function anonymise(dev, value) {
    let fileName = value ?? dev.getId();
    let data = recurse(dev);
    const configFolder = path_1.default.join(datadir, '/newConfig');
    const configFile = path_1.default.join(configFolder, fileName + '.json');
    if (!fs_1.default.existsSync(configFolder))
        fs_1.default.mkdirSync(configFolder);
    if (!fs_1.default.existsSync(configFile)) {
        logger.info('New Module Detected Generate Anonymize Config For Integration');
        fs_1.default.writeFileSync(configFile, JSON.stringify(data));
    }
    else {
        logger.debug('New Module Detected Anonymize Config already exists');
    }
}
function recurse(resp) {
    Object.entries(resp).forEach(entry => {
        const [key, value] = entry;
        if (key == "cloud" ||
            key == "desc") {
            resp[key] = "anonymizeValue";
        }
        else if (value instanceof Object) {
            resp[key] = recurse(value);
        }
        else if (key == "value") {
            resp[key] = "anonymizeValue (" + typeof value + ")";
        }
    });
    return resp;
}
