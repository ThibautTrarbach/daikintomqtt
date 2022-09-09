import DaikinCloudController from "daikin-controller-cloud";
import ip from "ip";
import path from "path";
import fs from "fs";

async function getOptions() {
    return {
        logger: logger,
        logLevel: config.system.logLevel,
        proxyOwnIp: ip.address(),
        proxyPort: config.daikin.proxyPort,
        proxyWebPort: config.daikin.proxyWebPort,
        proxyListenBind: '0.0.0.0',
        proxyDataDir: datadir,
        communicationTimeout: config.daikin.communicationTimeout,
        communicationRetries: config.daikin.communicationRetries
    };
}

async function loadDaikinAPI() {
    const tokenFile = path.join(datadir, '/config/tokenset.json');

    let daikinOptions = await getOptions();
    /** Setup Daikin API */
    if (fs.existsSync(tokenFile)) global.daikinToken = JSON.parse(fs.readFileSync(tokenFile).toString())
    else global.daikinToken = undefined;



    /** Start Daikin Client **/
    // @ts-ignore
    let daikinClient = new DaikinCloudController(daikinToken, daikinOptions);

    daikinClient.on('token_update', (tokenSet: any) => {
        fs.writeFileSync(tokenFile, JSON.stringify(tokenSet));
    });

    if (daikinToken == undefined) {
        if (config.daikin.modeProxy) {
            await  daikinClient.initProxyServer();
          /*  clientOptions.message = `Please visit http://${daikinOptions.proxyOwnIp}:${daikinOptions.proxyWebPort} and Login to Daikin Cloud please.`
            await updateSystemInfo()
            await daikinClient.waitForTokenFromProxy();
            console.log('Retrieved tokens. Saved to ' + tokenFile);
            await delay(1000);
            await daikinCloud.stopProxyServer();
            clientOptions.message = "Connection Success"
            await updateSystemInfo(); */
        } else {
            await daikinClient.login(config.daikin.username, config.daikin.password);
        }
        global.daikinToken = JSON.parse(fs.readFileSync(tokenFile).toString());

        logger.debug('Use Token with the following claims: ' + JSON.stringify(daikinClient.getTokenSet().claims()));
    }

    const devices = await daikinClient.getCloudDeviceDetails();
    logger.info(JSON.stringify(devices))
}

export {
    loadDaikinAPI
}
