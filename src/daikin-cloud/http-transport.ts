import * as https from 'node:https';
import * as http from 'node:http';
import { spawn } from 'node:child_process';
import { URL } from 'node:url';

export type HttpTransportMode = 'node' | 'curl';

let transportMode: HttpTransportMode = 'node';

function configureHttpTransport(mode?: HttpTransportMode): void {
	const envMode = process.env.DAIKIN_HTTP_TRANSPORT as HttpTransportMode | undefined;
	transportMode = mode ?? envMode ?? 'node';
}

function getHttpTransportMode(): HttpTransportMode {
	return transportMode;
}

interface HttpResponse {
	statusCode: number;
	headers: Record<string, string | string[] | undefined>;
	body: string;
}

function nodeHttpRequest(
	url: string,
	options: { method: string; headers?: Record<string, string> },
	postData?: string,
): Promise<HttpResponse> {
	return new Promise((resolve, reject) => {
		const parsed = new URL(url);
		const lib = parsed.protocol === 'https:' ? https : http;
		const req = lib.request(
			url,
			{
				method: options.method,
				headers: options.headers,
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode ?? 0,
						headers: res.headers as Record<string, string | string[] | undefined>,
						body: Buffer.concat(chunks).toString('utf8'),
					});
				});
			},
		);
		req.on('error', reject);
		req.setTimeout(30_000, () => {
			req.destroy(new Error(`Request to ${parsed.hostname} timed out after 30000ms`));
		});
		if (postData) {
			req.write(postData);
		}
		req.end();
	});
}

function curlHttpRequest(
	url: string,
	options: { method: string; headers?: Record<string, string> },
	postData?: string,
): Promise<HttpResponse> {
	return new Promise((resolve, reject) => {
		const args = ['-sS', '-X', options.method, '-w', '\n%{http_code}', '--max-time', '30'];
		if (options.headers) {
			for (const [key, value] of Object.entries(options.headers)) {
				args.push('-H', `${key}: ${value}`);
			}
		}
		if (postData !== undefined) {
			args.push('-d', postData);
		}
		args.push(url);

		const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d) => { stdout += d.toString(); });
		child.stderr.on('data', (d) => { stderr += d.toString(); });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(stderr || `curl exited with code ${code}`));
				return;
			}
			const lastNewline = stdout.lastIndexOf('\n');
			const statusCode = parseInt(stdout.slice(lastNewline + 1).trim(), 10) || 0;
			const body = stdout.slice(0, lastNewline);
			resolve({ statusCode, headers: {}, body });
		});
	});
}

async function httpRequest(
	url: string,
	options: { method: string; headers?: Record<string, string> },
	postData?: string,
): Promise<HttpResponse> {
	if (getHttpTransportMode() === 'curl') {
		return curlHttpRequest(url, options, postData);
	}
	return nodeHttpRequest(url, options, postData);
}

export {
	configureHttpTransport,
	getHttpTransportMode,
	httpRequest,
};
