import 'reflect-metadata';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {PROPERTY_METADATA_CMD, PROPERTY_METADATA_DAIKIN} from '../decorator';
import {DevicesInformation, Gateways, ModulePropertyMetadata, ModulesDescriptionMetadata} from '../../types';
import {DaikinCloudDevice} from '../../daikin-cloud';
import {getConfiguredAuthMode} from '../requestBudget';
import {ApiDatapointRef, makeDatapointKey} from './apiDiscovery';
import {auditApiCoverage, ConfigCoverage, CoverageAuditResult} from './apiCoverageAudit';

const SUPPORT_CMD_TYPE_STRING = 1;

export type SupportStatus = 'full' | 'partial' | 'unsupported';

export const GITHUB_ISSUE_URL = 'https://github.com/ThibautTrarbach/daikintomqtt/issues/new';
export const REDACTED = '[redacted]';
const MAX_DEBUG_REPORT_SIZE = 48 * 1024;

const SUPPORT_CMD_KEYS = [
	'_supportStatus',
	'_configCoverage',
	'_configCoverageDetail',
	'_supportMessage',
	'_debugReport',
	'_unmappedDatapoints',
	'_unmappedDatapointsDetail',
	'_settableMismatches',
	'_settableMismatchesDetail',
	'_apiDatapointsDetail',
	'_unitModels',
	'_managementPointsList',
	'_githubIssueUrl',
] as const;

type SupportCmdKey = typeof SUPPORT_CMD_KEYS[number];
type SupportCommandValues = Partial<Record<SupportCmdKey, string>>;

export interface SupportEnrichmentContext {
	supportStatus: SupportStatus;
	gatewayModelRaw?: string;
	gatewayModelResolved?: string | null;
}

const SUPPORT_CMD_DEFS: Array<{ key: SupportCmdKey; name: string }> = [
	{ key: '_supportStatus', name: 'Support Status' },
	{ key: '_configCoverage', name: 'Config Coverage' },
	{ key: '_configCoverageDetail', name: 'Config Coverage Detail' },
	{ key: '_supportMessage', name: 'Support Message' },
	{ key: '_debugReport', name: 'Debug Report' },
	{ key: '_unmappedDatapoints', name: 'Unmapped Datapoints' },
	{ key: '_unmappedDatapointsDetail', name: 'Unmapped Datapoints Detail' },
	{ key: '_settableMismatches', name: 'Settable Mismatches' },
	{ key: '_settableMismatchesDetail', name: 'Settable Mismatches Detail' },
	{ key: '_apiDatapointsDetail', name: 'API Datapoints Detail' },
	{ key: '_unitModels', name: 'Unit Models' },
	{ key: '_managementPointsList', name: 'Management Points' },
	{ key: '_githubIssueUrl', name: 'GitHub Issue URL' },
];

function readGatewayField(device: DaikinCloudDevice, managementPoint: string, field: string): string {
	try {
		const data = device.getData(managementPoint, field, undefined);
		return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
	} catch {
		return '';
	}
}

export function redactSensitiveValue(): string {
	return REDACTED;
}

export function isSupportValueEmpty(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed === '' || trimmed === '{}' || trimmed === '[]') {
		return true;
	}
	return false;
}

export function extractUnitModels(device: DaikinCloudDevice): Record<string, string> {
	const unitModels: Record<string, string> = {};

	for (const embeddedId of Object.keys(device.managementPoints)) {
		const modelInfo = readGatewayField(device, embeddedId, 'modelInfo');
		const name = readGatewayField(device, embeddedId, 'name');
		const label = modelInfo || name;
		if (label) {
			unitModels[embeddedId] = label;
		}
	}

	return unitModels;
}

export function sanitizeUnitModelsForReport(device: DaikinCloudDevice): Record<string, string> {
	const unitModels: Record<string, string> = {};

	for (const embeddedId of Object.keys(device.managementPoints)) {
		const modelInfo = readGatewayField(device, embeddedId, 'modelInfo');
		if (modelInfo) {
			unitModels[embeddedId] = modelInfo;
			continue;
		}
		const name = readGatewayField(device, embeddedId, 'name');
		if (name) {
			unitModels[embeddedId] = REDACTED;
		}
	}

	return unitModels;
}

