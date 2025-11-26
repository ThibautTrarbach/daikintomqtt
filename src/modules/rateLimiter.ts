/**
 * Module de gestion du rate limiting avec logique de retry sophistiquée
 */

interface RateLimitInfo {
	limitMinute: number;
	remainingMinute: number;
	limitDay: number;
	remainingDay: number;
	lastUpdate: number; // Timestamp de la dernière mise à jour
}

interface RetryQueueItem {
	id: string;
	operation: () => Promise<any>;
	priority: number; // Plus élevé = plus prioritaire
	retryCount: number;
	maxRetries: number;
	lastAttempt: number;
	error?: Error;
}

interface RetryConfig {
	maxRetries?: number;
	baseDelay?: number; // Délai de base en ms
	maxDelay?: number; // Délai maximum en ms
	backoffMultiplier?: number; // Multiplicateur pour le backoff exponentiel
}

class RateLimiter {
	private rateLimitInfo: RateLimitInfo | null = null;
	private retryQueue: RetryQueueItem[] = [];
	private isProcessingQueue = false;
	private defaultConfig: Required<RetryConfig> = {
		maxRetries: 5,
		baseDelay: 1000, // 1 seconde
		maxDelay: 60000, // 60 secondes
		backoffMultiplier: 2
	};

	/**
	 * Met à jour les informations de rate limiting
	 */
	updateRateLimit(rateLimitStatus: any): void {
		this.rateLimitInfo = {
			limitMinute: rateLimitStatus.limitMinute || 0,
			remainingMinute: rateLimitStatus.remainingMinute || 0,
			limitDay: rateLimitStatus.limitDay || 0,
			remainingDay: rateLimitStatus.remainingMinute || 0,
			lastUpdate: Date.now()
		};

		logger.debug(`[rateLimiter.ts] => Rate limit mis à jour - Minute: ${this.rateLimitInfo.remainingMinute}/${this.rateLimitInfo.limitMinute}, Jour: ${this.rateLimitInfo.remainingDay}/${this.rateLimitInfo.limitDay}`);
	}

	/**
	 * Charge les informations de rate limiting depuis le cache
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
				logger.debug(`[rateLimiter.ts] => Rate limit chargé depuis le cache`);
			}
		} catch (error) {
			logger.warn(`[rateLimiter.ts] => Erreur lors du chargement du rate limit depuis le cache: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Vérifie si une requête peut être effectuée maintenant
	 */
	canMakeRequest(): boolean {
		if (!this.rateLimitInfo) {
			// Si on n'a pas d'info, on autorise (première requête)
			return true;
		}

		// Vérifier les limites par minute et par jour
		const canMakeRequest = this.rateLimitInfo.remainingMinute > 0 && this.rateLimitInfo.remainingDay > 0;

		if (!canMakeRequest) {
			logger.warn(`[rateLimiter.ts] => Rate limit atteint - Minute: ${this.rateLimitInfo.remainingMinute}/${this.rateLimitInfo.limitMinute}, Jour: ${this.rateLimitInfo.remainingDay}/${this.rateLimitInfo.limitDay}`);
		}

		return canMakeRequest;
	}

