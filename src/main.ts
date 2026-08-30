import {
	loadDaikinAPI,
	loadGlobalConfig,
	loadLogger,
	loadMQTTClient,
	startDaikinAPI,
	clearPendingCommands,
	clearGatewayCache,
} from "./modules";
import {loadCron, stopCronTasks} from "./modules/cron";
import {clearPostActionTimer} from "./modules/actionRefresh";
import {pausePolling} from "./modules/cron";
import {disableDaikinWebSocket} from "./modules/daikin";
import {disconnectMqttClient} from "./modules/mqttLifecycle";
import {beginShutdown, isShuttingDown} from "./modules/shutdown";
import {getTokenFilePath} from "./modules/tokenPaths";
import {createCache} from "cache-manager";
import fs from "fs";
import { setTimeout } from "timers/promises";


(async () => {
	try {
		// Initialize cache
		global.cache = createCache();

		// Configure data directory
		global.datadir = process.env.STORE_DIR || process.cwd() + "/config";

		// Initialize logger
		global.logger = loadLogger();
		global.logger.debug("[main.ts] => Cache initialized");
		global.logger.debug(`[main.ts] => Data directory: ${global.datadir}`);
		global.logger.info("[main.ts] => Starting DaikinToMQTT");

		// Load configuration
		global.logger.info("[main.ts] => Loading configuration");
		await loadGlobalConfig();

		// Connect to MQTT
		global.logger.info("[main.ts] => Connecting to MQTT broker");
		await loadMQTTClient();

		// Connect to Daikin
		global.logger.info("[main.ts] => Connecting to Daikin API");
		await loadDaikinAPI();

		// Start Daikin API
		global.logger.info("[main.ts] => Starting Daikin API");
		await startDaikinAPI();

		// Load polling
		global.logger.info("[main.ts] => Loading polling system");
		await loadCron();

		global.logger.info("[main.ts] => DaikinToMQTT started successfully!");

		const shutdown = async (signal: string) => {
			global.logger.info(`[main.ts] => ${signal} received, shutting down gracefully...`);
			beginShutdown();
			clearPostActionTimer();
			clearPendingCommands();
			clearGatewayCache();
			pausePolling();
			stopCronTasks();
			try {
				await disableDaikinWebSocket();
			} catch (e) {
				global.logger.debug(`[main.ts] => WebSocket shutdown: ${e instanceof Error ? e.message : String(e)}`);
			}
			try {
				await disconnectMqttClient(true);
			} catch (e) {
				global.logger.debug(`[main.ts] => MQTT shutdown: ${e instanceof Error ? e.message : String(e)}`);
			}
			process.exit(0);
		};
		process.on('SIGINT', () => { void shutdown('SIGINT'); });
		process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
		process.on('unhandledRejection', (reason) => {
			const message = reason instanceof Error ? reason.message : String(reason);
			if (isShuttingDown() && message.includes('client disconnecting')) {
				global.logger.debug(`[main.ts] => Ignored unhandled rejection during shutdown: ${message}`);
				return;
			}
			global.logger.error(`[main.ts] => Unhandled rejection: ${message}`);
			if (reason instanceof Error && reason.stack) {
				global.logger.debug(`[main.ts] => Stack trace: ${reason.stack}`);
			}
		});
	} catch (error) {
		// If logger is not yet initialized, use console
		if (!global.logger) {
			console.error(`[main.ts] => Critical error before logger initialization: ${error instanceof Error ? error.message : String(error)}`);
		} else {
			global.logger.error(`[main.ts] => Error during startup: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof Error && error.stack) {
				global.logger.debug(`[main.ts] => Stack trace: ${error.stack}`);
			}
		}
		throw error;
	}
})().catch(async error => {
	// Use global.logger or console if logger is not yet initialized
	const log = global.logger || {
		error: (msg: string) => console.error(msg),
		info: (msg: string) => console.log(msg),
		warn: (msg: string) => console.warn(msg),
		debug: (msg: string) => console.log(msg)
	};

	log.error(`[main.ts] => Unhandled error during startup: ${error instanceof Error ? error.message : String(error)}`);
	
	if (error instanceof Error && error.stack) {
		log.debug(`[main.ts] => Stack trace: ${error.stack}`);
	}

	// Handle invalid_grant error (invalid token)
	if ((error as any)?.error === "invalid_grant" || (error instanceof Error && error.message.includes("invalid_grant"))) {
		try {
			log.error('[main.ts] => Invalid token detected, deleting old token. A reconnection will be required.');
			const tokenPath = getTokenFilePath();
			
			if (fs.existsSync(tokenPath)) {
				fs.unlinkSync(tokenPath);
				log.info(`[main.ts] => Token file deleted: ${tokenPath}`);
			} else {
				log.warn(`[main.ts] => Token file does not exist: ${tokenPath}`);
			}
			
			process.exit(1);
		} catch (e) {
			log.error(`[main.ts] => Error deleting token: ${e instanceof Error ? e.message : String(e)}`);
			log.error(`[main.ts] => Please manually delete the file: ${getTokenFilePath()}`);
			process.exit(1);
		}
	} 
	// Handle authorization timeout
	else if ((error instanceof Error && error.message.includes("Authorization time out")) || 
	         (error instanceof Error && error.message.includes("authorization timeout")) ||
	         String(error).includes("Authorization time out")) {
		log.error('[main.ts] => Authorization timeout detected. Please restart DaikinToMQTT and try again.');
		
		try {
			// Update system module with timeout
			const {updateSystemBridge} = await import("./modules/daikin");
			await updateSystemBridge(null, null, {authorizationTimeout: true});
			log.info('[main.ts] => System module updated with timeout state');
		} catch (updateError) {
			log.error(`[main.ts] => Error updating system bridge: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
		}
		
		log.error('[main.ts] => Please restart DaikinToMQTT and try again.');
		await setTimeout(5000);
		process.exit(1);
	} 
	// Other errors
	else {
		log.error(`[main.ts] => Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
		
		// Log additional details if available
		if (error && typeof error === 'object') {
			Object.keys(error).forEach(key => {
				if (key !== 'message' && key !== 'stack') {
					log.debug(`[main.ts] => ${key}: ${JSON.stringify((error as any)[key])}`);
				}
			});
		}
		
		process.exit(1);
	}
})


