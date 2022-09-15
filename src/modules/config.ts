import path from "path";
import fs from "fs";
import {Daikin2MQTT} from "../types";
import yaml from "js-yaml";


async function loadGlobalConfig() {
    try {
        const settingsPatch = path.join(datadir, '/config/settings.yml');
        global.config = <Daikin2MQTT>yaml.load(fs.readFileSync(settingsPatch, 'utf8'));

        global.logger.level = config.system.logLevel
    } catch (e) {
        console.log(e);
        throw new Error("Not load config files")
    }
}

export {
    loadGlobalConfig
}
