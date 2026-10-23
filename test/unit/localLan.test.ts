/**
 * Unit tests for LAN HTTP parse / compatibility / mapper.
 * Run: npx ts-node test/unit/localLan.test.ts
 */

import {
	parseLanResponse,
	isLanResponseOk,
	toLanQuery,
} from '../../src/modules/local/LocalHttpClient';
import { isLanCompatibleModel, listLanCompatibleModels } from '../../src/modules/local/LanCompatibility';
import {
	mapLanToClimateState,
	applyCloudWriteToLanControl,
	docModeToCloud,
	cloudModeToDoc,
	docFanToCloud,
	cloudFanToDoc,
} from '../../src/modules/local/LanMapper';

let failed = 0;

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		failed++;
		console.error(`FAIL: ${msg}`);
	} else {
		console.log(`OK: ${msg}`);
	}
}

function assertEqual(actual: unknown, expected: unknown, msg: string): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	assert(ok, `${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

// --- parse ---
{
	const parsed = parseLanResponse('ret=OK,pow=1,mode=3,stemp=24.0,shum=0,f_rate=A,f_dir=0');
	assert(isLanResponseOk(parsed), 'ret=OK is success');
	assertEqual(parsed.pow, '1', 'pow parsed');
	assertEqual(parsed.mode, '3', 'mode parsed');
	assertEqual(toLanQuery({ pow: '1', mode: '3' }), 'pow=1&mode=3', 'query string');
}

{
	const bad = parseLanResponse('ret=PARAM NG,msg=error');
	assert(!isLanResponseOk(bad), 'ret≠OK is failure');
}

// --- compatibility ---
{
	assert(isLanCompatibleModel('BRP069A42'), 'A42 compatible');
	assert(isLanCompatibleModel('brp069a43'), 'A43 case-insensitive');
	assert(isLanCompatibleModel('BRP069B41'), 'B41 compatible');
	assert(!isLanCompatibleModel('BRP069C41'), 'C41 not compatible');
	assert(!isLanCompatibleModel('BRP069A61'), 'A61 not compatible');
	assert(!isLanCompatibleModel(''), 'empty not compatible');
	assert(listLanCompatibleModels().includes('BRP069A42'), 'list includes A42');
}

// --- mapper modes / fan ---
{
	assertEqual(docModeToCloud('3'), 'cooling', 'mode 3 → cooling');
	assertEqual(docModeToCloud('4'), 'heating', 'mode 4 → heating');
	assertEqual(cloudModeToDoc('fanOnly'), '6', 'fanOnly → 6');
	assertEqual(docFanToCloud('A').mode, 'auto', 'f_rate A → auto');
	assertEqual(docFanToCloud('B').mode, 'quiet', 'f_rate B → quiet');
	assertEqual(docFanToCloud('5').fixed, 3, 'f_rate 5 → fixed 3');
	assertEqual(cloudFanToDoc('fixed', 2), '4', 'fixed 2 → f_rate 4');
}

{
	const climate = mapLanToClimateState(
		{ ret: 'OK', pow: '1', mode: '3', stemp: '22.0', shum: '0', f_rate: 'A', f_dir: '1' },
		{ ret: 'OK', htemp: '21.5', otemp: '10', hhum: '45' },
	);
	assertEqual(climate.onOffMode, 'on', 'pow→on');
	assertEqual(climate.operationMode, 'cooling', 'mode→cooling');
	assertEqual(climate.targetTemperature, 22, 'stemp');
	assertEqual(climate.swingVertical, 'swing', 'f_dir 1 vertical');
	assertEqual(climate.roomTemperature, 21.5, 'htemp');
}

{
	const current = { pow: '1', mode: '3', stemp: '22.0', shum: '0', f_rate: 'A', f_dir: '0' };
	const next = applyCloudWriteToLanControl(current, {
		managementPoint: 'climateControl',
		dataPoint: 'onOffMode',
		value: 'off',
	});
	assert(next !== null, 'onOffMode mappable');
	assertEqual(next!.pow, '0', 'write off → pow 0');

	const unmapped = applyCloudWriteToLanControl(current, {
		managementPoint: 'climateControl',
		dataPoint: 'powerfulMode',
		value: 'on',
	});
	assert(unmapped === null, 'powerfulMode not on LAN → null (cloud fallback)');
}

if (failed > 0) {
	console.error(`\n${failed} assertion(s) failed`);
	process.exit(1);
}
console.log('\nAll local LAN unit tests passed');
