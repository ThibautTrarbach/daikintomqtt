# Changelog

All notable changes to Daikin2MQTT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
