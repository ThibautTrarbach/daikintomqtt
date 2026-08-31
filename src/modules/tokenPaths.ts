import { resolve } from 'node:path';
import { AUTH_MODE_MOBILE_APP } from '../daikin-cloud/constants';

function getTokenFilePath(): string {
	const authMode = config.daikin.authMode ?? 'developer_portal';
	if (authMode === AUTH_MODE_MOBILE_APP) {
		return resolve(datadir, 'daikin-mobile-tokenset');
	}
	return resolve(datadir, 'daikin-controller-cloud-tokenset');
}

export {
	getTokenFilePath,
};
