"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isShuttingDown = isShuttingDown;
exports.beginShutdown = beginShutdown;
let shuttingDown = false;
function isShuttingDown() {
    return shuttingDown;
}
function beginShutdown() {
    shuttingDown = true;
}
//# sourceMappingURL=shutdown.js.map