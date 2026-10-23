declare function getActionRefreshStrategy(): string;
declare function executePostActionRefresh(): Promise<void>;
declare function clearPostActionTimer(): void;
declare function schedulePostActionRefresh(deviceId: string): Promise<void>;
declare function timeUpdateFallback(): Promise<void>;
declare function initActionRefreshOnBoot(): Promise<void>;
export { schedulePostActionRefresh, executePostActionRefresh, timeUpdateFallback, initActionRefreshOnBoot, clearPostActionTimer, getActionRefreshStrategy, };
