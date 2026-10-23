/** Application version from package.json */
import fs from 'fs';
import path from 'path';

const PACKAGE_NAME = 'daikin2mqtt';

/**
 * Resolve package.json for both layouts:
 * - release-* (Jeedom): modules/ → ../package.json
 * - local dist/: dist/modules/ → ../../package.json
 * Match on package name to avoid picking up an unrelated parent package.json.
 */
function readAppVersion(): string {
	const candidates = [
		path.join(__dirname, '../package.json'),
		path.join(__dirname, '../../package.json'),
	];
	for (const pkgPath of candidates) {
		try {
			const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string; version?: string };
			if (pkg.name === PACKAGE_NAME && pkg.version) {
				return pkg.version;
			}
		} catch {
			// try next candidate
		}
	}
	return '0.0.0';
}

export const APP_VERSION = readAppVersion();

/** Device list cache TTL: 3 hours in milliseconds */
export const DEVICE_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

/** WebSocket post-action confirmation window: 120 seconds in milliseconds */
export const WS_CONFIRMATION_TTL_MS = 120 * 1000;

/** System bridge MQTT topic used for Home Assistant availability (authorization state) */
export { INSTANCE_ID as HA_SYSTEM_BRIDGE_TOPIC } from './instanceId';
