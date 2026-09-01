"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_CMD_KEYS = exports.REDACTED = exports.GITHUB_ISSUE_URL = void 0;
exports.redactSensitiveValue = redactSensitiveValue;
exports.isSupportValueEmpty = isSupportValueEmpty;
exports.extractUnitModels = extractUnitModels;
exports.sanitizeUnitModelsForReport = sanitizeUnitModelsForReport;
exports.buildDebugReport = buildDebugReport;
exports.needsSupportReporting = needsSupportReporting;
exports.syncSupportMetadata = syncSupportMetadata;
exports.enrichDeviceSupport = enrichDeviceSupport;
require("reflect-metadata");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const decorator_1 = require("../decorator");
const requestBudget_1 = require("../requestBudget");
const Anonymise_1 = require("./Anonymise");
const apiCoverageAudit_1 = require("./apiCoverageAudit");
const SUPPORT_CMD_TYPE_STRING = 1;
exports.GITHUB_ISSUE_URL = 'https://github.com/ThibautTrarbach/daikinRCCloud/issues/new';
exports.REDACTED = '[redacted]';
const MAX_DEBUG_REPORT_SIZE = 16 * 1024;
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
const SUPPORT_CMD_DEFS = [
    { key: '_supportStatus', name: 'Support Status' },
    { key: '_configCoverage', name: 'Config Coverage' },
    { key: '_configCoverageDetail', name: 'Config Coverage Detail' },
    { key: '_supportMessage', name: 'Support Message' },
    { key: '_debugReport', name: 'Debug Report' },
    { key: '_unmappedDatapoints', name: 'Unmapped Datapoints' },
    { key: '_unitModels', name: 'Unit Models' },
    { key: '_managementPointsList', name: 'Management Points' },
    { key: '_githubIssueUrl', name: 'GitHub Issue URL' },
];
function readGatewayField(device, managementPoint, field) {
    try {
        const data = device.getData(managementPoint, field, undefined);
        return data?.value !== undefined && data?.value !== null ? String(data.value) : '';
    }
    catch {
        return '';
    }
}
function redactSensitiveValue() {
    return exports.REDACTED;
}
function isSupportValueEmpty(value) {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '{}' || trimmed === '[]') {
        return true;
    }
    return false;
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
function sanitizeUnitModelsForReport(device) {
    const unitModels = {};
    for (const embeddedId of Object.keys(device.managementPoints)) {
        const modelInfo = readGatewayField(device, embeddedId, 'modelInfo');
        if (modelInfo) {
            unitModels[embeddedId] = modelInfo;
            continue;
        }
        const name = readGatewayField(device, embeddedId, 'name');
        if (name) {
            unitModels[embeddedId] = exports.REDACTED;
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
function buildDebugReport(device, context, coverage, managementPointsList, supportMessage) {
    const sanitizedUnitModels = sanitizeUnitModelsForReport(device);
    const lines = [
        '=== DaikinToMQTT Debug Report ===',
        `deviceId: ${exports.REDACTED}`,
        `deviceName: ${exports.REDACTED}`,
        `gatewayModelRaw: ${context.gatewayModelRaw ?? 'unknown'}`,
        `gatewayModelResolved: ${context.gatewayModelResolved ?? 'none'}`,
        `supportStatus: ${context.supportStatus}`,
        `configCoverage: ${coverage.configCoverage}`,
        `configCoverageDetail: ${coverage.configCoverageDetail}`,
        `firmwareVersion: ${readGatewayField(device, 'gateway', 'firmwareVersion')}`,
        `serialNumber: ${exports.REDACTED}`,
        `daemonVersion: ${getDaemonVersion()}`,
        `authMode: ${(0, requestBudget_1.getConfiguredAuthMode)()}`,
        `detectedAt: ${new Date().toISOString()}`,
    ];
    if (supportMessage) {
        lines.push(`supportMessage: ${supportMessage}`);
    }
    lines.push(`managementPoints: ${managementPointsList.join(', ')}`);
    lines.push(`unitModels: ${JSON.stringify(sanitizedUnitModels)}`);
    if (coverage.unmappedDatapoints.length > 0) {
        lines.push(`unmappedDatapoints: ${coverage.unmappedDatapoints.join(', ')}`);
        if (coverage.totalUnmappedCount > coverage.unmappedDatapoints.length) {
            lines.push(`unmappedDatapointsTruncated: showing ${coverage.unmappedDatapoints.length}/${coverage.totalUnmappedCount}`);
        }
    }
    const footer = `githubIssueUrl: ${exports.GITHUB_ISSUE_URL}`;
    const body = lines.join('\n');
    const maxBodySize = MAX_DEBUG_REPORT_SIZE - footer.length - 1;
    if (body.length <= maxBodySize) {
        return `${body}\n${footer}`;
    }
    return `${body.slice(0, maxBodySize - 14)}\n...[truncated]\n${footer}`;
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
function getActiveSupportCommandKeys(gateway) {
    const cmdMetadata = Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, gateway) || {};
    const active = new Set();
    for (const key of SUPPORT_CMD_KEYS) {
        if (key in cmdMetadata) {
            active.add(key);
        }
    }
    return active;
}
function buildActiveSupportKeys(values) {
    const active = new Set();
    for (const def of SUPPORT_CMD_DEFS) {
        const value = values[def.key];
        if (value !== undefined && !isSupportValueEmpty(value)) {
            active.add(def.key);
        }
    }
    return active;
}
function supportCommandSetsEqual(a, b) {
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
function syncSupportMetadata(gateway, values) {
    const before = getActiveSupportCommandKeys(gateway);
    const after = buildActiveSupportKeys(values);
    const cmdMetadata = {
        ...(Reflect.getMetadata(decorator_1.PROPERTY_METADATA_CMD, gateway) || {}),
    };
    const daikinMetadata = {
        ...(Reflect.getMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, gateway) || {}),
    };
    const gatewayRecord = gateway;
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
    Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_CMD, cmdMetadata, gateway);
    Reflect.defineMetadata(decorator_1.PROPERTY_METADATA_DAIKIN, daikinMetadata, gateway);
    return !supportCommandSetsEqual(before, after);
}
function enrichDeviceSupport(device, gateway, context) {
    const coverage = (0, apiCoverageAudit_1.auditApiCoverage)(device, gateway);
    const unitModels = extractUnitModels(device);
    const sanitizedUnitModels = sanitizeUnitModelsForReport(device);
    const managementPointsList = Object.keys(device.managementPoints);
    const gatewayModelRaw = context.gatewayModelRaw ?? (readGatewayField(device, 'gateway', 'modelInfo') || readGatewayField(device, '0', 'modelInfo'));
    const supportMessage = buildSupportMessage(context, coverage);
    const debugReport = buildDebugReport(device, context, coverage, managementPointsList, supportMessage);
    const reporting = needsSupportReporting(context.supportStatus, coverage.configCoverage);
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
    const supportValues = reporting ? {
        _supportStatus: context.supportStatus,
        _configCoverage: coverage.configCoverage,
        _configCoverageDetail: coverage.configCoverageDetail,
        _supportMessage: supportMessage,
        _debugReport: debugReport,
        _unmappedDatapoints: coverage.unmappedDatapoints.join(', '),
        _unitModels: JSON.stringify(sanitizedUnitModels),
        _managementPointsList: managementPointsList.join(', '),
        _githubIssueUrl: exports.GITHUB_ISSUE_URL,
    } : {};
    const supportCommandsChanged = syncSupportMetadata(gateway, supportValues);
    if (reporting) {
        const anonymiseKey = gatewayModelRaw || device.getId();
        (0, Anonymise_1.anonymise)(device, anonymiseKey);
    }
    return supportCommandsChanged;
}
//# sourceMappingURL=supportMetadata.js.map