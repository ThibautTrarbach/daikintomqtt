const {validateData, validateDataPath} = require("../utils");

async function getBRP069A62(devices) {
    return {
        device: {
            name: devices.getData('0', 'name').value,
            modelInfo: devices.getData('0', 'modelInfo').value,
            serialNumber: devices.getData('0', 'serialNumber').value,
            firmwareVersion: devices.getData('0', 'firmwareVersion').value,
            errorCode: devices.getData('1', 'errorCode').value,
            isInErrorState: devices.getData('0', 'isInErrorState').value,
        },
        'isHolidayModeActive1': devices.getData('1', 'isHolidayModeActive').value,
        'isInErrorState1': devices.getData('1', 'isInErrorState').value,
        'isInWarningState1': devices.getData('1', 'isInWarningState').value,
        'isInInstallerState1': devices.getData('1', 'isInInstallerState').value,
        'isInEmergencyState1': devices.getData('1', 'isInEmergencyState').value,
        'operationMode1': devices.getData('1', 'operationMode').value,
        'onOffMode1': devices.getData('1', 'onOffMode').value,
        'setpointMode1': devices.getData('1', 'setpointMode').value,
        'controlMode1': devices.getData('1', 'controlMode').value,
        'roomTemperature1': devices.getData('1', 'sensoryData', "/roomTemperature").value,
        'outdoorTemperature1': devices.getData('1', 'sensoryData', "/outdoorTemperature").value,
        'leavingWaterTemperature1': devices.getData('1', 'sensoryData', "/leavingWaterTemperature").value,
        'temperatureControl1': await getTemperatureControlModules1(devices),
        'targetTemperature1': devices.getData('1', 'targetTemperature').value,

        'isHolidayModeActive2': devices.getData('2', 'isHolidayModeActive').value,
        'isInErrorState2': devices.getData('2', 'isInErrorState').value,
        'isInWarningState2': devices.getData('2', 'isInWarningState').value,
        'isInInstallerState2': devices.getData('2', 'isInInstallerState').value,
        'isInEmergencyState2': devices.getData('2', 'isInEmergencyState').value,
        'onOffMode2': devices.getData('2', 'onOffMode').value,
        'operationMode2': devices.getData('2', 'operationMode').value,
        'powerfulMode2': devices.getData('2', 'powerfulMode').value,
        'heatupMode2': devices.getData('2', 'heatupMode').value,
        'tankTemperature2': devices.getData('2', 'sensoryData', "/tankTemperature").value,
        'temperatureControl2': devices.getData('2', 'temperatureControl', "/operationModes/heating/setpoints/domesticHotWaterTemperature").value,
        'setpointMode2': devices.getData('2', 'setpointMode').value,
    };
}

async function setBRP069A62(devices, message) {
    const data = JSON.parse(message);

    if (data.onOffMode1 !== undefined)
        await validateData('1', 'onOffMode', data.onOffMode1, devices)
    if (data.operationMode !== undefined)
        await validateData('climateControl', 'operationMode', data.operationMode, devices)
    if (data.temperatureControl !== undefined)
        await validateDataPath('climateControl', 'temperatureControl',await setTemperatureControl(devices), data.temperatureControl, devices)
    if (data.fanControl !== undefined)
        await updateFanControl(data.fanControl, devices)
    if (data.econoMode !== undefined)
        await validateData('climateControl', 'econoMode', data.econoMode, devices)
    if (data.powerfulMode !== undefined)
        await validateData('climateControl', 'powerfulMode', data.powerfulMode, devices)
    if (data.streamerMode !== undefined)
        await validateData('climateControl', 'streamerMode', data.streamerMode, devices)
    if (data.outdoorSilentMode !== undefined)
        await validateData('climateControl', 'outdoorSilentMode', data.outdoorSilentMode, devices)


    await devices.updateData();
    console.log("Update Value")
}

async function getTemperatureControlModules1(devices) {
    switch (devices.getData('1', 'controlMode').value) {
        case 'roomTemperature':
            return devices.getData('1', 'temperatureControl', "/operationModes/heating/setpoints/roomTemperature").value
        case 'leavingWaterTemperature':
            return devices.getData('1', 'temperatureControl', "/operationModes/heating/setpoints/leavingWaterOffset").value
        default:
            return -1;
    }
}

module.exports = {
    getBRP069A62,
    setBRP069A62
}
