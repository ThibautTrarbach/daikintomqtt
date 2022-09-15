"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDevice = exports.generateConfig = exports.subscribeDevices = exports.loadDaikinAPI = void 0;
const daikin_controller_cloud_1 = __importDefault(require("daikin-controller-cloud"));
const ip_1 = __importDefault(require("ip"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const gateway_1 = require("./gateway");
const converter_1 = require("./converter");
const mqtt_1 = require("./mqtt");
function getOptions() {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            logger: logger,
            logLevel: config.system.logLevel,
            proxyOwnIp: ip_1.default.address(),
            proxyPort: config.daikin.proxyPort,
            proxyWebPort: config.daikin.proxyWebPort,
            proxyListenBind: '0.0.0.0',
            proxyDataDir: datadir,
            communicationTimeout: config.daikin.communicationTimeout,
            communicationRetries: config.daikin.communicationRetries
        };
    });
}
function loadDaikinAPI() {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenFile = path_1.default.join(datadir, '/tokenset.json');
        let daikinOptions = yield getOptions();
        if (fs_1.default.existsSync(tokenFile))
            global.daikinToken = JSON.parse(fs_1.default.readFileSync(tokenFile).toString());
        else
            global.daikinToken = undefined;
        let daikinClient = new daikin_controller_cloud_1.default(daikinToken, daikinOptions);
        daikinClient.on('token_update', (tokenSet) => {
            fs_1.default.writeFileSync(tokenFile, JSON.stringify(tokenSet));
        });
        if (daikinToken == undefined) {
            if (config.daikin.modeProxy) {
                yield daikinClient.initProxyServer();
            }
            else {
                yield daikinClient.login(config.daikin.username, config.daikin.password);
            }
            global.daikinToken = JSON.parse(fs_1.default.readFileSync(tokenFile).toString());
            logger.debug('Use Token with the following claims: ' + JSON.stringify(daikinClient.getTokenSet().claims()));
        }
        global.daikinClient = daikinClient;
    });
}
exports.loadDaikinAPI = loadDaikinAPI;
function subscribeDevices() {
    return __awaiter(this, void 0, void 0, function* () {
        const devices = yield daikinClient.getCloudDevices();
        for (let dev of devices) {
            let subscribeTopic = config.mqtt.topic + "/" + dev.getId() + "/set";
            mqttClient.subscribe(subscribeTopic, function (err) {
                if (!err)
                    logger.info("Subscribe to " + subscribeTopic);
            });
        }
        mqttClient.on('message', function (topic, message) {
            return __awaiter(this, void 0, void 0, function* () {
                logger.debug(`Topic : ${topic} \n- Message : ${message.toString()}`);
                const devices = yield daikinClient.getCloudDevices();
                for (let dev of devices) {
                    if (!topic.toString().includes(dev.getId()))
                        continue;
                    let gateway = getModels(dev);
                    if (gateway !== undefined) {
                        yield (0, gateway_1.eventValue)(dev, gateway, JSON.parse(message.toString()));
                    }
                }
            });
        });
    });
}
exports.subscribeDevices = subscribeDevices;
function sendDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const devices = yield daikinClient.getCloudDevices();
        if (devices && devices.length) {
            for (let dev of devices) {
                let gateway = getModels(dev);
                yield (0, mqtt_1.publishToMQTT)(dev.getId(), JSON.stringify(gateway));
            }
        }
        return devices;
    });
}
exports.sendDevice = sendDevice;
function getModels(devices) {
    let value;
    if (devices.getData('gateway', 'modelInfo') !== null)
        value = devices.getData('gateway', 'modelInfo').value;
    else if (devices.getData('0', 'modelInfo') !== null)
        value = devices.getData('0', 'modelInfo').value;
    switch (value) {
        case 'BRP069C4x':
            return new gateway_1.BRP069C4x(devices);
        default:
            (0, gateway_1.anonymise)(devices, value);
            return undefined;
    }
}
function generateConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        const devices = yield daikinClient.getCloudDevices();
        if (devices && devices.length) {
            for (let dev of devices) {
                let module = getModels(dev);
                if (module)
                    yield (0, converter_1.makeDefineFile)(module);
            }
        }
    });
}
exports.generateConfig = generateConfig;
