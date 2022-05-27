const fs = require("fs");
const path = require("path");

function generateInfoModule(datadir, dev) {
    let data = recurse(dev)
    const configFolder = path.join(datadir, '/newConfig')
    const configFile = path.join(configFolder, dev.getId()+'.json')

    if (!fs.existsSync(configFolder)) fs.mkdirSync(configFolder)

    if (!fs.existsSync(configFile)) {
        console.log('New Module Detected Generate Anonymize Config For Integration')
        fs.writeFileSync(configFile, JSON.stringify(data));
    } else {
        console.log('New Module Detected Anonymize Config already exists')
    }

}

function recurse(resp) {
    let data;
    for (let x in resp) {
        data = resp[x]

        if (x === "cloud") resp[x] = "anonymizeValue"

        if (data instanceof Object) {
            data = recurse(data);
        } else if (x === "value") {
            resp[x] = "anonymizeValue ("+typeof data+")";
        }
    }
    return resp;
}


module.exports = {
    generateInfoModule
}
