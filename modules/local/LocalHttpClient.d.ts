export type LanKeyValue = Record<string, string>;
export declare class LocalHttpError extends Error {
    readonly ip: string;
    readonly path: string;
    readonly causeError?: unknown;
    constructor(message: string, ip: string, path: string, causeError?: unknown);
}
export declare function parseLanResponse(body: string): LanKeyValue;
export declare function isLanResponseOk(parsed: LanKeyValue): boolean;
export declare function toLanQuery(params: LanKeyValue): string;
export interface LocalHttpClientOptions {
    timeoutMs?: number;
}
export declare class LocalHttpClient {
    readonly timeoutMs: number;
    constructor(options?: LocalHttpClientOptions);
    get(ip: string, path: string, query?: LanKeyValue): Promise<LanKeyValue>;
    getBasicInfo(ip: string): Promise<LanKeyValue>;
    getControlInfo(ip: string): Promise<LanKeyValue>;
    getSensorInfo(ip: string): Promise<LanKeyValue>;
    getModelInfo(ip: string): Promise<LanKeyValue>;
    setControlInfo(ip: string, params: LanKeyValue): Promise<LanKeyValue>;
    reboot(ip: string): Promise<LanKeyValue>;
}
