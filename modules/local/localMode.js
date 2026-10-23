"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLocalOnlyAuthMode = isLocalOnlyAuthMode;
exports.resolveLocalConfig = resolveLocalConfig;
function isLocalOnlyAuthMode(authMode) {
    return (authMode ?? '') === 'local';
}
function resolveLocalConfig(daikinConfig) {
    const local = daikinConfig?.local ?? {};
    const localOnly = isLocalOnlyAuthMode(daikinConfig?.authMode);
    return {
        ...local,
        enabled: localOnly ? true : local.enabled === true,
    };
}
//# sourceMappingURL=localMode.js.map