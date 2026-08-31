/**
 * Minimal OAuth mock server for integration tests (inspired by mp-consulting IMPLEMENTATION_GUIDE).
 */

import * as http from 'node:http';

export class OAuthMockServer {
	private server: http.Server | null = null;
	private port = 0;

	async start(preferredPort = 18765): Promise<number> {
		return new Promise((resolve, reject) => {
			this.server = http.createServer((req, res) => {
				const url = new URL(req.url ?? '/', `http://127.0.0.1:${preferredPort}`);
				if (url.pathname === '/v1/oidc/authorize') {
					const redirectUri = url.searchParams.get('redirect_uri') ?? 'http://127.0.0.1/callback';
					const state = url.searchParams.get('state') ?? '';
					res.writeHead(302, { Location: `${redirectUri}?code=mock_code&state=${state}` });
					res.end();
					return;
				}
				if (url.pathname === '/v1/oidc/token' && req.method === 'POST') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						access_token: 'mock_access_token',
						refresh_token: 'mock_refresh_token',
						token_type: 'Bearer',
						expires_in: 3600,
					}));
					return;
				}
				res.writeHead(404);
				res.end();
			});

			this.server.listen(preferredPort, '127.0.0.1', () => {
				const addr = this.server!.address();
				this.port = typeof addr === 'object' && addr ? addr.port : preferredPort;
				resolve(this.port);
			});
			this.server.on('error', reject);
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.server) {
				resolve();
				return;
			}
			this.server.close(() => resolve());
		});
	}

	getPort(): number {
		return this.port;
	}
}
