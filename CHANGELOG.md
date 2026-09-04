# Changelog

All notable changes to Daikin2MQTT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

---

## [2.1.7] - 2026-09-04

### Changed

- Gateway IP/MAC/SSID and indoor unit software version: publish in `_device` for Jeedom equipment info panel only (no longer as MQTT commands)
- Support MQTT: publish diagnostic fields (`_debugReport`, inventaire API, unmapped, …) only when support is incomplete; healthy devices stay silent on MQTT
- Jeedom: hide all support/debug commands by default (still available in equipment configuration)

### Fixed

- BRP069A78: mark main/tank `operationMode` and DHW setpoint (`temperatureControlDhw` fixed path) as settable to match API
- Coverage audit: treat `climateControl/name` as intentional read-only (`SETTABLE_MISMATCH_EXCEPTIONS`) — device identity via `_device`, no MQTT CMD

### Added

- Support MQTT: `_unmappedDatapointsDetail` with leaf metadata (`settable`, `valueType`, `values`, `minValue`/`maxValue`, `stepValue`, `unit`) in debug report
- Support MQTT: `_apiDatapointsDetail` inventory + `_settableMismatches(Detail)` when API-settable leaves are mapped read-only
- BRP069C4x: map `climateControl/intelligentEyeMode`, `indoorUnit/frontPanelSetting`, `indoorUnit/installationPosition`

### Removed

- MQTT commands `_gatewayIpAddress`, `_gatewayMacAddress`, `_gatewaySsid`, `_indoorUnitSoftwareVersion` (moved to `_device` metadata)
- Anonymized dump export to `config/newConfig/` (replaced by MQTT debug report); legacy folder is deleted on daemon startup

---

## [2.1.6] - 2026-09-02

### Added

- BRP069C4x: complete mapping for gateway datapoints (LED, daylight saving, region), demandControl, iconId, lock function, indoor/outdoor units (dry keep, EEPROM, thermo on, defrost)
- `demandControlPack` catalog helper for power demand control (mode + fixed value)

---

## [2.1.5] - 2026-09-01

### Fixed

