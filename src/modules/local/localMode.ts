/**
 * Helpers for LAN-only daemon mode (no Onecta cloud).
 */

export function isLocalOnlyAuthMode(authMode?: string | null): boolean {
	return (authMode ?? '') === 'local';
}

/**
 * Effective local config: force enabled when authMode is local.
 */
export function resolveLocalConfig(daikinConfig: {
	authMode?: string | null;
	local?: {
		enabled?: boolean;
		timeoutMs?: number;
		probeIntervalMinutes?: number;
		devices?: Array<{ ip: string }>;
		overrides?: Record<string, string>;
	};
} | undefined) {
	const local = daikinConfig?.local ?? {};
	const localOnly = isLocalOnlyAuthMode(daikinConfig?.authMode);
	return {
		...local,
		enabled: localOnly ? true : local.enabled === true,
	};
}
