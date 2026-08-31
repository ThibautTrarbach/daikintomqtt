export class GatewayError extends Error {
	constructor(message: string, public readonly statusCode: number) {
		super(message);
		this.name = 'GatewayError';
	}
}

export class ReadOnlyCharacteristicError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ReadOnlyCharacteristicError';
	}
}

export class AuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthenticationError';
	}
}

function isGatewayErrorStatus(statusCode: number): boolean {
	return statusCode === 502 || statusCode === 503 || statusCode === 504;
}

function isReadOnlyError(body: string): boolean {
	const lower = body.toLowerCase();
	return lower.includes('read_only') || lower.includes('readonly') || lower.includes('read-only');
}

function categorizeHttpError(statusCode: number, body: string): Error {
	if (statusCode === 401) {
		return new AuthenticationError(`Unauthorized (401): ${body || 'Authentication required'}`);
	}
	if (statusCode === 400 && isReadOnlyError(body)) {
		return new ReadOnlyCharacteristicError(
			`Characteristic is read-only (400): device may be updating firmware or offline`,
		);
	}
	if (isGatewayErrorStatus(statusCode)) {
		return new GatewayError(`Gateway error (${statusCode}): ${body || 'Temporary server error'}`, statusCode);
	}
	return new Error(`HTTP ${statusCode}: ${body || 'No body'}`);
}

function isRetryableError(error: unknown): boolean {
	if (error instanceof GatewayError) {
		return true;
	}
	if (error instanceof Error) {
		const code = (error as NodeJS.ErrnoException).code;
		return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EAI_AGAIN';
	}
	return false;
}

function getRetryDelayMs(attempt: number, baseDelay = 2000, maxDelay = 60000): number {
	const exponential = baseDelay * Math.pow(2, attempt);
	const jitter = Math.random() * 500;
	return Math.min(exponential + jitter, maxDelay);
}

export {
	isGatewayErrorStatus,
	isReadOnlyError,
	categorizeHttpError,
	isRetryableError,
	getRetryDelayMs,
};
