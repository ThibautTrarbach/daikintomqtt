import {ClassModule, DevicesInformation} from "../../types";
import {modulesDaikinAcces, modulesDaikinDevice, modulesDataDescription} from "../decorator";
import {convertDaikinDevice, converterEnum, typeEnum} from "./BaseModules";

export class BRP069A62 implements ClassModule{
	@modulesDaikinDevice({
		name: {
			managementPoint: "0",
			dataPoint: "name",
		},
		modelInfo: {
			managementPoint: "0",
			dataPoint: "modelInfo",
		},
		serialNumber: {
			managementPoint: "0",
			dataPoint: "serialNumber",
		},
		firmwareVersion: {
			managementPoint: "0",
			dataPoint: "firmwareVersion",
		},
		isInErrorState: {
			managementPoint: "0",
			dataPoint: "isInErrorState",
		},
		errorCode: {
			managementPoint: "1",
			dataPoint: "errorCode",
		}
	})
	private _device: DevicesInformation = {
		id: "",
		name: "",
		modelInfo: "",
		serialNumber: "",
		firmwareVersion: "",
		isInErrorState: "",
		errorCode:""
	}

	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "isHolidayModeActive"
	})
	@modulesDataDescription({
		name: '1 - Holiday Mode',
		settable: false,
		type: typeEnum.binary
	})
	private _isHolidayModeActive1?: boolean
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "isInErrorState"
	})
	@modulesDataDescription({
		name: '1 - Error State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInErrorState1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "isInWarningState"
	})
	@modulesDataDescription({
		name: '1 - Warning State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInWarningState1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "isInInstallerState"
	})
	@modulesDataDescription({
		name: '1 - Installer State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInInstallerState1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "isInEmergencyState"
	})
	@modulesDataDescription({
		name: '1 - Emergency State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInEmergencyState1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "operationMode"
	})
	@modulesDataDescription({
		name: '1 - Operation Mode',
		settable: true,
		type: typeEnum.string,
		values : [
			"heating"
		]
	})
	private _operationMode1?: string;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "onOffMode",
		converter: converterEnum.binary
	})
	@modulesDataDescription({
		name: '1 - State',
		settable: true,
		generic_type: "ENERGY_STATE",
		type: typeEnum.binary
	})
	private _onOffMode1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "setpointMode",
		converter: converterEnum.string
	})
	@modulesDataDescription({
		name: '1 - Setpoint Mode',
		settable: false,
		type: typeEnum.string
	})
	private _setpointMode1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "controlMode",
		converter: converterEnum.string
	})
	@modulesDataDescription({
		name: '1 - Control Mode',
		settable: false,
		type: typeEnum.string
	})
	private _controlMode1?: boolean;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "sensoryData",
		dataPointPath: "/roomTemperature"
	})
	@modulesDataDescription({
		name: '1 - Room Temperature',
		settable: false,
		type: typeEnum.numeric,
		minValue: 10,
		maxValue: 30,
		unite: '°C'
	})
	private _roomTemperature1?: number;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "sensoryData",
		dataPointPath: "/outdoorTemperature"
	})
	@modulesDataDescription({
		name: '1 - Outdoor Temperature',
		settable: false,
		type: typeEnum.numeric,
		minValue: -10,
		maxValue: 40,
		unite: '°C'
	})
	private _outdoorTemperature1?: number;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "sensoryData",
		dataPointPath: "/leavingWaterTemperature"
	})
	@modulesDataDescription({
		name: '1 - Leaving Water Temperature',
		settable: false,
		type: typeEnum.numeric,
		minValue: 0,
		maxValue: 50,
		unite: '°C'
	})
	private _leavingWaterTemperature1?: number;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "temperatureControl",
		dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: {
			managementPoint: "1",
			dataPoint: "operationMode"
		}
	})
	@modulesDataDescription({
		name: '1 - Temperature Control',
		settable: true,
		type: typeEnum.numeric,
		unite: '°C',
		minValue: -10,
		maxValue: 30
	})
	private _temperatureControl1?: number;
	@modulesDaikinAcces({
		managementPoint: "1",
		dataPoint: "targetTemperature",
		converter: converterEnum.numeric
	})
	@modulesDataDescription({
		name: '1 - Target Temperature',
		settable: true,
		type: typeEnum.numeric,
		unite: '°C',
		minValue: 12,
		maxValue: 30
	})
	private _targetTemperature1?: number;

	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "isHolidayModeActive"
	})
	@modulesDataDescription({
		name: '2 - Holiday Mode',
		settable: false,
		type: typeEnum.binary
	})
	private _isHolidayModeActive2?: boolean
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "isInErrorState"
	})
	@modulesDataDescription({
		name: '2 - Error State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInErrorState2?: boolean;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "isInWarningState"
	})
	@modulesDataDescription({
		name: '2 - Warning State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInWarningState2?: boolean;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "isInInstallerState"
	})
	@modulesDataDescription({
		name: '2 - Installer State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInInstallerState2?: boolean;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "isInEmergencyState"
	})
	@modulesDataDescription({
		name: '2 - Emergency State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInEmergencyState2?: boolean;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "onOffMode",
		converter: converterEnum.binary
	})
	@modulesDataDescription({
		name: '2 - State',
		settable: true,
		generic_type: "ENERGY_STATE",
		type: typeEnum.binary
	})
	private _onOffMode2?: boolean;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "operationMode"
	})
	@modulesDataDescription({
		name: '2 - Operation Mode',
		settable: false,
		type: typeEnum.string
	})
	private _operationMode2?: string;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "powerfulMode",
		converter: converterEnum.binary
	})
	@modulesDataDescription({
		name: '2 - Powerful Mode',
		settable: true,
		generic_type: "ENERGY_STATE",
		type: typeEnum.binary
	})
	private _powerfulMode?: boolean;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "heatupMode",
	})
	@modulesDataDescription({
		name: ' 2 - Heatup Mode',
		settable: false,
		type: typeEnum.string
	})
	private _heatupMode2?: string;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "sensoryData",
		dataPointPath: "/tankTemperature"
	})
	@modulesDataDescription({
		name: '2 - Tank Temperature',
		settable: false,
		type: typeEnum.numeric,
		minValue: 10,
		maxValue: 30,
		unite: '°C'
	})
	private _tankTemperature2?: number;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "temperatureControl",
		dataPointPath: "/operationModes/#value#/setpoints/domesticHotWaterTemperature",
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: {
			managementPoint: "2",
			dataPoint: "operationMode"
		}
	})
	@modulesDataDescription({
		name: '2 - Temperature Control',
		settable: false,
		type: typeEnum.numeric,
		unite: '°C',
		minValue: 30,
		maxValue: 55
	})
	private _temperatureControl?: number;
	@modulesDaikinAcces({
		managementPoint: "2",
		dataPoint: "setpointMode",
		converter: converterEnum.string
	})
	@modulesDataDescription({
		name: '2 - Setpoint Mode',
		settable: false,
		type: typeEnum.string
	})
	private _setpointMode2?: boolean;

	/** Getter and Setter **/
	set isHolidayModeActive1(value: boolean) {
		this._isHolidayModeActive1 = value;
	}
	set isInErrorState1(value: boolean) {
		this._isInErrorState1 = value;
	}
	set isInWarningState1(value: boolean) {
		this._isInWarningState1 = value;
	}
	set isInInstallerState1(value: boolean) {
		this._isInInstallerState1 = value;
	}
	set isInEmergencyState1(value: boolean) {
		this._isInEmergencyState1 = value;
	}
	set operationMode1(value: string) {
		this._operationMode1 = value;
	}
	set onOffMode1(value: boolean) {
		this._onOffMode1 = value;
	}
	set setpointMode1(value: boolean) {
		this._setpointMode1 = value;
	}
	set controlMode1(value: boolean) {
		this._controlMode1 = value;
	}
	set roomTemperature1(value: number) {
		this._roomTemperature1 = value;
	}
	set outdoorTemperature1(value: number) {
		this._outdoorTemperature1 = value;
	}
	set leavingWaterTemperature1(value: number) {
		this._leavingWaterTemperature1 = value;
	}
	set temperatureControl1(value: number) {
		this._temperatureControl1 = value;
	}
	set targetTemperature1(value: number) {
		this._targetTemperature1 = value;
	}
	set isHolidayModeActive2(value: boolean) {
		this._isHolidayModeActive2 = value;
	}
	set isInErrorState2(value: boolean) {
		this._isInErrorState2 = value;
	}
	set isInWarningState2(value: boolean) {
		this._isInWarningState2 = value;
	}
	set isInInstallerState2(value: boolean) {
		this._isInInstallerState2 = value;
	}
	set isInEmergencyState2(value: boolean) {
		this._isInEmergencyState2 = value;
	}
	set onOffMode2(value: boolean) {
		this._onOffMode2 = value;
	}
	set operationMode2(value: string) {
		this._operationMode2 = value;
	}
	set powerfulMode(value: boolean) {
		this._powerfulMode = value;
	}
	set heatupMode2(value: string) {
		this._heatupMode2 = value;
	}
	set tankTemperature2(value: number) {
		this._tankTemperature2 = value;
	}
	set temperatureControl(value: number) {
		this._temperatureControl = value;
	}
	set setpointMode2(value: boolean) {
		this._setpointMode2 = value;
	}
	set device(value: DevicesInformation) {
		this._device = value;
	}

	/** Fonctions **/
	constructor(device: any) {
		convertDaikinDevice(device, this)
	}
}
