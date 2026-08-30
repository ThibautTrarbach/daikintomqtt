"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDataPath = resolveDataPath;
exports.getNewConfigDir = getNewConfigDir;
const path_1 = __importDefault(require("path"));
function resolveDataPath(...segments) {
    return path_1.default.join(global.datadir, ...segments);
}
function getNewConfigDir() {
    return resolveDataPath('newConfig');
}
//# sourceMappingURL=paths.js.map