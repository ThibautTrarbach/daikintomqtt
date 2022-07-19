async function validateData(managementPoint, dataPoint, value, devices) {
    console.log('1')
    let params = devices.getData(managementPoint, dataPoint);
    console.log('1')
    let data = await checkData(params, value)
    console.log('3')
    console.log(params)
    console.log(data);
    if (!data.isOK) return;

    await devices.setData(managementPoint, dataPoint, data.value)
    console.log('4')
}


async function validateDataPath(managementPoint, dataPoint,dataPointPath, value, devices) {
    let params = devices.getData(managementPoint, dataPoint, dataPointPath);

    let data = await checkData(params, value)
    console.log(params)
    console.log(data);
    if (!data.isOK) return;

    await devices.setData(managementPoint, dataPoint, dataPointPath, data.value)
}

async function checkData(params, value) {
    let result = {
        isOK: false,
        value: value
    }

    if (!params.settable) return result;
    if (params.values && !params.values.includes(value)) return result;
    if (value < params.minValue) result.value = params.minValue;
    if (params.maxValue < value) result.value = params.maxValue;
    if (result.value === params.value) return result;

    result.isOK = true;
    return result;
}

module.exports = {
    validateData,
    validateDataPath
}