function getDaemonVersion(): string {
	try {
		const packagePath = resolve(__dirname, '../../../package.json');
		const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
		return pkg.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

export function serializeUnmappedDatapointDetail(ref: ApiDatapointRef): Record<string, unknown> {
	const detail: Record<string, unknown> = {
		key: makeDatapointKey(ref.managementPoint, ref.dataPoint, ref.dataPointPath),
		settable: ref.settable,
	};
	if (ref.valueType) {
		detail.valueType = ref.valueType;
	}
	if (ref.values !== undefined) {
		detail.values = ref.values;
	}
	if (ref.minValue !== undefined) {
		detail.minValue = ref.minValue;
	}
	if (ref.maxValue !== undefined) {
		detail.maxValue = ref.maxValue;
	}
	if (ref.stepValue !== undefined) {
		detail.stepValue = ref.stepValue;
	}
	if (ref.unit !== undefined) {
		detail.unit = ref.unit;
	}
	return detail;
}

export function buildUnmappedDatapointsDetailJson(details: ApiDatapointRef[]): string {
	return JSON.stringify(details.map(serializeUnmappedDatapointDetail));
}

export function buildSettableMismatchesDetailJson(mismatches: CoverageAuditResult['settableMismatches']): string {
	return JSON.stringify(mismatches);
}

export function buildApiDatapointsDetailJson(details: ApiDatapointRef[]): string {
	return JSON.stringify(details.map(serializeUnmappedDatapointDetail));
}

export function buildDebugReport(
	device: DaikinCloudDevice,
	context: SupportEnrichmentContext,
	coverage: CoverageAuditResult,
	managementPointsList: string[],
	supportMessage: string,
): string {
	const sanitizedUnitModels = sanitizeUnitModelsForReport(device);
	const lines = [
		'=== DaikinToMQTT Debug Report ===',
		`deviceId: ${REDACTED}`,
		`deviceName: ${REDACTED}`,
		`gatewayModelRaw: ${context.gatewayModelRaw ?? 'unknown'}`,
		`gatewayModelResolved: ${context.gatewayModelResolved ?? 'none'}`,
		`supportStatus: ${context.supportStatus}`,
		`configCoverage: ${coverage.configCoverage}`,
		`configCoverageDetail: ${coverage.configCoverageDetail}`,
		`firmwareVersion: ${readGatewayField(device, 'gateway', 'firmwareVersion')}`,
		`serialNumber: ${REDACTED}`,
		`daemonVersion: ${getDaemonVersion()}`,
		`authMode: ${getConfiguredAuthMode()}`,
		`detectedAt: ${new Date().toISOString()}`,
	];

	if (supportMessage) {
		lines.push(`supportMessage: ${supportMessage}`);
	}

	lines.push(`managementPoints: ${managementPointsList.join(', ')}`);
	lines.push(`unitModels: ${JSON.stringify(sanitizedUnitModels)}`);
	lines.push(`apiDatapointsCount: ${coverage.apiCount}`);
	lines.push(`apiDatapointsDetail: ${buildApiDatapointsDetailJson(coverage.apiDatapointDetails)}`);

	if (coverage.unmappedDatapoints.length > 0) {
		lines.push(`unmappedDatapoints: ${coverage.unmappedDatapoints.join(', ')}`);
		if (coverage.totalUnmappedCount > coverage.unmappedDatapoints.length) {
			lines.push(`unmappedDatapointsTruncated: showing ${coverage.unmappedDatapoints.length}/${coverage.totalUnmappedCount}`);
		}
		lines.push(`unmappedDatapointsDetail: ${buildUnmappedDatapointsDetailJson(coverage.unmappedDatapointDetails)}`);
	}

	if (coverage.settableMismatches.length > 0) {
		lines.push(`settableMismatches: ${coverage.settableMismatches.map((item) => item.key).join(', ')}`);
		lines.push(`settableMismatchesDetail: ${buildSettableMismatchesDetailJson(coverage.settableMismatches)}`);
	}

	const footer = `githubIssueUrl: ${GITHUB_ISSUE_URL}`;
	const body = lines.join('\n');
	const maxBodySize = MAX_DEBUG_REPORT_SIZE - footer.length - 1;
	if (body.length <= maxBodySize) {
		return `${body}\n${footer}`;
	}

	return `${body.slice(0, maxBodySize - 14)}\n...[truncated]\n${footer}`;
}

function buildSupportMessage(context: SupportEnrichmentContext, coverage: CoverageAuditResult): string {
	if (context.supportStatus === 'unsupported') {
		return 'Device model is not supported. Please open a GitHub issue with the debug report below.';
	}
	if (context.supportStatus === 'partial') {
		return 'Device model is using dynamic fallback mapping. Please open a GitHub issue with the debug report below to improve static support.';
	}
	if (coverage.settableMismatches.length > 0 && coverage.totalUnmappedCount === 0) {
		return 'Some API-settable datapoints are mapped as read-only. Please open a GitHub issue with the debug report below.';
	}
	if (coverage.configCoverage === 'incomplete') {
		return 'Static gateway configuration is incomplete for this API variant. Please open a GitHub issue with the debug report below.';
	}
	return '';
}

export function needsSupportReporting(supportStatus: SupportStatus, configCoverage: ConfigCoverage): boolean {
	return supportStatus !== 'full' || configCoverage === 'incomplete';
}

function getActiveSupportCommandKeys(gateway: Gateways): Set<SupportCmdKey> {
	const cmdMetadata = (Reflect.getMetadata(PROPERTY_METADATA_CMD, gateway) as Record<string, unknown>) || {};
	const active = new Set<SupportCmdKey>();
	for (const key of SUPPORT_CMD_KEYS) {
		if (key in cmdMetadata) {
			active.add(key);
		}
	}
	return active;
}

function buildActiveSupportKeys(values: SupportCommandValues): Set<SupportCmdKey> {
	const active = new Set<SupportCmdKey>();
	for (const def of SUPPORT_CMD_DEFS) {
		const value = values[def.key];
		if (value !== undefined && !isSupportValueEmpty(value)) {
			active.add(def.key);
		}
	}
	return active;
}

function supportCommandSetsEqual(a: Set<SupportCmdKey>, b: Set<SupportCmdKey>): boolean {
	if (a.size !== b.size) {
		return false;
	}
	for (const key of a) {
		if (!b.has(key)) {
			return false;
		}
	}
	return true;
}

export function syncSupportMetadata(
	gateway: Gateways,
	values: SupportCommandValues,
): boolean {
	const before = getActiveSupportCommandKeys(gateway);
	const after = buildActiveSupportKeys(values);

	const cmdMetadata = {
		...((Reflect.getMetadata(PROPERTY_METADATA_CMD, gateway) as Record<string, ModulesDescriptionMetadata>) || {}),
	};
	const daikinMetadata = {
		...((Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gateway) as Record<string, ModulePropertyMetadata>) || {}),
	};
	const gatewayRecord = gateway as unknown as Record<string, unknown>;

	for (const key of SUPPORT_CMD_KEYS) {
		delete cmdMetadata[key];
		delete daikinMetadata[key];
		delete gatewayRecord[key];
	}

	for (const def of SUPPORT_CMD_DEFS) {
		const value = values[def.key];
		if (value === undefined || isSupportValueEmpty(value)) {
			continue;
		}
		cmdMetadata[def.key] = {
			name: def.name,
			settable: false,
			type: SUPPORT_CMD_TYPE_STRING,
			visible: true,
		};
		daikinMetadata[def.key] = {
			managementPoint: 'gateway',
			dataPoint: '__support__',
		};
		gatewayRecord[def.key] = value;
	}

	Reflect.defineMetadata(PROPERTY_METADATA_CMD, cmdMetadata, gateway);
	Reflect.defineMetadata(PROPERTY_METADATA_DAIKIN, daikinMetadata, gateway);

	return !supportCommandSetsEqual(before, after);
}

export function enrichDeviceSupport(
	device: DaikinCloudDevice,
	gateway: Gateways,
	context: SupportEnrichmentContext,
): boolean {
	const coverage = auditApiCoverage(device, gateway);
	const unitModels = extractUnitModels(device);
	const sanitizedUnitModels = sanitizeUnitModelsForReport(device);
	const managementPointsList = Object.keys(device.managementPoints);
	const gatewayModelRaw = context.gatewayModelRaw ?? (readGatewayField(device, 'gateway', 'modelInfo') || readGatewayField(device, '0', 'modelInfo'));

	const supportMessage = buildSupportMessage(context, coverage);
	const debugReport = buildDebugReport(device, context, coverage, managementPointsList, supportMessage);
	const reporting = needsSupportReporting(context.supportStatus, coverage.configCoverage);
	const unmappedDetailJson = coverage.unmappedDatapointDetails.length > 0
		? buildUnmappedDatapointsDetailJson(coverage.unmappedDatapointDetails)
		: '';
	const settableMismatchKeys = coverage.settableMismatches.map((item) => item.key).join(', ');
	const settableMismatchDetailJson = coverage.settableMismatches.length > 0
		? buildSettableMismatchesDetailJson(coverage.settableMismatches)
		: '';
	const apiDetailJson = coverage.apiDatapointDetails.length > 0
		? buildApiDatapointsDetailJson(coverage.apiDatapointDetails)
		: '';

	const deviceInfo = (gateway as { _device?: DevicesInformation })._device;
	if (deviceInfo) {
		deviceInfo.supportStatus = context.supportStatus;
		deviceInfo.configCoverage = coverage.configCoverage;
		deviceInfo.configCoverageDetail = coverage.configCoverageDetail;
		deviceInfo.gatewayModelRaw = gatewayModelRaw || deviceInfo.modelInfo;
		deviceInfo.gatewayModelResolved = context.gatewayModelResolved ?? undefined;
		deviceInfo.unitModels = JSON.stringify(unitModels);
		deviceInfo.managementPointsList = managementPointsList.join(', ');
		deviceInfo.unmappedDatapoints = coverage.unmappedDatapoints.join(', ');
		deviceInfo.unmappedDatapointsDetail = unmappedDetailJson || undefined;
		deviceInfo.settableMismatches = settableMismatchKeys || undefined;
		deviceInfo.settableMismatchesDetail = settableMismatchDetailJson || undefined;
		deviceInfo.apiDatapointsDetail = apiDetailJson || undefined;
		deviceInfo.supportMessage = supportMessage;
		deviceInfo.debugReport = debugReport;
		deviceInfo.githubIssueUrl = GITHUB_ISSUE_URL;
	}

	const supportValues: SupportCommandValues = reporting ? {
		_supportStatus: context.supportStatus,
		_configCoverage: coverage.configCoverage,
		_configCoverageDetail: coverage.configCoverageDetail,
		_supportMessage: supportMessage,
		_debugReport: debugReport,
		_unmappedDatapoints: coverage.unmappedDatapoints.join(', '),
		_unmappedDatapointsDetail: unmappedDetailJson,
		_settableMismatches: settableMismatchKeys,
		_settableMismatchesDetail: settableMismatchDetailJson,
		_apiDatapointsDetail: apiDetailJson,
		_unitModels: JSON.stringify(sanitizedUnitModels),
		_managementPointsList: managementPointsList.join(', '),
		_githubIssueUrl: GITHUB_ISSUE_URL,
	} : {
		// Keep a compact API inventory on healthy devices so the Jeedom info page stays complete.
		_configCoverage: coverage.configCoverage,
		_configCoverageDetail: coverage.configCoverageDetail,
		_apiDatapointsDetail: apiDetailJson,
		_unitModels: JSON.stringify(sanitizedUnitModels),
		_managementPointsList: managementPointsList.join(', '),
	};

	return syncSupportMetadata(gateway, supportValues);
}

export {SUPPORT_CMD_KEYS};
