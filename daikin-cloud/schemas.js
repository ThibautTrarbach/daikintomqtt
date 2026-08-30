"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitStatusSchema = exports.TokenSetSchema = void 0;
exports.validateTokenSet = validateTokenSet;
const zod_1 = require("zod");
exports.TokenSetSchema = zod_1.z.object({
    access_token: zod_1.z.string(),
    refresh_token: zod_1.z.string().optional(),
    token_type: zod_1.z.string(),
    expires_in: zod_1.z.number().optional(),
    expires_at: zod_1.z.number().optional(),
    scope: zod_1.z.string().optional(),
});
exports.RateLimitStatusSchema = zod_1.z.object({
    limitMinute: zod_1.z.number().optional(),
    remainingMinute: zod_1.z.number().optional(),
    limitDay: zod_1.z.number().optional(),
    remainingDay: zod_1.z.number().optional(),
});
function validateTokenSet(data) {
    const result = exports.TokenSetSchema.safeParse(data);
    return result.success ? result.data : null;
}
//# sourceMappingURL=schemas.js.map