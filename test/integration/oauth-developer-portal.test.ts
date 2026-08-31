/**
 * Smoke test for OAuth mock server (Developer Portal flow endpoints).
 * Run: npx ts-node test/integration/oauth-developer-portal.test.ts
 */

import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { OAuthMockServer } from '../mocks/oauth-mock-server';

function httpGet(url: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders }> {
	return new Promise((resolve, reject) => {
		http.get(url, (res) => {
			res.resume();
			resolve({ statusCode: res.statusCode ?? 0, headers: res.headers });
		}).on('error', reject);
	});
}

async function run(): Promise<void> {
	const server = new OAuthMockServer();
	const port = await server.start(18766);
	assert.ok(port > 0, `expected bound port, got ${port}`);

	try {
		const authRes = await httpGet(`http://127.0.0.1:${port}/v1/oidc/authorize?redirect_uri=http://127.0.0.1/cb&state=abc`);
		assert.equal(authRes.statusCode, 302);
		assert.match(String(authRes.headers.location ?? ''), /code=mock_code/);
		console.log('oauth-developer-portal.test.ts: OK');
	} finally {
		await server.stop();
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
