export declare function isLocalOnlyAuthMode(authMode?: string | null): boolean;
export declare function resolveLocalConfig(daikinConfig: {
    authMode?: string | null;
    local?: {
        enabled?: boolean;
        timeoutMs?: number;
        probeIntervalMinutes?: number;
        devices?: Array<{
            ip: string;
        }>;
        overrides?: Record<string, string>;
    };
} | undefined): {
    enabled: boolean;
    timeoutMs?: number;
    probeIntervalMinutes?: number;
    devices?: Array<{
        ip: string;
    }>;
    overrides?: Record<string, string>;
};
