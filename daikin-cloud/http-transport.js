"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureHttpTransport = configureHttpTransport;
exports.getHttpTransportMode = getHttpTransportMode;
exports.httpRequest = httpRequest;
const https = __importStar(require("node:https"));
const http = __importStar(require("node:http"));
const node_child_process_1 = require("node:child_process");
const node_url_1 = require("node:url");
const types_1 = require("./types");
let transportMode = 'node';
function configureHttpTransport(mode) {
    const envMode = process.env.DAIKIN_HTTP_TRANSPORT;
    transportMode = mode ?? envMode ?? 'node';
}
function getHttpTransportMode() {
    return transportMode;
}
function nodeHttpRequest(url, options, postData) {
    return new Promise((resolve, reject) => {
        const parsed = new node_url_1.URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const reqOptions = {
            method: options.method,
            headers: {
                'User-Agent': types_1.DAIKIN_MOBILE_CONFIG.userAgent,
                ...options.headers,
                ...(postData ? { 'Content-Length': Buffer.byteLength(postData).toString() } : {}),
            },
        };
        if (parsed.protocol === 'https:') {
            reqOptions.autoSelectFamily = true;
        }
        const req = lib.request(parsed, reqOptions, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode ?? 0,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf8'),
                });
            });
        });
        req.on('error', reject);
        req.setTimeout(30_000, () => {
            req.destroy(new Error(`Request to ${parsed.hostname} timed out after 30000ms`));
        });
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}
function curlHttpRequest(url, options, postData) {
    return new Promise((resolve, reject) => {
        const args = ['-sS', '-X', options.method, '-w', '\n%{http_code}', '--max-time', '30'];
        const headers = {
            'User-Agent': types_1.DAIKIN_MOBILE_CONFIG.userAgent,
            ...options.headers,
        };
        for (const [key, value] of Object.entries(headers)) {
            args.push('-H', `${key}: ${value}`);
        }
        if (postData !== undefined) {
            args.push('-d', postData);
        }
        args.push(url);
        const child = (0, node_child_process_1.spawn)('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `curl exited with code ${code}`));
                return;
            }
            const lastNewline = stdout.lastIndexOf('\n');
            const statusCode = parseInt(stdout.slice(lastNewline + 1).trim(), 10) || 0;
            const body = stdout.slice(0, lastNewline);
            resolve({ statusCode, headers: {}, body });
        });
    });
}
async function httpRequest(url, options, postData) {
    if (getHttpTransportMode() === 'curl') {
        return curlHttpRequest(url, options, postData);
    }
    return nodeHttpRequest(url, options, postData);
}
//# sourceMappingURL=http-transport.js.map