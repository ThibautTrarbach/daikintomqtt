const {generateInfoModule} = require("./default");
const {getBRP069C4x, setBRP069C4x} = require("./BRP069C4x");

async function getDataFromModules(devices, dataDirectory) {
    console.log(devices.getData())
    let value = devices.getData('gateway', 'modelInfo').value ?? devices.getData(0, 'modelInfo').value;

    console.log(value)

    switch (value) {
        case 'BRP069C4x':
            console.log("Coucou 4.1")
            return await getBRP069C4x(devices);
        default:
            console.log("Coucou 4.2")
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
