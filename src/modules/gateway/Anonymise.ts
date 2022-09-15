import fs from "fs";
import path from "path";

function anonymise(dev: any, value: string) {
	let fileName = value ?? dev.getId();

	let data = recurse(dev)
		const configFolder = path.join(datadir, '/newConfig')
		const configFile = path.join(configFolder, fileName+'.json')

		if (!fs.existsSync(configFolder)) fs.mkdirSync(configFolder)

		if (!fs.existsSync(configFile)) {
			logger.info('New Module Detected Generate Anonymize Config For Integration')
			fs.writeFileSync(configFile, JSON.stringify(data));
		} else {
			logger.debug('New Module Detected Anonymize Config already exists')
		}
}

function recurse(resp: any) {
	Object.entries(resp).forEach(entry => {
		const [key, value] = entry;

		if (
			key == "cloud" ||
			key == "desc"
		) {
			resp[key] = "anonymizeValue"
		} else if (value instanceof Object){
			resp[key] = recurse(value)
		} else if (key == "value") {
			resp[key] = "anonymizeValue ("+typeof value+")";

		}
	})
	return resp;
}

export {
	anonymise
}
