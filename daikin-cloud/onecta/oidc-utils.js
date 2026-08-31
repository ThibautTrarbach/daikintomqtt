"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESOLVED = exports.maybeParseInt = exports.onecta_oidc_auth_thank_you_html = exports.onecta_oidc_issuer = exports.OnectaMockDevice = exports.OnectaOIDCEndpoint = exports.OnectaAPIBaseUrl = exports.OnectaOIDCScope = void 0;
const openid_client_1 = require("openid-client");
var OnectaOIDCScope;
(function (OnectaOIDCScope) {
    OnectaOIDCScope["basic"] = "openid onecta:basic.integration";
})(OnectaOIDCScope || (exports.OnectaOIDCScope = OnectaOIDCScope = {}));
var OnectaAPIBaseUrl;
(function (OnectaAPIBaseUrl) {
    OnectaAPIBaseUrl["prod"] = "https://api.onecta.daikineurope.com";
    OnectaAPIBaseUrl["mock"] = "https://api.onecta.daikineurope.com/mock";
})(OnectaAPIBaseUrl || (exports.OnectaAPIBaseUrl = OnectaAPIBaseUrl = {}));
var OnectaOIDCEndpoint;
(function (OnectaOIDCEndpoint) {
    OnectaOIDCEndpoint["authorization"] = "https://idp.onecta.daikineurope.com/v1/oidc/authorize";
    OnectaOIDCEndpoint["token"] = "https://idp.onecta.daikineurope.com/v1/oidc/token";
    OnectaOIDCEndpoint["revocation"] = "https://idp.onecta.daikineurope.com/v1/oidc/revoke";
    OnectaOIDCEndpoint["introspection"] = "https://idp.onecta.daikineurope.com/v1/oidc/introspect";
})(OnectaOIDCEndpoint || (exports.OnectaOIDCEndpoint = OnectaOIDCEndpoint = {}));
var OnectaMockDevice;
(function (OnectaMockDevice) {
    OnectaMockDevice["airToAirDx23"] = "air-to-air-dx23";
    OnectaMockDevice["airToAirDx4"] = "air-to-air-dx4";
    OnectaMockDevice["airPurifierWithHumidifier"] = "airpurifier-with-humidifier";
    OnectaMockDevice["airPurifier"] = "airpurifier";
    OnectaMockDevice["althermaAirToWaterLan"] = "altherma-air-to-water-lan";
    OnectaMockDevice["althermaAirToWaterWlan"] = "altherma-air-to-water-wlan";
    OnectaMockDevice["d2cndGasBoiler"] = "d2cnd-gas-boiler";
})(OnectaMockDevice || (exports.OnectaMockDevice = OnectaMockDevice = {}));
exports.onecta_oidc_issuer = new openid_client_1.Issuer({
    issuer: 'Daikin',
    authorization_endpoint: OnectaOIDCEndpoint.authorization,
    token_endpoint: OnectaOIDCEndpoint.token,
    revocation_endpoint: OnectaOIDCEndpoint.revocation,
    introspection_endpoint: OnectaOIDCEndpoint.introspection,
});
exports.onecta_oidc_auth_thank_you_html = `
<html>
<head>
<title>Thank you!</title>
</head>
<body>
  <h1>Authorization complete</h1>
  <p>Thank you for authorizing <code>daikin-controller-cloud</code> to access your devices.</p>
</body>
</html>
`;
const maybeParseInt = (v) => {
    return typeof v === 'string' ? parseInt(v) : undefined;
};
exports.maybeParseInt = maybeParseInt;
exports.RESOLVED = Promise.resolve();
//# sourceMappingURL=oidc-utils.js.map