/**
 * Unit tests for gateway model resolver.
 * Run: npx ts-node test/unit/modelResolver.test.ts
 */

import * as assert from 'node:assert/strict';
import { resolveGatewayModel } from '../../src/modules/gateway/modelResolver';

assert.equal(resolveGatewayModel('BRP069C41'), 'BRP069C41');
assert.equal(resolveGatewayModel('BRP069C42'), 'BRP069C4x');
assert.equal(resolveGatewayModel('BRP069A45'), 'BRP069A4x');
assert.equal(resolveGatewayModel('BRP069A78'), 'BRP069A78');
assert.equal(resolveGatewayModel('UNKNOWN_MODEL'), null);
assert.equal(resolveGatewayModel(null), null);

console.log('modelResolver.test.ts: all tests passed');
