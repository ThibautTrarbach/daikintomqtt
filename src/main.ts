import {
	generateConfig,
	loadDaikinAPI,
	loadGlobalConfig,
	loadLogger,
	loadMQTTClient,
	sendDevice,
	subscribeDevices
} from "./modules";
import {loadCron} from "./modules/cron";

async function main() {
	global.datadir = process.env.STORE_DIR || process.cwd() + "/config"
	global.logger = loadLogger()

	console.info("Starting DaikinToMQTT")
	logger.info("=> Load configuration")
	await loadGlobalConfig()
	logger.info("=> Connect to MQTT")
	await loadMQTTClient()
	logger.info("=> Connect to Daikin")
	await loadDaikinAPI()
	logger.info("=> Subscribe to MQTT Action")
	await subscribeDevices()
	logger.info("DaikinToMQTT Started !!")
	logger.info("Generate Config Info")
	await generateConfig()
	logger.info("Load Polling Daikin")
	await loadCron()
	logger.info("Send First Event Data Value")
	await sendDevice()
}

main().then();

