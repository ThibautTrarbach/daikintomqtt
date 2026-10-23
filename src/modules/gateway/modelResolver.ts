const EXACT_MODELS = new Set([
	'BRP069C4x',
	'BRP069A62',
	'BRP069A78',
	'BRP069B4x',
	'BRP069A4x',
	'BRP069A61',
	'BRP069C41',
	'BRP069C8x',
]);

const FAMILY_PATTERNS: Array<{ pattern: RegExp; family: string; exclude?: RegExp }> = [
	{ pattern: /^BRP069C41$/i, family: 'BRP069C41' },
	{ pattern: /^BRP069C4/i, family: 'BRP069C4x', exclude: /^BRP069C41$/i },
	{ pattern: /^BRP069A61$/i, family: 'BRP069A61' },
	{ pattern: /^BRP069A62$/i, family: 'BRP069A62' },
	{ pattern: /^BRP069A78$/i, family: 'BRP069A78' },
	{ pattern: /^BRP069A4/i, family: 'BRP069A4x' },
	{ pattern: /^BRP069B4/i, family: 'BRP069B4x' },
	{ pattern: /^BRP069C8/i, family: 'BRP069C8x' },
];

/**
 * Resolves a raw API modelInfo string to a static gateway family key.
 * Priority: exact match → family pattern → null (DynamicGateway).
 */
export function resolveGatewayModel(raw: string | undefined | null): string | null {
	if (!raw) {
		return null;
	}

	const model = raw.trim();
	if (EXACT_MODELS.has(model)) {
		return model;
	}

	for (const { pattern, family, exclude } of FAMILY_PATTERNS) {
		if (exclude?.test(model)) {
			continue;
		}
		if (pattern.test(model)) {
			return family;
		}
	}

	return null;
}
