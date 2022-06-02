const DaikinCloud = require('daikin-controller-cloud');
const yaml = require('js-yaml');
const cron = require('node-cron');
const mqtt = require('mqtt')
const path = require('path');
const fs = require('fs');
const ip = require("ip");
const {getDataFromModules, setDataFromModules} = require("./modules/main");

const datadir = process.env.STORE_DIR || path.join(__dirname, '/config')
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`
const tokenFile = path.join(datadir, '/tokenset.json');

let tempCache = {}
let daikinCloud;
let mqttClient;
let tokenSet;
let config;

let clientOptions = {
    address: ip.address(),
    message: "",
    loglevel: null,
    topic: null,
    daikinStart: false,
    mqttStart: false
};

async function daikinToMQTT() {
    await loadConfig();
    await startSystem();

    cron.schedule('*/10 * * * * *', async function () {
        await refreshData()
    });

    cron.schedule('*/5 * * * * *', async function () {
        await updateSystemInfo()
    });
}

async function loadConfig() {
    try {
        const settingsPatch = path.join(datadir, '/settings.yml');
        config = yaml.load(fs.readFileSync(settingsPatch, 'utf8'));
    } catch (e) {
        console.log(e);
    }
}

async function startSystem() {
    /** Setup Variable **/
    clientOptions.topic = config.mqtt.topic+'/';
    clientOptions.loglevel = config.system.loglevel;
    const daikinOptions = {
        logger: console.log,
        logLevel: config.system.loglevel,
        proxyOwnIp: ip.address(),
        proxyPort: config.daikin.proxyPort,
        proxyWebPort: config.daikin.proxyWebPort,
        proxyListenBind: '0.0.0.0',
        proxyDataDir: __dirname,
        communicationTimeout: config.daikin.communicationTimeout,
        communicationRetries: config.daikin.communicationRetries
    };
    const mqttOptions = {
        clientId,
        clean: true,
        connectTimeout: config.mqtt.connectTimeout,
        username: config.mqtt.username,
        password: config.mqtt.password,
        reconnectPeriod: config.mqtt.reconnectPeriod,
    };

    //TODO : MQTT No Auth
    const mqttHost = `mqtt://${config.mqtt.host}:${config.mqtt.port}`

    /** Start MQTT Client **/
    mqttClient = mqtt.connect(mqttHost, mqttOptions)
    /** MQTT Event **/
    mqttClient.on('connect', () => {
        console.log('service connected')
        clientOptions.mqttStart = true; })
    /** Setup Daikin API */
    if (fs.existsSync(tokenFile)) tokenSet = JSON.parse(fs.readFileSync(tokenFile).toString());
    /** Start Daikin Client **/
    daikinCloud = new DaikinCloud(tokenSet, daikinOptions);
    /** Daikin Event **/
    daikinCloud.on('token_update', tokenSet => {
        fs.writeFileSync(tokenFile, JSON.stringify(tokenSet));
    });
    /** Login if token not exist **/
    if (!tokenSet) {
        if (config.daikin.modeproxy) {
            await daikinCloud.initProxyServer();
            clientOptions.message = `Please visit http://${daikinOptions.proxyOwnIp}:${daikinOptions.proxyWebPort} and Login to Daikin Cloud please.`
            await updateSystemInfo()
            await daikinCloud.waitForTokenFromProxy();
            console.log('Retrieved tokens. Saved to ' + tokenFile);
            await delay(1000);
            await daikinCloud.stopProxyServer();
            clientOptions.message = "Connection Success"
            await updateSystemInfo();
        } else {
            console.log(config.daikin.username)
            console.log(config.daikin.password)
            await daikinCloud.login(config.daikin.username, config.daikin.password);
        }
        tokenSet = JSON.parse(fs.readFileSync(tokenFile).toString());
    }
    clientOptions.daikinStart = true;
    await updateSystemInfo()

    console.log('Use Token with the following claims: ' + JSON.stringify(daikinCloud.getTokenSet().claims()));


    while (!clientOptions.daikinStart || !clientOptions.mqttStart) {
        console.log(clientOptions.mqttStart)
        await delay(1000)
    }

    const devices = await daikinCloud.getCloudDevices();
    for (let dev of devices) {
        let subscribeTopic = clientOptions.topic+ dev.getId() + "/set"
        mqttClient.subscribe(subscribeTopic, function (err) {
            if (!err) console.log("Subscribe to "+subscribeTopic)
        })
    }

    mqttClient.on('message', async function (topic, message) {
        console.log(`Topic : ${topic} \n- Message : ${message.toString()}`)

        const devices = await daikinCloud.getCloudDevices();
        for (let dev of devices) {
            if (!topic.toString().includes(dev.getId())) continue;
            await setDataFromModules(dev, message)
        }

        await refreshData()
    })

    console.log('Start Service OK')
}

async function refreshData() {
    if (!(clientOptions.daikinStart && clientOptions.daikinStart)) return;
    console.log('Refresh Data')

    const devices = await daikinCloud.getCloudDevices();

    if (devices && devices.length) {
        for (let dev of devices) {
            let data;

            data = await getDataFromModules(dev, datadir)
            if (data === "defaults") continue;

            if (JSON.stringify(tempCache[dev.getId()]) ===  JSON.stringify(data)) continue;
            tempCache[dev.getId()] = data;

            mqttClient.publish(clientOptions.topic + dev.getId(), JSON.stringify(data), {qos: 0, retain: true}, (error) => {
                console.log("sendEvent : " + dev.getId())
                if (error) console.error(error)
            })
        }
    }
}

async function updateSystemInfo() {
    if (!clientOptions.mqttStart) return;
    if (JSON.stringify(tempCache['system']) ===  JSON.stringify(clientOptions)) return;
    mqttClient.publish(clientOptions.topic + "system", JSON.stringify(clientOptions), {qos: 0, retain: true}, (error) => {
        tempCache['system'] = clientOptions;
        if (error) console.error(error)
    })
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

(async () => {
    await daikinToMQTT();
})();

