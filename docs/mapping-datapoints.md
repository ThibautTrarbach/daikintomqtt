# Guide: adding a Daikin datapoint mapping

> Version française : [mapping-datapoints_FR.md](mapping-datapoints_FR.md)

This guide explains how to cover an Onecta API datapoint in a **static gateway** (e.g. `BRP069C4x`).

## Flow

```
Onecta API → discoverApiDatapoints() → auditApiCoverage()
                ↑                              ↓
         catalog.ts (helpers)          unmappedDatapoints
                ↑
    *Gateway.ts (composition) → MQTT + jeedom/{deviceId}
```

The debug report (`unmappedDatapoints` in Jeedom) lists keys in this format:

```
{managementPoint}/{dataPoint}{/sub/path}
```

Examples:
- `gateway/ledEnabled`
- `climateControl/demandControl/currentMode`
- `indoorUnit/eepromVersion`

## Where to change what

| Situation | File | Action |
|-----------|------|--------|
| Gateway field (LED, region, DST…) | `catalog.ts` → `gatewayDiagnosticsPack()` | Add a helper |
| Gateway identity (IP, MAC, SSID) | `_device` via `BaseModules.createDeviceInfo` + `EXTRA_DEVICE_DATAPOINTS` | Info panel only (no MQTT CMD) |
| Indoor/outdoor unit | `catalog.ts` → `auxiliaryUnitPack()` | Add a helper |
| Climate field group (fan, demand control…) | `catalog.ts` → new `*Pack()` | Create and reuse |
| Simple climate field | `ExtendedMonoZoneClimateGateway.ts` or dedicated gateway | `stateBool`, `stringField`, or inline definition |
| Multi-zone model (A78, C8x…) | Dedicated gateway (`BRP069A78.ts`, etc.) | Compose the right packs |
| Read-only without MQTT command | `apiCoverageAudit.ts` → `EXTRA_DEVICE_DATAPOINTS` | Audit-only (rare) |

**Rule**: prefer a shared pack in `catalog.ts` over duplicated inline definitions.

## Choosing the right helper

| API type | Helper | Key options |
|----------|--------|-------------|
| `on` / `off` settable | `stateBool(mp, dp, label, { settable: true })` | `propertyKey`, `generic_type: 'ENERGY_STATE'` |
| `on` / `off` read-only | `stateBool(mp, dp, label)` | — |
| string / enum | `stringField(mp, dp, label, { settable: true, values: [...] })` | `propertyKey` |
| settable integer | inline definition | `converter: converterEnum.numeric`, `type: typeEnum.numeric` |
| nested path (`sensoryData`, `demandControl`…) | inline or `*Pack()` | `dataPointPath: '/currentMode'` |
| depends on current `operationMode` | `fanClimatePack()` as template | `multiple: true`, `dataPointPath` with `#value#` |

### Example: nested field

```typescript
{
  propertyKey: '_demandControlFixed',
  daikin: {
    managementPoint: 'climateControl',
    dataPoint: 'demandControl',
    dataPointPath: '/modes/fixed',
    converter: converterEnum.numeric,
  },
  description: {
    name: 'Demand Control Fixed',
    settable: true,
    type: typeEnum.numeric,
    minMaxValue: {
      managementPoint: 'climateControl',
      dataPoint: 'demandControl',
      dataPointPath: '/modes/fixed',
    },
  },
}
```

### Example: gateway boolean

```typescript
stateBool('gateway', 'ledEnabled', 'LED Enabled', {
  settable: true,
  propertyKey: '_gatewayLedEnabled',
}),
```

## Checklist (new datapoint)

1. **Identify** the exact key from `unmappedDatapoints` or an API dump.
2. **Check** the type (`value`, `settable`, `values`, `minValue`/`maxValue`).
3. **Add** to the right pack or gateway (`catalog.ts` first).
4. **Export** the new pack if created (`export { ... }` at the bottom of `catalog.ts`).
5. **Wire** the pack into the relevant static gateway.
6. **Update** `test/unit/apiCoverageAudit.test.js`:
   - enrich `createMockDevice()` (or model mock) with the datapoint;
   - align the gateway mock (`createC4xGatewayMock()`, etc.).
7. **Verify**:
   ```bash
   npm run build
   node test/unit/apiCoverageAudit.test.js
   ```
8. **Changelog**: entry in `CHANGELOG.md` and `CHANGELOG_FR.md`.

## Existing packs (quick reference)

| Pack | Management points | Usage |
|------|-------------------|-------|
| `gatewayDiagnosticsPack()` | `gateway` | Diagnostics, LED, DST, region (IP/MAC/SSID → `_device` only) |
| `auxiliaryUnitPack('indoorUnit' \| 'outdoorUnit', label)` | units | Model, EEPROM, states (indoor `softwareVersion` → `_device` only) |
| `demandControlPack('climateControl')` | climate | Power demand control |
| `fanClimatePack('climateControl', opts)` | climate | Fan (mode-dependent) |
| `consumptionPack(mp, prefix)` | climate / zone | kWh consumption |
| `powerfulModeClimate(mp)` | climate | Powerful mode + active state |

## Edge cases

- **Datapoint missing on some models**: no guard needed; `BaseModules.ts` ignores read errors.
- **Key with `#value#`**: used when the path depends on the current mode (`operationMode`). Audit matches via regex.
- **`ref` in the API**: `discoverApiDatapoints` skips root-level `ref` datapoints; the real structure may be flat (`demandControl/currentMode`).
- **Audit-only**: add to `EXTRA_DEVICE_DATAPOINTS` when no MQTT command is desired (e.g. `timeZone`, gateway IP/MAC, indoor unit software version for the Jeedom equipment info panel).
- **Settable but identity-only**: when the API marks a leaf settable but it is only used as `_device` identity (no MQTT CMD), add the key to `SETTABLE_MISMATCH_EXCEPTIONS` in `apiCoverageAudit.ts` (e.g. `climateControl/name`). Do not use `EXTRA_DEVICE_DATAPOINTS` for this — it still counts as a settable mismatch.
- **Intentionally out of scope**: complex structures (`schedule`, `demandControl/modes/scheduled`) — do not partially map without explicit need.

## Key files

| File | Role |
|------|------|
| `src/modules/gateway/characteristics/catalog.ts` | Mapping helpers |
| `src/modules/gateway/ExtendedMonoZoneClimateGateway.ts` | A4x / B4x / C4x |
| `src/modules/gateway/apiDiscovery.ts` | API leaf discovery |
| `src/modules/gateway/apiCoverageAudit.ts` | API vs mapping comparison |
| `test/unit/apiCoverageAudit.test.js` | Full coverage test |