- BRP069B4x / BRP069A4x: propagate `gatewayDiagnosticsPack` and `auxiliaryUnitPack` (complete static coverage, fixes daikinRCCloud #42)
- BRP069A78: add gateway diagnostics, temperatureControl leavingWaterOffset, DHW tank name/isPowerfulModeActive, auxiliary unit packs for hydro/outdoor/UI (fixes daikinRCCloud #41)
- Debug report: redact `serialNumber` alongside other sensitive fields
- Debug report: point `githubIssueUrl` to `daikintomqtt` repository

### Added

- `temperatureControlLeavingWaterOffset` and `auxiliaryUnitInfoPack` catalog helpers
- API coverage tests for BRP069B4x and BRP069A78

---

## [2.1.4] - 2026-09-01

### Fixed

- `auxiliaryUnitPack`: add modelInfo, serialNumber (indoor/outdoor) and softwareVersion (outdoor) — complete BRP069C4x coverage

---

## [2.1.3] - 2026-09-01

### Added

- `gatewayDiagnosticsPack`: gateway network/diagnostic sensors (IP, MAC, SSID, firmware update support, error state)
- `auxiliaryUnitPack`: indoor/outdoor unit sensors (software version, error/warning/caution states) for BRP069C4x
- `isPowerfulModeActive` read-only mapping alongside `powerfulMode` (firmware 2.6.x API)
- Support metadata module: debug report generation, GitHub issue URL, support command synchronization with redaction
- Unit tests for API coverage audit and support metadata (`test/unit/apiCoverageAudit.test.js`, `test/unit/supportMetadata.test.ts`)

### Fixed

- API coverage audit: normalize datapoint paths (fix `//` segments), count `_device` metadata, match `#value#` placeholders
- Home Assistant preset mode: fallback to `_isPowerfulModeActive` when `_powerfulMode` is absent

### Changed

- `_device` enrichment: `ipAddress`, `macAddress`, and `ssid` alias for `wifiConnectionSSID`
- Debug report: include support message, indicate truncation when unmapped datapoints exceed display limit (`totalUnmappedCount`)

---

## [2.1.2] - 2026-09-01

### Added

- `authorizationTimeoutSeconds`: configurable browser OAuth authorization wait time (60–3600 s, validated at startup)

### Changed

- npm package renamed: `daikin-deamon` → `daikin2mqtt`

---

## [2.1.1] - 2026-08-31

### Added

- Cleanup of stale retained MQTT topics on startup (`cleanStaleRetainedTopics`)
- WebSocket: support for nested characteristics and references in `applyWebSocketUpdate`
- `shutdown.ts` module: centralized graceful shutdown management (skip poll/publish during shutdown)

### Changed

- Device metadata: dynamic keys in `AbstractGateway`, automatic registration in `DynamicGateway`
- `RateLimiter`: merge partial updates, retain previous values when absent
- Refined mobile OAuth error handling and HTTP transport
- `main.ts` entry point (DaikinToMQTT): improved handling of unhandled promise rejections

---

## [2.1.0] - 2026-08-30

### Added

- `authMode: mobile_app` — Gigya/PKCE OAuth (ported from [homebridge-daikin-cloud](https://github.com/mp-consulting/homebridge-daikin-cloud)), tokens stored in `daikin-mobile-tokenset`
- Automatic completion of pending Onecta registration (Gigya error 206001) via `completePendingRegistration`
- Onecta WebSocket client (`src/daikin-cloud/onecta/websocket.ts`): heartbeat, exponential reconnect, real-time updates (0 GET)
- `wsUpdateMapper`: WS → device cache → MQTT, skip post-action refresh when change is confirmed by WebSocket
- `DynamicGateway`: automatic fallback for unknown device models (`system.dynamicFallback`, `system.exposeReadOnly`)
- `requestBudget` module: quota thresholds per authentication mode, adaptive polling (×1.5 low / ×2 critical)
- `actionRefresh` module: modes 1/2/3, strategies `timer` / `merge_with_poll` / `disabled`
- `writeQueue`: sequential PATCH queue per device with configurable coalescing (`commandCoalesceMs`, default 400 ms)
- Optimistic MQTT publish after commands (`publishOptimisticUpdate`) — modes 2 and 3
- `httpTransport: node | curl` with mobile Daikin User-Agent (WAF/TLS bypass)
- Graceful shutdown on `SIGINT`/`SIGTERM`: stop cron, close WebSocket, flush pending commands, clear gateway cache, disconnect MQTT
- System MQTT bridge sensors: `API Budget Status`, `Auth Mode`, `WebSocket Connected`, `Next Polling At`, `Daily Quota Limit`, `Skipped Refresh Count`
- Zod TokenSet validation, `schema:check` script, OAuth integration tests (`oauth-developer-portal`, `oauth-mobile-app`)
- Gateway refactor: `AbstractGateway`, `metadataRegistry`, characteristic catalogs
- `CharacteristicWriter`, `ScheduleManager`, specialized gateways (`MonoZoneClimateGateway`, `MultiZoneClimateGateway`, `DualZoneHeatPumpGateway`, `ExtendedMonoZoneClimateGateway`)
- `publishOnDelta`: skip MQTT publish when payload is unchanged
- Daily energy stats refresh at configurable time (`energyStatsRefreshTime`, default `23:58`)
- Mock API mode (`useMock` / `mockId`) for testing without production cloud
- Node.js ≥ 20 required

### Changed

- `RateLimiter`: merge partial HTTP rate-limit headers (WebSocket compatibility), separate refresh/connectivity retry modes
- Enhanced TypeScript strictness, compilation scoped to `src/` for CI
- Restructured entry point: `src/main.ts` (DaikinToMQTT)
- Polling intervals reduced when WebSocket is active (minimum 30 min day / 60 min night in `mobile_app` mode)
- Post-action polling pause during debounce to avoid duplicate GET requests

### Fixed

- Auth handling: `AuthenticationError` class, centralized `isAuthFailure` detection, automatic token removal on `invalid_grant`
- Automatic retry on 502/503/504 gateway errors and network errors with exponential backoff and jitter
- OAuth token refresh deduplication (`refreshPromise`) in mobile OAuth flow

---

## [2.0.4] - 2025

### Changed

- Improved energy consumption data handling in `BaseModules`
- Adjusted cron polling intervals for better performance

---

## [2.0.3] - 2025

### Changed

- Synchronized version numbers between `package.json` and `SystemBridge.ts`

---

## [2.0.2] - 2025

### Changed

- Improved logging and property assignment in `BaseModules`

---

## [2.0.1] - 2025

### Added

- Enhanced Daikin logging and error handling, including OIDC authorization timeout

### Fixed

- `updateDaikinDevice` returns a detailed result object instead of a boolean
- `dataPointPath`: `null` → `undefined` for API compatibility
- `getTimeUntilNextInterval` fixed to avoid immediate or misaligned polls
- `RateLimiter`: retry on connectivity errors (`ECONNRESET`, timeout, DNS) with exponential backoff

---

## [2.0.0] - 2025

### Added

- Daikin Cloud OIDC integration (Developer Portal authentication)
- TypeScript architecture with static gateways (BRP069A4x, BRP069A61, BRP069A62, BRP069A78, BRP069B4x, BRP069C4x, BRP069C41, BRP069C8x)
- Configurable day/night polling intervals via `node-cron`
- MQTT integrations: Jeedom message format and Home Assistant Discovery
- Post-action refresh modes (1/2/3) and post-action refresh delay
- YAML configuration with strict validation (`configValidator`)
- Validation error documentation (`VALIDATION_ERRORS_DOCUMENTATION_EN.md`, `VALIDATION_ERRORS_DOCUMENTATION_FR.md`)
- Energy consumption metrics and Home Assistant sensor discovery
- Rate limiting with daily quota tracking and cache persistence
- Error handler with retry on transient failures
