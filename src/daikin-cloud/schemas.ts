import { z } from 'zod';

export const TokenSetSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().optional(),
	token_type: z.string(),
	expires_in: z.number().optional(),
	expires_at: z.number().optional(),
	scope: z.string().optional(),
});

export const RateLimitStatusSchema = z.object({
	limitMinute: z.number().optional(),
	remainingMinute: z.number().optional(),
	limitDay: z.number().optional(),
	remainingDay: z.number().optional(),
});

export type TokenSetValidated = z.infer<typeof TokenSetSchema>;

function validateTokenSet(data: unknown): TokenSetValidated | null {
	const result = TokenSetSchema.safeParse(data);
	return result.success ? result.data : null;
}

export {
	validateTokenSet,
};
