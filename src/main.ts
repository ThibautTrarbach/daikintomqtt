import {
    generateConfig,
    loadDaikinAPI, loadGlobalConfig,
    loadLogger,
    loadMQTTClient,
    sendDevice, subscribeDevices
} from "./modules";

async function main() {
    global.datadir = process.env.STORE_DIR || process.cwd()
    global.logger = loadLogger()

    logger.info("Starting DaikinToMQTT")
    logger.info("=> Load configuration")
    await loadGlobalConfig()
    logger.info("=> Connect to MQTT")
    await loadMQTTClient()
    logger.info("=> Connect to Daikin")
    await loadDaikinAPI()
    logger.info("=> Subscribe to MQTT Action")
    await subscribeDevices()
    logger.info("DaikinToMQTT Started !!")
    await sendDevice()
    await generateConfig()


}

main().then();

