import { Gateways } from '../../types';
import { DaikinCloudDevice } from '../../daikin-cloud';
export type ConfigCoverage = 'complete' | 'incomplete';
export interface CoverageAuditResult {
    configCoverage: ConfigCoverage;
    mappedCount: number;
    apiCount: number;
    configCoverageDetail: string;
    unmappedDatapoints: string[];
    totalUnmappedCount: number;
}
export declare function auditApiCoverage(device: DaikinCloudDevice, gateway: Gateways): CoverageAuditResult;
