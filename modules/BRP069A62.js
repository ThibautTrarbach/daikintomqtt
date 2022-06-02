const {validateData, validateDataPath} = require("../utils");

async function getBRP069A62(devices) {
    return {
        device: {
            name: devices.getData('0', 'name').value,
            modelInfo: devices.getData('0', 'modelInfo').value,
            serialNumber: devices.getData('0', 'serialNumber').value,
            firmwareVersion: devices.getData('0', 'firmwareVersion').value,
            errorCode: devices.getData('climateControl', 'errorCode').value,
            isInErrorState: devices.getData('gateway', 'isInErrorState').value,
        },
        heatingfloor: {
            isHolidayModeActive: devices.getData('1', 'isHolidayModeActive').value,
            isInErrorState: devices.getData('1', 'isInErrorState').value,
            isInWarningState: devices.getData('1', 'isInWarningState').value,
            isInInstallerState: devices.getData('1', 'isInInstallerState').value,
            isInEmergencyState: devices.getData('1', 'isInEmergencyState').value,

            operationMode: devices.getData('1', 'operationMode').value,
            setpointMode: devices.getData('1', 'setpointMode').value,
            controlMode: devices.getData('1', 'controlMode').value,
            roomTemperature: devices.getData('1', 'sensoryData', "/roomTemperature").value,
            outdoorTemperature: devices.getData('1', 'sensoryData', "/outdoorTemperature").value,
            leavingWaterTemperature: devices.getData('1', 'sensoryData', "/leavingWaterTemperature").value,
            temperatureControl: await getTemperatureControlModules1(devices),
            targetTemperature: devices.getData('1', 'targetTemperature').value
        }
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
            return devices.getData('climateControl', 'temperatureControl', "/operationModes/heating/setpoints/roomTemperature").value
        case 'leavingWaterTemperature':
            return devices.getData('climateControl', 'temperatureControl', "/operationModes/heating/setpoints/leavingWaterOffset").value
        default:
            return -1;
    }
}

module.exports = {
    getBRP069A62,
    setBRP069A62
}
