import fs from 'fs';
import path from 'path';

/** Resolves a path under the global data directory. */
function resolveDataPath(...segments: string[]): string {
	return path.join(global.datadir, ...segments);
}

/** Legacy directory for anonymized dumps (removed; cleaned on startup). */
function getNewConfigDir(): string {
	return resolveDataPath('newConfig');
}

/**
 * Removes the legacy `newConfig/` dump directory if it still exists.
 * Support diagnostics now use the MQTT debug report only.
 */
function cleanupLegacyNewConfigDir(): void {
	const configFolder = getNewConfigDir();
	if (!fs.existsSync(configFolder)) {
		return;
	}
	try {
		fs.rmSync(configFolder, { recursive: true, force: true });
		logger.info('[paths.ts] => Removed legacy config/newConfig directory');
	} catch (error) {
		logger.warn(`[paths.ts] => Failed to remove legacy config/newConfig: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export {
	resolveDataPath,
	getNewConfigDir,
	cleanupLegacyNewConfigDir,
};
