import path from "path";
import fs from "fs";
import {Config} from "../types";
import yaml from "js-yaml";


async function loadGlobalConfig() {
    try {
        const settingsPatch = path.join(datadir, '/config/settings.yml');
        global.config = <Config>yaml.load(fs.readFileSync(settingsPatch, 'utf8'));
    } catch (e) {
        console.log(e);
        throw new Error("Not load config files")
    }
}

export {
    loadGlobalConfig
}
