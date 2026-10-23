/**
 * HTTP client for Daikin Online Controller LAN API (plain HTTP :80).
 * Protocol reference: DaikinOnlineCtrl (get_control_info / set_control_info, …).
 */

export type LanKeyValue = Record<string, string>;

export class LocalHttpError extends Error {
	readonly ip: string;
	readonly path: string;
	readonly causeError?: unknown;

	constructor(message: string, ip: string, path: string, causeError?: unknown) {
		super(message);
		this.name = 'LocalHttpError';
		this.ip = ip;
		this.path = path;
		this.causeError = causeError;
	}
}

/**
 * Parse `ret=OK,pow=1,mode=3,...` bodies used by Online Controller modules.
 */
export function parseLanResponse(body: string): LanKeyValue {
	const trimmed = (body ?? '').trim();
	if (!trimmed) {
		throw new Error('Empty LAN response body');
	}
	const result: LanKeyValue = {};
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

export function isLanResponseOk(parsed: LanKeyValue): boolean {
	return parsed.ret === 'OK';
}

/**
 * Build query string for set_control_info (and similar) from key/value map.
 */
export function toLanQuery(params: LanKeyValue): string {
	return Object.entries(params)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
		.join('&');
}

export interface LocalHttpClientOptions {
	timeoutMs?: number;
}

export class LocalHttpClient {
	readonly timeoutMs: number;

	constructor(options: LocalHttpClientOptions = {}) {
		this.timeoutMs = options.timeoutMs ?? 5000;
	}

	/**
	 * GET http://{ip}{path}[?query] and return parsed key/value map.
	 * Throws LocalHttpError on network failure or ret≠OK.
	 */
	async get(ip: string, path: string, query?: LanKeyValue): Promise<LanKeyValue> {
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
				throw new LocalHttpError(
					`HTTP ${response.status} from ${url}`,
					normalizedIp,
					normalizedPath,
				);
			}
			const parsed = parseLanResponse(body);
			if (!isLanResponseOk(parsed)) {
				throw new LocalHttpError(
					`LAN module returned ret=${parsed.ret ?? 'missing'} for ${url}`,
					normalizedIp,
					normalizedPath,
				);
			}
			return parsed;
		} catch (err) {
			if (err instanceof LocalHttpError) {
				throw err;
			}
			const message = err instanceof Error ? err.message : String(err);
			throw new LocalHttpError(
				`LAN request failed for ${url}: ${message}`,
				normalizedIp,
				normalizedPath,
				err,
			);
		} finally {
			clearTimeout(timer);
		}
	}

	async getBasicInfo(ip: string): Promise<LanKeyValue> {
		return this.get(ip, '/common/basic_info');
	}

	async getControlInfo(ip: string): Promise<LanKeyValue> {
		return this.get(ip, '/aircon/get_control_info');
	}

	async getSensorInfo(ip: string): Promise<LanKeyValue> {
		return this.get(ip, '/aircon/get_sensor_info');
	}

	async getModelInfo(ip: string): Promise<LanKeyValue> {
		return this.get(ip, '/aircon/get_model_info');
	}

	/**
	 * Write control state. All mandatory fields (pow, mode, stemp, shum, f_rate, f_dir) must be present.
	 */
	async setControlInfo(ip: string, params: LanKeyValue): Promise<LanKeyValue> {
		const required = ['pow', 'mode', 'stemp', 'shum', 'f_rate', 'f_dir'];
		for (const key of required) {
			if (params[key] === undefined || params[key] === '') {
				throw new LocalHttpError(
					`set_control_info missing required field "${key}"`,
					ip.trim(),
					'/aircon/set_control_info',
				);
			}
		}
		return this.get(ip, '/aircon/set_control_info', params);
	}

	async reboot(ip: string): Promise<LanKeyValue> {
		return this.get(ip, '/common/reboot');
	}
}
