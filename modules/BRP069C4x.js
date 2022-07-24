const {validateData, validateDataPath} = require("../utils");

async function getBRP069C4x(devices) {
    return {
        device: {
            name: devices.getData('climateControl', 'name').value,
            modelInfo: devices.getData('gateway', 'modelInfo').value,
            serialNumber: devices.getData('gateway', 'serialNumber').value,
            firmwareVersion: devices.getData('gateway', 'firmwareVersion').value,
            wifiConnectionSSID: devices.getData('gateway', 'wifiConnectionSSID').value,
            wifiConnectionStrength: devices.getData('gateway', 'wifiConnectionStrength').value,
            regionCode: devices.getData('gateway', 'regionCode').value,
            timeZone: devices.getData('gateway', 'timeZone').value,
            ledEnabled: devices.getData('gateway', 'ledEnabled').value,
            isInErrorState: devices.getData('gateway', 'isInErrorState').value,
            errorCode: devices.getData('climateControl', 'errorCode').value,
        },
        isHolidayModeActive: devices.getData('climateControl', 'isHolidayModeActive').value,
        isInErrorState: devices.getData('climateControl', 'isInErrorState').value,
        isInWarningState: devices.getData('climateControl', 'isInWarningState').value,
        isInModeConflict: devices.getData('climateControl', 'isInModeConflict') ? devices.getData('climateControl', 'isInModeConflict').value : null,
        isInCautionState: devices.getData('climateControl', 'isInCautionState').value,
        isCoolHeatMaster: devices.getData('climateControl', 'isCoolHeatMaster').value,

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

async function setBRP069C4x(devices, message) {
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

async function getTemperatureControl(devices) {
    switch (devices.getData('climateControl', 'operationMode').value) {
        case 'heating':
            return devices.getData('climateControl', 'temperatureControl', "/operationModes/heating/setpoints/roomTemperature").value
        case 'cooling':
            return devices.getData('climateControl', 'temperatureControl', "/operationModes/cooling/setpoints/roomTemperature").value
        case 'auto':
            return devices.getData('climateControl', 'temperatureControl', "/operationModes/auto/setpoints/roomTemperature").value
        default:
            return -1;
    }
}

async function setTemperatureControl(devices) {
    switch (devices.getData('climateControl', 'operationMode').value) {
        case 'heating':
            return "/operationModes/heating/setpoints/roomTemperature"
        case 'cooling':
            return "/operationModes/cooling/setpoints/roomTemperature"
        case 'auto':
            return "/operationModes/auto/setpoints/roomTemperature"
        default:
            return false;
    }
}

async function getFanControl(devices) {
    switch (devices.getData('climateControl', 'operationMode').value) {
        case 'heating':
            return {
                currentMode: devices.getData('climateControl', 'fanControl', "/operationModes/heating/fanSpeed/currentMode").value,
                fixed: devices.getData('climateControl', 'fanControl', "/operationModes/heating/fanSpeed/modes/fixed").value,
                horizontal: devices.getData('climateControl', 'fanControl', "/operationModes/heating/fanDirection/horizontal/currentMode").value,
                vertical: devices.getData('climateControl', 'fanControl', "/operationModes/heating/fanDirection/vertical/currentMode").value,
            }
        case 'cooling':
            return {
                currentMode: devices.getData('climateControl', 'fanControl', "/operationModes/cooling/fanSpeed/currentMode").value,
                fixed: devices.getData('climateControl', 'fanControl', "/operationModes/cooling/fanSpeed/modes/fixed").value,
                horizontal: devices.getData('climateControl', 'fanControl', "/operationModes/cooling/fanDirection/horizontal/currentMode").value,
                vertical: devices.getData('climateControl', 'fanControl', "/operationModes/cooling/fanDirection/vertical/currentMode").value,
            }
        case 'auto':
            return {
                currentMode: devices.getData('climateControl', 'fanControl', "/operationModes/auto/fanSpeed/currentMode").value,
                fixed: devices.getData('climateControl', 'fanControl', "/operationModes/auto/fanSpeed/modes/fixed").value,
                horizontal: devices.getData('climateControl', 'fanControl', "/operationModes/auto/fanDirection/horizontal/currentMode").value,
                vertical: devices.getData('climateControl', 'fanControl', "/operationModes/auto/fanDirection/vertical/currentMode").value,
            }
        case 'dry':
            return {
                currentMode: devices.getData('climateControl', 'fanControl', "/operationModes/dry/fanSpeed/currentMode").value,
                vertical: devices.getData('climateControl', 'fanControl', "/operationModes/dry/fanDirection/vertical/currentMode").value,
                horizontal: devices.getData('climateControl', 'fanControl', "/operationModes/dry/fanDirection/horizontal/currentMode").value,
                fixed: -1,
            }
        case 'fanOnly':
            return {
                currentMode: devices.getData('climateControl', 'fanControl', "/operationModes/fanOnly/fanSpeed/currentMode").value,
                fixed: devices.getData('climateControl', 'fanControl', "/operationModes/fanOnly/fanSpeed/modes/fixed").value,
                horizontal: devices.getData('climateControl', 'fanControl', "/operationModes/fanOnly/fanDirection/horizontal/currentMode").value,
                vertical: devices.getData('climateControl', 'fanControl', "/operationModes/fanOnly/fanDirection/vertical/currentMode").value,
            }
        default:
            return -1;
    }
}

async function updateFanControl(data, devices) {
    switch (devices.getData('climateControl', 'operationMode').value) {
        case 'heating':
            if (data.currentMode) await validateDataPath('climateControl', 'fanControl', "/operationModes/heating/fanSpeed/currentMode", data.currentMode, devices)
            if (data.fixed) await validateDataPath('climateControl', 'fanControl', "/operationModes/heating/fanSpeed/modes/fixed", data.fixed, devices)
            if (data.horizontal) await validateDataPath('climateControl', 'fanControl', "/operationModes/heating/fanDirection/horizontal/currentMode", data.horizontal, devices)
            if (data.vertical) await validateDataPath('climateControl', 'fanControl', "/operationModes/heating/fanDirection/vertical/currentMode", data.vertical, devices)
            break;
        case 'cooling':
            if (data.currentMode) await validateDataPath('climateControl', 'fanControl', "/operationModes/cooling/fanSpeed/currentMode", data.currentMode, devices)
            if (data.fixed) await validateDataPath('climateControl', 'fanControl', "/operationModes/cooling/fanSpeed/modes/fixed", data.fixed, devices)
            if (data.horizontal) await validateDataPath('climateControl', 'fanControl', "/operationModes/cooling/fanDirection/horizontal/currentMode", data.horizontal, devices)
            if (data.vertical) await validateDataPath('climateControl', 'fanControl', "/operationModes/cooling/fanDirection/vertical/currentMode", data.vertical, devices)
            break;
        case 'auto':
            if (data.currentMode) await validateDataPath('climateControl', 'fanControl', "/operationModes/auto/fanSpeed/currentMode", data.currentMode, devices)
            if (data.fixed) await validateDataPath('climateControl', 'fanControl', "/operationModes/auto/fanSpeed/modes/fixed", data.fixed, devices)
            if (data.horizontal) await validateDataPath('climateControl', 'fanControl', "/operationModes/auto/fanDirection/horizontal/currentMode", data.horizontal, devices)
            if (data.vertical) await validateDataPath('climateControl', 'fanControl', "/operationModes/auto/fanDirection/vertical/currentMode", data.vertical, devices)
            break;
        case 'dry':
            if (data.currentMode) await validateDataPath('climateControl', 'fanControl', "/operationModes/dry/fanSpeed/currentMode", data.currentMode, devices)
            if (data.horizontal) await validateDataPath('climateControl', 'fanControl', "/operationModes/dry/fanDirection/horizontal/currentMode", data.horizontal, devices)
            if (data.vertical) await validateDataPath('climateControl', 'fanControl', "/operationModes/dry/fanDirection/vertical/currentMode", data.vertical, devices)
            break;
        case 'fanOnly':
            if (data.currentMode) await validateDataPath('climateControl', 'fanControl', "/operationModes/fanOnly/fanSpeed/currentMode", data.currentMode, devices)
            if (data.fixed) await validateDataPath('climateControl', 'fanControl', "/operationModes/fanOnly/fanSpeed/modes/fixed", data.fixed, devices)
            if (data.horizontal) await validateDataPath('climateControl', 'fanControl', "/operationModes/fanOnly/fanDirection/horizontal/currentMode", data.horizontal, devices)
            if (data.vertical) await validateDataPath('climateControl', 'fanControl', "/operationModes/fanOnly/fanDirection/vertical/currentMode", data.vertical, devices)
            break;
    }
    return;
}

module.exports = {
    getBRP069C4x,
    setBRP069C4x
}