	/**
	 * Calcule le temps d'attente nécessaire avant de pouvoir faire une nouvelle requête
	 */
	getWaitTime(): number {
		if (!this.rateLimitInfo) {
			return 0;
		}

		// Si on a encore des requêtes disponibles, pas d'attente
		if (this.rateLimitInfo.remainingMinute > 0 && this.rateLimitInfo.remainingDay > 0) {
			return 0;
		}

		// Calculer le temps d'attente basé sur la limite la plus restrictive
		let waitTime = 0;

		// Si limite par minute atteinte, attendre jusqu'à la prochaine minute
		if (this.rateLimitInfo.remainingMinute <= 0) {
			waitTime = Math.max(waitTime, 60000); // 1 minute minimum
		}

		// Si limite par jour atteinte, attendre jusqu'au prochain jour
		if (this.rateLimitInfo.remainingDay <= 0) {
			// Calculer le temps jusqu'à minuit
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
	 * Détecte si une erreur est liée au rate limiting
	 */
	isRateLimitError(error: any): boolean {
		if (!error) return false;

		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorString = String(error).toLowerCase();

		// Patterns d'erreur de rate limiting
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
	 * Exécute une opération avec retry automatique en cas de rate limiting
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
				// Vérifier si on peut faire la requête
				if (!this.canMakeRequest()) {
					const waitTime = this.getWaitTime();
					if (waitTime > 0) {
						logger.info(`[rateLimiter.ts] => Rate limit atteint pour ${operationId}, attente de ${Math.round(waitTime / 1000)}s`);
						await this.wait(waitTime);
						// Recharger les infos depuis le cache après l'attente
						await this.loadRateLimitFromCache();
						continue;
					}
				}

				// Exécuter l'opération
				const result = await operation();
				
				// Si succès et ce n'était pas le premier essai, logger
				if (attempt > 0) {
					logger.info(`[rateLimiter.ts] => Opération ${operationId} réussie après ${attempt} tentative(s)`);
				}

				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				attempt++;

				// Vérifier si c'est une erreur de rate limiting
				if (this.isRateLimitError(error)) {
					logger.warn(`[rateLimiter.ts] => Rate limit détecté pour ${operationId} (tentative ${attempt}/${finalConfig.maxRetries + 1})`);

					if (attempt > finalConfig.maxRetries) {
						logger.error(`[rateLimiter.ts] => Nombre maximum de tentatives atteint pour ${operationId}`);
						break;
					}

					// Calculer le délai avec backoff exponentiel
					const delay = Math.min(
						finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
						finalConfig.maxDelay
					);

					// Ajouter le temps d'attente du rate limit si nécessaire
					const waitTime = this.getWaitTime();
					const totalDelay = Math.max(delay, waitTime);

					logger.info(`[rateLimiter.ts] => Attente de ${Math.round(totalDelay / 1000)}s avant retry pour ${operationId}`);
					await this.wait(totalDelay);

					// Recharger les infos depuis le cache après l'attente
					await this.loadRateLimitFromCache();
					continue;
				}

				// Si ce n'est pas une erreur de rate limiting, propager l'erreur
				logger.error(`[rateLimiter.ts] => Erreur non liée au rate limit pour ${operationId}: ${lastError.message}`);
				throw lastError;
			}
		}

		// Si on arrive ici, toutes les tentatives ont échoué
		logger.error(`[rateLimiter.ts] => Échec définitif pour ${operationId} après ${attempt} tentative(s)`);
		throw lastError || new Error(`Échec de l'opération ${operationId} après ${finalConfig.maxRetries + 1} tentatives`);
	}

	/**
	 * Ajoute une opération à la file d'attente de retry
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
		this.retryQueue.sort((a, b) => b.priority - a.priority); // Trier par priorité décroissante

		logger.debug(`[rateLimiter.ts] => Opération ${operationId} ajoutée à la file d'attente (priorité: ${priority}, file: ${this.retryQueue.length})`);

		// Démarrer le traitement de la file si ce n'est pas déjà en cours
		if (!this.isProcessingQueue) {
			this.processQueue();
		}
	}

	/**
	 * Traite la file d'attente de retry
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue) {
			return;
		}

		this.isProcessingQueue = true;
		logger.debug(`[rateLimiter.ts] => Démarrage du traitement de la file d'attente (${this.retryQueue.length} opération(s))`);

		while (this.retryQueue.length > 0) {
			const item = this.retryQueue.shift();
			if (!item) break;

			try {
				await this.executeWithRetry(item.operation, item.id, {
					maxRetries: item.maxRetries
				});
				logger.debug(`[rateLimiter.ts] => Opération ${item.id} traitée avec succès depuis la file`);
			} catch (error) {
				logger.error(`[rateLimiter.ts] => Échec définitif de l'opération ${item.id} depuis la file: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		this.isProcessingQueue = false;
		logger.debug(`[rateLimiter.ts] => Fin du traitement de la file d'attente`);
	}

	/**
	 * Attend un certain temps
	 */
	private wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Obtient les informations de rate limiting actuelles
	 */
	getRateLimitInfo(): RateLimitInfo | null {
		return this.rateLimitInfo;
	}

	/**
	 * Réinitialise le rate limiter
	 */
	reset(): void {
		this.rateLimitInfo = null;
		this.retryQueue = [];
		this.isProcessingQueue = false;
		logger.debug(`[rateLimiter.ts] => Rate limiter réinitialisé`);
	}
}

// Instance singleton
const rateLimiter = new RateLimiter();

export {
	rateLimiter,
	RateLimiter,
	RateLimitInfo,
	RetryQueueItem,
	RetryConfig
};

