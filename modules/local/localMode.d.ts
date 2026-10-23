export declare function isLocalOnlyAuthMode(authMode?: string | null): boolean;
import type { ConfigDaikin, ConfigDaikinLocal } from '../../types';
export declare function resolveLocalConfig(daikinConfig: ConfigDaikin | undefined): ConfigDaikinLocal;
