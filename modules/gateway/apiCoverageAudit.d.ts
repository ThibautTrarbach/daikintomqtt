import { Gateways } from '../../types';
import { DaikinCloudDevice } from '../../daikin-cloud';
import { ApiDatapointRef } from './apiDiscovery';
export type ConfigCoverage = 'complete' | 'incomplete';
export interface SettableMismatch {
    key: string;
    propertyKey?: string;
    apiSettable: boolean;
    mappedSettable: boolean;
    valueType?: ApiDatapointRef['valueType'];
    values?: unknown[];
    minValue?: number;
    maxValue?: number;
    stepValue?: number;
    unit?: string;
}
export interface CoverageAuditResult {
    configCoverage: ConfigCoverage;
    mappedCount: number;
    apiCount: number;
    configCoverageDetail: string;
    unmappedDatapoints: string[];
    unmappedDatapointDetails: ApiDatapointRef[];
    totalUnmappedCount: number;
    settableMismatches: SettableMismatch[];
    apiDatapointDetails: ApiDatapointRef[];
}
export declare function auditApiCoverage(device: DaikinCloudDevice, gateway: Gateways): CoverageAuditResult;
