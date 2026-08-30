"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenFilePath = getTokenFilePath;
const node_path_1 = require("node:path");
const constants_1 = require("../daikin-cloud/constants");
function getTokenFilePath() {
    const authMode = config.daikin.authMode ?? 'developer_portal';
    if (authMode === constants_1.AUTH_MODE_MOBILE_APP) {
        return (0, node_path_1.resolve)(datadir, 'daikin-mobile-tokenset');
    }
    return (0, node_path_1.resolve)(datadir, 'daikin-controller-cloud-tokenset');
}
//# sourceMappingURL=tokenPaths.js.map