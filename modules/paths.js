"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDataPath = resolveDataPath;
exports.getNewConfigDir = getNewConfigDir;
exports.cleanupLegacyNewConfigDir = cleanupLegacyNewConfigDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function resolveDataPath(...segments) {
    return path_1.default.join(global.datadir, ...segments);
}
function getNewConfigDir() {
    return resolveDataPath('newConfig');
}
function cleanupLegacyNewConfigDir() {
    const configFolder = getNewConfigDir();
    if (!fs_1.default.existsSync(configFolder)) {
        return;
    }
    try {
        fs_1.default.rmSync(configFolder, { recursive: true, force: true });
        logger.info('[paths.ts] => Removed legacy config/newConfig directory');
    }
    catch (error) {
        logger.warn(`[paths.ts] => Failed to remove legacy config/newConfig: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=paths.js.map