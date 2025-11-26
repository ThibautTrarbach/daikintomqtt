"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHADiscovery = generateHADiscovery;
const gateway_1 = require("../gateway");
const daikinModeToHA = {
    "heating": "heat",
    "cooling": "cool",
    "fanOnly": "fan_only",
    "auto": "auto",
    "dry": "dry"
};
function generateHADiscovery(data, modules, device) {
    const deviceId = modules._device?.id || device.getId();
    const deviceName = modules._device?.name || deviceId;
    const serialNumber = modules._device?.serialNumber || deviceId;
    const modelInfo = modules._device?.modelInfo || "Daikin";
    const firmwareVersion = modules._device?.firmwareVersion || "";
    const discoveryPrefix = global.config.homeassistant?.discoveryPrefix || "homeassistant";
    const baseTopic = global.config.mqtt.topic;
    const stateTopic = `${baseTopic}/${deviceId}`;
    const commandTopic = `${baseTopic}/${deviceId}/set`;
    const discoveryConfigs = {};
    const climateConfig = generateClimateDiscovery(device, modules, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, commandTopic, data);
    discoveryConfigs["climate"] = { [deviceId]: climateConfig };
    Object.entries(data).forEach(entry => {
        try {
            let [key, value] = entry;
            const propertyMetadata = value;
            if (key === "_operationMode" ||
                key === "_onOffMode" ||
                key === "_temperatureControl" ||
                key === "_fanCurrentMode" ||
                key === "_econoMode" ||
                key === "_powerfulMode" ||
                key === "_streamerMode" ||
                key === "_fanVertical" ||
                key === "_fanHorizontal") {
                return;
            }
            if (modules[key] === undefined || modules[key] === null) {
                return;
            }
            if (propertyMetadata.type === gateway_1.typeEnum.numeric && !propertyMetadata.settable) {
                const sensorConfig = generateSensorDiscovery(device, modules, key, propertyMetadata, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, baseTopic);
                if (sensorConfig) {
                    if (!discoveryConfigs["sensor"]) {
                        discoveryConfigs["sensor"] = {};
                    }
                    const objectId = key.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
                    discoveryConfigs["sensor"][`${deviceId}_${objectId}`] = sensorConfig;
                }
            }
            else if (propertyMetadata.type === gateway_1.typeEnum.binary) {
                const switchConfig = generateSwitchDiscovery(device, modules, key, propertyMetadata, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, commandTopic);
                if (switchConfig) {
                    const componentType = propertyMetadata.settable ? "switch" : "binary_sensor";
                    if (!discoveryConfigs[componentType]) {
                        discoveryConfigs[componentType] = {};
                    }
                    const objectId = key.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
                    discoveryConfigs[componentType][`${deviceId}_${objectId}`] = switchConfig;
                }
            }
        }
        catch (e) {
            logger.error("[homeassistant.ts] => ");
            logger.error(e);
        }
    });
    return discoveryConfigs;
}
function generateClimateDiscovery(device, gatewayClass, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, commandTopic, metadata) {
    let operationModeMeta;
    let hvacModes = ["off", "heat", "cool", "auto", "fan_only", "dry"];
    for (const [key, value] of Object.entries(metadata)) {
        if (key === "_operationMode" && value && value.values) {
            operationModeMeta = value;
            const daikinModes = value.values;
            hvacModes = ["off", ...daikinModes.map(m => daikinModeToHA[m] || m)];
            break;
        }
    }
    const haConfig = {
        name: deviceName,
        unique_id: `daikin_${deviceId}_climate`,
        availability: [{
                topic: `${global.config.mqtt.topic}/system/bridge/authorization_timeout`,
                payload_available: "false",
                payload_not_available: "true"
            }],
        device: {
            identifiers: [serialNumber || deviceId],
            name: deviceName,
            manufacturer: "Daikin",
            model: modelInfo,
            sw_version: firmwareVersion
        },
        origin: {
            name: "daikin2mqtt",
            sw: "1.1.0"
        },
        state_topic: stateTopic,
        command_topic: commandTopic,
        mode_state_topic: stateTopic,
        mode_command_topic: commandTopic,
        mode_state_template: "{% if value_json.onOffMode == false %}off{% elif value_json.operationMode == 'heating' %}heat{% elif value_json.operationMode == 'cooling' %}cool{% elif value_json.operationMode == 'fanOnly' %}fan_only{% elif value_json.operationMode == 'auto' %}auto{% elif value_json.operationMode == 'dry' %}dry{% else %}off{% endif %}",
        mode_command_template: "{% if value == 'off' %}{\"onOffMode\": false}{% elif value == 'heat' %}{\"onOffMode\": true, \"operationMode\": \"heating\"}{% elif value == 'cool' %}{\"onOffMode\": true, \"operationMode\": \"cooling\"}{% elif value == 'fan_only' %}{\"onOffMode\": true, \"operationMode\": \"fanOnly\"}{% else %}{\"onOffMode\": true, \"operationMode\": \"{{ value }}\"}{% endif %}",
        modes: hvacModes,
        current_temperature_topic: stateTopic,
        current_temperature_template: "{{ value_json.roomTemperature | default(0) }}",
        temperature_state_topic: stateTopic,
        temperature_command_topic: commandTopic,
        temperature_state_template: "{{ value_json.temperatureControl | default(20) }}",
        temperature_command_template: "{\"temperatureControl\": {{ value }}}",
        temperature_unit: "C",
        min_temp: 16,
        max_temp: 30,
        temp_step: 0.5,
        fan_mode_state_topic: stateTopic,
        fan_mode_command_topic: commandTopic,
        fan_mode_state_template: "{{ value_json.fanCurrentMode | default('auto') }}",
        fan_mode_command_template: "{\"fanCurrentMode\": \"{{ value }}\"}",
        fan_modes: ["auto", "quiet", "fixed"],
        preset_mode_state_topic: stateTopic,
        preset_mode_command_topic: commandTopic,
        preset_mode_state_template: "{% if value_json.econoMode %}eco{% elif value_json.powerfulMode %}powerful{% elif value_json.streamerMode %}streamer{% else %}none{% endif %}",
        preset_mode_command_template: "{% if value == 'eco' %}{\"econoMode\": true}{% elif value == 'powerful' %}{\"powerfulMode\": true}{% elif value == 'streamer' %}{\"streamerMode\": true}{% else %}{\"econoMode\": false, \"powerfulMode\": false, \"streamerMode\": false}{% endif %}",
        preset_modes: ["none", "eco", "powerful", "streamer"],
        swing_mode_state_topic: stateTopic,
        swing_mode_command_topic: commandTopic,
        swing_mode_state_template: "{% if value_json.fanVertical == 'swing' or value_json.fanHorizontal == 'swing' %}on{% else %}off{% endif %}",
        swing_mode_command_template: "{% if value == 'on' %}{\"fanVertical\": \"swing\"}{% else %}{\"fanVertical\": \"stop\"}{% endif %}",
        swing_modes: ["on", "off"],
        power_command_topic: commandTopic,
        power_command_template: "{\"onOffMode\": {% if value == 'ON' %}true{% else %}false{% endif %}}",
        json_attributes_topic: stateTopic,
        json_attributes_template: "{{ value_json | tojson }}",
        qos: 0,
        retain: true
    };
    return haConfig;
}
function generateSensorDiscovery(device, gatewayClass, propertyKey, metadata, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, baseTopic) {
    let deviceClass;
    let unitOfMeasurement = metadata.unite;
    const propertyName = metadata.name.toLowerCase();
    if (propertyName.includes("temperature")) {
        deviceClass = "temperature";
        unitOfMeasurement = unitOfMeasurement || "°C";
    }
    else if (propertyName.includes("humidity")) {
        deviceClass = "humidity";
        unitOfMeasurement = unitOfMeasurement || "%";
    }
    else if (propertyName.includes("consumption") || propertyName.includes("energy")) {
        deviceClass = "energy";
        unitOfMeasurement = unitOfMeasurement || "kWh";
    }
    const valuePath = propertyKey.replace(/^_/, "");
    const haConfig = {
        name: `${deviceName} ${metadata.name}`,
        unique_id: `daikin_${deviceId}_${propertyKey.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")}`,
        state_topic: stateTopic,
        value_template: `{{ value_json.${valuePath} | default(0) }}`,
        device: {
            identifiers: [serialNumber || deviceId],
            name: deviceName,
            manufacturer: "Daikin",
            model: modelInfo,
            sw_version: firmwareVersion
        },
        origin: {
            name: "daikin2mqtt",
            sw: "1.1.0"
        },
        availability: [{
                topic: `${baseTopic}/system/bridge/authorization_timeout`,
                payload_available: "false",
                payload_not_available: "true"
            }],
        qos: 0,
        retain: true
    };
    if (deviceClass) {
        haConfig.device_class = deviceClass;
    }
    if (unitOfMeasurement) {
        haConfig.unit_of_measurement = unitOfMeasurement;
    }
    return haConfig;
}
function generateSwitchDiscovery(device, gatewayClass, propertyKey, metadata, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, commandTopic) {
    const valuePath = propertyKey.replace(/^_/, "");
    const haConfig = {
        name: `${deviceName} ${metadata.name}`,
        unique_id: `daikin_${deviceId}_${propertyKey.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")}`,
        state_topic: stateTopic,
        state_template: `{{ value_json.${valuePath} | default(false) }}`,
        device: {
            identifiers: [serialNumber || deviceId],
            name: deviceName,
            manufacturer: "Daikin",
            model: modelInfo,
            sw_version: firmwareVersion
        },
        origin: {
            name: "daikin2mqtt",
            sw: "1.1.0"
        },
        availability: [{
                topic: `${global.config.mqtt.topic}/system/bridge/authorization_timeout`,
                payload_available: "false",
                payload_not_available: "true"
            }],
        qos: 0,
        retain: true
    };
    if (metadata.settable) {
        haConfig.command_topic = commandTopic;
        haConfig.command_template = `{"${valuePath}": {% if value == 'ON' %}true{% else %}false{% endif %}}`;
        haConfig.payload_on = "ON";
        haConfig.payload_off = "OFF";
    }
    else {
        haConfig.payload_on = "true";
        haConfig.payload_off = "false";
    }
    return haConfig;
}
//# sourceMappingURL=homeassistant.js.map