/**
 * Rate limiting management module with sophisticated retry logic
 */

interface RateLimitInfo {
	limitMinute: number;
	remainingMinute: number;
	limitDay: number;
	remainingDay: number;
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
}

class RateLimiter {
	private rateLimitInfo: RateLimitInfo | null = null;
	private retryQueue: RetryQueueItem[] = [];
	private isProcessingQueue = false;
	private defaultConfig: Required<RetryConfig> = {
		maxRetries: 5,
		baseDelay: 1000, // 1 second
		maxDelay: 60000, // 60 seconds
		backoffMultiplier: 2
	};

	/**
	 * Updates rate limiting information
	 */
	updateRateLimit(rateLimitStatus: any): void {
		this.rateLimitInfo = {
			limitMinute: rateLimitStatus.limitMinute || 0,
			remainingMinute: rateLimitStatus.remainingMinute || 0,
			limitDay: rateLimitStatus.limitDay || 0,
			remainingDay: rateLimitStatus.remainingMinute || 0,
			lastUpdate: Date.now()
		};

		logger.debug(`[rateLimiter.ts] => Rate limit updated - Minute: ${this.rateLimitInfo.remainingMinute}/${this.rateLimitInfo.limitMinute}, Day: ${this.rateLimitInfo.remainingDay}/${this.rateLimitInfo.limitDay}`);
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

		// Check limits per minute and per day
		const canMakeRequest = this.rateLimitInfo.remainingMinute > 0 && this.rateLimitInfo.remainingDay > 0;

		if (!canMakeRequest) {
			logger.warn(`[rateLimiter.ts] => Rate limit reached - Minute: ${this.rateLimitInfo.remainingMinute}/${this.rateLimitInfo.limitMinute}, Day: ${this.rateLimitInfo.remainingDay}/${this.rateLimitInfo.limitDay}`);
		}

		return canMakeRequest;
	}

	/**
	 * Calculates wait time needed before making a new request
	 */
	getWaitTime(): number {
		if (!this.rateLimitInfo) {
			return 0;
		}

		// If we still have requests available, no wait
		if (this.rateLimitInfo.remainingMinute > 0 && this.rateLimitInfo.remainingDay > 0) {
			return 0;
		}

		// Calculate wait time based on most restrictive limit
		let waitTime = 0;

		// If per-minute limit reached, wait until next minute
		if (this.rateLimitInfo.remainingMinute <= 0) {
			waitTime = Math.max(waitTime, 60000); // 1 minute minimum
		}

		// If per-day limit reached, wait until next day
		if (this.rateLimitInfo.remainingDay <= 0) {
			// Calculate time until midnight
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
	 * Executes an operation with automatic retry on rate limiting
	 */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationId: string,
		config: RetryConfig = {}
	): Promise<T> {
		const finalConfig = { ...this.defaultConfig, ...config };
		let lastError: Error | undefined;
		let attempt = 0;

		while (attempt <= finalConfig.maxRetries) {
			try {
				// Check if we can make the request
				if (!this.canMakeRequest()) {
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
				attempt++;

				// Check if it's a rate limiting error
				if (this.isRateLimitError(error)) {
					logger.warn(`[rateLimiter.ts] => Rate limit detected for ${operationId} (attempt ${attempt}/${finalConfig.maxRetries + 1})`);

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

				// If it's not a rate limiting error, propagate the error
				logger.error(`[rateLimiter.ts] => Error not related to rate limit for ${operationId}: ${lastError.message}`);
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

