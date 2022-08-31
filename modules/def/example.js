/**
 *
 *      File : example.js
 *      Modules :
 *      Creates : 01/01/1970
 *      Updated : 01/01/1970
 *      Creator : Joe Doe
 *
 */

const {validateData, validateDataPath} = require("../../utils");

async function getExample(devices) {
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
    };
}

async function setExample(devices, message) {
    const data = JSON.parse(message);

    if (data.onOffMode !== undefined)
        await validateData('climateControl', 'onOffMode', data.onOffMode, devices)

    await devices.updateData();
    console.log("Update Value")
}

module.exports = {
    getExample,
    setExample
}
