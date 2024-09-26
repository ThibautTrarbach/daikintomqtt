import { ClassModule, DevicesInformation } from "../../types";
export declare class BRP069A78 implements ClassModule {
    private _device;
    private _controlModeMain?;
    private _errorCodeMain?;
    private _isHolidayModeActiveMain?;
    private _isInEmergencyStateMain?;
    private _isInErrorStateMain?;
    private _isInInstallerStateMain?;
    private _isInWarningStateMain?;
    private _onOffModeMain?;
    private _operationModeMain?;
    private _roomTemperatureMain?;
    private _outdoorTemperatureMain?;
    private _leavingWaterTemperatureMain?;
    private _setpointModeMain?;
    private _temperatureControlMain?;
    private _temperatureControlWaterMain?;
    private _errorCodeTank?;
    private _heatupModeTank?;
    private _isHolidayModeActiveTank?;
    private _isInEmergencyStatTank?;
    private _isInErrorStateTank?;
    private _isInInstallerStateTank?;
    private _isInWarningStateTank?;
    private _onOffModeTank?;
    private _operationModeTank?;
    private _powerfulModeTank?;
    private _tankTemperatureTank?;
    private _setpointModeTank?;
    private _domesticHotWaterTemperatureTank?;
    set controlModeMain(value: string);
    set errorCodeMain(value: string);
    set isHolidayModeActiveMain(value: boolean);
    set isInEmergencyStateMain(value: boolean);
    set isInErrorStateMain(value: boolean);
    set isInInstallerStateMain(value: boolean);
    set isInWarningStateMain(value: boolean);
    set onOffModeMain(value: boolean);
    set operationModeMain(value: string);
    set roomTemperatureMain(value: number);
    set outdoorTemperatureMain(value: number);
    set leavingWaterTemperatureMain(value: number);
    set setpointModeMain(value: boolean);
    set temperatureControlMain(value: number);
    set temperatureControlWaterMain(value: number);
    set errorCodeTank(value: string);
    set heatupModeTank(value: string);
    set isHolidayModeActiveTank(value: boolean);
    set isInEmergencyStatTank(value: boolean);
    set isInErrorStateTank(value: boolean);
    set isInInstallerStateTank(value: boolean);
    set isInWarningStateTank(value: boolean);
    set onOffModeTank(value: boolean);
    set operationModeTank(value: string);
    set powerfulModeTank(value: boolean);
    set tankTemperatureTank(value: number);
    set setpointModeTank(value: boolean);
    set domesticHotWaterTemperatureTank(value: number);
    set device(value: DevicesInformation);
    constructor(device: any);
}
