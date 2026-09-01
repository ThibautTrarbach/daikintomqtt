import "reflect-metadata";
import {modulesDataDescription} from "../decorator";
import {typeEnum} from "./typeConstants";
import {ClassModule, DevicesInformation} from "../../types";
import { APP_VERSION } from "../constants";

export class SystemBridge implements ClassModule {
	private _device: DevicesInformation = {
		id: "Daikin2MQTT",
		name: "Daikin2MQTT Bridge",
		modelInfo: "Daikin2MQTT",
		serialNumber: "Daikin2MQTT",
		firmwareVersion: APP_VERSION,
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

	// Module information
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

	// Unsupported modules
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

	// Authorization information
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

	@modulesDataDescription({
		name: 'API Budget Status',
		settable: false,
		type: typeEnum.string
	})
	private _apiBudgetStatus?: string;

	@modulesDataDescription({
		name: 'Next Polling At',
		settable: false,
		type: typeEnum.numeric,
		unite: 'ms'
	})
	private _nextPollingAt?: number;

	@modulesDataDescription({
		name: 'Skipped Refresh Count',
		settable: false,
		type: typeEnum.numeric,
		unite: 'count'
	})
	private _skippedRefreshCount?: number;

	@modulesDataDescription({
		name: 'Auth Mode',
		settable: false,
		type: typeEnum.string
	})
	private _authMode?: string;

	@modulesDataDescription({
		name: 'WebSocket Connected',
		settable: false,
		type: typeEnum.binary
	})
	private _webSocketConnected?: boolean;

	@modulesDataDescription({
		name: 'Daily Quota Limit',
		settable: false,
		type: typeEnum.numeric,
		unite: 'req/day'
	})
	private _dailyQuotaLimit?: number;

	constructor() {
		// Default initialization
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
		this._apiBudgetStatus = 'ok';
		this._nextPollingAt = 0;
		this._skippedRefreshCount = 0;
		this._authMode = 'developer_portal';
		this._webSocketConnected = false;
		this._dailyQuotaLimit = 200;
	}

	// Getters to access properties
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

	get apiBudgetStatus(): string | undefined {
		return this._apiBudgetStatus;
	}

	set apiBudgetStatus(value: string | undefined) {
		this._apiBudgetStatus = value;
	}

	get nextPollingAt(): number | undefined {
		return this._nextPollingAt;
	}

	set nextPollingAt(value: number | undefined) {
		this._nextPollingAt = value;
	}

	get skippedRefreshCount(): number | undefined {
		return this._skippedRefreshCount;
	}

	set skippedRefreshCount(value: number | undefined) {
		this._skippedRefreshCount = value;
	}

	get authMode(): string | undefined {
		return this._authMode;
	}

	set authMode(value: string | undefined) {
		this._authMode = value;
	}

	get webSocketConnected(): boolean | undefined {
		return this._webSocketConnected;
	}

	set webSocketConnected(value: boolean | undefined) {
		this._webSocketConnected = value;
	}

	get dailyQuotaLimit(): number | undefined {
		return this._dailyQuotaLimit;
	}

	set dailyQuotaLimit(value: number | undefined) {
		this._dailyQuotaLimit = value;
	}
}

