/**
 * Rate limiting management module with sophisticated retry logic
 */

interface RateLimitInfo {
	limitMinute?: number;
	remainingMinute?: number;
	limitDay?: number;
	remainingDay?: number;
	lastUpdate: number; // Timestamp of last update
}

interface RetryQueueItem {
	id: string;
	operation: () => Promise<any>;
	priority: number; // Higher = more priority
	retryCount: number;
	maxRetries: number;
	lastAttempt: number;
	error?: Error;
}

interface RetryConfig {
	maxRetries?: number;
	baseDelay?: number; // Base delay in ms
	maxDelay?: number; // Maximum delay in ms
	backoffMultiplier?: number; // Multiplier for exponential backoff
	maxTotalDurationMs?: number; // Maximum total duration for retries
	skipWaitWhenRateLimited?: boolean; // If true, do not wait when rate limited, fail fast
	refreshMode?: boolean; // Special mode for refresh operations (3 tries every minute, no retry on daily limit)
}

class RateLimiter {
	private rateLimitInfo: RateLimitInfo | null = null;
	private retryQueue: RetryQueueItem[] = [];
	private isProcessingQueue = false;
	private defaultConfig: Required<RetryConfig> = {
		maxRetries: 5,
		baseDelay: 1000, // 1 second
		maxDelay: 60000, // 60 seconds
		backoffMultiplier: 2,
		// By default, an action is valid for at most 1 hour
		maxTotalDurationMs: 60 * 60 * 1000,
		skipWaitWhenRateLimited: false,
		refreshMode: false
	};

	/**
	 * Updates rate limiting information (merges partial HTTP header updates).
	 */
	updateRateLimit(rateLimitStatus: any): void {
		const previous = this.rateLimitInfo;
		this.rateLimitInfo = {
			limitMinute: rateLimitStatus.limitMinute !== undefined
				? rateLimitStatus.limitMinute
				: previous?.limitMinute,
			remainingMinute: rateLimitStatus.remainingMinute !== undefined
				? rateLimitStatus.remainingMinute
				: previous?.remainingMinute,
			limitDay: rateLimitStatus.limitDay !== undefined
				? rateLimitStatus.limitDay
				: previous?.limitDay,
			remainingDay: rateLimitStatus.remainingDay !== undefined
				? rateLimitStatus.remainingDay
				: previous?.remainingDay,
			lastUpdate: Date.now(),
		};

		logger.debug(`[rateLimiter.ts] => Rate limit updated - Minute: ${this.formatLimit(this.rateLimitInfo.remainingMinute, this.rateLimitInfo.limitMinute)}, Day: ${this.formatLimit(this.rateLimitInfo.remainingDay, this.rateLimitInfo.limitDay)}`);
	}

	private formatLimit(remaining?: number, limit?: number): string {
		if (limit == null || limit <= 0) {
			return 'n/a';
		}
		return `${remaining ?? '?'}/${limit}`;
	}

	private isMinuteLimitBlocking(): boolean {
		if (!this.rateLimitInfo) {
			return false;
		}
		const { limitMinute, remainingMinute } = this.rateLimitInfo;
		return limitMinute != null && limitMinute > 0 && (remainingMinute ?? 0) <= 0;
	}

	private isDayLimitBlocking(): boolean {
		if (!this.rateLimitInfo) {
			return false;
		}
		const { limitDay, remainingDay } = this.rateLimitInfo;
		return limitDay != null && limitDay > 0 && (remainingDay ?? 0) <= 0;
	}

