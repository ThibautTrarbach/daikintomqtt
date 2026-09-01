"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_CMD_KEYS = exports.GITHUB_ISSUE_URL = void 0;
exports.extractUnitModels = extractUnitModels;
exports.buildDebugReport = buildDebugReport;
exports.needsSupportReporting = needsSupportReporting;
exports.enrichDeviceSupport = enrichDeviceSupport;
require("reflect-metadata");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const decorator_1 = require("../decorator");
const requestBudget_1 = require("../requestBudget");
const Anonymise_1 = require("./Anonymise");
const apiCoverageAudit_1 = require("./apiCoverageAudit");
const BaseModules_1 = require("./BaseModules");
exports.GITHUB_ISSUE_URL = 'https://github.com/ThibautTrarbach/daikinRCCloud/issues/new';
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
];
exports.SUPPORT_CMD_KEYS = SUPPORT_CMD_KEYS;
function readGatewayField(device, managementPoint, field) {
    try {
        const data = device.getData(managementPoint, field, undefined);
        return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
    }
    catch {
        return '';
    }
}
function extractUnitModels(device) {
    const unitModels = {};
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
function getDaemonVersion() {
    try {
        const packagePath = (0, node_path_1.resolve)(__dirname, '../../../package.json');
        const pkg = JSON.parse((0, node_fs_1.readFileSync)(packagePath, 'utf8'));
        return pkg.version ?? 'unknown';
    }
    catch {
        return 'unknown';
    }
}
function buildDebugReport(device, context, coverage, unitModels, managementPointsList) {
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
        `authMode: ${(0, requestBudget_1.getConfiguredAuthMode)()}`,
        `detectedAt: ${new Date().toISOString()}`,
    ];
    if (coverage.unmappedDatapoints.length > 0) {
        lines.push('unmappedDatapoints:');
        for (const point of coverage.unmappedDatapoints) {
            lines.push(`  - ${point}`);
        }
    }
    lines.push(`githubIssueUrl: ${exports.GITHUB_ISSUE_URL}`);
    return lines.join('\n').slice(0, 2048);
}
function buildSupportMessage(context, coverage) {
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
function needsSupportReporting(supportStatus, configCoverage) {
    return supportStatus !== 'full' || configCoverage === 'incomplete';
}
function appendSupportMetadata(gateway, values) {
    const cmdMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, gateway) || {};
    const daikinMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gateway) || {};
    const supportDefs = [
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
            type: BaseModules_1.typeEnum.string,
            visible: true,
        };
        daikinMetadata[def.key] = {
            managementPoint: 'gateway',
            dataPoint: '__support__',
        };
        gateway[def.key] = def.value;
    }
    Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_CMD, cmdMetadata, gateway);
    Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, daikinMetadata, gateway);
}
function enrichDeviceSupport(device, gateway, context) {
    const coverage = (0, apiCoverageAudit_1.auditApiCoverage)(device, gateway);
    const unitModels = extractUnitModels(device);
    const managementPointsList = Object.keys(device.managementPoints);
    const gatewayModelRaw = context.gatewayModelRaw ?? (readGatewayField(device, 'gateway', 'modelInfo') || readGatewayField(device, '0', 'modelInfo'));
    const debugReport = buildDebugReport(device, context, coverage, unitModels, managementPointsList);
    const supportMessage = buildSupportMessage(context, coverage);
    const deviceInfo = gateway._device;
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
        deviceInfo.githubIssueUrl = exports.GITHUB_ISSUE_URL;
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
            _githubIssueUrl: exports.GITHUB_ISSUE_URL,
        });
        const anonymiseKey = gatewayModelRaw || device.getId();
        (0, Anonymise_1.anonymise)(device, anonymiseKey);
    }
}
//# sourceMappingURL=supportMetadata.js.map