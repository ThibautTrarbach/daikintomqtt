# Workflow: local LAN control (Online Controller)

Prefer the classic Daikin Online Controller HTTP API on the LAN when the gateway model is compatible, and fall back to Onecta cloud when LAN is unreachable. Home Assistant MQTT Discovery and the Jeedom MQTT contract stay unchanged.

## Supported models (v1 whitelist)

| Model | LAN HTTP |
|-------|----------|
| `BRP069A42` | yes |
| `BRP069A43` | yes |
| `BRP069B41` | yes |
| `BRP069C*` / `A61` / `A62` / `A78` | **no** — cloud only (never probed) |

Protocol: plain HTTP port 80 (`/common/basic_info`, `/aircon/get_control_info`, `/aircon/set_control_info`, …) — same as the Jeedom plugin **DaikinOnlineCtrl**.

## Modes

| `daikin.authMode` | Cloud Onecta | LAN |
|-------------------|--------------|-----|
| `developer_portal` / `mobile_app` | yes | optional via `daikin.local` (hybrid) |
| `local` | **no** — client not started | **required** — `daikin.local.devices` must list IPs |

In `local` mode the daemon skips OAuth/mobile auth entirely and only talks HTTP to Online Controller modules.

## Config (`daikin.local`)

```yaml
daikin:
  authMode: local   # or developer_portal / mobile_app with local.enabled
  local:
    enabled: true
    timeoutMs: 5000
    probeIntervalMinutes: 5
    pollIntervalSeconds: 60   # LAN refresh; independent of cloud quota
    devices:
      - ip: "192.168.1.50"   # local-only (not on Onecta)
    overrides:
      "<cloud-uuid>": "192.168.1.51"  # force LAN IP for a cloud device (hybrid only)
```

| Key | Default | Meaning |
|-----|---------|---------|
| `enabled` | `false` | Master switch (forced `true` when `authMode: local`) |
| `timeoutMs` | `5000` | HTTP timeout |
| `probeIntervalMinutes` | `5` | Re-probe after hybrid LAN failure |
| `pollIntervalSeconds` | `60` | LAN state refresh interval (5–300); **no** Onecta quota |
| `devices` | `[]` | Local-only modules (manual IP); **required** if `authMode: local` |
| `overrides` | `{}` | Cloud UUID → LAN IP |

## Polling: LAN vs cloud / quota

Two independent timers:

| Poller | Interval | Quota | What it does |
|--------|----------|-------|--------------|
| **Cloud** (`cron.ts`) | day/night 15–30 min | `canRefresh()` / Onecta headers | `getDevices(force)` + MQTT |
| **LAN** (`scheduleLocalPolling`) | `pollIntervalSeconds` (default 60 s) | **none** | `device.updateData()` on `local`/`hybrid` with known IP, then MQTT |

- Targets: devices whose meta `accessMode` is `local` or `hybrid` and that have an IP (`getDeviceLocalMeta`).
- `authMode: local`: only the LAN poller runs (no cloud cron, no energy-stats cloud cron).
- Hybrid with cloud quota exhausted: cloud poller skips; **LAN poller keeps running**.
- Post-action / single-device refresh: LAN-capable devices skip `canRefresh` so writes are not blocked by API budget.

## Behaviour

1. **Cloud-only** (model not whitelisted, no override): never call LAN.
2. **Hybrid** (whitelisted + cloud IP, or override): probe LAN → if OK, read/write via LAN; on failure use Onecta (`controlPath: degraded_cloud`) and re-probe later.
3. **Local-only** (`devices` list): identity `local-{mac}` from `/common/basic_info`; no cloud fallback.

Writes always merge full `pow,mode,stemp,shum,f_rate,f_dir` before `set_control_info` (DOC requirement). Unmappable cloud datapoints (e.g. powerful) fall back to cloud on hybrid devices.

## MQTT metadata

Published under `_device` (additive):

| Field | Values | Use |
|-------|--------|-----|
| `accessMode` | `cloud` \| `local` \| `hybrid` | Jeedom badge (capability) |
| `controlPath` | `local` \| `cloud` \| `degraded_cloud` | Active path / diagnostics |

Enums for climate (`on`/`off`, `heating`/`cooling`, …) remain cloud-style so **Jeedom** and **Home Assistant** Discovery keep working.

## Home Assistant

With `integration.homeassistant.enabled: true`, local and hybrid devices use the same `generateHADiscovery` path as cloud devices. Do not change discovery topic shapes for LAN.
