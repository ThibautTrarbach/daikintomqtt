import path from "path";
import fs from "fs";
import {Config} from "../types/config";

async function loadConfig() {
    let config: Config;
    try {
        const settingsPatch = path.join(datadir, '/settings.yml');
        config = yaml.load(fs.readFileSync(settingsPatch, 'utf8'));
        return config;
    } catch (e) {
        console.log(e);
    }
    throw new Error("Not load config files")
}

export {
    loadConfig
}
