import "reflect-metadata";
import {modulesDataDescription} from "../decorator";
import {typeEnum} from "./BaseModules";
import {ClassModule, DevicesInformation} from "../../types";
import {DaikinCloudDevice} from "daikin-controller-cloud/dist/device";

export class SystemBridge implements ClassModule {
	private _device: DevicesInformation = {
		id: "Daikin2MQTT",
		name: "Daikin2MQTT Bridge",
		modelInfo: "Daikin2MQTT",
		serialNumber: "Daikin2MQTT",
		firmwareVersion: "1.0.0",
		isInErrorState: "false",
		errorCode: ""
	}

	get device(): DevicesInformation {
		return this._device;
	}

	set device(value: DevicesInformation) {
		this._device = value;
	}

	// Rate Limit - Minute
	@modulesDataDescription({
		name: 'Rate Limit Minute',
		settable: false,
		type: typeEnum.numeric,
		unite: 'req/min'
	})
	private _rateLimitMinute?: number;

	@modulesDataDescription({
		name: 'Rate Remaining Minute',
		settable: false,
		type: typeEnum.numeric,
		unite: 'req/min'
	})
	private _rateRemainingMinute?: number;

	// Rate Limit - Day
	@modulesDataDescription({
		name: 'Rate Limit Day',
		settable: false,
		type: typeEnum.numeric,
		unite: 'req/day'
	})
	private _rateLimitDay?: number;

	@modulesDataDescription({
		name: 'Rate Remaining Day',
		settable: false,
		type: typeEnum.numeric,
		unite: 'req/day'
	})
	private _rateRemainingDay?: number;

	// Informations sur les modules
	@modulesDataDescription({
		name: 'Modules Count',
		settable: false,
		type: typeEnum.numeric,
		unite: 'modules'
	})
	private _modulesCount?: number;

	@modulesDataDescription({
		name: 'Modules List',
		settable: false,
		type: typeEnum.string
	})
	private _modulesList?: string;

	// Modules non gérés
	@modulesDataDescription({
		name: 'Unsupported Modules Count',
		settable: false,
		type: typeEnum.numeric,
		unite: 'modules'
	})
	private _unsupportedModulesCount?: number;

	@modulesDataDescription({
		name: 'Unsupported Modules List',
		settable: false,
		type: typeEnum.string
	})
	private _unsupportedModulesList?: string;

	// Action Refresh
	@modulesDataDescription({
		name: 'Refresh All Devices',
		settable: true,
		type: typeEnum.binary
	})
	private _refreshAllDevices?: boolean;

	// Informations d'autorisation
	@modulesDataDescription({
		name: 'Authorization URL',
		settable: false,
		type: typeEnum.string
	})
	private _authorizationUrl?: string;

	@modulesDataDescription({
		name: 'Authorization Request',
		settable: false,
		type: typeEnum.binary
	})
	private _authorizationRequest?: boolean;

	@modulesDataDescription({
		name: 'Authorization Timeout',
		settable: false,
		type: typeEnum.binary
	})
	private _authorizationTimeout?: boolean;

	constructor() {
		// Initialisation par défaut
		this._rateLimitMinute = 0;
		this._rateRemainingMinute = 0;
		this._rateLimitDay = 0;
		this._rateRemainingDay = 0;
		this._modulesCount = 0;
		this._modulesList = "[]";
		this._unsupportedModulesCount = 0;
		this._unsupportedModulesList = "[]";
		this._refreshAllDevices = false;
		this._authorizationUrl = "";
		this._authorizationRequest = false;
		this._authorizationTimeout = false;
	}

	// Getters pour accéder aux propriétés
	get rateLimitMinute(): number | undefined {
		return this._rateLimitMinute;
	}

	set rateLimitMinute(value: number | undefined) {
		this._rateLimitMinute = value;
	}

	get rateRemainingMinute(): number | undefined {
		return this._rateRemainingMinute;
	}

	set rateRemainingMinute(value: number | undefined) {
		this._rateRemainingMinute = value;
	}

	get rateLimitDay(): number | undefined {
		return this._rateLimitDay;
	}

	set rateLimitDay(value: number | undefined) {
		this._rateLimitDay = value;
	}

	get rateRemainingDay(): number | undefined {
		return this._rateRemainingDay;
	}

	set rateRemainingDay(value: number | undefined) {
		this._rateRemainingDay = value;
	}

	get modulesCount(): number | undefined {
		return this._modulesCount;
	}

	set modulesCount(value: number | undefined) {
		this._modulesCount = value;
	}

	get modulesList(): string | undefined {
		return this._modulesList;
	}

	set modulesList(value: string | undefined) {
		this._modulesList = value;
	}

	get unsupportedModulesCount(): number | undefined {
		return this._unsupportedModulesCount;
	}

	set unsupportedModulesCount(value: number | undefined) {
		this._unsupportedModulesCount = value;
	}

	get unsupportedModulesList(): string | undefined {
		return this._unsupportedModulesList;
	}

	set unsupportedModulesList(value: string | undefined) {
		this._unsupportedModulesList = value;
	}

	get refreshAllDevices(): boolean | undefined {
		return this._refreshAllDevices;
	}

	set refreshAllDevices(value: boolean | undefined) {
		this._refreshAllDevices = value;
	}

	get authorizationUrl(): string | undefined {
		return this._authorizationUrl;
	}

	set authorizationUrl(value: string | undefined) {
		this._authorizationUrl = value;
	}

	get authorizationRequest(): boolean | undefined {
		return this._authorizationRequest;
	}

	set authorizationRequest(value: boolean | undefined) {
		this._authorizationRequest = value;
	}

	get authorizationTimeout(): boolean | undefined {
		return this._authorizationTimeout;
	}

	set authorizationTimeout(value: boolean | undefined) {
		this._authorizationTimeout = value;
	}
}

