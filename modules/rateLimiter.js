"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.rateLimiter = void 0;
class RateLimiter {
    rateLimitInfo = null;
    retryQueue = [];
    isProcessingQueue = false;
    defaultConfig = {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        maxTotalDurationMs: 60 * 60 * 1000,
        skipWaitWhenRateLimited: false,
        refreshMode: false
    };
    updateRateLimit(rateLimitStatus) {
        this.rateLimitInfo = {
            limitMinute: rateLimitStatus.limitMinute || 0,
            remainingMinute: rateLimitStatus.remainingMinute || 0,
            limitDay: rateLimitStatus.limitDay || 0,
            remainingDay: rateLimitStatus.remainingMinute || 0,
            lastUpdate: Date.now()
        };
        logger.debug(`[rateLimiter.ts] => Rate limit updated - Minute: ${this.rateLimitInfo.remainingMinute}/${this.rateLimitInfo.limitMinute}, Day: ${this.rateLimitInfo.remainingDay}/${this.rateLimitInfo.limitDay}`);
    }
    async loadRateLimitFromCache() {
        try {
            const [limitMinute, remainingMinute, limitDay, remainingDay] = await Promise.all([
                cache.get('rate/limitMinute'),
                cache.get('rate/remainingMinute'),
                cache.get('rate/limitDay'),
                cache.get('rate/remainingDay')
            ]);
            if (limitMinute !== undefined && remainingMinute !== undefined) {
                this.rateLimitInfo = {
                    limitMinute: Number(limitMinute),
                    remainingMinute: Number(remainingMinute),
                    limitDay: limitDay !== undefined ? Number(limitDay) : 0,
                    remainingDay: remainingDay !== undefined ? Number(remainingDay) : 0,
                    lastUpdate: Date.now()
                };
                logger.debug(`[rateLimiter.ts] => Rate limit loaded from cache`);
            }
        }
        catch (error) {
            logger.warn(`[rateLimiter.ts] => Error loading rate limit from cache: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    canMakeRequest() {
        if (!this.rateLimitInfo) {
            return true;
        }
        const canMakeRequest = this.rateLimitInfo.remainingMinute > 0 && this.rateLimitInfo.remainingDay > 0;
        if (!canMakeRequest) {
            logger.warn(`[rateLimiter.ts] => Rate limit reached - Minute: ${this.rateLimitInfo.remainingMinute}/${this.rateLimitInfo.limitMinute}, Day: ${this.rateLimitInfo.remainingDay}/${this.rateLimitInfo.limitDay}`);
        }
        return canMakeRequest;
    }
    getWaitTime() {
        if (!this.rateLimitInfo) {
            return 0;
        }
        if (this.rateLimitInfo.remainingMinute > 0 && this.rateLimitInfo.remainingDay > 0) {
            return 0;
        }
        let waitTime = 0;
        if (this.rateLimitInfo.remainingMinute <= 0) {
            waitTime = Math.max(waitTime, 60000);
        }
        if (this.rateLimitInfo.remainingDay <= 0) {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const msUntilMidnight = tomorrow.getTime() - now.getTime();
            waitTime = Math.max(waitTime, msUntilMidnight);
        }
        return waitTime;
    }
    isRateLimitError(error) {
        if (!error)
            return false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorString = String(error).toLowerCase();
        const rateLimitPatterns = [
            'rate limit',
            'rate_limit',
            '429',
            'too many requests',
            'quota exceeded',
            'request limit',
            'throttle'
        ];
        return rateLimitPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern) ||
            errorString.includes(pattern));
    }
    isConnectivityError(error) {
        if (!error)
            return false;
        const err = error;
        const code = (err.code || '').toString().toUpperCase();
        const message = (err.message || String(error)).toLowerCase();
        const connectivityCodes = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENETUNREACH',
            'EHOSTUNREACH',
            'EAI_AGAIN'
        ];
        if (connectivityCodes.includes(code)) {
            return true;
        }
        const connectivityPatterns = [
            'network error',
            'network unreachable',
            'connect timeout',
            'timeout',
            'socket hang up',
            'connection refused',
            'failed to fetch',
            'dns',
        ];
        return connectivityPatterns.some(pattern => message.includes(pattern));
    }
    async executeWithRetry(operation, operationId, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = Date.now();
        let lastError;
        let attempt = 0;
        while (attempt <= finalConfig.maxRetries) {
            try {
                if (!this.canMakeRequest()) {
                    if (finalConfig.skipWaitWhenRateLimited) {
                        logger.warn(`[rateLimiter.ts] => Rate limit reached for ${operationId} and skipWaitWhenRateLimited is true, aborting without retry`);
                        throw new Error(`Rate limit reached for ${operationId}`);
                    }
                    const waitTime = this.getWaitTime();
                    if (waitTime > 0) {
                        logger.info(`[rateLimiter.ts] => Rate limit reached for ${operationId}, waiting ${Math.round(waitTime / 1000)}s`);
                        await this.wait(waitTime);
                        await this.loadRateLimitFromCache();
                        continue;
                    }
                }
                const result = await operation();
                if (attempt > 0) {
                    logger.info(`[rateLimiter.ts] => Operation ${operationId} succeeded after ${attempt} attempt(s)`);
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const elapsed = Date.now() - startTime;
                if (elapsed > finalConfig.maxTotalDurationMs) {
                    logger.error(`[rateLimiter.ts] => Maximum total duration (${Math.round(finalConfig.maxTotalDurationMs / 1000)}s) exceeded for ${operationId}, aborting`);
                    break;
                }
                attempt++;
                if (finalConfig.refreshMode && this.isConnectivityError(error)) {
                    logger.warn(`[rateLimiter.ts] => Connectivity error detected for refresh operation ${operationId} (attempt ${attempt}/${finalConfig.maxRetries + 1})`);
                    if (attempt > finalConfig.maxRetries) {
                        logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for refresh operation ${operationId}`);
                        break;
                    }
                    const delay = 60000;
                    logger.info(`[rateLimiter.ts] => Waiting ${Math.round(delay / 1000)}s before retry for refresh operation ${operationId} (connectivity issue)`);
                    await this.wait(delay);
                    continue;
                }
                if (this.isRateLimitError(error)) {
                    logger.warn(`[rateLimiter.ts] => Rate limit detected for ${operationId} (attempt ${attempt}/${finalConfig.maxRetries + 1})`);
                    if (finalConfig.refreshMode) {
                        const info = this.rateLimitInfo;
                        if (info && info.remainingDay <= 0) {
                            logger.error(`[rateLimiter.ts] => Daily rate limit reached for refresh operation ${operationId}, aborting without further retries`);
                            break;
                        }
                        if (attempt > finalConfig.maxRetries) {
                            logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for refresh operation ${operationId}`);
                            break;
                        }
                        const delay = 60000;
                        logger.info(`[rateLimiter.ts] => Waiting ${Math.round(delay / 1000)}s before retry for refresh operation ${operationId} (minute rate limit or unknown)`);
                        await this.wait(delay);
                        continue;
                    }
                    if (attempt > finalConfig.maxRetries) {
                        logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for ${operationId}`);
                        break;
                    }
                    const delay = Math.min(finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1), finalConfig.maxDelay);
                    const waitTime = this.getWaitTime();
                    const totalDelay = Math.max(delay, waitTime);
                    logger.info(`[rateLimiter.ts] => Waiting ${Math.round(totalDelay / 1000)}s before retry for ${operationId}`);
                    await this.wait(totalDelay);
                    await this.loadRateLimitFromCache();
                    continue;
                }
                logger.error(`[rateLimiter.ts] => Error not related to rate limit for ${operationId}: ${lastError.message}`);
                throw lastError;
            }
        }
        logger.error(`[rateLimiter.ts] => Final failure for ${operationId} after ${attempt} attempt(s)`);
        throw lastError || new Error(`Operation ${operationId} failed after ${finalConfig.maxRetries + 1} attempts`);
    }
    async queueOperation(operation, operationId, priority = 0, config = {}) {
        const item = {
            id: operationId,
            operation,
            priority,
            retryCount: 0,
            maxRetries: config.maxRetries || this.defaultConfig.maxRetries,
            lastAttempt: 0
        };
        this.retryQueue.push(item);
        this.retryQueue.sort((a, b) => b.priority - a.priority);
        logger.debug(`[rateLimiter.ts] => Operation ${operationId} added to queue (priority: ${priority}, queue: ${this.retryQueue.length})`);
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }
    async processQueue() {
        if (this.isProcessingQueue) {
            return;
        }
        this.isProcessingQueue = true;
        logger.debug(`[rateLimiter.ts] => Starting queue processing (${this.retryQueue.length} operation(s))`);
        while (this.retryQueue.length > 0) {
            const item = this.retryQueue.shift();
            if (!item)
                break;
            try {
                await this.executeWithRetry(item.operation, item.id, {
                    maxRetries: item.maxRetries
                });
                logger.debug(`[rateLimiter.ts] => Operation ${item.id} processed successfully from queue`);
            }
            catch (error) {
                logger.error(`[rateLimiter.ts] => Final failure of operation ${item.id} from queue: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        this.isProcessingQueue = false;
        logger.debug(`[rateLimiter.ts] => Queue processing finished`);
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getRateLimitInfo() {
        return this.rateLimitInfo;
    }
    reset() {
        this.rateLimitInfo = null;
        this.retryQueue = [];
        this.isProcessingQueue = false;
        logger.debug(`[rateLimiter.ts] => Rate limiter reset`);
    }
}
exports.RateLimiter = RateLimiter;
const rateLimiter = new RateLimiter();
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map