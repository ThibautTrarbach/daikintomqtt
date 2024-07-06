import {
	loadDaikinAPI,
	loadGlobalConfig,
	loadLogger,
	loadMQTTClient,
	startDaikinAPI,
} from "./modules";
import {loadCron} from "./modules/cron";
import {createCache, memoryStore} from "cache-manager";


(async () => {
	global.cache = createCache(memoryStore({
		max: 100,
		ttl: 10 * 60 * 1000 /*milliseconds*/,
	}));

	global.datadir = process.env.STORE_DIR || process.cwd() + "/config"
	global.logger = loadLogger()

	console.info("Starting DaikinToMQTT")
	logger.info("=> Load configuration")
	await loadGlobalConfig()
	logger.info("=> Connect to MQTT")
	await loadMQTTClient()
	logger.info("=> Connect to Daikin")
	await loadDaikinAPI()
	logger.info("DaikinToMQTT Started !!")
	await startDaikinAPI()
	logger.info("Load Polling Daikin")
	await loadCron()
})().catch(console.error)


