/**
 * Unit tests for support metadata (conditional commands, redaction, cache sync).
 * Run: npx ts-node test/unit/supportMetadata.test.ts
 */

/// <reference path="../../src/global.d.ts" />

import 'reflect-metadata';
import * as assert from 'node:assert/strict';

(global as typeof globalThis).config = {
	system: { exposeReadOnly: true },
	integration: { jeedom: false },
} as never;
(global as typeof globalThis).logger = {
	debug: () => undefined,
	info: () => undefined,
	warn: () => undefined,
	error: () => undefined,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DaikinCloudDevice } = require('../../src/daikin-cloud/device') as typeof import('../../src/daikin-cloud/device');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PROPERTY_METADATA_CMD } = require('../../src/modules/decorator') as typeof import('../../src/modules/decorator');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
	REDACTED,
	GITHUB_ISSUE_URL,
	buildDebugReport,
	isSupportValueEmpty,
	sanitizeUnitModelsForReport,
	syncSupportMetadata,
	SUPPORT_CMD_KEYS,
} = require('../../src/modules/gateway/supportMetadata') as typeof import('../../src/modules/gateway/supportMetadata');

const stubClient = {};
const DEVICE_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const GATEWAY_NAME = 'Maison Thibaut';

function makeSupportDevice(): InstanceType<typeof DaikinCloudDevice> {
	const desc = {
		id: DEVICE_UUID,
		deviceModel: 'test',
		isCloudConnectionUp: { value: true },
		managementPoints: [
			{
				embeddedId: 'gateway',
				managementPointType: 'gateway',
				modelInfo: { value: 'BRP069C4x' },
				name: { value: GATEWAY_NAME },
				firmwareVersion: { value: '1.0.0' },
				serialNumber: { value: 'SN123456' },
			},
			{
				embeddedId: 'climateControl',
				managementPointType: 'climateControl',
				name: { value: 'Thibaut' },
			},
		],
	};
	return new DaikinCloudDevice(desc, stubClient as never);
}

function createGatewayStub(): object {
	return {};
}

function getActiveSupportKeys(gateway: object): string[] {
	const metadata = Reflect.getMetadata(PROPERTY_METADATA_CMD, gateway) as Record<string, unknown> || {};
	return SUPPORT_CMD_KEYS.filter((key) => key in metadata);
}

