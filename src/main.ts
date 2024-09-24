import {
	loadDaikinAPI,
	loadGlobalConfig,
	loadLogger,
	loadMQTTClient, publishConfig,
	startDaikinAPI,
} from "./modules";
import {loadCron} from "./modules/cron";
import {createCache, memoryStore} from "cache-manager";
import {resolve} from "node:path";
import fs from "fs";
import { setTimeout } from "timers/promises";


(async () => {
	global.cache = createCache(memoryStore({
		max: 100,
		ttl: 10 * 60 * 1000 /*milliseconds*/,
	}));

	global.datadir = process.env.STORE_DIR || process.cwd() + "/config"
	global.logger = loadLogger()

	console.info("[main.ts] => Starting DaikinToMQTT")
	logger.info("[main.ts] => Load configuration")
	await loadGlobalConfig()
	logger.info("[main.ts] => Connect to MQTT")
	await loadMQTTClient()
	logger.info("[main.ts] => Connect to Daikin")
	await loadDaikinAPI()
	logger.info("[main.ts] => DaikinToMQTT Started !!")
	await startDaikinAPI()
	logger.info("[main.ts] => Load Polling Daikin")
	await loadCron()

})().catch(async error => {

	if (error.error == "invalid_grant") {
		try {
			console.log('====> Token invalid, delete de l ancien token, une reconnection va être necesaire')
			let path = resolve(datadir, 'daikin-controller-cloud-tokenset')
			fs.unlinkSync(path);
			process.exit(1)
		} catch (e) {
			console.error('Merci de delete le fichier : path');
			process.exit(1)
		}
	} else if (error == 'Error: Authorization time out') {
		console.log('====> Authorization time out, please restart DaikinToMQTT and retry')
		await publishConfig('authorization_timeout', true);
		await setTimeout(5000)
		process.exit(1)
	} else {
		console.error(error)
	}
})



