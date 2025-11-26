import cron from "node-cron";
import {sendDevice, timeUpdate} from "./daikin";

/**
 * Détermine si on est actuellement en période nuit
 */
function isNightTime(): boolean {
	const now = new Date();
	const currentHour = now.getHours();
	
	const pollingConfig = config.system.polling;
	if (!pollingConfig) {
		// Par défaut, si pas de config, on considère qu'on est en journée
		return false;
	}
	
	const nightStart = pollingConfig.nightStart ?? 22;
	const nightEnd = pollingConfig.nightEnd ?? 7;
	
	// Gestion du cas où la période nuit traverse minuit (ex: 22h-7h)
	if (nightStart > nightEnd) {
		// Période nuit qui traverse minuit (ex: 22h à 7h)
		return currentHour >= nightStart || currentHour < nightEnd;
	} else {
		// Période nuit dans la même journée (ex: 0h à 6h)
		return currentHour >= nightStart && currentHour < nightEnd;
	}
}

/**
 * Récupère l'intervalle de polling actuel en fonction de l'heure
 */
function getCurrentPollingInterval(): number {
	const pollingConfig = config.system.polling;
	if (!pollingConfig) {
		// Par défaut, 10 minutes si pas de config
		return 10;
	}
	
	return isNightTime() 
		? (pollingConfig.nightInterval ?? 20)
		: (pollingConfig.dayInterval ?? 10);
}

/**
 * Calcule le temps jusqu'au prochain intervalle en millisecondes
 */
function getTimeUntilNextInterval(): number {
	const intervalMinutes = getCurrentPollingInterval();
	const now = new Date();
	const currentMinutes = now.getMinutes();
	const currentSeconds = now.getSeconds();
	
	// Calculer les secondes écoulées dans l'heure actuelle
	const secondsInCurrentHour = currentMinutes * 60 + currentSeconds;
	
	// Calculer le prochain intervalle (en secondes)
	const intervalSeconds = intervalMinutes * 60;
	
	// Calculer le temps jusqu'au prochain intervalle
	const nextInterval = Math.ceil(secondsInCurrentHour / intervalSeconds) * intervalSeconds;
	const timeUntilNext = (nextInterval - secondsInCurrentHour) * 1000;
	
	return timeUntilNext;
}

let pollingTimer: NodeJS.Timeout | null = null;

/**
 * Planifie le prochain polling en fonction de l'heure actuelle
 */
function scheduleNextPolling() {
	// Annuler le timer précédent s'il existe
	if (pollingTimer) {
		clearTimeout(pollingTimer);
	}
	
	const timeUntilNext = getTimeUntilNextInterval();
	const isNight = isNightTime();
	const interval = getCurrentPollingInterval();
	
	logger.debug(`[cron.ts] => Prochain polling dans ${Math.round(timeUntilNext / 1000)}s (${isNight ? 'nuit' : 'jour'} - intervalle: ${interval}min)`);
	
	pollingTimer = setTimeout(async () => {
		const currentIsNight = isNightTime();
		logger.info(`[cron.ts] => CRON - Daikin Polling = START (${currentIsNight ? 'nuit' : 'jour'})`);
		try {
			await sendDevice(null, true);
			logger.info(`[cron.ts] => CRON - Daikin Polling = SUCCESS (${currentIsNight ? 'nuit' : 'jour'})`);
		} catch (error) {
			logger.error(`[cron.ts] => CRON - Erreur lors du polling Daikin: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
			}
		} finally {
			// Planifier le prochain polling même en cas d'erreur
			scheduleNextPolling();
		}
	}, timeUntilNext);
}

async function loadCron() {
	try {
		// Configuration par défaut si non définie
		if (!config.system.polling) {
			config.system.polling = {
				dayInterval: 10,
				nightInterval: 20,
				nightStart: 22,
				nightEnd: 7
			};
			logger.warn("[cron.ts] => Configuration polling non trouvée, utilisation des valeurs par défaut");
		}
		
		const pollingConfig = config.system.polling;
		const isNight = isNightTime();
		const currentInterval = getCurrentPollingInterval();
		const now = new Date();
		const currentTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
		
		// Log des informations de configuration au démarrage
		logger.info("[cron.ts] => Configuration du polling dynamique :");
		logger.info(`[cron.ts] =>   - Intervalle journée : ${pollingConfig.dayInterval} minutes`);
		logger.info(`[cron.ts] =>   - Intervalle nuit : ${pollingConfig.nightInterval} minutes`);
		logger.info(`[cron.ts] =>   - Période nuit : ${pollingConfig.nightStart}h - ${pollingConfig.nightEnd}h`);
		logger.info(`[cron.ts] =>   - Heure actuelle : ${currentTime} (${isNight ? 'nuit' : 'jour'})`);
		logger.info(`[cron.ts] =>   - Intervalle actuel : ${currentInterval} minutes`);
		
		// Démarrer le polling dynamique
		scheduleNextPolling();
		logger.info("[cron.ts] => Système de polling dynamique démarré");
		
		// Refresh forcé à 23h58 chaque jour pour les stats électriques
		cron.schedule('58 23 * * *', async function () {
			logger.info("[cron.ts] => CRON - Refresh forcé à 23h58 pour les stats électriques = START");
			try {
				await sendDevice(null, true);
				logger.info("[cron.ts] => CRON - Refresh forcé à 23h58 pour les stats électriques = SUCCESS");
			} catch (error) {
				logger.error(`[cron.ts] => CRON - Erreur lors du refresh forcé à 23h58: ${error instanceof Error ? error.message : String(error)}`);
				if (error instanceof Error && error.stack) {
					logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
				}
			}
		});
		logger.debug("[cron.ts] => Tâche CRON planifiée pour le refresh quotidien à 23h58");
		
		// Vérification toutes les 15 secondes pour le refresh après action
		cron.schedule('*/15 * * * * *', async function () {
			logger.debug("[cron.ts] => CRON - Vérification du refresh après action = START");
			try {
				await timeUpdate();
				logger.debug("[cron.ts] => CRON - Vérification du refresh après action = FINISH");
			} catch (error) {
				logger.error(`[cron.ts] => CRON - Erreur lors de la vérification du refresh: ${error instanceof Error ? error.message : String(error)}`);
				if (error instanceof Error && error.stack) {
					logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
				}
			}
		});
		logger.debug("[cron.ts] => Tâche CRON planifiée pour la vérification du refresh toutes les 15 secondes");
		
		logger.info("[cron.ts] => Système CRON initialisé avec succès");
	} catch (error) {
		logger.error(`[cron.ts] => Erreur lors de l'initialisation du système CRON: ${error instanceof Error ? error.message : String(error)}`);
		if (error instanceof Error && error.stack) {
			logger.debug(`[cron.ts] => Stack trace: ${error.stack}`);
		}
		throw error;
	}
}

export {
	loadCron
}
