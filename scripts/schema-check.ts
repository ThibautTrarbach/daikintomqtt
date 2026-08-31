/**
 * Validates core Zod schemas used for token/rate-limit parsing.
 * Run: npm run schema:check
 */

import { TokenSetSchema, RateLimitStatusSchema } from '../src/daikin-cloud/schemas';

function run(): void {
	const token = TokenSetSchema.safeParse({
		access_token: 'abc',
		token_type: 'Bearer',
		expires_in: 3600,
	});
	if (!token.success) {
		throw new Error(`TokenSetSchema failed: ${token.error.message}`);
	}

	const rate = RateLimitStatusSchema.safeParse({
		limitDay: 200,
		remainingDay: 150,
	});
	if (!rate.success) {
		throw new Error(`RateLimitStatusSchema failed: ${rate.error.message}`);
	}

	console.log('schema:check OK');
}

run();
