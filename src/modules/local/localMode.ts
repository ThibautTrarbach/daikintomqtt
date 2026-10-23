/**
 * Helpers for LAN-only daemon mode (no Onecta cloud).
 */

export function isLocalOnlyAuthMode(authMode?: string | null): boolean {
	return (authMode ?? '') === 'local';
}

/**
 * Effective local config: force enabled when authMode is local.
 */
import type { ConfigDaikin, ConfigDaikinLocal } from '../../types';

export function resolveLocalConfig(daikinConfig: ConfigDaikin | undefined): ConfigDaikinLocal {
	const local = daikinConfig?.local ?? {};
	const localOnly = isLocalOnlyAuthMode(daikinConfig?.authMode);
	const overridesRaw = local.overrides;
	const overrides: Record<string, string> =
		overridesRaw && !Array.isArray(overridesRaw) && typeof overridesRaw === 'object'
			? (overridesRaw as Record<string, string>)
			: {};
	return {
		...local,
		enabled: localOnly ? true : local.enabled === true,
		overrides,
	};
}
