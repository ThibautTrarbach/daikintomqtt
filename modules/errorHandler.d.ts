export declare class GatewayError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class ReadOnlyCharacteristicError extends Error {
    constructor(message: string);
}
export declare class AuthenticationError extends Error {
    constructor(message: string);
}
declare function isGatewayErrorStatus(statusCode: number): boolean;
declare function isReadOnlyError(body: string): boolean;
declare function categorizeHttpError(statusCode: number, body: string): Error;
declare function isRetryableError(error: unknown): boolean;
declare function getRetryDelayMs(attempt: number, baseDelay?: number, maxDelay?: number): number;
export { isGatewayErrorStatus, isReadOnlyError, categorizeHttpError, isRetryableError, getRetryDelayMs, };
