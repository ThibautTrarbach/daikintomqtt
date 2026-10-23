"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalHttpClient = exports.LocalHttpError = void 0;
exports.parseLanResponse = parseLanResponse;
exports.isLanResponseOk = isLanResponseOk;
exports.toLanQuery = toLanQuery;
class LocalHttpError extends Error {
    ip;
    path;
    causeError;
    constructor(message, ip, path, causeError) {
        super(message);
        this.name = 'LocalHttpError';
        this.ip = ip;
        this.path = path;
        this.causeError = causeError;
    }
}
exports.LocalHttpError = LocalHttpError;
function parseLanResponse(body) {
    const trimmed = (body ?? '').trim();
    if (!trimmed) {
        throw new Error('Empty LAN response body');
    }
    const result = {};
    for (const part of trimmed.split(',')) {
        const eq = part.indexOf('=');
        if (eq <= 0) {
            continue;
        }
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (key) {
            result[key] = value;
        }
    }
    return result;
}
function isLanResponseOk(parsed) {
    return parsed.ret === 'OK';
}
function toLanQuery(params) {
    return Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
}
class LocalHttpClient {
    timeoutMs;
    constructor(options = {}) {
        this.timeoutMs = options.timeoutMs ?? 5000;
    }
    async get(ip, path, query) {
        const normalizedIp = ip.trim();
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const qs = query && Object.keys(query).length > 0 ? `?${toLanQuery(query)}` : '';
        const url = `http://${normalizedIp}${normalizedPath}${qs}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: { Accept: '*/*' },
            });
            const body = await response.text();
            if (!response.ok) {
                throw new LocalHttpError(`HTTP ${response.status} from ${url}`, normalizedIp, normalizedPath);
            }
            const parsed = parseLanResponse(body);
            if (!isLanResponseOk(parsed)) {
                throw new LocalHttpError(`LAN module returned ret=${parsed.ret ?? 'missing'} for ${url}`, normalizedIp, normalizedPath);
            }
            return parsed;
        }
        catch (err) {
            if (err instanceof LocalHttpError) {
                throw err;
            }
            const message = err instanceof Error ? err.message : String(err);
            throw new LocalHttpError(`LAN request failed for ${url}: ${message}`, normalizedIp, normalizedPath, err);
        }
        finally {
            clearTimeout(timer);
        }
    }
    async getBasicInfo(ip) {
        return this.get(ip, '/common/basic_info');
    }
    async getControlInfo(ip) {
        return this.get(ip, '/aircon/get_control_info');
    }
    async getSensorInfo(ip) {
        return this.get(ip, '/aircon/get_sensor_info');
    }
    async getModelInfo(ip) {
        return this.get(ip, '/aircon/get_model_info');
    }
    async setControlInfo(ip, params) {
        const required = ['pow', 'mode', 'stemp', 'shum', 'f_rate', 'f_dir'];
        for (const key of required) {
            if (params[key] === undefined || params[key] === '') {
                throw new LocalHttpError(`set_control_info missing required field "${key}"`, ip.trim(), '/aircon/set_control_info');
            }
        }
        return this.get(ip, '/aircon/set_control_info', params);
    }
    async reboot(ip) {
        return this.get(ip, '/common/reboot');
    }
}
exports.LocalHttpClient = LocalHttpClient;
//# sourceMappingURL=LocalHttpClient.js.map