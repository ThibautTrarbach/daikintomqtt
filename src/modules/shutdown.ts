let shuttingDown = false;

function isShuttingDown(): boolean {
	return shuttingDown;
}

function beginShutdown(): void {
	shuttingDown = true;
}

export {
	isShuttingDown,
	beginShutdown,
};
