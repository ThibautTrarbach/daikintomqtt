import {BRP069A4x, BRP069A61, BRP069A62, BRP069A78, BRP069B4x, BRP069C41, BRP069C4x} from "../modules/gateway";

export interface Daikin2MQTT {
	system: ConfigSystem
	daikin: ConfigDaikin
	mqtt: ConfigMQTT
	integration?: ConfigIntegration
}

export interface ConfigSystem {
	logLevel: string
	polling?: ConfigPolling
	/**
	 * Post-action refresh mode:
	 * 1 = full refresh delayed by actionRefreshDelaySeconds after the action
	 * 2 = optimistic update (cache + MQTT) without cloud refresh after the action
	 * 3 = hybrid (optimistic update + full refresh actionRefreshDelaySeconds after the last action)
	 */
	actionRefreshMode?: number
	/**
	 * Delay in seconds before full refresh in modes 1 and 3
	 */
	actionRefreshDelaySeconds?: number
	/**
	 * Post-action cloud refresh strategy:
	 * - timer: dedicated GET after actionRefreshDelaySeconds
	 * - merge_with_poll: skip dedicated GET if a poll is due within mergeWithPollWindowMinutes
	 * - disabled: no cloud GET after action (optimistic only)
	 */
	actionRefreshStrategy?: 'timer' | 'merge_with_poll' | 'disabled'
	/**
	 * Window in minutes to merge post-action refresh with upcoming poll (merge_with_poll strategy)
	 */
	mergeWithPollWindowMinutes?: number
	/**
	 * Debounce window in ms to coalesce rapid MQTT commands per device
	 */
	commandCoalesceMs?: number
	/**
	 * Daily energy stats refresh time (HH:MM, 24h)
	 */
	energyStatsRefreshTime?: string
}

export interface ConfigPolling {
	dayInterval: number // Polling interval in minutes during the day
	nightInterval: number // Polling interval in minutes during the night
	nightStart: number // Night period start hour (0-23)
	nightEnd: number // Night period end hour (0-23)
}

export interface ConfigIntegration {
	jeedom?: boolean
	homeassistant?: ConfigHomeAssistant
}

export interface ConfigHomeAssistant {
	enabled: boolean
	discoveryPrefix?: string
}

export interface ConfigDaikin {
	modeProxy?: boolean // Optional, not used currently
	clientSecret: string
	clientID: string
	clientURL: string
	clientPort: number
	useMock?: boolean
	mockId?: string | null
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

export type Gateways =
	BRP069C4x |
	BRP069A62 |
	BRP069A78 |
	BRP069B4x |
	BRP069A4x |
	BRP069C41 |
	BRP069A61 |
	BRP069C8x



