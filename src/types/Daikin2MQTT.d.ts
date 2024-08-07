import {BRP069A4x, BRP069A61, BRP069A62, BRP069A78, BRP069B4x, BRP069C41, BRP069C4x} from "../modules/gateway";

export interface Daikin2MQTT {
	system: ConfigSystem
	daikin: ConfigDaikin
	mqtt: ConfigMQTT
}

export interface ConfigSystem {
	logLevel: string
	jeedom: boolean
}

export interface ConfigDaikin {
	modeProxy: boolean
	clientSecret: string
	clientID: string
	clientURL: string
	clientPort: number
}

export interface ConfigMQTT {
	host: string
	port: number
	auth: boolean
	username: string | null | undefined
	password: string | null | undefined
	connectTimeout: number
	reconnectPeriod: number
	topic: string
}

export interface ModulesDescriptionMetadata {
	name: string,
	settable: boolean
	generic_type?: string,
	minMaxValue?: ModulesDescriptionMetadataMinMax,
	minValue?: number
	maxValue?: number
	unite?: string
	type: number
	values?: object
}

export interface ModulesDescriptionMetadataMinMax {
	managementPoint: string,
	dataPoint: string,
	dataPointPath?: string
	consumptionT?: number
	multiple?: boolean
	multipleValue?: ModulePropertyMetadata
}

export interface ModulePropertyMetadata {
	managementPoint: string,
	dataPoint: string,
	dataPointPath?: string
	converter?: number
	consumptionT?: number
	multiple?: boolean
	multipleValue?: ModulePropertyMetadata
}

export interface ModuleDeviceMetadata {
	name: ModulePropertyMetadata
	modelInfo: ModulePropertyMetadata,
	serialNumber?: ModulePropertyMetadata,
	firmwareVersion?: ModulePropertyMetadata,
	isInErrorState?: ModulePropertyMetadata,
	errorCode?: ModulePropertyMetadata
}

export interface DevicesInformation {
	id: string
	name: string
	modelInfo: string,
	serialNumber: string,
	firmwareVersion: string,
	isInErrorState: string,
	errorCode: string
}

export interface ClassModule {
	device: DevicesInformation;
}

type Gateways =
	BRP069C4x |
	BRP069A62 |
	BRP069A78 |
	BRP069B4x |
	BRP069A4x |
	BRP069C41 |
	BRP069A61 |
	BRP069C8x