	/**
	 * Loads rate limiting information from cache
	 */
	async loadRateLimitFromCache(): Promise<void> {
		try {
			const [limitMinute, remainingMinute, limitDay, remainingDay] = await Promise.all([
				cache.get('rate/limitMinute'),
				cache.get('rate/remainingMinute'),
				cache.get('rate/limitDay'),
				cache.get('rate/remainingDay')
			]);

			if (
				limitMinute !== undefined || remainingMinute !== undefined
				|| limitDay !== undefined || remainingDay !== undefined
			) {
				const previous = this.rateLimitInfo;
				this.rateLimitInfo = {
					limitMinute: limitMinute !== undefined
						? (Number(limitMinute) || undefined)
						: previous?.limitMinute,
					remainingMinute: remainingMinute !== undefined
						? Number(remainingMinute)
						: previous?.remainingMinute,
					limitDay: limitDay !== undefined
						? (Number(limitDay) || undefined)
						: previous?.limitDay,
					remainingDay: remainingDay !== undefined
						? Number(remainingDay)
						: previous?.remainingDay,
					lastUpdate: Date.now(),
				};
				logger.debug(`[rateLimiter.ts] => Rate limit loaded from cache`);
			}
		} catch (error) {
			logger.warn(`[rateLimiter.ts] => Error loading rate limit from cache: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Checks if a request can be made now
	 */
	canMakeRequest(): boolean {
		if (!this.rateLimitInfo) {
			// If we don't have info, allow (first request)
			return true;
		}

		if (this.isDayLimitBlocking()) {
			logger.warn(`[rateLimiter.ts] => Daily rate limit reached - Day: ${this.formatLimit(this.rateLimitInfo.remainingDay, this.rateLimitInfo.limitDay)}`);
			return false;
		}

		if (this.isMinuteLimitBlocking()) {
			logger.warn(`[rateLimiter.ts] => Minute rate limit reached - Minute: ${this.formatLimit(this.rateLimitInfo.remainingMinute, this.rateLimitInfo.limitMinute)}`);
			return false;
		}

		return true;
	}

	/**
	 * Calculates wait time needed before making a new request
	 */
	getWaitTime(): number {
		if (!this.rateLimitInfo) {
			return 0;
		}

		if (!this.isMinuteLimitBlocking() && !this.isDayLimitBlocking()) {
			return 0;
		}

		let waitTime = 0;

		if (this.isMinuteLimitBlocking()) {
			waitTime = Math.max(waitTime, 60000); // 1 minute minimum
		}

		if (this.isDayLimitBlocking()) {
			const now = new Date();
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(0, 0, 0, 0);
			const msUntilMidnight = tomorrow.getTime() - now.getTime();
			waitTime = Math.max(waitTime, msUntilMidnight);
		}

		return waitTime;
	}

	/**
	 * Detects if an error is related to rate limiting
	 */
	isRateLimitError(error: any): boolean {
		if (!error) return false;

		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorString = String(error).toLowerCase();

		// Rate limiting error patterns
		const rateLimitPatterns = [
			'rate limit',
			'rate_limit',
			'429',
			'too many requests',
			'quota exceeded',
			'request limit',
			'throttle'
		];

		return rateLimitPatterns.some(pattern => 
			errorMessage.toLowerCase().includes(pattern) || 
			errorString.includes(pattern)
		);
	}

	/**
	 * Detects if an error is related to connectivity / network issues
	 */
	private isConnectivityError(error: any): boolean {
		if (!error) return false;

		const err: any = error;
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

	/**
	 * Executes an operation with automatic retry on rate limiting
	 */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationId: string,
		config: RetryConfig = {}
	): Promise<T> {
		const finalConfig = { ...this.defaultConfig, ...config };
		const startTime = Date.now();
		let lastError: Error | undefined;
		let attempt = 0;

		while (attempt <= finalConfig.maxRetries) {
			try {
				// Check if we can make the request
				if (!this.canMakeRequest()) {
					if (finalConfig.skipWaitWhenRateLimited) {
						logger.warn(`[rateLimiter.ts] => Rate limit reached for ${operationId} and skipWaitWhenRateLimited is true, aborting without retry`);
						throw new Error(`Rate limit reached for ${operationId}`);
					}
					
					const waitTime = this.getWaitTime();
					if (waitTime > 0) {
						logger.info(`[rateLimiter.ts] => Rate limit reached for ${operationId}, waiting ${Math.round(waitTime / 1000)}s`);
						await this.wait(waitTime);
						// Reload info from cache after wait
						await this.loadRateLimitFromCache();
						continue;
					}
				}

				// Execute operation
				const result = await operation();
				
				// If success and it wasn't the first attempt, log
				if (attempt > 0) {
					logger.info(`[rateLimiter.ts] => Operation ${operationId} succeeded after ${attempt} attempt(s)`);
				}

				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				
				// Check total duration for this operation
				const elapsed = Date.now() - startTime;
				if (elapsed > finalConfig.maxTotalDurationMs) {
					logger.error(`[rateLimiter.ts] => Maximum total duration (${Math.round(finalConfig.maxTotalDurationMs / 1000)}s) exceeded for ${operationId}, aborting`);
					break;
				}
				attempt++;

				// Special handling for refresh operations
				if (finalConfig.refreshMode && this.isConnectivityError(error)) {
					logger.warn(`[rateLimiter.ts] => Connectivity error detected for refresh operation ${operationId} (attempt ${attempt}/${finalConfig.maxRetries + 1})`);

					if (attempt > finalConfig.maxRetries) {
						logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for refresh operation ${operationId}`);
						break;
					}

					const delay = 60000; // 60 seconds between tries for refresh
					logger.info(`[rateLimiter.ts] => Waiting ${Math.round(delay / 1000)}s before retry for refresh operation ${operationId} (connectivity issue)`);
					await this.wait(delay);
					continue;
				}

