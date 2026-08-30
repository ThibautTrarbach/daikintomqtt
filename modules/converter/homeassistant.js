"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHADiscovery = generateHADiscovery;
const gateway_1 = require("../gateway");
const constants_1 = require("../constants");
function toObjectId(propertyKey) {
    return propertyKey.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}
function valueJsonTemplate(propertyKey, defaultValue) {
    return `{{ value_json['${propertyKey}'] | default(${defaultValue}) }}`;
}
function buildAvailability(baseTopic) {
    return [{
            topic: `${baseTopic}/${constants_1.HA_AVAILABILITY_TOPIC_SUFFIX}`,
            payload_available: "false",
            payload_not_available: "true"
        }];
}
function buildOrigin() {
    return {
        name: "daikin2mqtt",
        sw: constants_1.APP_VERSION
    };
}
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
                key === "_outdoorSilentMode" ||
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
                    const objectId = toObjectId(key);
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
                    const objectId = toObjectId(key);
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
        availability: buildAvailability(global.config.mqtt.topic),
        device: {
            identifiers: [serialNumber || deviceId],
            name: deviceName,
            manufacturer: "Daikin",
            model: modelInfo,
            sw_version: firmwareVersion
        },
        origin: buildOrigin(),
        state_topic: stateTopic,
        command_topic: commandTopic,
        mode_state_topic: stateTopic,
        mode_command_topic: commandTopic,
        mode_state_template: "{% if value_json._onOffMode == false %}off{% elif value_json._operationMode == 'heating' %}heat{% elif value_json._operationMode == 'cooling' %}cool{% elif value_json._operationMode == 'fanOnly' %}fan_only{% elif value_json._operationMode == 'auto' %}auto{% elif value_json._operationMode == 'dry' %}dry{% else %}off{% endif %}",
        mode_command_template: "{% if value == 'off' %}{\"_onOffMode\": false}{% elif value == 'heat' %}{\"_onOffMode\": true, \"_operationMode\": \"heating\"}{% elif value == 'cool' %}{\"_onOffMode\": true, \"_operationMode\": \"cooling\"}{% elif value == 'fan_only' %}{\"_onOffMode\": true, \"_operationMode\": \"fanOnly\"}{% else %}{\"_onOffMode\": true, \"_operationMode\": \"{{ value }}\"}{% endif %}",
        modes: hvacModes,
        current_temperature_topic: stateTopic,
        current_temperature_template: "{{ value_json._roomTemperature | default(0) }}",
        temperature_state_topic: stateTopic,
        temperature_command_topic: commandTopic,
        temperature_state_template: "{{ value_json._temperatureControl | default(20) }}",
        temperature_command_template: "{\"_temperatureControl\": {{ value }}}",
        temperature_unit: "C",
        min_temp: 16,
        max_temp: 30,
        temp_step: 0.5,
        fan_mode_state_topic: stateTopic,
        fan_mode_command_topic: commandTopic,
        fan_mode_state_template: "{{ value_json._fanCurrentMode | default('auto') }}",
        fan_mode_command_template: "{\"_fanCurrentMode\": \"{{ value }}\"}",
        fan_modes: ["auto", "quiet", "fixed"],
        preset_mode_state_topic: stateTopic,
        preset_mode_command_topic: commandTopic,
        preset_mode_state_template: "{% if value_json._isHolidayModeActive %}away{% elif value_json._econoMode %}eco{% elif value_json._powerfulMode %}powerful{% elif value_json._streamerMode %}streamer{% else %}none{% endif %}",
        preset_mode_command_template: "{% if value == 'away' %}{\"_setPresetAway\": true}{% elif value == 'eco' %}{\"_econoMode\": true}{% elif value == 'powerful' %}{\"_powerfulMode\": true}{% elif value == 'streamer' %}{\"_streamerMode\": true}{% else %}{\"_econoMode\": false, \"_powerfulMode\": false, \"_streamerMode\": false}{% endif %}",
        preset_modes: ["none", "away", "eco", "powerful", "streamer"],
        swing_mode_state_topic: stateTopic,
        swing_mode_command_topic: commandTopic,
        swing_mode_state_template: "{% if value_json._fanVertical == 'swing' or value_json._fanHorizontal == 'swing' %}on{% else %}off{% endif %}",
        swing_mode_command_template: "{% if value == 'on' %}{\"_fanVertical\": \"swing\"}{% else %}{\"_fanVertical\": \"stop\"}{% endif %}",
        swing_modes: ["on", "off"],
        power_command_topic: commandTopic,
        power_command_template: "{\"_onOffMode\": {% if value == 'ON' %}true{% else %}false{% endif %}}",
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
    let isEnergy = false;
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
        isEnergy = true;
    }
    const haConfig = {
        name: `${deviceName} ${metadata.name}`,
        unique_id: `daikin_${deviceId}_${toObjectId(propertyKey)}`,
        state_topic: stateTopic,
        value_template: valueJsonTemplate(propertyKey, "0"),
        device: {
            identifiers: [serialNumber || deviceId],
            name: deviceName,
            manufacturer: "Daikin",
            model: modelInfo,
            sw_version: firmwareVersion
        },
        origin: buildOrigin(),
        availability: buildAvailability(baseTopic),
        qos: 0,
        retain: true
    };
    if (deviceClass) {
        haConfig.device_class = deviceClass;
    }
    if (unitOfMeasurement) {
        haConfig.unit_of_measurement = unitOfMeasurement;
    }
    if (isEnergy) {
        haConfig.state_class = "total_increasing";
    }
    return haConfig;
}
function generateSwitchDiscovery(device, gatewayClass, propertyKey, metadata, deviceId, deviceName, serialNumber, modelInfo, firmwareVersion, stateTopic, commandTopic) {
    const haConfig = {
        name: `${deviceName} ${metadata.name}`,
        unique_id: `daikin_${deviceId}_${toObjectId(propertyKey)}`,
        state_topic: stateTopic,
        value_template: valueJsonTemplate(propertyKey, "false"),
        device: {
            identifiers: [serialNumber || deviceId],
            name: deviceName,
            manufacturer: "Daikin",
            model: modelInfo,
            sw_version: firmwareVersion
        },
        origin: buildOrigin(),
        availability: buildAvailability(global.config.mqtt.topic),
        qos: 0,
        retain: true
    };
    if (metadata.settable) {
        haConfig.command_topic = commandTopic;
        haConfig.command_template = `{"${propertyKey}": {% if value == 'ON' %}true{% else %}false{% endif %}}`;
        haConfig.payload_on = "ON";
        haConfig.payload_off = "OFF";
        haConfig.state_on = "true";
        haConfig.state_off = "false";
    }
    else {
        haConfig.payload_on = "true";
        haConfig.payload_off = "false";
    }
    return haConfig;
}
//# sourceMappingURL=homeassistant.js.map