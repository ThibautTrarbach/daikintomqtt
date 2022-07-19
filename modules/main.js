const {generateInfoModule} = require("./default");
const {getBRP069C4x, setBRP069C4x} = require("./BRP069C4x");
const {getBRP069A62, setBRP069A62} = require("./BRP069A62");

async function getDataFromModules(devices, dataDirectory) {
    let value;
    if (devices.getData('gateway', 'modelInfo') !== null) value = devices.getData('gateway', 'modelInfo').value
    else if (devices.getData('0', 'modelInfo') !== null) value = devices.getData('0', 'modelInfo').value
    switch (value) {
        case 'BRP069C4x':
            return await getBRP069C4x(devices);
        case 'BRP069A62':
            return await getBRP069A62(devices);
        default:
            await generateInfoModule(dataDirectory, devices)
            return "defaults";
    }
}

async function setDataFromModules(devices, message) {
    switch (devices.getData('gateway', 'modelInfo').value) {
        case 'BRP069C4x':
            return await setBRP069C4x(devices, message);
        case 'BRP069A62':
            return await setBRP069A62(devices, message);
        default:
            return "null";
    }
}


module.exports = {
    getDataFromModules,
    setDataFromModules
}
