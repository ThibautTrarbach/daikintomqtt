import { Gateways } from '../../types';
import { DaikinCloudDevice } from '../../daikin-cloud';
export type ConfigCoverage = 'complete' | 'incomplete';
export interface CoverageAuditResult {
    configCoverage: ConfigCoverage;
    mappedCount: number;
    apiCount: number;
    configCoverageDetail: string;
    unmappedDatapoints: string[];
}
export declare function auditApiCoverage(device: DaikinCloudDevice, gateway: Gateways): CoverageAuditResult;
