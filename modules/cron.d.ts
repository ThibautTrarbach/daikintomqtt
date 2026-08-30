declare function isNightTime(): boolean;
declare function getCurrentPollingInterval(): Promise<number>;
declare function getNextPollingAt(): number;
declare function getMergeWithPollWindowMs(): number;
declare function pausePolling(): void;
declare function resumePolling(): void;
declare function loadCron(): Promise<void>;
declare function isPollingPaused(): boolean;
export { loadCron, getNextPollingAt, getMergeWithPollWindowMs, isNightTime, getCurrentPollingInterval, pausePolling, resumePolling, isPollingPaused, };
