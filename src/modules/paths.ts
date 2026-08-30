import path from 'path';

/** Resolves a path under the global data directory. */
function resolveDataPath(...segments: string[]): string {
	return path.join(global.datadir, ...segments);
}

/** Directory for anonymized unsupported gateway configs. */
function getNewConfigDir(): string {
	return resolveDataPath('newConfig');
}

export {
	resolveDataPath,
	getNewConfigDir,
};
