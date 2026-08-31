"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = exports.ReadOnlyCharacteristicError = exports.GatewayError = void 0;
exports.isGatewayErrorStatus = isGatewayErrorStatus;
exports.isReadOnlyError = isReadOnlyError;
exports.categorizeHttpError = categorizeHttpError;
exports.isRetryableError = isRetryableError;
exports.getRetryDelayMs = getRetryDelayMs;
class GatewayError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'GatewayError';
    }
}
exports.GatewayError = GatewayError;
class ReadOnlyCharacteristicError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReadOnlyCharacteristicError';
    }
}
exports.ReadOnlyCharacteristicError = ReadOnlyCharacteristicError;
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
function isGatewayErrorStatus(statusCode) {
    return statusCode === 502 || statusCode === 503 || statusCode === 504;
}
function isReadOnlyError(body) {
    const lower = body.toLowerCase();
    return lower.includes('read_only') || lower.includes('readonly') || lower.includes('read-only');
}
function categorizeHttpError(statusCode, body) {
    if (statusCode === 401) {
        return new AuthenticationError(`Unauthorized (401): ${body || 'Authentication required'}`);
    }
    if (statusCode === 400 && isReadOnlyError(body)) {
        return new ReadOnlyCharacteristicError(`Characteristic is read-only (400): device may be updating firmware or offline`);
    }
    if (isGatewayErrorStatus(statusCode)) {
        return new GatewayError(`Gateway error (${statusCode}): ${body || 'Temporary server error'}`, statusCode);
    }
    return new Error(`HTTP ${statusCode}: ${body || 'No body'}`);
}
function isRetryableError(error) {
    if (error instanceof GatewayError) {
        return true;
    }
    if (error instanceof Error) {
        const code = error.code;
        return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EAI_AGAIN';
    }
    return false;
}
function getRetryDelayMs(attempt, baseDelay = 2000, maxDelay = 60000) {
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    return Math.min(exponential + jitter, maxDelay);
}
//# sourceMappingURL=errorHandler.js.map