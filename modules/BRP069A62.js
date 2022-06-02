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
        '1-isHolidayModeActive': devices.getData('1', 'isHolidayModeActive').value,
        '1-isInErrorState': devices.getData('1', 'isInErrorState').value,
        '1-isInWarningState': devices.getData('1', 'isInWarningState').value,
        '1-isInInstallerState': devices.getData('1', 'isInInstallerState').value,
        '1-isInEmergencyState': devices.getData('1', 'isInEmergencyState').value,

        '1-operationMode': devices.getData('1', 'operationMode').value,
        '1-onOffMode': devices.getData('1', 'onOffMode').value,
        '1-setpointMode': devices.getData('1', 'setpointMode').value,
        '1-controlMode': devices.getData('1', 'controlMode').value,
        '1-roomTemperature': devices.getData('1', 'sensoryData', "/roomTemperature").value,
        '1-outdoorTemperature': devices.getData('1', 'sensoryData', "/outdoorTemperature").value,
        '1-leavingWaterTemperature': devices.getData('1', 'sensoryData', "/leavingWaterTemperature").value,
        '1-temperatureControl': await getTemperatureControlModules1(devices),
        '1-targetTemperature': devices.getData('1', 'targetTemperature').value,

        '2-isHolidayModeActive': devices.getData('2', 'isHolidayModeActive').value,
        '2-isInErrorState': devices.getData('2', 'isInErrorState').value,
        '2-isInWarningState': devices.getData('2', 'isInWarningState').value,
        '2-isInInstallerState': devices.getData('2', 'isInInstallerState').value,
        '2-isInEmergencyState': devices.getData('2', 'isInEmergencyState').value,

        '2-onOffMode': devices.getData('2', 'onOffMode').value,
        '2-operationMode': devices.getData('2', 'operationMode').value,
        '2-powerfulMode': devices.getData('2', 'powerfulMode').value,
        '2-heatupMode': devices.getData('2', 'heatupMode').value,
        '2-tankTemperature': devices.getData('2', 'sensoryData', "/tankTemperature").value,
        '2-temperatureControl': devices.getData('2', 'temperatureControl', "/operationModes/heating/setpoints/domesticHotWaterTemperature").value,
        '2-setpointMode': devices.getData('2', 'setpointMode').value,
    };
}

async function setBRP069A62(devices, message) {
    const data = JSON.parse(message);

    if (data.onOffMode !== undefined)
        await validateData('climateControl', 'onOffMode', data.onOffMode, devices)
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
