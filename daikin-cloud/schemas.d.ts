import { z } from 'zod';
export declare const TokenSetSchema: z.ZodObject<{
    access_token: z.ZodString;
    refresh_token: z.ZodOptional<z.ZodString>;
    token_type: z.ZodString;
    expires_in: z.ZodOptional<z.ZodNumber>;
    expires_at: z.ZodOptional<z.ZodNumber>;
    scope: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RateLimitStatusSchema: z.ZodObject<{
    limitMinute: z.ZodOptional<z.ZodNumber>;
    remainingMinute: z.ZodOptional<z.ZodNumber>;
    limitDay: z.ZodOptional<z.ZodNumber>;
    remainingDay: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type TokenSetValidated = z.infer<typeof TokenSetSchema>;
declare function validateTokenSet(data: unknown): TokenSetValidated | null;
export { validateTokenSet, };
