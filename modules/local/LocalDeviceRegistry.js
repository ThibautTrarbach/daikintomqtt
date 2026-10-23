"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDeviceRegistry = void 0;
exports.initLocalDeviceRegistry = initLocalDeviceRegistry;
exports.getLocalDeviceRegistry = getLocalDeviceRegistry;
const LanCompatibility_1 = require("./LanCompatibility");
const LocalHttpClient_1 = require("./LocalHttpClient");
class LocalDeviceRegistry {
    client;
    enabled;
    probeIntervalMs;
    hybrid = new Map();
    localOnly = new Map();
    pendingLocalIps = [];
    constructor(localConfig) {
        this.enabled = localConfig?.enabled === true;
        this.client = new LocalHttpClient_1.LocalHttpClient({
            timeoutMs: localConfig?.timeoutMs ?? 5000,
        });
        this.probeIntervalMs = (localConfig?.probeIntervalMinutes ?? 5) * 60 * 1000;
        if (!this.enabled || !localConfig) {
            return;
        }
        for (const entry of localConfig.devices ?? []) {
            if (entry?.ip) {
                this.pendingLocalIps.push(entry.ip.trim());
            }
        }
        const overridesRaw = localConfig.overrides;
        const overrides = overridesRaw && !Array.isArray(overridesRaw) && typeof overridesRaw === 'object'
            ? overridesRaw
            : {};
        for (const [uuid, ip] of Object.entries(overrides)) {
            if (uuid && typeof ip === 'string' && ip.trim()) {
                this.hybrid.set(uuid, {
                    ip: ip.trim(),
                    deviceId: uuid,
                    accessMode: 'hybrid',
                    controlPath: 'cloud',
                    lastProbeOk: false,
                    fromOverride: true,
                });
            }
        }
    }
    hasOverride(deviceId) {
        return this.hybrid.get(deviceId)?.fromOverride === true;
    }
    getPendingLocalIps() {
        return [...this.pendingLocalIps];
    }
    clearPendingLocalIp(ip) {
        this.pendingLocalIps = this.pendingLocalIps.filter((x) => x !== ip);
    }
    registerLocalOnly(binding) {
        if (!binding.deviceId) {
            return;
        }
        this.localOnly.set(binding.deviceId, binding);
        this.clearPendingLocalIp(binding.ip);
    }
    getLocalOnlyDevices() {
        return Array.from(this.localOnly.values());
    }
    getHybridBinding(deviceId) {
        return this.hybrid.get(deviceId);
    }
    getBinding(deviceId) {
        return this.hybrid.get(deviceId) ?? this.localOnly.get(deviceId);
    }
    resolveHybridIp(deviceId, modelInfo, cloudIp) {
        if (!this.enabled) {
            return null;
        }
        const override = this.hybrid.get(deviceId);
        if (override?.ip) {
            return override.ip;
        }
        if (!(0, LanCompatibility_1.isLanCompatibleModel)(modelInfo)) {
            return null;
        }
        const ip = (cloudIp ?? '').trim();
        if (!ip) {
            return null;
        }
        if (!this.hybrid.has(deviceId)) {
            this.hybrid.set(deviceId, {
                ip,
                deviceId,
                accessMode: 'hybrid',
                controlPath: 'cloud',
                modelInfo: modelInfo ?? undefined,
            });
        }
        return ip;
    }
    ensureHybridBinding(deviceId, ip, modelInfo) {
        let binding = this.hybrid.get(deviceId);
        if (!binding) {
            binding = {
                ip,
                deviceId,
                accessMode: 'hybrid',
                controlPath: 'cloud',
                modelInfo,
            };
            this.hybrid.set(deviceId, binding);
        }
        else {
            binding.ip = ip;
            if (modelInfo) {
                binding.modelInfo = modelInfo;
            }
        }
        return binding;
    }
    markProbe(deviceId, ok) {
        const binding = this.getBinding(deviceId);
        if (!binding) {
            return;
        }
        binding.lastProbeOk = ok;
        binding.lastProbeAt = Date.now();
        if (binding.accessMode === 'local') {
            binding.controlPath = ok ? 'local' : 'local';
            return;
        }
        binding.controlPath = ok ? 'local' : 'degraded_cloud';
    }
    shouldReprobe(deviceId) {
        const binding = this.getBinding(deviceId);
        if (!binding) {
            return false;
        }
        if (binding.lastProbeOk) {
            return true;
        }
        if (!binding.lastProbeAt) {
            return true;
        }
        return Date.now() - binding.lastProbeAt >= this.probeIntervalMs;
    }
    isLocalOnlyId(deviceId) {
        return deviceId.startsWith('local-') || this.localOnly.has(deviceId);
    }
}
exports.LocalDeviceRegistry = LocalDeviceRegistry;
let registrySingleton = null;
function initLocalDeviceRegistry(localConfig) {
    registrySingleton = new LocalDeviceRegistry(localConfig);
    return registrySingleton;
}
function getLocalDeviceRegistry() {
    return registrySingleton;
}
//# sourceMappingURL=LocalDeviceRegistry.js.map