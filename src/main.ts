import {loadDaikinAPI, loadDataBase, loadGlobalConfig, loadLogger, loadMQTTClient} from "./modules";

async function main() {
    global.datadir = process.env.STORE_DIR || process.cwd()

    global.logger = loadLogger()
    logger.info("Starting DaikinToMQTT")
    logger.info("=> Load configuration")
    await loadGlobalConfig()
    logger.info("=> Connect to DataBase ")
    await loadDataBase();
    logger.info("=> Connect to MQTT")
    await loadMQTTClient()
    logger.info("=> Connect to Daikin")
    await loadDaikinAPI()
    logger.info("DaikinToMQTT Started !!")
}

main().then();

