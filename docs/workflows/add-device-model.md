# Workflow: add a new device model

How to promote an unknown Daikin gateway from **DynamicGateway** to a **static gateway** with full API coverage.

## Prerequisites

- An anonymized API dump in `config/newConfig/{model}.json` (generated when `system.dynamicFallback: false` and model is unsupported, or via `Anonymise.ts`)
- Or a debug report / GitHub issue listing `unmappedDatapoints` for the target model

## Decision: reuse or create?

| If the device looks like… | Reuse gateway from |
|---------------------------|-------------------|
| Single-zone climate (A4x/B4x/C4x family) | `ExtendedMonoZoneClimateGateway.ts` |
| Mono-zone C41 / C8x | `MonoZoneClimateGateway.ts` |
| Dual-zone heat pump (A61/A62) | `DualZoneHeatPumpGateway.ts` |
| Multi-zone + DHW (A78) | `MultiZoneClimateGateway.ts` |
| Completely different layout | New `*Gateway.ts` extending `AbstractGateway` |

Compare the dump structure (management points, zones, climateControl layout) with an existing gateway mock in `test/unit/apiCoverageAudit.test.js`.

## Step-by-step

### 1. Register the model in `modelResolver.ts`

Add to `EXACT_MODELS` if the API returns an exact family key, or add a `FAMILY_PATTERNS` entry:

```typescript
{ pattern: /^BRP069X99$/i, family: 'BRP069X99' },
// or family pattern:
{ pattern: /^BRP069X9/i, family: 'BRP069X9x', exclude: /^BRP069X99$/i },
```

Add a test case in `test/unit/modelResolver.test.ts`.

### 2. Create or extend the gateway class

**Option A — reuse existing builder:**

Add a new export class in the appropriate `*Gateway.ts` file:

```typescript
export class BRP069X9x extends AbstractGateway {
  constructor(device: DaikinCloudDevice) {
    super(device, buildExtendedMonoZoneCharacteristics(device, { /* opts */ }));
  }
}
```

**Option B — new gateway file:**

Create `src/modules/gateway/MyNewGateway.ts` with a `build*Characteristics()` function composing packs from `catalog.ts`.

### 3. Create the re-export shim

Create `src/modules/gateway/BRP069X9x.ts`:

```typescript
export { BRP069X9x } from './ExtendedMonoZoneClimateGateway';
// or from './MyNewGateway'
```

### 4. Wire the factory

In `src/modules/daikin.ts`:

1. Import the new class at the top
2. Add a `case` in `createStaticGatewayInstance()`:

```typescript
case 'BRP069X9x':
  return new BRP069X9x(devices);
```

### 5. Export from barrel

Add the export in `src/modules/gateway/index.ts`.

### 6. Map all datapoints

Follow [mapping-datapoints.md](../mapping-datapoints.md) until `auditApiCoverage()` returns `configCoverage: complete` for the model.

### 7. Update tests

In `test/unit/apiCoverageAudit.test.js`:

1. Add or extend `createMockDevice()` with all API datapoints for the model
2. Add a gateway mock factory (e.g. `createX9xGatewayMock()`)
3. Add an audit test case expecting `configCoverage: complete`

Run:

```bash
npm run build
node test/unit/apiCoverageAudit.test.js
npx ts-node test/unit/modelResolver.test.ts
```

### 8. Update README

Add the model to the **Supported devices** list in `README.md`.

### 9. Changelog

Add entries to `CHANGELOG.md` and `CHANGELOG_FR.md` under `### Added`.

## Support status after merge

| Gateway type | `_supportStatus` |
|--------------|------------------|
| Static (full coverage) | `full` |
| DynamicGateway | `partial` |
| UnsupportedGateway | `unsupported` |

## Don'ts

- Do not add model-specific cloud API calls in the gateway constructor — use characteristic definitions + `BaseModules`.
- Do not duplicate characteristic packs — factor into `catalog.ts`.
- Do not modify `daikinRCCloud` — Jeedom discovers commands via MQTT automatically.
