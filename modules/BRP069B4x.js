/**
 *
 *      File : BRP069B4x.js
 *      Modules : FTXM20N2V1B
 *      Creates : 28/08/2022
 *      Updated : 28/08/2022
 *      Creator : Thibaut Trarbach
 *      Version : 1.0
 *
 */

const {validateData, validateDataPath} = require("../utils");

async function getBRP069B4x(devices) {
    return {
        device: {
            name: devices.getData('gateway', 'name').value,
            modelInfo: devices.getData('gateway', 'modelInfo').value,
            firmwareVersion: devices.getData('gateway', 'firmwareVersion').value,
            wifiConnectionSSID: devices.getData('gateway', 'wifiConnectionSSID').value,
            wifiConnectionStrength: devices.getData('gateway', 'wifiConnectionStrength').value,
            regionCode: devices.getData('gateway', 'regionCode').value,
            timeZone: devices.getData('gateway', 'timeZone').value,
            ledEnabled: devices.getData('gateway', 'ledEnabled').value,
            errorCode: devices.getData('climateControl', 'errorCode').value,
        },
        isHolidayModeActive: devices.getData('climateControl', 'isHolidayModeActive').value,
        isInErrorState: devices.getData('climateControl', 'isInErrorState').value,
        isInModeConflict: devices.getData('climateControl', 'isInModeConflict') ? devices.getData('climateControl', 'isInModeConflict').value : null,

        operationMode: devices.getData('climateControl', 'operationMode').value,
        onOffMode: devices.getData('climateControl', 'onOffMode').value,
        econoMode: devices.getData('climateControl', 'econoMode').value,
        powerfulMode: devices.getData('climateControl', 'powerfulMode').value,
        streamerMode: devices.getData('climateControl', 'streamerMode').value,

        roomTemperature: devices.getData('climateControl', 'sensoryData', "/roomTemperature").value,
        outdoorTemperature: devices.getData('climateControl', 'sensoryData', "/outdoorTemperature").value,

        scheduleEnable: devices.getData('climateControl', 'schedule', "/currentMode").value,
        outdoorSilentMode: devices.getData('climateControl', 'outdoorSilentMode').value,

        temperatureControl: await getTemperatureControl(devices),
        fanControl: await getFanControl(devices),
    };
}

async function setBRP069B4x(devices, message) {
    const data = JSON.parse(message);

    if (data.onOffMode !== undefined)
        await validateData('climateControl', 'onOffMode', data.onOffMode, devices)

    await devices.updateData();
    console.log("Update Value")
}

module.exports = {
    getBRP069B4x,
    setBRP069B4x
}
