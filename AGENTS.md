# AGENTS.md — Guide for AI contributors

This file is the entry point for any AI agent working on **daikin2mqtt** (repo: `daikintomqtt`). Read it first, then follow the linked workflow guides.

## Stack

| Item | Value |
|------|-------|
| Runtime | Node.js >= 20 (`engines` in `package.json`) |
| Language | TypeScript strict, CommonJS |
| Build | `rootDir: src`, `outDir: dist`, `experimentalDecorators: true` |
| Entry | `daikinToMQTT.js` → `dist/main.js` ← `src/main.ts` |
| Package name | `daikin2mqtt` (npm) |

## Commands

```bash
npm run build          # Compile src/ → dist/ + copy certs
npm start              # Run compiled daemon
npm run run            # Dev: ts-node src/main.ts
npm run schema:check   # Validate Zod schemas (tokens, rate-limit)
npm run test:oauth     # OAuth integration smoke tests
npm run build && node test/unit/apiCoverageAudit.test.js   # Coverage audit (requires dist/)
npx ts-node test/unit/modelResolver.test.ts                # Single unit test example
```

There is **no global `npm test` script**. See [docs/workflows/testing.md](docs/workflows/testing.md).

## Where to change what

| Feature | Primary files | Workflow guide |
|---------|---------------|----------------|
| New datapoint mapping | `src/modules/gateway/characteristics/catalog.ts`, gateway `BRP069*.ts`, `apiCoverageAudit.test.js` | [docs/mapping-datapoints.md](docs/mapping-datapoints.md) |
| New device model / gateway | `modelResolver.ts`, `*Gateway.ts`, `daikin.ts`, `BRP069*.ts` | [docs/workflows/add-device-model.md](docs/workflows/add-device-model.md) |
| MQTT payload / Jeedom contract | `mqtt.ts`, `converter/jeedom.ts`, `CharacteristicWriter.ts` | [docs/workflows/mqtt-contract.md](docs/workflows/mqtt-contract.md) |
| New config option | `config/settings-default.yml`, `configValidator.ts`, `types/Daikin2MQTT.d.ts` | [docs/workflows/add-config-option.md](docs/workflows/add-config-option.md) |
| API quota / polling | `rateLimiter.ts`, `requestBudget.ts`, `cron.ts`, `actionRefresh.ts`, `writeQueue.ts` | [docs/workflows/api-quota.md](docs/workflows/api-quota.md) |
| Release | `package.json`, `CHANGELOG.md`, `CHANGELOG_FR.md` | [docs/workflows/release.md](docs/workflows/release.md) |
| Architecture overview | — | [docs/architecture.md](docs/architecture.md) |

## Non-negotiable conventions

- **Indentation**: tabs (not spaces)
- **Logger**: global `logger` (Winston), format `[filename.ts] => message`
- **Errors**: use typed errors from `src/modules/errorHandler.ts` where applicable
- **Enums**: `typeEnum`, `converterEnum`, `consumptionEnum` from `src/modules/gateway/typeConstants.ts`
- **Property keys**: MQTT/gateway keys prefixed with `_` (e.g. `_onOffMode`, `_device`)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- **Changelog**: Keep a Changelog format in **both** `CHANGELOG.md` and `CHANGELOG_FR.md`

## Global don'ts

1. **Do not modify `daikinRCCloud`** (Jeedom plugin) for a new datapoint mapping — Jeedom auto-discovers via MQTT.
2. **Do not edit `src/daikin-cloud/**`** unless fixing a cloud-client bug (vendored fork).
3. **Do not commit** `config/settings.yml` or token files.
4. **Do not bypass** `enqueueWriteForDevice` or add ad-hoc cloud API polling in gateways.
5. **Do not partially map** complex structures (`schedule`, `demandControl/modes/scheduled`) without explicit need.

## Documentation index

| Document | Purpose |
|----------|---------|
| [docs/architecture.md](docs/architecture.md) | Layer map, init sequence, file roles |
| [docs/mapping-datapoints.md](docs/mapping-datapoints.md) | Add/fix static datapoint mappings |
| [docs/workflows/add-device-model.md](docs/workflows/add-device-model.md) | Support a new BRP069 model |
| [docs/workflows/mqtt-contract.md](docs/workflows/mqtt-contract.md) | MQTT topics, payloads, Jeedom contract |
| [docs/workflows/add-config-option.md](docs/workflows/add-config-option.md) | New settings.yml key |
| [docs/workflows/testing.md](docs/workflows/testing.md) | Run and extend tests |
| [docs/workflows/release.md](docs/workflows/release.md) | Version bump and CI branches |
| [docs/workflows/api-quota.md](docs/workflows/api-quota.md) | Rate limit and polling guardrails |
| [VALIDATION_ERRORS_DOCUMENTATION_EN.md](VALIDATION_ERRORS_DOCUMENTATION_EN.md) | Config validation error reference |

## Cursor rules (`.cursor/rules/`)

| Rule | Trigger |
|------|---------|
| `project-overview.mdc` | Always applied |
| `daikin-datapoint-mapping.mdc` | Gateway TS + coverage test |
| `daikin-gateway-model.mdc` | Model resolver + gateway files |
| `mqtt-contract.mdc` | MQTT + converter files |
| `config-option.mdc` | Config + types |
| `testing-and-verification.mdc` | `test/**` |
| `api-quota-guardrails.mdc` | Rate limit / polling modules |

## Related project

**daikinRCCloud** (Jeedom plugin) consumes MQTT published by this daemon. Contract details: [docs/workflows/mqtt-contract.md](docs/workflows/mqtt-contract.md). Plugin requires daemon >= 2.0.0, installed from `release-beta` branch by default.
