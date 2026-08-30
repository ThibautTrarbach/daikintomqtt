interface RateLimitInfo {
    limitMinute?: number;
    remainingMinute?: number;
    limitDay?: number;
    remainingDay?: number;
    lastUpdate: number;
}
interface RetryQueueItem {
    id: string;
    operation: () => Promise<any>;
    priority: number;
    retryCount: number;
    maxRetries: number;
    lastAttempt: number;
    error?: Error;
}
interface RetryConfig {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    maxTotalDurationMs?: number;
    skipWaitWhenRateLimited?: boolean;
    refreshMode?: boolean;
}
declare class RateLimiter {
    private rateLimitInfo;
    private retryQueue;
    private isProcessingQueue;
    private defaultConfig;
    updateRateLimit(rateLimitStatus: any): void;
    private formatLimit;
    private isMinuteLimitBlocking;
    private isDayLimitBlocking;
    loadRateLimitFromCache(): Promise<void>;
    canMakeRequest(): boolean;
    getWaitTime(): number;
    isRateLimitError(error: any): boolean;
    private isConnectivityError;
    executeWithRetry<T>(operation: () => Promise<T>, operationId: string, config?: RetryConfig): Promise<T>;
    queueOperation(operation: () => Promise<any>, operationId: string, priority?: number, config?: RetryConfig): Promise<void>;
    private processQueue;
    private wait;
    getRateLimitInfo(): RateLimitInfo | null;
    reset(): void;
}
declare const rateLimiter: RateLimiter;
export { rateLimiter, RateLimiter, RateLimitInfo, RetryQueueItem, RetryConfig };
