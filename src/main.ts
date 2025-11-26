import {
	loadDaikinAPI,
	loadGlobalConfig,
	loadLogger,
	loadMQTTClient,
	startDaikinAPI,
} from "./modules";
import {loadCron} from "./modules/cron";
import {createCache} from "cache-manager";
import {resolve} from "node:path";
import fs from "fs";
import { setTimeout } from "timers/promises";


(async () => {
	global.cache = createCache();

	global.datadir = process.env.STORE_DIR || process.cwd() + "/config"
	global.logger = loadLogger()

	logger.info("[main.ts] => Starting DaikinToMQTT")
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
			logger.error('====> Token invalid, delete de l ancien token, une reconnection va être necesaire')
			const tokenPath = resolve(datadir, 'daikin-controller-cloud-tokenset')
			fs.unlinkSync(tokenPath);
			process.exit(1)
		} catch (e) {
			logger.error(`Merci de delete le fichier : ${resolve(datadir, 'daikin-controller-cloud-tokenset')}`);
			process.exit(1)
		}
	} else if (error == 'Error: Authorization time out') {
		console.log('====> Authorization time out, please restart DaikinToMQTT and retry')
		// Mettre à jour le module système avec le timeout
		const {updateSystemBridge} = await import("./modules/daikin");
		await updateSystemBridge(null, null, {authorizationTimeout: true});
		await setTimeout(5000)
		process.exit(1)
	} else {
		logger.error(`[main.ts] => Unhandled error: ${error}`)
	}
})



