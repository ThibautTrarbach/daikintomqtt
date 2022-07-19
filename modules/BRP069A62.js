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
    if (data.temperatureControl1 !== undefined)
        await validateDataPath('1', 'temperatureControl', await setTemperatureControl(devices), data.temperatureControl1, devices)
    if (data.operationMode1 !== undefined)
        await validateData('1', 'operationMode', data.operationMode1, devices)
    if (data.targetTemperature1 !== undefined)
        await validateData('1', 'targetTemperature', data.targetTemperature1, devices)

    if (data.onOffMode2 !== undefined)
        await validateData('2', 'onOffMode', data.onOffMode2, devices)
    if (data.operationMode2 !== undefined)
        await validateData('2', 'powerfulMode', data.operationMode2, devices)

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

async function setTemperatureControl(devices) {
    switch (devices.getData('1', 'controlMode').value) {
        case 'roomTemperature':
            return "/operationModes/heating/setpoints/roomTemperature";
        case 'leavingWaterTemperature':
            return "/operationModes/heating/setpoints/leavingWaterOffset";
        default:
            return false;
    }
}

module.exports = {
    getBRP069A62,
    setBRP069A62
}
