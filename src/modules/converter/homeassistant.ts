import {ModulesDescriptionMetadata} from "../../types";
import {typeEnum} from "../gateway";
import {Gateways} from "../../types";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

// Mapping des modes Daikin vers les modes Home Assistant
const daikinModeToHA: { [key: string]: string } = {
	"heating": "heat",
	"cooling": "cool",
	"fanOnly": "fan_only",
	"auto": "auto",
	"dry": "dry"
};

interface HomeAssistantDevice {
	identifiers: string[];
	name: string;
	manufacturer?: string;
	model?: string;
	sw_version?: string;
	via_device?: string;
}

interface HomeAssistantOrigin {
	name: string;
	sw: string;
	url?: string;
}

interface HomeAssistantDiscoveryConfig {
	device: HomeAssistantDevice;
	origin?: HomeAssistantOrigin;
	availability?: Array<{
		topic: string;
		payload_available?: string;
		payload_not_available?: string;
	}>;
	[key: string]: any;
}

/**
 * Generates Home Assistant discovery configuration for a device
 */
function generateHADiscovery(data: object, modules: object, device: DaikinCloudDevice) {
	const deviceId = (modules as any)._device?.id || device.getId();
	const deviceName = (modules as any)._device?.name || deviceId;
	const serialNumber = (modules as any)._device?.serialNumber || deviceId;
	const modelInfo = (modules as any)._device?.modelInfo || "Daikin";
	const firmwareVersion = (modules as any)._device?.firmwareVersion || "";

	const discoveryPrefix = global.config.integration?.homeassistant?.discoveryPrefix || "homeassistant";
	const baseTopic = global.config.mqtt.topic;
	const stateTopic = `${baseTopic}/${deviceId}`;
	const commandTopic = `${baseTopic}/${deviceId}/set`;

	const discoveryConfigs: { [componentType: string]: { [objectId: string]: HomeAssistantDiscoveryConfig } } = {};

	// 1. Generate discovery configuration for the climate component
	const climateConfig = generateClimateDiscovery(
		device,
		modules as Gateways,
		deviceId,
		deviceName,
		serialNumber,
		modelInfo,
		firmwareVersion,
		stateTopic,
		commandTopic,
		data
	);
	discoveryConfigs["climate"] = { [deviceId]: climateConfig };

	// 2. Generate discovery configuration for sensors and switches
	Object.entries(data).forEach(entry => {
		try {
			let [key, value] = entry;
			const propertyMetadata = value as ModulesDescriptionMetadata;

			// Ignore properties already handled by the climate component
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

			if ((modules as any)[key] === undefined || (modules as any)[key] === null) {
				return;
			}

			// Generate discovery configuration depending on the type
			if (propertyMetadata.type === typeEnum.numeric && !propertyMetadata.settable) {
				// Numeric sensor
				const sensorConfig = generateSensorDiscovery(
					device,
					modules as Gateways,
					key,
					propertyMetadata,
					deviceId,
					deviceName,
					serialNumber,
					modelInfo,
					firmwareVersion,
					stateTopic,
					baseTopic
				);
				if (sensorConfig) {
					if (!discoveryConfigs["sensor"]) {
						discoveryConfigs["sensor"] = {};
					}
					const objectId = key.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
					discoveryConfigs["sensor"][`${deviceId}_${objectId}`] = sensorConfig;
				}
			} else if (propertyMetadata.type === typeEnum.binary) {
				// Binary sensor or switch
				const switchConfig = generateSwitchDiscovery(
					device,
					modules as Gateways,
					key,
					propertyMetadata,
					deviceId,
					deviceName,
					serialNumber,
					modelInfo,
					firmwareVersion,
					stateTopic,
					commandTopic
				);
				if (switchConfig) {
					const componentType = propertyMetadata.settable ? "switch" : "binary_sensor";
					if (!discoveryConfigs[componentType]) {
						discoveryConfigs[componentType] = {};
					}
					const objectId = key.replace(/^_/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
					discoveryConfigs[componentType][`${deviceId}_${objectId}`] = switchConfig;
				}
			}
		} catch (e) {
			logger.error("[homeassistant.ts] => ")
			logger.error(e)
		}
	});

	return discoveryConfigs;
}

/**
 * Generates Home Assistant discovery configuration for a climate component
 */
function generateClimateDiscovery(
	device: DaikinCloudDevice,
	gatewayClass: Gateways,
	deviceId: string,
	deviceName: string,
	serialNumber: string,
	modelInfo: string,
	firmwareVersion: string,
	stateTopic: string,
	commandTopic: string,
	metadata: any
): HomeAssistantDiscoveryConfig {
	// Determine available modes
	let operationModeMeta: ModulesDescriptionMetadata | undefined;
	let hvacModes = ["off", "heat", "cool", "auto", "fan_only", "dry"];

	for (const [key, value] of Object.entries(metadata)) {
		if (key === "_operationMode" && value && (value as ModulesDescriptionMetadata).values) {
			operationModeMeta = value as ModulesDescriptionMetadata;
			const daikinModes = (value as ModulesDescriptionMetadata).values as string[];
			hvacModes = ["off", ...daikinModes.map(m => daikinModeToHA[m] || m)];
			break;
		}
	}

	const haConfig: HomeAssistantDiscoveryConfig = {
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
		// Topics
		state_topic: stateTopic,
		command_topic: commandTopic,
		// Mode configuration
		mode_state_topic: stateTopic,
		mode_command_topic: commandTopic,
		mode_state_template: "{% if value_json.onOffMode == false %}off{% elif value_json.operationMode == 'heating' %}heat{% elif value_json.operationMode == 'cooling' %}cool{% elif value_json.operationMode == 'fanOnly' %}fan_only{% elif value_json.operationMode == 'auto' %}auto{% elif value_json.operationMode == 'dry' %}dry{% else %}off{% endif %}",
		mode_command_template: "{% if value == 'off' %}{\"onOffMode\": false}{% elif value == 'heat' %}{\"onOffMode\": true, \"operationMode\": \"heating\"}{% elif value == 'cool' %}{\"onOffMode\": true, \"operationMode\": \"cooling\"}{% elif value == 'fan_only' %}{\"onOffMode\": true, \"operationMode\": \"fanOnly\"}{% else %}{\"onOffMode\": true, \"operationMode\": \"{{ value }}\"}{% endif %}",
		modes: hvacModes,
		// Temperature configuration
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
		// Fan mode configuration
		fan_mode_state_topic: stateTopic,
		fan_mode_command_topic: commandTopic,
		fan_mode_state_template: "{{ value_json.fanCurrentMode | default('auto') }}",
		fan_mode_command_template: "{\"fanCurrentMode\": \"{{ value }}\"}",
		fan_modes: ["auto", "quiet", "fixed"],
		// Preset modes (eco, powerful, etc.)
		preset_mode_state_topic: stateTopic,
		preset_mode_command_topic: commandTopic,
		preset_mode_state_template: "{% if value_json.econoMode %}eco{% elif value_json.powerfulMode %}powerful{% elif value_json.streamerMode %}streamer{% else %}none{% endif %}",
		preset_mode_command_template: "{% if value == 'eco' %}{\"econoMode\": true}{% elif value == 'powerful' %}{\"powerfulMode\": true}{% elif value == 'streamer' %}{\"streamerMode\": true}{% else %}{\"econoMode\": false, \"powerfulMode\": false, \"streamerMode\": false}{% endif %}",
		preset_modes: ["none", "eco", "powerful", "streamer"],
		// Swing mode
		swing_mode_state_topic: stateTopic,
		swing_mode_command_topic: commandTopic,
		swing_mode_state_template: "{% if value_json.fanVertical == 'swing' or value_json.fanHorizontal == 'swing' %}on{% else %}off{% endif %}",
		swing_mode_command_template: "{% if value == 'on' %}{\"fanVertical\": \"swing\"}{% else %}{\"fanVertical\": \"stop\"}{% endif %}",
		swing_modes: ["on", "off"],
		// Power command
		power_command_topic: commandTopic,
		power_command_template: "{\"onOffMode\": {% if value == 'ON' %}true{% else %}false{% endif %}}",
		// JSON attributes
		json_attributes_topic: stateTopic,
		json_attributes_template: "{{ value_json | tojson }}",
		qos: 0,
		retain: true
	};

	return haConfig;
}

/**
 * Generates Home Assistant discovery configuration for a sensor
 */
function generateSensorDiscovery(
	device: DaikinCloudDevice,
	gatewayClass: Gateways,
	propertyKey: string,
	metadata: ModulesDescriptionMetadata,
	deviceId: string,
	deviceName: string,
	serialNumber: string,
	modelInfo: string,
	firmwareVersion: string,
	stateTopic: string,
	baseTopic: string
): HomeAssistantDiscoveryConfig | null {
	// Determine device_class and unit
	let deviceClass: string | undefined;
	let unitOfMeasurement: string | undefined = metadata.unite;

	// Mapping based on name and unit
	const propertyName = metadata.name.toLowerCase();
	let isEnergy = false;
	if (propertyName.includes("temperature")) {
		deviceClass = "temperature";
		unitOfMeasurement = unitOfMeasurement || "°C";
	} else if (propertyName.includes("humidity")) {
		deviceClass = "humidity";
		unitOfMeasurement = unitOfMeasurement || "%";
	} else if (propertyName.includes("consumption") || propertyName.includes("energy")) {
		deviceClass = "energy";
		unitOfMeasurement = unitOfMeasurement || "kWh";
		isEnergy = true;
	}

	const valuePath = propertyKey.replace(/^_/, "");

	const haConfig: HomeAssistantDiscoveryConfig = {
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

	// For energy / consumption values, mark as a monotonically increasing total
	// so that Home Assistant can use them directly in the Energy dashboard.
	if (isEnergy) {
		(haConfig as any).state_class = "total_increasing";
	}

	return haConfig;
}

/**
 * Generates Home Assistant discovery configuration for a switch/binary_sensor
 */
function generateSwitchDiscovery(
	device: DaikinCloudDevice,
	gatewayClass: Gateways,
	propertyKey: string,
	metadata: ModulesDescriptionMetadata,
	deviceId: string,
	deviceName: string,
	serialNumber: string,
	modelInfo: string,
	firmwareVersion: string,
	stateTopic: string,
	commandTopic: string
): HomeAssistantDiscoveryConfig | null {
	const valuePath = propertyKey.replace(/^_/, "");

	const haConfig: HomeAssistantDiscoveryConfig = {
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

	// Si settable, c'est un switch avec command_topic
	if (metadata.settable) {
		haConfig.command_topic = commandTopic;
		haConfig.command_template = `{"${valuePath}": {% if value == 'ON' %}true{% else %}false{% endif %}}`;
		haConfig.payload_on = "ON";
		haConfig.payload_off = "OFF";
	} else {
		// Sinon c'est un binary_sensor
		haConfig.payload_on = "true";
		haConfig.payload_off = "false";
	}

	return haConfig;
}

export {
	generateHADiscovery
}

