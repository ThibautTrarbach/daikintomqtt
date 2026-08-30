"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAIKIN_MOBILE_CONFIG = void 0;
exports.DAIKIN_MOBILE_CONFIG = {
    apiKey: process.env.DAIKIN_API_KEY ?? '',
    clientId: process.env.DAIKIN_CLIENT_ID ?? '',
    clientSecret: process.env.DAIKIN_CLIENT_SECRET ?? '',
    redirectUri: process.env.DAIKIN_REDIRECT_URI || 'daikinunified://cdc/',
    gigyaBaseUrl: process.env.DAIKIN_GIGYA_BASE_URL || 'https://cdc.daikin.eu',
    idpTokenEndpoint: process.env.DAIKIN_IDP_TOKEN_ENDPOINT || 'https://idp.onecta.daikineurope.com/v1/oidc/token',
    scope: process.env.DAIKIN_SCOPE || 'openid onecta:onecta.application offline_access',
    apiBaseUrl: process.env.DAIKIN_API_BASE_URL || 'https://api.onecta.daikineurope.com',
};
//# sourceMappingURL=types.js.map