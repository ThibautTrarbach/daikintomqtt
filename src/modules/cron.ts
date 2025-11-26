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
		// Par défaut, 15 minutes si pas de config
		return 15;
	}
	
	return isNightTime() 
		? (pollingConfig.nightInterval ?? 60)
		: (pollingConfig.dayInterval ?? 15);
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
		logger.debug(`[cron.ts] => CRON - Daikin Polling = RUN (${isNightTime() ? 'nuit' : 'jour'})`);
		await sendDevice(null, true);
		logger.debug("[cron.ts] => CRON - Daikin Polling = FINISH");
		
		// Planifier le prochain polling
		scheduleNextPolling();
	}, timeUntilNext);
}

async function loadCron() {
	// Configuration par défaut si non définie
	if (!config.system.polling) {
		config.system.polling = {
			dayInterval: 15,
			nightInterval: 60,
			nightStart: 22,
			nightEnd: 7
		};
		logger.warn("[cron.ts] => Configuration polling non trouvée, utilisation des valeurs par défaut");
	}
	
	// Démarrer le polling dynamique
	scheduleNextPolling();
	
	// Garder le cron pour le refresh après action (toutes les 30 secondes)
	cron.schedule('*/30 * * * * *', async function () {
		logger.debug("[cron.ts] => CRON - Refresh data after action = RUN")
		await timeUpdate()
		logger.debug("[cron.ts] => CRON - Refresh data after action = FINISH")
	});
}

export {
	loadCron
}
