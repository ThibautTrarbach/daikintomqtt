/**
 *
 *      File : BRP069C4x.js
 *      Modules :
 *      Creates : 28/08/2022
 *      Updated : 28/08/2022
 *      Creator : Thibaut Trarbach
 *      Version : 1.0
 */

const {validateData, validateDataPath, getData} = require("../../utils");

async function getBRP069C4x(devices) {
    return {
        device: {
            name: getData(devices,'climateControl', 'name'),
            modelInfo: getData(devices,'gateway', 'modelInfo'),
            serialNumber: getData(devices,'gateway', 'serialNumber'),
            firmwareVersion: getData(devices,'gateway', 'firmwareVersion'),
            wifiConnectionSSID: getData(devices,'gateway', 'wifiConnectionSSID'),
            wifiConnectionStrength: getData(devices,'gateway', 'wifiConnectionStrength'),
            regionCode: getData(devices,'gateway', 'regionCode'),
            timeZone: getData(devices,'gateway', 'timeZone'),
            ledEnabled: getData(devices,'gateway', 'ledEnabled'),
            isInErrorState: getData(devices,'gateway', 'isInErrorState'),
            errorCode: getData(devices,'climateControl', 'errorCode'),
        },
        isHolidayModeActive: getData(devices,'climateControl', 'isHolidayModeActive'),
        isInErrorState: getData(devices,'climateControl', 'isInErrorState'),
        isInWarningState: getData(devices,'climateControl', 'isInWarningState'),
        isInModeConflict: getData(devices,'climateControl', 'isInModeConflict'),
        isInCautionState: getData(devices,'climateControl', 'isInCautionState'),
        isCoolHeatMaster: getData(devices,'climateControl', 'isCoolHeatMaster'),

        operationMode: getData(devices,'climateControl', 'operationMode'),
        onOffMode: getData(devices,'climateControl', 'onOffMode'),
        econoMode: getData(devices,'climateControl', 'econoMode'),
        powerfulMode: getData(devices,'climateControl', 'powerfulMode'),
        streamerMode: getData(devices,'climateControl', 'streamerMode'),

        roomTemperature: getData(devices,'climateControl', 'sensoryData', "/roomTemperature"),
        outdoorTemperature: getData(devices,'climateControl', 'sensoryData', "/outdoorTemperature"),

        scheduleEnable: getData(devices,'climateControl', 'schedule', "/currentMode"),
        outdoorSilentMode: getData(devices,'climateControl', 'outdoorSilentMode'),

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
