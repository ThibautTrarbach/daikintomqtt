const {generateInfoModule} = require("./default");
const {getBRP069C4x, setBRP069C4x} = require("./BRP069C4x");

async function getDataFromModules(devices, dataDirectory) {
    switch (devices.getData('gateway', 'modelInfo').value) {
        case 'BRP069C4xaa':
            return await getBRP069C4x(devices);
        default:
            await generateInfoModule(dataDirectory, devices)
            return "defaults";
    }
}

async function setDataFromModules(devices, message) {
    switch (devices.getData('gateway', 'modelInfo').value) {
        case 'BRP069C4x':
            return await setBRP069C4x(devices, message);
        default:
            return "null";
    }
}


module.exports = {
    getDataFromModules,
    setDataFromModules
}
