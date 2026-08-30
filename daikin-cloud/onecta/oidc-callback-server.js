"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnectaOIDCCallbackServer = void 0;
const node_path_1 = require("node:path");
const node_https_1 = require("node:https");
const promises_1 = require("node:fs/promises");
const ip_1 = require("ip");
const oidc_utils_1 = require("./oidc-utils");
class OnectaOIDCCallbackServer {
    #config;
    #server;
    #redirectUri;
    constructor(config) {
        this.#config = config;
        this.#server = null;
        this.#redirectUri = null;
    }
    async listen() {
        const config = this.#config;
        const server = (0, node_https_1.createServer)({
            key: await (0, promises_1.readFile)(config.certificatePathKey
                ?? (0, node_path_1.resolve)(__dirname, '..', 'cert', 'cert.key')),
            cert: await (0, promises_1.readFile)(config.certificatePathCert
                ?? (0, node_path_1.resolve)(__dirname, '..', 'cert', 'cert.pem')),
        });
        await new Promise((resolve, reject) => {
            const cleanup = () => {
                server.removeListener('listening', onListening);
                server.removeListener('error', onError);
            };
            const onListening = () => {
                cleanup();
                resolve();
            };
            const onError = (err) => {
                cleanup();
                reject(err);
            };
            server.on('listening', onListening);
            server.on('error', onError);
            server.listen(config.oidcCallbackServerPort ?? 0, config.oidcCallbackServerBindAddr ?? '0.0.0.0');
        });
        let callbackUrl = config.oidcCallbackServerBaseUrl;
        if (!callbackUrl) {
            const oidcHostname = config.oidcCallbackServerExternalAddress ?? (0, ip_1.address)('public');
            const oidcPort = config.oidcCallbackServerPort ?? server.address().port;
            callbackUrl = `https://${oidcHostname}:${oidcPort}`;
        }
        this.#server = server;
        this.#redirectUri = callbackUrl;
        return callbackUrl;
    }
    async waitForAuthCodeAndClose(oidc_state, auth_url) {
        const config = this.#config;
        const server = this.#server;
        if (!server?.listening) {
            throw new Error('server is not listening');
        }
        return await new Promise((resolve, reject) => {
            let timeout;
            const cleanup = () => {
                clearTimeout(timeout);
                server.removeListener('request', onRequest);
                server.removeListener('error', onError);
                server.closeAllConnections();
                server.close();
            };
            const onError = (err) => {
                cleanup();
                reject(err);
            };
            const onTimeout = () => {
                cleanup();
                reject(new Error('Authorization time out'));
            };
            const onAuthCode = (code) => {
                cleanup();
                resolve(code);
            };
            const onRequest = (req, res) => {
                const url = new URL(req.url ?? '/', this.#redirectUri);
                const resState = url.searchParams.get('state');
                const authCode = url.searchParams.get('code');
                if (resState === oidc_state && authCode) {
                    res.statusCode = 200;
                    res.write(config.onectaOidcAuthThankYouHtml ?? oidc_utils_1.onecta_oidc_auth_thank_you_html);
                    res.once('finish', () => onAuthCode(authCode));
                }
                else if (!resState && !authCode && (req.url ?? '/') === '/') {
                    res.writeHead(302, {
                        'Location': auth_url,
                    });
                }
                else {
                    res.statusCode = 400;
                }
                res.end();
            };
            timeout = setTimeout(onTimeout, (config.oidcAuthorizationTimeoutS || 300) * 1000);
            server.on('request', onRequest);
            server.on('error', onError);
        });
    }
}
exports.OnectaOIDCCallbackServer = OnectaOIDCCallbackServer;
//# sourceMappingURL=oidc-callback-server.js.map