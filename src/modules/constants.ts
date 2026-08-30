/** Application version from package.json */
import fs from 'fs';
import path from 'path';

function readAppVersion(): string {
	try {
		const pkgPath = path.join(__dirname, '../../package.json');
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
		return pkg.version ?? '0.0.0';
	} catch {
		return '0.0.0';
	}
}

export const APP_VERSION = readAppVersion();

/** Device list cache TTL: 3 hours in milliseconds */
export const DEVICE_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

/** WebSocket post-action confirmation window: 120 seconds in milliseconds */
export const WS_CONFIRMATION_TTL_MS = 120 * 1000;

/** Availability topic suffix for Home Assistant discovery */
export const HA_AVAILABILITY_TOPIC_SUFFIX = 'system/bridge/authorization_timeout';
