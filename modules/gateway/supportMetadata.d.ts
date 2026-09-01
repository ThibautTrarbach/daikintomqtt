import 'reflect-metadata';
import { Gateways } from '../../types';
import { DaikinCloudDevice } from '../../daikin-cloud';
import { ConfigCoverage, CoverageAuditResult } from './apiCoverageAudit';
export type SupportStatus = 'full' | 'partial' | 'unsupported';
export declare const GITHUB_ISSUE_URL = "https://github.com/ThibautTrarbach/daikinRCCloud/issues/new";
declare const SUPPORT_CMD_KEYS: readonly ["_supportStatus", "_configCoverage", "_configCoverageDetail", "_supportMessage", "_debugReport", "_unmappedDatapoints", "_unitModels", "_managementPointsList", "_githubIssueUrl"];
export interface SupportEnrichmentContext {
    supportStatus: SupportStatus;
    gatewayModelRaw?: string;
    gatewayModelResolved?: string | null;
}
export declare function extractUnitModels(device: DaikinCloudDevice): Record<string, string>;
export declare function buildDebugReport(device: DaikinCloudDevice, context: SupportEnrichmentContext, coverage: CoverageAuditResult, unitModels: Record<string, string>, managementPointsList: string[]): string;
export declare function needsSupportReporting(supportStatus: SupportStatus, configCoverage: ConfigCoverage): boolean;
export declare function enrichDeviceSupport(device: DaikinCloudDevice, gateway: Gateways, context: SupportEnrichmentContext): void;
export { SUPPORT_CMD_KEYS };
