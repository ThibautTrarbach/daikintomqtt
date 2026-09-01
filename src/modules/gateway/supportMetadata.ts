import 'reflect-metadata';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {PROPERTY_METADATA_CMD, PROPERTY_METADATA_DAIKIN} from '../decorator';
import {DevicesInformation, Gateways, ModulePropertyMetadata, ModulesDescriptionMetadata} from '../../types';
import {DaikinCloudDevice} from '../../daikin-cloud';
import {getConfiguredAuthMode} from '../requestBudget';
import {anonymise} from './Anonymise';
import {auditApiCoverage, ConfigCoverage, CoverageAuditResult} from './apiCoverageAudit';
import {typeEnum} from './BaseModules';

export type SupportStatus = 'full' | 'partial' | 'unsupported';

export const GITHUB_ISSUE_URL = 'https://github.com/ThibautTrarbach/daikinRCCloud/issues/new';

const SUPPORT_CMD_KEYS = [
	'_supportStatus',
	'_configCoverage',
	'_configCoverageDetail',
	'_supportMessage',
	'_debugReport',
	'_unmappedDatapoints',
	'_unitModels',
	'_managementPointsList',
	'_githubIssueUrl',
] as const;

export interface SupportEnrichmentContext {
	supportStatus: SupportStatus;
	gatewayModelRaw?: string;
	gatewayModelResolved?: string | null;
}

function readGatewayField(device: DaikinCloudDevice, managementPoint: string, field: string): string {
	try {
		const data = device.getData(managementPoint, field, undefined);
		return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
	} catch {
		return '';
	}
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

function getDaemonVersion(): string {
	try {
		const packagePath = resolve(__dirname, '../../../package.json');
		const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
		return pkg.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

export function buildDebugReport(
	device: DaikinCloudDevice,
	context: SupportEnrichmentContext,
	coverage: CoverageAuditResult,
	unitModels: Record<string, string>,
	managementPointsList: string[],
): string {
	const lines = [
		'=== DaikinToMQTT Debug Report ===',
		`deviceId: ${device.getId()}`,
		`gatewayModelRaw: ${context.gatewayModelRaw ?? 'unknown'}`,
		`gatewayModelResolved: ${context.gatewayModelResolved ?? 'none'}`,
		`supportStatus: ${context.supportStatus}`,
		`configCoverage: ${coverage.configCoverage}`,
		`configCoverageDetail: ${coverage.configCoverageDetail}`,
		`firmwareVersion: ${readGatewayField(device, 'gateway', 'firmwareVersion')}`,
		`serialNumber: ${readGatewayField(device, 'gateway', 'serialNumber')}`,
		`managementPoints: ${managementPointsList.join(', ')}`,
		`unitModels: ${JSON.stringify(unitModels)}`,
		`daemonVersion: ${getDaemonVersion()}`,
		`authMode: ${getConfiguredAuthMode()}`,
		`detectedAt: ${new Date().toISOString()}`,
	];

	if (coverage.unmappedDatapoints.length > 0) {
		lines.push('unmappedDatapoints:');
		for (const point of coverage.unmappedDatapoints) {
			lines.push(`  - ${point}`);
		}
	}

	lines.push(`githubIssueUrl: ${GITHUB_ISSUE_URL}`);
	return lines.join('\n').slice(0, 2048);
}

function buildSupportMessage(context: SupportEnrichmentContext, coverage: CoverageAuditResult): string {
	if (context.supportStatus === 'unsupported') {
		return 'Device model is not supported. Please open a GitHub issue with the debug report below.';
	}
	if (context.supportStatus === 'partial') {
		return 'Device model is using dynamic fallback mapping. Please open a GitHub issue with the debug report below to improve static support.';
	}
	if (coverage.configCoverage === 'incomplete') {
		return 'Static gateway configuration is incomplete for this API variant. Please open a GitHub issue with the debug report below.';
	}
	return '';
}

export function needsSupportReporting(supportStatus: SupportStatus, configCoverage: ConfigCoverage): boolean {
	return supportStatus !== 'full' || configCoverage === 'incomplete';
}

function appendSupportMetadata(
	gateway: Gateways,
	values: Record<string, string>,
): void {
	const cmdMetadata = (Reflect.getMetadata(PROPERTY_METADATA_CMD, gateway) as Record<string, ModulesDescriptionMetadata>) || {};
	const daikinMetadata = (Reflect.getMetadata(PROPERTY_METADATA_DAIKIN, gateway) as Record<string, ModulePropertyMetadata>) || {};

	const supportDefs: Array<{ key: string; name: string; value: string }> = [
		{ key: '_supportStatus', name: 'Support Status', value: values._supportStatus },
		{ key: '_configCoverage', name: 'Config Coverage', value: values._configCoverage },
		{ key: '_configCoverageDetail', name: 'Config Coverage Detail', value: values._configCoverageDetail },
		{ key: '_supportMessage', name: 'Support Message', value: values._supportMessage },
		{ key: '_debugReport', name: 'Debug Report', value: values._debugReport },
		{ key: '_unmappedDatapoints', name: 'Unmapped Datapoints', value: values._unmappedDatapoints },
		{ key: '_unitModels', name: 'Unit Models', value: values._unitModels },
		{ key: '_managementPointsList', name: 'Management Points', value: values._managementPointsList },
		{ key: '_githubIssueUrl', name: 'GitHub Issue URL', value: values._githubIssueUrl },
	];

	for (const def of supportDefs) {
		cmdMetadata[def.key] = {
			name: def.name,
			settable: false,
			type: typeEnum.string,
			visible: true,
		};
		daikinMetadata[def.key] = {
			managementPoint: 'gateway',
			dataPoint: '__support__',
		};
		(gateway as unknown as Record<string, unknown>)[def.key] = def.value;
	}

	Reflect.defineMetadata(PROPERTY_METADATA_CMD, cmdMetadata, gateway);
	Reflect.defineMetadata(PROPERTY_METADATA_DAIKIN, daikinMetadata, gateway);
}

export function enrichDeviceSupport(
	device: DaikinCloudDevice,
	gateway: Gateways,
	context: SupportEnrichmentContext,
): void {
	const coverage = auditApiCoverage(device, gateway);
	const unitModels = extractUnitModels(device);
	const managementPointsList = Object.keys(device.managementPoints);
	const gatewayModelRaw = context.gatewayModelRaw ?? (readGatewayField(device, 'gateway', 'modelInfo') || readGatewayField(device, '0', 'modelInfo'));

	const debugReport = buildDebugReport(device, context, coverage, unitModels, managementPointsList);
	const supportMessage = buildSupportMessage(context, coverage);

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
		deviceInfo.supportMessage = supportMessage;
		deviceInfo.debugReport = debugReport;
		deviceInfo.githubIssueUrl = GITHUB_ISSUE_URL;
	}

	if (needsSupportReporting(context.supportStatus, coverage.configCoverage)) {
		appendSupportMetadata(gateway, {
			_supportStatus: context.supportStatus,
			_configCoverage: coverage.configCoverage,
			_configCoverageDetail: coverage.configCoverageDetail,
			_supportMessage: supportMessage,
			_debugReport: debugReport,
			_unmappedDatapoints: coverage.unmappedDatapoints.join(', '),
			_unitModels: JSON.stringify(unitModels),
			_managementPointsList: managementPointsList.join(', '),
			_githubIssueUrl: GITHUB_ISSUE_URL,
		});

		const anonymiseKey = gatewayModelRaw || device.getId();
		anonymise(device, anonymiseKey);
	}
}

export {SUPPORT_CMD_KEYS};
