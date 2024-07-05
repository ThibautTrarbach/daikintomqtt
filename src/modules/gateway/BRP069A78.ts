import {ClassModule, DevicesInformation} from "../../types";
import {convertDaikinDevice, converterEnum, typeEnum} from "./BaseModules";
import {modulesDaikinAcces, modulesDaikinDevice, modulesDataDescription} from "../decorator";

export class BRP069A78 implements ClassModule{

	@modulesDaikinDevice({
		name: {
			managementPoint: "climateControl",
			dataPoint: "name",
		},
		modelInfo: {
			managementPoint: "gateway",
			dataPoint: "modelInfo",
		},
		serialNumber: {
			managementPoint: "gateway",
			dataPoint: "serialNumber",
		},
		firmwareVersion: {
			managementPoint: "gateway",
			dataPoint: "firmwareVersion",
		},
		isInErrorState: {
			managementPoint: "gateway",
			dataPoint: "isInErrorState",
		}
	})
	private _device: DevicesInformation = {
		id: "",
		name: "",
		modelInfo: "",
		serialNumber: "",
		firmwareVersion: "",
		isInErrorState: "",
		errorCode: ""
	}

	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "controlMode"
	})
	@modulesDataDescription({
		name: 'Main Zone - controlMode',
		settable: false,
		type: typeEnum.string
	})
	private _controlModeMain?: string;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "errorCode"
	})
	@modulesDataDescription({
		name: 'Main Zone - Error Code',
		settable: false,
		type: typeEnum.string
	})
	private _errorCodeMain?: string;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "isHolidayModeActive"
	})
	@modulesDataDescription({
		name: 'Main Zone -Holiday Mode',
		settable: false,
		type: typeEnum.binary
	})
	private _isHolidayModeActiveMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "isInEmergencyState"
	})
	@modulesDataDescription({
		name: 'Main Zone - Emergency State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInEmergencyStateMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "isInErrorState"
	})
	@modulesDataDescription({
		name: 'Main Zone - Error State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInErrorStateMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "isInInstallerState"
	})
	@modulesDataDescription({
		name: 'Main Zone - Installer State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInInstallerStateMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "isInWarningState"
	})
	@modulesDataDescription({
		name: 'Main Zone - Warning State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInWarningStateMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "onOffMode",
		converter: converterEnum.binary
	})
	@modulesDataDescription({
		name: 'Main Zone - State',
		settable: true,
		generic_type: "ENERGY_STATE",
		type: typeEnum.binary
	})
	private _onOffModeMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "operationMode"
	})
	@modulesDataDescription({
		name: 'Main Zone - Operation Mode',
		settable: false,
		type: typeEnum.string,
		values: [
			"heating"
		]
	})
	private _operationModeMain?: string;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "sensoryData",
		dataPointPath: "/roomTemperature"
	})
	@modulesDataDescription({
		name: 'Main Zone - Room Temperature',
		settable: false,
		type: typeEnum.numeric,
		minMaxValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "sensoryData",
			dataPointPath: "/roomTemperature"
		},
		unite: '°C'
	})
	private _roomTemperatureMain?: number;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "sensoryData",
		dataPointPath: "/outdoorTemperature"
	})
	@modulesDataDescription({
		name: 'Main Zone - Outdoor Temperature',
		settable: false,
		type: typeEnum.numeric,
		minMaxValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "sensoryData",
			dataPointPath: "/outdoorTemperature"
		},
		unite: '°C'
	})
	private _outdoorTemperatureMain?: number;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "sensoryData",
		dataPointPath: "/leavingWaterTemperature"
	})
	@modulesDataDescription({
		name: 'Main Zone - Leaving Water Temperature',
		settable: false,
		type: typeEnum.numeric,
		minMaxValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "sensoryData",
			dataPointPath: "/leavingWaterTemperature"
		},
		unite: '°C'
	})
	private _leavingWaterTemperatureMain?: number;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "setpointMode",
		converter: converterEnum.string
	})
	@modulesDataDescription({
		name: 'Main Zone - Setpoint Mode',
		settable: false,
		type: typeEnum.string
	})
	private _setpointModeMain?: boolean;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "temperatureControl",
		dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "operationMode"
		}
	})
	@modulesDataDescription({
		name: 'Main Zone - Temperature Control',
		settable: true,
		type: typeEnum.numeric,
		unite: '°C',
		minMaxValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "temperatureControl",
			dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
			multiple: true,
			multipleValue: {
				managementPoint: "climateControlMainZone",
				dataPoint: "operationMode"
			}
		}
	})
	private _temperatureControlMain?: number;
	@modulesDaikinAcces({
		managementPoint: "climateControlMainZone",
		dataPoint: "temperatureControl",
		dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
		multiple: true,
		converter: converterEnum.numeric,
		multipleValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "operationMode"
		}
	})
	@modulesDataDescription({
		name: 'Main Zone - Leaving Water Control',
		settable: true,
		type: typeEnum.numeric,
		unite: '°C',
		minMaxValue: {
			managementPoint: "climateControlMainZone",
			dataPoint: "temperatureControl",
			dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
			multiple: true,
			multipleValue: {
				managementPoint: "climateControlMainZone",
				dataPoint: "operationMode"
			}
		}
	})
	private _temperatureControlWaterMain?: number;

	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "errorCode"
	})
	@modulesDataDescription({
		name: 'Water Tank - Error Code',
		settable: false,
		type: typeEnum.string
	})
	private _errorCodeTank?: string;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "heatupMode"
	})
	@modulesDataDescription({
		name: 'Main Zone - Heatup Code',
		settable: false,
		type: typeEnum.string
	})
	private _heatupModeTank?: string;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "isHolidayModeActive"
	})
	@modulesDataDescription({
		name: 'Water Tank - Holiday Mode',
		settable: false,
		type: typeEnum.binary
	})
	private _isHolidayModeActiveTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "isInEmergencyState"
	})
	@modulesDataDescription({
		name: 'Water Tank - Emergency State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInEmergencyStatTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "isInErrorState"
	})
	@modulesDataDescription({
		name: 'Water Tank - Error State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInErrorStateTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "isInInstallerState"
	})
	@modulesDataDescription({
		name: 'Water Tank - Installer State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInInstallerStateTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "isInWarningState"
	})
	@modulesDataDescription({
		name: 'Water Tank - Warning State',
		settable: false,
		type: typeEnum.binary
	})
	private _isInWarningStateTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "onOffMode",
		converter: converterEnum.binary
	})
	@modulesDataDescription({
		name: 'Water Tank - State',
		settable: true,
		generic_type: "ENERGY_STATE",
		type: typeEnum.binary
	})
	private _onOffModeTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "operationMode"
	})
	@modulesDataDescription({
		name: 'Water Tank - Operation Mode',
		settable: false,
		type: typeEnum.string,
		values: [
			"heating"
		]
	})
	private _operationModeTank?: string;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "powerfulMode",
		converter: converterEnum.binary
	})
	@modulesDataDescription({
		name: 'Water Tank - Powerful Mode',
		settable: true,
		generic_type: "ENERGY_STATE",
		type: typeEnum.binary
	})
	private _powerfulModeTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "sensoryData",
		dataPointPath: "/tankTemperature"
	})
	@modulesDataDescription({
		name: 'Water Tank - Tank Temperature',
		settable: false,
		type: typeEnum.numeric,
		minMaxValue: {
			managementPoint: "domesticHotWaterTank",
			dataPoint: "sensoryData",
			dataPointPath: "/tankTemperature"
		},
		unite: '°C'
	})
	private _tankTemperatureTank?: number;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "setpointMode",
		converter: converterEnum.string
	})
	@modulesDataDescription({
		name: 'Water Tank - Setpoint Mode',
		settable: false,
		type: typeEnum.string
	})
	private _setpointModeTank?: boolean;
	@modulesDaikinAcces({
		managementPoint: "domesticHotWaterTank",
		dataPoint: "temperatureControl",
		dataPointPath: "/operationModes/heating/setpoints/domesticHotWaterTemperature",
		converter: converterEnum.numeric
	})
	@modulesDataDescription({
		name: 'Water Tank - Domestic Water Temperature',
		settable: false,
		type: typeEnum.numeric,
		unite: '°C',
		minMaxValue: {
			managementPoint: "domesticHotWaterTank",
			dataPoint: "temperatureControl",
			dataPointPath: "/operationModes/heating/setpoints/domesticHotWaterTemperature",
		},
	})
	private _domesticHotWaterTemperatureTank?: number;

	/** Getter and Setter **/
	set controlModeMain(value: string) {
		this._controlModeMain = value;
	}
	set errorCodeMain(value: string) {
		this._errorCodeMain = value;
	}
	set isHolidayModeActiveMain(value: boolean) {
		this._isHolidayModeActiveMain = value;
	}
	set isInEmergencyStateMain(value: boolean) {
		this._isInEmergencyStateMain = value;
	}
	set isInErrorStateMain(value: boolean) {
		this._isInErrorStateMain = value;
	}
	set isInInstallerStateMain(value: boolean) {
		this._isInInstallerStateMain = value;
	}
	set isInWarningStateMain(value: boolean) {
		this._isInWarningStateMain = value;
	}
	set onOffModeMain(value: boolean) {
		this._onOffModeMain = value;
	}
	set operationModeMain(value: string) {
		this._operationModeMain = value;
	}
	set roomTemperatureMain(value: number) {
		this._roomTemperatureMain = value;
	}
	set outdoorTemperatureMain(value: number) {
		this._outdoorTemperatureMain = value;
	}
	set leavingWaterTemperatureMain(value: number) {
		this._leavingWaterTemperatureMain = value;
	}
	set setpointModeMain(value: boolean) {
		this._setpointModeMain = value;
	}
	set temperatureControlMain(value: number) {
		this._temperatureControlMain = value;
	}
	set temperatureControlWaterMain(value: number) {
		this._temperatureControlWaterMain = value;
	}
	set errorCodeTank(value: string) {
		this._errorCodeTank = value;
	}
	set heatupModeTank(value: string) {
		this._heatupModeTank = value;
	}
	set isHolidayModeActiveTank(value: boolean) {
		this._isHolidayModeActiveTank = value;
	}
	set isInEmergencyStatTank(value: boolean) {
		this._isInEmergencyStatTank = value;
	}
	set isInErrorStateTank(value: boolean) {
		this._isInErrorStateTank = value;
	}
	set isInInstallerStateTank(value: boolean) {
		this._isInInstallerStateTank = value;
	}
	set isInWarningStateTank(value: boolean) {
		this._isInWarningStateTank = value;
	}
	set onOffModeTank(value: boolean) {
		this._onOffModeTank = value;
	}
	set operationModeTank(value: string) {
		this._operationModeTank = value;
	}
	set powerfulModeTank(value: boolean) {
		this._powerfulModeTank = value;
	}
	set tankTemperatureTank(value: number) {
		this._tankTemperatureTank = value;
	}
	set setpointModeTank(value: boolean) {
		this._setpointModeTank = value;
	}
	set domesticHotWaterTemperatureTank(value: number) {
		this._domesticHotWaterTemperatureTank = value;
	}
	set device(value: DevicesInformation) {
		this._device = value;
	}


	/** Fonctions **/
	constructor(device: any) {
		convertDaikinDevice(device, this)
	}
}
