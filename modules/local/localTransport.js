"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceLocalMeta = getDeviceLocalMeta;
exports.setDeviceLocalMeta = setDeviceLocalMeta;
exports.createLocalOnlyDevice = createLocalOnlyDevice;
exports.attachLocalTransport = attachLocalTransport;
exports.attachLocalToCloudDevices = attachLocalToCloudDevices;
exports.loadLocalOnlyDevices = loadLocalOnlyDevices;
const daikin_cloud_1 = require("../../daikin-cloud");
const LanMapper_1 = require("./LanMapper");
const LanCompatibility_1 = require("./LanCompatibility");
const META_KEY = '__daikinLocalMeta';
function getDeviceLocalMeta(device) {
    return device[META_KEY];
}
function setDeviceLocalMeta(device, meta) {
    device[META_KEY] = meta;
}
function formatMacForId(mac) {
    return mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
}
async function createLocalOnlyDevice(ip, client, cloudStub) {
    const basic = await client.getBasicInfo(ip);
    const control = await client.getControlInfo(ip);
    let sensor = {};
    try {
        sensor = await client.getSensorInfo(ip);
    }
    catch {
    }
    const mac = formatMacForId(basic.mac ?? '');
    if (!mac) {
        throw new Error(`LAN device at ${ip} did not return a MAC address`);
    }
    const deviceId = `local-${mac}`;
    const modelInfo = basic.model ?? basic.ver ?? 'BRP069A42';
    const name = basic.name ? decodeUriComponentSafe(basic.name) : `Daikin ${ip}`;
    const climate = (0, LanMapper_1.mapLanToClimateState)(control, sensor);
    const desc = (0, LanMapper_1.buildLanDeviceDescription)({
        deviceId,
        name,
        modelInfo: (0, LanCompatibility_1.isLanCompatibleModel)(modelInfo) ? modelInfo : 'BRP069A42',
        macAddress: basic.mac,
        ipAddress: ip,
        firmwareVersion: basic.ver,
        climate,
    });
    const device = new daikin_cloud_1.DaikinCloudDevice(desc, cloudStub);
    setDeviceLocalMeta(device, {
        accessMode: 'local',
        controlPath: 'local',
        ip,
        lastControl: control,
        localOnly: true,
    });
    attachLocalTransport(device, client, { ip, deviceId, accessMode: 'local', controlPath: 'local' });
    return device;
}
function decodeUriComponentSafe(value) {
    try {
        return decodeURIComponent(value.replace(/\+/g, ' '));
    }
    catch {
        return value;
    }
}
function attachLocalTransport(device, client, binding) {
    const originalUpdateData = device.updateData.bind(device);
    const originalSetData = device.setData.bind(device);
    const localOnly = binding.accessMode === 'local' || device.getId().startsWith('local-');
    const meta = getDeviceLocalMeta(device) ?? {
        accessMode: binding.accessMode,
        controlPath: binding.controlPath,
        ip: binding.ip,
        localOnly,
    };
    meta.ip = binding.ip;
    meta.accessMode = binding.accessMode;
    meta.localOnly = localOnly;
    setDeviceLocalMeta(device, meta);
    device.updateData = async () => {
        const ip = meta.ip;
        if (!ip) {
            if (localOnly) {
                throw new Error(`Local-only device ${device.getId()} has no IP`);
            }
            meta.controlPath = 'cloud';
            setDeviceLocalMeta(device, meta);
            return originalUpdateData();
        }
        try {
            const control = await client.getControlInfo(ip);
            let sensor = {};
            try {
                sensor = await client.getSensorInfo(ip);
            }
            catch {
            }
            const climate = (0, LanMapper_1.mapLanToClimateState)(control, sensor);
            (0, LanMapper_1.applyClimateStateToManagementPoints)(device.managementPoints, climate);
            meta.lastControl = control;
            meta.controlPath = 'local';
            setDeviceLocalMeta(device, meta);
            device.emit?.('updated');
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warn(`[localTransport.ts] => LAN update failed for ${device.getId()} @ ${ip}: ${message}`);
            if (localOnly) {
                meta.controlPath = 'local';
                setDeviceLocalMeta(device, meta);
                throw err;
            }
            meta.controlPath = 'degraded_cloud';
            setDeviceLocalMeta(device, meta);
            return originalUpdateData();
        }
    };
    device.setData = async (managementPoint, dataPoint, dataPointPath, value, options = { ignoreWritableCheck: false, updateLocalData: false }) => {
        const ip = meta.ip;
        if (!ip) {
            return originalSetData(managementPoint, dataPoint, dataPointPath, value, options);
        }
        let path = dataPointPath;
        let val = value;
        let opts = options;
        if (typeof options === 'boolean') {
            opts = { ignoreWritableCheck: options, updateLocalData: false };
        }
        if (val === undefined) {
            val = path;
            path = undefined;
        }
        try {
            let current = meta.lastControl;
            if (!current) {
                current = await client.getControlInfo(ip);
                meta.lastControl = current;
            }
            const next = (0, LanMapper_1.applyCloudWriteToLanControl)(current, {
                managementPoint,
                dataPoint,
                dataPointPath: path,
                value: val,
            });
            if (!next) {
                if (localOnly) {
                    throw new Error(`Datapoint ${managementPoint}/${dataPoint} is not supported over LAN for ${device.getId()}`);
                }
                meta.controlPath = 'degraded_cloud';
                setDeviceLocalMeta(device, meta);
                return originalSetData(managementPoint, dataPoint, path, val, opts);
            }
            await client.setControlInfo(ip, next);
            meta.lastControl = next;
            meta.controlPath = 'local';
            setDeviceLocalMeta(device, meta);
            try {
                const def = path
                    ? device.managementPoints[managementPoint][dataPoint][path]
                    : device.managementPoints[managementPoint][dataPoint];
                if (def && typeof def === 'object' && 'value' in def) {
                    def.value = val;
                }
            }
            catch {
            }
            return true;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warn(`[localTransport.ts] => LAN setData failed for ${device.getId()} @ ${ip}: ${message}`);
            if (localOnly) {
                throw err;
            }
            meta.controlPath = 'degraded_cloud';
            setDeviceLocalMeta(device, meta);
            return originalSetData(managementPoint, dataPoint, path, val, opts);
        }
    };
}
async function attachLocalToCloudDevices(devices, registry) {
    if (!registry.enabled) {
        return;
    }
    for (const device of devices) {
        const id = device.getId();
        const model = device.getData('gateway', 'modelInfo', undefined)?.value ??
            device.getData('0', 'modelInfo', undefined)?.value;
        const cloudIp = device.getData('gateway', 'ipAddress', undefined)?.value ??
            device.getData('0', 'ipAddress', undefined)?.value;
        const hasOverride = registry.hasOverride(id);
        const modelOk = (0, LanCompatibility_1.isLanCompatibleModel)(model);
        if (!hasOverride && !modelOk) {
            setDeviceLocalMeta(device, {
                accessMode: 'cloud',
                controlPath: 'cloud',
                localOnly: false,
            });
            continue;
        }
        const ip = hasOverride
            ? registry.getHybridBinding(id).ip
            : registry.resolveHybridIp(id, model, cloudIp != null ? String(cloudIp) : null);
        if (!ip) {
            setDeviceLocalMeta(device, {
                accessMode: 'cloud',
                controlPath: 'cloud',
                localOnly: false,
            });
            continue;
        }
        const binding = registry.ensureHybridBinding(id, ip, model != null ? String(model) : undefined);
        if (hasOverride) {
            binding.fromOverride = true;
        }
        attachLocalTransport(device, registry.client, binding);
        try {
            await registry.client.getBasicInfo(ip);
            await device.updateData();
            registry.markProbe(id, true);
            const meta = getDeviceLocalMeta(device);
            meta.accessMode = 'hybrid';
            meta.controlPath = 'local';
            setDeviceLocalMeta(device, meta);
            logger.info(`[localTransport.ts] => Hybrid LAN OK for ${id} @ ${ip}`);
        }
        catch (err) {
            registry.markProbe(id, false);
            const meta = getDeviceLocalMeta(device);
            meta.accessMode = 'hybrid';
            meta.controlPath = 'degraded_cloud';
            setDeviceLocalMeta(device, meta);
            const message = err instanceof Error ? err.message : String(err);
            logger.warn(`[localTransport.ts] => Hybrid LAN probe failed for ${id} @ ${ip}: ${message} — using cloud`);
        }
    }
}
async function loadLocalOnlyDevices(registry) {
    if (!registry.enabled) {
        return [];
    }
    const stub = {
        requestResource: async () => {
            throw new Error('Cloud API is not available for local-only devices');
        },
    };
    const result = [];
    for (const ip of registry.getPendingLocalIps()) {
        try {
            const device = await createLocalOnlyDevice(ip, registry.client, stub);
            registry.registerLocalOnly({
                ip,
                deviceId: device.getId(),
                accessMode: 'local',
                controlPath: 'local',
                lastProbeOk: true,
                lastProbeAt: Date.now(),
            });
            result.push(device);
            logger.info(`[localTransport.ts] => Local-only device ${device.getId()} @ ${ip}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`[localTransport.ts] => Failed to add local device @ ${ip}: ${message}`);
            registry.clearPendingLocalIp(ip);
        }
    }
    return result;
}
//# sourceMappingURL=localTransport.js.map