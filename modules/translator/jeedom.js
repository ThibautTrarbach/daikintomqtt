function generateCMDAction(
    name,
    genricType = null,
    isHistorized = false,
    subType = "string",
    unite = null,

) {
    let isVisible = false;
    let value = false;
    let minValue = false;
    let maxValue = false;

    let cmd = {
        "type": "info",
        "name": name,
        "generic_type": genricType,
        "isHistorized": isHistorized,
        "subType": subType,
        "unite": unite,
        "value": null,
        "minValue": null,
        "maxValue": null
    }
}

function generateCMDInfo() {

}

module.exports = {

}