				// Check if it's a rate limiting error
				if (this.isRateLimitError(error)) {
					logger.warn(`[rateLimiter.ts] => Rate limit detected for ${operationId} (attempt ${attempt}/${finalConfig.maxRetries + 1})`);

					// Special rules for refresh operations:
					// - If daily limit is reached, do not retry (abort)
					// - If minute limit is reached (or unknown), retry up to maxRetries, every 60s
					if (finalConfig.refreshMode) {
						const info = this.rateLimitInfo;

						if (info && info.limitDay != null && info.limitDay > 0 && (info.remainingDay ?? 0) <= 0) {
							logger.error(`[rateLimiter.ts] => Daily rate limit reached for refresh operation ${operationId}, aborting without further retries`);
							break;
						}

						if (attempt > finalConfig.maxRetries) {
							logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for refresh operation ${operationId}`);
							break;
						}

						const delay = 60000; // 60 seconds between tries for refresh
						logger.info(`[rateLimiter.ts] => Waiting ${Math.round(delay / 1000)}s before retry for refresh operation ${operationId} (minute rate limit or unknown)`);
						await this.wait(delay);
						continue;
					}

					if (attempt > finalConfig.maxRetries) {
						logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for ${operationId}`);
						break;
					}

					// Calculate delay with exponential backoff
					const delay = Math.min(
						finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
						finalConfig.maxDelay
					);

					// Add rate limit wait time if necessary
					const waitTime = this.getWaitTime();
					const totalDelay = Math.max(delay, waitTime);

					logger.info(`[rateLimiter.ts] => Waiting ${Math.round(totalDelay / 1000)}s before retry for ${operationId}`);
					await this.wait(totalDelay);

					// Reload info from cache after wait
					await this.loadRateLimitFromCache();
					continue;
				}

				// Check if it's a connectivity error (timeout, network issues, etc.)
				if (this.isConnectivityError(error)) {
					logger.warn(`[rateLimiter.ts] => Connectivity error detected for ${operationId} (attempt ${attempt}/${finalConfig.maxRetries + 1}): ${lastError.message}`);
					
					if (attempt > finalConfig.maxRetries) {
						logger.error(`[rateLimiter.ts] => Maximum number of attempts reached for ${operationId} (connectivity issue)`);
						break;
					}
					
					// Calculate delay with exponential backoff for connectivity errors
					const delay = Math.min(
						finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
						finalConfig.maxDelay
					);
					
					logger.info(`[rateLimiter.ts] => Waiting ${Math.round(delay / 1000)}s before retry for ${operationId} (connectivity issue)`);
					await this.wait(delay);
					continue;
				}
				
				// If it's not a rate limiting or connectivity error, propagate the error
				logger.error(`[rateLimiter.ts] => Error not related to rate limit or connectivity for ${operationId}: ${lastError.message}`);
				throw lastError;
			}
		}

		// If we get here, all attempts failed
		logger.error(`[rateLimiter.ts] => Final failure for ${operationId} after ${attempt} attempt(s)`);
		throw lastError || new Error(`Operation ${operationId} failed after ${finalConfig.maxRetries + 1} attempts`);
	}

	/**
	 * Adds an operation to the retry queue
	 */
	async queueOperation(
		operation: () => Promise<any>,
		operationId: string,
		priority: number = 0,
		config: RetryConfig = {}
	): Promise<void> {
		const item: RetryQueueItem = {
			id: operationId,
			operation,
			priority,
			retryCount: 0,
			maxRetries: config.maxRetries || this.defaultConfig.maxRetries,
			lastAttempt: 0
		};

		this.retryQueue.push(item);
		this.retryQueue.sort((a, b) => b.priority - a.priority); // Sort by descending priority

		logger.debug(`[rateLimiter.ts] => Operation ${operationId} added to queue (priority: ${priority}, queue: ${this.retryQueue.length})`);

		// Start queue processing if not already in progress
		if (!this.isProcessingQueue) {
			this.processQueue();
		}
	}

	/**
	 * Processes the retry queue
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue) {
			return;
		}

		this.isProcessingQueue = true;
		logger.debug(`[rateLimiter.ts] => Starting queue processing (${this.retryQueue.length} operation(s))`);

		while (this.retryQueue.length > 0) {
			const item = this.retryQueue.shift();
			if (!item) break;

			try {
				await this.executeWithRetry(item.operation, item.id, {
					maxRetries: item.maxRetries
				});
				logger.debug(`[rateLimiter.ts] => Operation ${item.id} processed successfully from queue`);
			} catch (error) {
				logger.error(`[rateLimiter.ts] => Final failure of operation ${item.id} from queue: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		this.isProcessingQueue = false;
		logger.debug(`[rateLimiter.ts] => Queue processing finished`);
	}

	/**
	 * Waits for a certain amount of time
	 */
	private wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Gets current rate limiting information
	 */
	getRateLimitInfo(): RateLimitInfo | null {
		return this.rateLimitInfo;
	}

	/**
	 * Resets the rate limiter
	 */
	reset(): void {
		this.rateLimitInfo = null;
		this.retryQueue = [];
		this.isProcessingQueue = false;
		logger.debug(`[rateLimiter.ts] => Rate limiter reset`);
	}
}

// Singleton instance
const rateLimiter = new RateLimiter();

export {
	rateLimiter,
	RateLimiter,
	RateLimitInfo,
	RetryQueueItem,
	RetryConfig
};

