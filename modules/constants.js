"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HA_SYSTEM_BRIDGE_TOPIC = exports.WS_CONFIRMATION_TTL_MS = exports.DEVICE_CACHE_TTL_MS = exports.APP_VERSION = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readAppVersion() {
    try {
        const pkgPath = path_1.default.join(__dirname, '../../package.json');
        const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
        return pkg.version ?? '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
exports.APP_VERSION = readAppVersion();
exports.DEVICE_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
exports.WS_CONFIRMATION_TTL_MS = 120 * 1000;
var instanceId_1 = require("./instanceId");
Object.defineProperty(exports, "HA_SYSTEM_BRIDGE_TOPIC", { enumerable: true, get: function () { return instanceId_1.INSTANCE_ID; } });
//# sourceMappingURL=constants.js.map