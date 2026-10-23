import * as fs from 'node:fs';
import type { TokenSet } from './types';

const TOKEN_FILE_MODE = 0o600;

function loadTokenFromFile(filePath: string): TokenSet | null {
	try {
		if (fs.existsSync(filePath)) {
			const data = fs.readFileSync(filePath, 'utf8');
			const parsed = JSON.parse(data) as TokenSet;
			if (parsed && typeof parsed.access_token === 'string') {
				if (parsed.expires_in && !parsed.expires_at) {
					parsed.expires_at = Math.floor(Date.now() / 1000) + parsed.expires_in;
				}
				return parsed;
			}
		}
	} catch {
		// treat as missing
	}
	return null;
}

function saveTokenToFile(filePath: string, tokenSet: TokenSet): void {
	fs.writeFileSync(filePath, JSON.stringify(tokenSet, null, 2), {
		encoding: 'utf8',
		mode: TOKEN_FILE_MODE,
	});
}

function deleteTokenFile(filePath: string): void {
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch {
		// ignore
	}
}

export {
	loadTokenFromFile,
	saveTokenToFile,
	deleteTokenFile,
	TOKEN_FILE_MODE,
};
