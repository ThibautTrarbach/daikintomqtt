import {loadDaikinAPI, loadDataBase, loadGlobalConfig, loadLogger, loadMQTTClient} from "./modules";
import {Greeter} from "./modules/gateway/BRP069C4x";

async function main() {

    var greetingInstance = new Greeter("hi");
    var serializerFunc : (input: any) => string = Reflect.getMetadata("serialization", greetingInstance, "greeting");
    serializerFunc(greetingInstance.greeting);

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
    //await loadDaikinAPI()
    logger.info("DaikinToMQTT Started !!")
}

main().then();

