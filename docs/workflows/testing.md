# Workflow: testing and verification

There is **no single `npm test` command**. Tests are run individually or in documented sequences.

## Test inventory

### Unit tests (`test/unit/`)

| File | Runner | Requires build? | What it tests |
|------|--------|-----------------|---------------|
| `modelResolver.test.ts` | `npx ts-node` | No | `resolveGatewayModel()` patterns |
| `supportMetadata.test.ts` | `npx ts-node` | No | Support fields, redaction, sync |
| `device-ws-update.test.ts` | `npx ts-node` | No | WebSocket merge on nested characteristics |
| `apiCoverageAudit.test.js` | `node` | **Yes** (`dist/`) | Full API coverage audit per gateway model |

### Integration tests (`test/integration/`)

| File | Runner | What it tests |
|------|--------|---------------|
| `oauth-developer-portal.test.ts` | `npm run test:oauth` | OIDC mock server smoke test |
| `oauth-mobile-app.test.ts` | `npm run test:oauth` | Mobile OAuth config constants |

### Other checks

| Command | Purpose |
|---------|---------|
| `npm run build` | TypeScript compilation (must pass before release) |
| `npm run schema:check` | Zod schema validation for tokens/rate-limit |

## Running tests

```bash
# Unit tests (TypeScript, no build needed)
npx ts-node test/unit/modelResolver.test.ts
npx ts-node test/unit/supportMetadata.test.ts
npx ts-node test/unit/device-ws-update.test.ts

# Coverage audit (requires compiled dist/)
npm run build
node test/unit/apiCoverageAudit.test.js

# OAuth integration
npm run test:oauth

# Schema validation
npm run schema:check
```

## Coverage audit — the main gateway gate

`test/unit/apiCoverageAudit.test.js` is the **mandatory check** when adding or changing static gateway mappings.

### Success criterion

Test output must show:

```
configCoverage: complete
```

for every static gateway model under test.

### How it works

1. Loads compiled modules from `dist/`
2. Builds mock `DaikinCloudDevice` with API datapoints
3. Instantiates gateway mock with characteristic definitions
4. Runs `auditApiCoverage()` — compares discovered API keys vs mapped keys
5. Fails if any API datapoint is unmapped (unless in `EXTRA_DEVICE_DATAPOINTS`)
6. Fails if an API-settable leaf is mapped read-only (unless in `SETTABLE_MISMATCH_EXCEPTIONS`)

### Extending mocks

When adding a datapoint or model:

1. **`createMockDevice()`** — add the API datapoint structure (managementPoint, dataPoint, value, settable, etc.)
2. **Gateway mock factory** (e.g. `createC4xGatewayMock()`) — ensure characteristics include the new mapping
3. **Add test case** — assert `configCoverage === 'complete'` and no unexpected `unmappedDatapoints`

Example pattern:

```javascript
const result = auditApiCoverage(mockDevice, gatewayMock);
assert.strictEqual(result.configCoverage, 'complete');
assert.deepStrictEqual(result.unmappedDatapoints, []);
```

### EXTRA_DEVICE_DATAPOINTS

In `apiCoverageAudit.ts` — use **only** for datapoints intentionally not mapped to MQTT (e.g. read-only audit-only fields like `timeZone`). Do not use as a shortcut to skip real mappings.

### SETTABLE_MISMATCH_EXCEPTIONS

In `apiCoverageAudit.ts` — allowlist of API-settable keys that are intentionally mapped read-only (e.g. `climateControl/name` as `_device` identity, no MQTT CMD). Use when a settable mismatch is a product decision, not a missing mapping.

## When to run which tests

| Change type | Minimum verification |
|-------------|---------------------|
| New datapoint mapping | `npm run build && node test/unit/apiCoverageAudit.test.js` |
| New model / modelResolver | Above + `npx ts-node test/unit/modelResolver.test.ts` |
| Support metadata / debug report | `npx ts-node test/unit/supportMetadata.test.ts` |
| WebSocket update logic | `npx ts-node test/unit/device-ws-update.test.ts` |
| OAuth / auth changes | `npm run test:oauth` |
| Config validation | Manual invalid config startup + `npm run build` |
| Any TS change | `npm run build` (noEmitOnError: true) |

## CI note

GitHub Actions workflows (`.github/workflows/build-*.yml`) run **`yarn build` only** — no automated test execution in CI. Local verification before push is the contributor's responsibility.

## Adding a new unit test

1. Create `test/unit/myFeature.test.ts`
2. Use Node assert or plain throw-on-failure pattern (match existing tests)
3. For gateway tests requiring compiled code, use `.js` and import from `dist/` like `apiCoverageAudit.test.js`
4. Document the run command in this file if it becomes a recurring check
