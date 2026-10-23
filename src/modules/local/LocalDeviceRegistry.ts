import type { ConfigDaikinLocal, DeviceAccessMode, DeviceControlPath } from '../../types';
import { isLanCompatibleModel } from './LanCompatibility';
import { LocalHttpClient } from './LocalHttpClient';

export interface LocalBinding {
	ip: string;
	/** cloud UUID or local-{mac} */
	deviceId?: string;
	accessMode: DeviceAccessMode;
	controlPath: DeviceControlPath;
	lastProbeOk?: boolean;
	lastProbeAt?: number;
	/** Cached raw MAC without separators */
	mac?: string;
	modelInfo?: string;
	/** True when IP comes from daikin.local.overrides */
	fromOverride?: boolean;
}

/**
 * Resolves LAN IPs for hybrid (cloud UUID) and local-only devices from config + runtime probes.
 */
export class LocalDeviceRegistry {
	readonly client: LocalHttpClient;
	readonly enabled: boolean;
	readonly probeIntervalMs: number;

	/** cloudUuid → binding */
	private hybrid = new Map<string, LocalBinding>();
	/** local-{mac} → binding */
	private localOnly = new Map<string, LocalBinding>();
	/** configured local-only IPs not yet probed */
	private pendingLocalIps: string[] = [];

	constructor(localConfig: ConfigDaikinLocal | undefined) {
		this.enabled = localConfig?.enabled === true;
		this.client = new LocalHttpClient({
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

		for (const [uuid, ip] of Object.entries(localConfig.overrides ?? {})) {
			if (uuid && ip) {
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

	hasOverride(deviceId: string): boolean {
		return this.hybrid.get(deviceId)?.fromOverride === true;
	}

	getPendingLocalIps(): string[] {
		return [...this.pendingLocalIps];
	}

	clearPendingLocalIp(ip: string): void {
		this.pendingLocalIps = this.pendingLocalIps.filter((x) => x !== ip);
	}

	registerLocalOnly(binding: LocalBinding): void {
		if (!binding.deviceId) {
			return;
		}
		this.localOnly.set(binding.deviceId, binding);
		this.clearPendingLocalIp(binding.ip);
	}

	getLocalOnlyDevices(): LocalBinding[] {
		return Array.from(this.localOnly.values());
	}

	getHybridBinding(deviceId: string): LocalBinding | undefined {
		return this.hybrid.get(deviceId);
	}

	getBinding(deviceId: string): LocalBinding | undefined {
		return this.hybrid.get(deviceId) ?? this.localOnly.get(deviceId);
	}

	/**
	 * Resolve LAN IP for a cloud device: override first, else cloud ipAddress if model whitelisted.
	 */
	resolveHybridIp(
		deviceId: string,
		modelInfo: string | null | undefined,
		cloudIp: string | null | undefined,
	): string | null {
		if (!this.enabled) {
			return null;
		}
		const override = this.hybrid.get(deviceId);
		if (override?.ip) {
			return override.ip;
		}
		if (!isLanCompatibleModel(modelInfo)) {
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

	ensureHybridBinding(deviceId: string, ip: string, modelInfo?: string): LocalBinding {
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
		} else {
			binding.ip = ip;
			if (modelInfo) {
				binding.modelInfo = modelInfo;
			}
		}
		return binding;
	}

	markProbe(deviceId: string, ok: boolean): void {
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

	shouldReprobe(deviceId: string): boolean {
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

	isLocalOnlyId(deviceId: string): boolean {
		return deviceId.startsWith('local-') || this.localOnly.has(deviceId);
	}
}

let registrySingleton: LocalDeviceRegistry | null = null;

export function initLocalDeviceRegistry(localConfig: ConfigDaikinLocal | undefined): LocalDeviceRegistry {
	registrySingleton = new LocalDeviceRegistry(localConfig);
	return registrySingleton;
}

export function getLocalDeviceRegistry(): LocalDeviceRegistry | null {
	return registrySingleton;
}
