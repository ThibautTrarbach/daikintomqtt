"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGatewayModel = normalizeGatewayModel;
exports.isLanCompatibleModel = isLanCompatibleModel;
exports.listLanCompatibleModels = listLanCompatibleModels;
const EXACT_LAN_MODELS = new Set([
    'BRP069A42',
    'BRP069A43',
    'BRP069B41',
]);
function normalizeGatewayModel(raw) {
    if (!raw || typeof raw !== 'string') {
        return '';
    }
    return raw.trim().toUpperCase().replace(/\s+/g, '');
}
function isLanCompatibleModel(rawModel) {
    const model = normalizeGatewayModel(rawModel);
    if (!model) {
        return false;
    }
    if (EXACT_LAN_MODELS.has(model)) {
        return true;
    }
    return false;
}
function listLanCompatibleModels() {
    return Array.from(EXACT_LAN_MODELS).sort();
}
//# sourceMappingURL=LanCompatibility.js.map