/**
 * Whitelist of Online Controller gateway models that speak the classic LAN HTTP API.
 * v1: BRP069A42 / A43 / B41 (DaikinOnlineCtrl documented set).
 */

const EXACT_LAN_MODELS = new Set([
	'BRP069A42',
	'BRP069A43',
	'BRP069B41',
]);

/** Normalize model strings from cloud/LAN (spaces, case). */
export function normalizeGatewayModel(raw: string | null | undefined): string {
	if (!raw || typeof raw !== 'string') {
		return '';
	}
	return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * True only for models known to expose /aircon/get_control_info over plain HTTP.
 * Never returns true for C*, A61/A62, A78, or unknown models.
 */
export function isLanCompatibleModel(rawModel: string | null | undefined): boolean {
	const model = normalizeGatewayModel(rawModel);
	if (!model) {
		return false;
	}
	if (EXACT_LAN_MODELS.has(model)) {
		return true;
	}
	// Close DOC variants explicitly listed as A4x/B4x Online Controller family members
	// that match the documented A42/A43/B41 protocol — keep exact set for v1 safety.
	return false;
}

export function listLanCompatibleModels(): string[] {
	return Array.from(EXACT_LAN_MODELS).sort();
}
