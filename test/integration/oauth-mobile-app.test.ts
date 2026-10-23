/**
 * Placeholder integration test for Mobile App OAuth configuration validation.
 * Run: npx ts-node test/integration/oauth-mobile-app.test.ts
 */

import * as assert from 'node:assert/strict';
import { DAIKIN_MOBILE_CONFIG } from '../../src/daikin-cloud/types';

function run(): void {
	assert.ok(DAIKIN_MOBILE_CONFIG.clientId.length > 0);
	assert.ok(DAIKIN_MOBILE_CONFIG.idpTokenEndpoint.startsWith('https://'));
	assert.ok(DAIKIN_MOBILE_CONFIG.scope.includes('offline_access'));
	console.log('oauth-mobile-app.test.ts: OK (config constants)');
}

try {
	run();
} catch (err) {
	console.error(err);
	process.exit(1);
}
