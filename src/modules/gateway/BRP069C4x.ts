import "reflect-metadata";
import {MyDateSerializer, serializeWith} from "../decorator";
/*
class BRP069C4x {
    private _isHolidayModeActive: boolean;
    private _isInErrorState: boolean;
    private _isInWarningState: boolean;
    private _isInModeConflict: boolean;
    private isInCautionState: boolean;
    private isCoolHeatMaster: boolean;
    private operationMode: string;
    private onOffMode: string;
    private econoMode: string;
    private powerfulMode: boolean;
    private streamerMode: boolean;
    private roomTemperature: boolean;
    private outdoorTemperature: boolean;
    private scheduleEnable: boolean;
    private outdoorSilentMode: boolean;
    private temperatureControl: boolean;
    private fanControl: boolean;

}*/

class Greeter {
    @serializeWith(MyDateSerializer)
    public greeting : string;

    constructor(message: string) {
        this.greeting = message;
    }
}


export {
    Greeter
}