function run(): void {
	assert.equal(isSupportValueEmpty(''), true);
	assert.equal(isSupportValueEmpty('  '), true);
	assert.equal(isSupportValueEmpty('{}'), true);
	assert.equal(isSupportValueEmpty('[]'), true);
	assert.equal(isSupportValueEmpty('partial'), false);

	const device = makeSupportDevice();
	const sanitized = sanitizeUnitModelsForReport(device);
	assert.deepEqual(sanitized, {
		gateway: 'BRP069C4x',
		climateControl: REDACTED,
	});
	assert.equal(sanitized.climateControl, REDACTED);
	assert.equal(sanitized.gateway, 'BRP069C4x');

	const report = buildDebugReport(
		device,
		{
			supportStatus: 'partial',
			gatewayModelRaw: 'BRP069C4x',
			gatewayModelResolved: 'BRP069C4x',
		},
		{
			configCoverage: 'incomplete',
			mappedCount: 1,
			apiCount: 2,
			configCoverageDetail: '1/2 datapoints mapped',
			unmappedDatapoints: ['climateControl/somePoint'],
			totalUnmappedCount: 1,
		},
		['gateway', 'climateControl'],
		'Needs support',
	);
	assert.equal(report.includes(DEVICE_UUID), false);
	assert.equal(report.includes(GATEWAY_NAME), false);
	assert.equal(report.includes('"climateControl":"Thibaut"'), false);
	assert.equal(report.includes('Maison Thibaut'), false);
	assert.equal(report.includes(`deviceId: ${REDACTED}`), true);
	assert.equal(report.includes(`deviceName: ${REDACTED}`), true);
	assert.equal(report.includes('SN123456'), false);
	assert.equal(report.includes(`serialNumber: ${REDACTED}`), true);
	assert.equal(report.includes('"gateway":"BRP069C4x"'), true);
	assert.equal(report.includes(`"climateControl":"${REDACTED}"`), true);
	assert.equal(report.includes('supportMessage: Needs support'), true);
	assert.equal(report.includes(`githubIssueUrl: ${GITHUB_ISSUE_URL}`), true);
	assert.equal(report.includes('unmappedDatapoints: climateControl/somePoint'), true);

	const longUnmapped = Array.from({ length: 42 }, (_, index) =>
		`climateControl/fanControl//operationModes/heating/fanSpeed/modes/fixed/${index}`,
	);
	const longReport = buildDebugReport(
		device,
		{
			supportStatus: 'full',
			gatewayModelRaw: 'BRP069C4x',
			gatewayModelResolved: 'BRP069C4x',
		},
		{
			configCoverage: 'incomplete',
			mappedCount: 8,
			apiCount: 50,
			configCoverageDetail: '8/50 datapoints mapped',
			unmappedDatapoints: longUnmapped,
			totalUnmappedCount: 55,
		},
		['gateway', 'climateControl'],
		'Static gateway configuration is incomplete for this API variant. Please open a GitHub issue with the debug report below.',
	);
	assert.ok(longReport.length > 2048, 'long report should exceed the previous 2048-byte cap');
	assert.equal(longReport.includes(`githubIssueUrl: ${GITHUB_ISSUE_URL}`), true);
	assert.equal(longReport.includes('supportMessage: Static gateway configuration is incomplete'), true);
	assert.equal(longReport.includes('unmappedDatapointsTruncated: showing 42/55'), true);
	for (const point of longUnmapped) {
		assert.equal(longReport.includes(point), true, `missing unmapped datapoint in report: ${point}`);
	}

	const gateway = createGatewayStub();
	const changedOnAdd = syncSupportMetadata(gateway as never, {
		_supportStatus: 'partial',
		_configCoverage: 'incomplete',
		_configCoverageDetail: '1/2 datapoints mapped',
		_supportMessage: 'Needs support',
		_debugReport: report,
		_unmappedDatapoints: 'climateControl/somePoint',
		_unitModels: JSON.stringify(sanitized),
		_managementPointsList: 'gateway, climateControl',
		_githubIssueUrl: 'https://example.com/issues',
	});
	assert.equal(changedOnAdd, true);
	assert.ok(getActiveSupportKeys(gateway).includes('_supportStatus'));
	assert.ok(getActiveSupportKeys(gateway).includes('_debugReport'));
	assert.equal(getActiveSupportKeys(gateway).includes('_unmappedDatapoints'), true);

	const changedOnPartial = syncSupportMetadata(gateway as never, {
		_supportStatus: 'partial',
		_configCoverage: 'incomplete',
		_configCoverageDetail: '1/2 datapoints mapped',
		_supportMessage: 'Needs support',
		_debugReport: report,
		_unmappedDatapoints: '',
		_unitModels: JSON.stringify(sanitized),
		_managementPointsList: 'gateway, climateControl',
		_githubIssueUrl: 'https://example.com/issues',
	});
	assert.equal(changedOnPartial, true);
	assert.equal(getActiveSupportKeys(gateway).includes('_unmappedDatapoints'), false);

	const changedOnClear = syncSupportMetadata(gateway as never, {});
	assert.equal(changedOnClear, true);
	assert.deepEqual(getActiveSupportKeys(gateway), []);

	const gatewayWithStale = createGatewayStub();
	syncSupportMetadata(gatewayWithStale as never, {
		_supportStatus: 'partial',
		_configCoverage: 'incomplete',
		_configCoverageDetail: '1/2 datapoints mapped',
		_supportMessage: 'Needs support',
		_debugReport: report,
		_unitModels: JSON.stringify(sanitized),
		_managementPointsList: 'gateway, climateControl',
		_githubIssueUrl: 'https://example.com/issues',
	});
	assert.ok(getActiveSupportKeys(gatewayWithStale).length > 0);
	const changedOnFullSupport = syncSupportMetadata(gatewayWithStale as never, {});
	assert.equal(changedOnFullSupport, true);
	assert.deepEqual(getActiveSupportKeys(gatewayWithStale), []);

	const emptyUnitModelsGateway = createGatewayStub();
	const changedEmptyModels = syncSupportMetadata(emptyUnitModelsGateway as never, {
		_supportStatus: 'partial',
		_unitModels: '{}',
	});
	assert.equal(changedEmptyModels, true);
	assert.equal(getActiveSupportKeys(emptyUnitModelsGateway).includes('_unitModels'), false);
	assert.equal(getActiveSupportKeys(emptyUnitModelsGateway).includes('_supportStatus'), true);

	console.log('supportMetadata.test.ts: all tests passed');
}

try {
	run();
} catch (err) {
	console.error(err);
	process.exit(1);
}
