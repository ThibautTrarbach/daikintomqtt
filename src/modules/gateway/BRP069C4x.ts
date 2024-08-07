import "reflect-metadata";
import {
    modulesDaikinAcces, modulesDaikinDevice,
    modulesDataDescription
} from "../decorator";
import {consumptionEnum, convertDaikinDevice, converterEnum, typeEnum} from "./BaseModules";
import {ClassModule, DevicesInformation} from "../../types";

export class BRP069C4x implements ClassModule {

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
        },
        errorCode: {
            managementPoint: "climateControl",
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
        managementPoint: "climateControl",
        dataPoint: "isHolidayModeActive"
    })
    @modulesDataDescription({
        name: 'Holiday Mode',
        settable: false,
        type: typeEnum.binary
    })
    private _isHolidayModeActive?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "isInErrorState"
    })
    @modulesDataDescription({
        name: 'Error State',
        settable: false,
        type: typeEnum.binary
    })
    private _isInErrorState?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "isInWarningState"
    })
    @modulesDataDescription({
        name: 'Warning State',
        settable: false,
        type: typeEnum.binary
    })
    private _isInWarningState?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "isInModeConflict"
    })
    @modulesDataDescription({
        name: 'Conflict State',
        settable: false,
        type: typeEnum.binary
    })
    private _isInModeConflict?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "isInCautionState"
    })
    @modulesDataDescription({
        name: 'Caution State',
        settable: false,
        type: typeEnum.binary
    })
    private _isInCautionState?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "isCoolHeatMaster"
    })
    @modulesDataDescription({
        name: 'Master',
        settable: false,
        type: typeEnum.binary
    })
    private _isCoolHeatMaster?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "operationMode"
    })
    @modulesDataDescription({
        name: 'Operation Mode',
        settable: true,
        type: typeEnum.string,
        values: [
            "fanOnly",
            "heating",
            "cooling",
            "auto",
            "dry"
        ]
    })
    private _operationMode?: string;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "onOffMode",
        converter: converterEnum.binary
    })
    @modulesDataDescription({
        name: 'State',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: typeEnum.binary
    })
    private _onOffMode?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "econoMode",
        converter: converterEnum.binary
    })
    @modulesDataDescription({
        name: 'Eco Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: typeEnum.binary
    })
    private _econoMode?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "powerfulMode",
        converter: converterEnum.binary
    })
    @modulesDataDescription({
        name: 'Powerful Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: typeEnum.binary
    })
    private _powerfulMode?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "streamerMode",
        converter: converterEnum.binary
    })
    @modulesDataDescription({
        name: 'Streamer Mode',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: typeEnum.binary
    })
    private _streamerMode?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "sensoryData",
        dataPointPath: "/roomTemperature"
    })
    @modulesDataDescription({
        name: 'Room Temperature',
        settable: false,
        type: typeEnum.numeric,
        minMaxValue: {
            managementPoint: "climateControl",
            dataPoint: "sensoryData",
            dataPointPath: "/roomTemperature"
        },
        unite: '°C'
    })
    private _roomTemperature?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "sensoryData",
        dataPointPath: "/outdoorTemperature"
    })
    @modulesDataDescription({
        name: 'Outdoor Temperature',
        settable: false,
        type: typeEnum.numeric,
        minMaxValue: {
            managementPoint: "climateControl",
            dataPoint: "sensoryData",
            dataPointPath: "/outdoorTemperature"
        },
        unite: '°C'
    })
    private _outdoorTemperature?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "outdoorSilentMode",
        converter: converterEnum.binary
    })
    @modulesDataDescription({
        name: 'Outdoor Silent',
        settable: true,
        generic_type: "ENERGY_STATE",
        type: typeEnum.binary
    })
    private _outdoorSilentMode?: boolean;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "temperatureControl",
        dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
        multiple: true,
        converter: converterEnum.numeric,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    })
    @modulesDataDescription({
        name: 'Temperature Control',
        settable: true,
        type: typeEnum.numeric,
        unite: '°C',
        minMaxValue: {
            managementPoint: "climateControl",
            dataPoint: "temperatureControl",
            dataPointPath: "/operationModes/#value#/setpoints/roomTemperature",
            multiple: true,
            multipleValue: {
                managementPoint: "climateControl",
                dataPoint: "operationMode"
            }
        },
    })
    private _temperatureControl?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanSpeed/currentMode",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    })
    @modulesDataDescription({
        name: 'Fan Current Mode',
        settable: true,
        type: typeEnum.string,
        values: [
            "auto",
            "quiet",
            "fixed",
        ]
    })
    private _fanCurrentMode?: string;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanSpeed/modes/fixed",
        multiple: true,
        converter: converterEnum.numeric,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    })
    @modulesDataDescription({
        name: 'Fan Fixed',
        settable: true,
        type: typeEnum.numeric,
        minMaxValue: {
            managementPoint: "climateControl",
            dataPoint: "fanControl",
            dataPointPath: "/operationModes/#value#/fanSpeed/modes/fixed",
            multiple: true,
            multipleValue: {
                managementPoint: "climateControl",
                dataPoint: "operationMode"
            }
        },
    })
    private _fanFixed?: string;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanDirection/horizontal/currentMode",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    })
    @modulesDataDescription({
        name: 'Fan Horizontal',
        settable: true,
        type: typeEnum.string,
        values: [
            "stop",
            "swing"
        ]
    })
    private _fanHorizontal?: string;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "fanControl",
        dataPointPath: "/operationModes/#value#/fanDirection/vertical/currentMode",
        multiple: true,
        multipleValue: {
            managementPoint: "climateControl",
            dataPoint: "operationMode"
        }
    })
    @modulesDataDescription({
        name: 'Fan Vertical',
        settable: true,
        type: typeEnum.string,
        values: [
            "stop",
            "swing",
            "windNice"
        ]
    })
    private _fanVertical?: string;

    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: consumptionEnum.heatingDay,
        converter: converterEnum.consumption
    })
    @modulesDataDescription({
        name: 'Heating Consumption Day',
        settable: false,
        type: typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    })
    private _heatingConsumptionD?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: consumptionEnum.heatingWeek,
        converter: converterEnum.consumption
    })
    @modulesDataDescription({
        name: 'Heating Consumption Week',
        settable: false,
        type: typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    })
    private _heatingConsumptionW?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: consumptionEnum.heatingMonth,
        converter: converterEnum.consumption
    })
    @modulesDataDescription({
        name: 'Heating Consumption Month',
        settable: false,
        type: typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    })
    private _heatingConsumptionM?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: consumptionEnum.coolingDay,
        converter: converterEnum.consumption
    })
    @modulesDataDescription({
        name: 'Cooling Consumption Day',
        settable: false,
        type: typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    })
    private _coolingConsumptionD?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: consumptionEnum.coolingWeek,
        converter: converterEnum.consumption
    })
    @modulesDataDescription({
        name: 'Cooling Consumption Week',
        settable: false,
        type: typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    })
    private _coolingConsumptionW?: number;
    @modulesDaikinAcces({
        managementPoint: "climateControl",
        dataPoint: "consumptionData",
        dataPointPath: "/electrical",
        consumptionT: consumptionEnum.coolingMonth,
        converter: converterEnum.consumption
    })
    @modulesDataDescription({
        name: 'Cooling Consumption Month',
        settable: false,
        type: typeEnum.numeric,
        minValue: 0,
        maxValue: 3000,
        unite: 'kWh'
    })
    private _coolingConsumptionM?: number;

    /** Getter and Setter **/
    set outdoorSilentMode(value: boolean) {
        this._outdoorSilentMode = value;
    }
    set streamerMode(value: boolean) {
        this._streamerMode = value;
    }
    set powerfulMode(value: boolean) {
        this._powerfulMode = value;
    }
    set econoMode(value: boolean) {
        this._econoMode = value;
    }
    set onOffMode(value: boolean) {
        this._onOffMode = value;
    }
    set operationMode(value: string) {
        this._operationMode = value;
    }
    set isCoolHeatMaster(value: boolean) {
        this._isCoolHeatMaster = value;
    }
    set isHolidayModeActive(value: boolean) {
        this._isHolidayModeActive = value;
    }
    set isInErrorState(value: boolean) {
        this._isInErrorState = value;
    }
    set isInWarningState(value: boolean) {
        this._isInWarningState = value;
    }
    set isInCautionState(value: boolean) {
        this._isInCautionState = value;
    }
    set roomTemperature(value: number) {
        this._roomTemperature = value;
    }
    set outdoorTemperature(value: number) {
        this._outdoorTemperature = value;
    }
    set temperatureControl(value: number) {
        this._temperatureControl = value;
    }
    set fanVertical(value: string) {
        this._fanVertical = value;
    }
    set fanHorizontal(value: string) {
        this._fanHorizontal = value;
    }
    set fanFixed(value: string) {
        this._fanFixed = value;
    }
    set fanCurrentMode(value: string) {
        this.fanCurrentMode = value;
    }
    set device(value: DevicesInformation) {
        this._device = value;
    }

    /** Fonctions **/
    constructor(device: any) {
        convertDaikinDevice(device, this)
    }
}
