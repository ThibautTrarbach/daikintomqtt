<div align="center">
    <br>
    <br>
    <h1>Daikin2MQTT  🌉</h1>
    <p>
        Allows you to use your Daikin devices <b>with</b> Cloud Onecta.
    </p>
    <p>
        It bridges events and allows you to control your Daikin devices via MQTT. In this way you can integrate your Daikin devices with whatever smart home infrastructure you are using.
    </p>
</div>

## Integrations
Daikin2MQTT integrates well with (almost) every home automation solution because it uses MQTT. However the following integrations are worth mentioning:

## Getting started

### Requirements

- Node.js **20 or newer** (see the `engines` field in `package.json`)
- An MQTT broker reachable from the machine running Daikin2MQTT
- A Daikin Developer Portal application with a **Client ID**, **Client Secret** and a **Redirect URL**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ThibautTrarbach/daikintomqtt.git
   cd daikintomqtt
   ```
2. Install dependencies (Yarn or npm):
   ```bash
   yarn install
   # or
   npm install
   ```

### Configuration

By default Daikin2MQTT expects its configuration in the `config` directory located in the working directory (or in the directory pointed to by the `STORE_DIR` environment variable).

1. Create your configuration file from the default template:
   ```bash
   cp config/settings-default.yml config/settings.yml
   ```
2. Edit `config/settings.yml` and adjust at least the following sections:

- `system`
  - `logLevel`: log level (`error`, `warn`, `info`, `debug`, ...)
  - `actionRefreshMode`: post-action refresh mode (`1` deferred cloud, `2` optimistic only, `3` hybrid recommended)
  - `actionRefreshDelaySeconds`: delay before cloud confirmation GET (modes 1 and 3, default `60`)
  - `actionRefreshStrategy`: `merge_with_poll` (default), `timer`, or `disabled`
  - `mergeWithPollWindowMinutes`: window to merge post-action refresh with polling (default `5`)
  - `commandCoalesceMs`: merge rapid MQTT commands per device (default `400`)
  - `energyStatsRefreshTime`: daily energy stats refresh time (`HH:MM`, default `23:58`)
  - `polling.*`: day/night intervals (default `15` / `30` minutes)
- `integration`
  - `jeedom`: enable/disable Jeedom integration
  - `homeassistant`
    - `enabled`: if `true`, Home Assistant MQTT discovery will be used
    - `discoveryPrefix`: MQTT discovery prefix (default `homeassistant`)
- `daikin`
  - `authMode`: `developer_portal` (default, 200 req/day) or `mobile_app` (recommended, 3000 req/day + WebSocket)
  - **Developer Portal**: `clientID`, `clientSecret`, `clientURL`, `clientPort`
  - **Mobile App**: `email`, `password` (Onecta account), `enableWebSocket` (default `true`)
  - `httpTransport`: `node` (default) or `curl` (WAF workaround)
- `mqtt`
  - `host` and `port`: address of your MQTT broker
  - `auth`, `username`, `password`: MQTT authentication if required
  - `topic`: base topic under which Daikin2MQTT publishes and listens (default `daikinToMQTT`)

If the configuration file is invalid at startup, Daikin2MQTT will stop and print validation errors in the logs. A detailed explanation of all validation errors is available in `VALIDATION_ERRORS_DOCUMENTATION.md`.

### Authorization flow with Daikin Cloud

On first start, if no token is stored yet, Daikin2MQTT will:

1. Start the local OIDC callback server using `daikin.clientURL` / `daikin.clientPort`
2. Trigger an `authorization_request` event and log an URL in the logs
3. You must open this URL in your browser, accept the certificate warning (if any), then authenticate with your Daikin account and approve access
4. The OIDC tokens will be stored in `config/daikin-controller-cloud-tokenset` (or in the directory defined by `STORE_DIR`)

Next starts will reuse this token. If the token becomes invalid, Daikin2MQTT will delete it and ask again for authorization on the next run.

### Running

#### Development mode (TypeScript)

Daikin2MQTT uses TypeScript. During development you can run it directly from sources:

```bash
yarn run run
# or
npx ts-node ./src/main.ts
```

#### Production mode

1. Build the project:
   ```bash
   yarn build
   # or
   npm run build
   ```
2. Start Daikin2MQTT from the compiled JavaScript:
   ```bash
   yarn start
   # or
   node --preserve-symlinks dist/main.js
   ```

You can change the data directory (configuration, tokens, generated files) by setting the `STORE_DIR` environment variable before starting the process.

### MQTT & Integrations

- MQTT: Daikin2MQTT publishes the state of your Daikin devices and subscribes to topics for commands under the base topic defined in `mqtt.topic` (default `daikinToMQTT`).
- Home Assistant: when `integration.homeassistant.enabled` is `true`, MQTT Discovery configuration is generated automatically and published on startup.
- Jeedom: when `integration.jeedom` is `true`, the payload format is adapted for the Jeedom integration.

## Daikin API quota

| Mode | Daily limit | WebSocket |
|------|-------------|-----------|
| Developer Portal | 200 req/day | No |
| Mobile App | 3000 req/day | Yes |

Built-in optimizations (inspired by [mp-consulting/homebridge-daikin-cloud](https://github.com/mp-consulting/homebridge-daikin-cloud)): Mobile App auth, WebSocket push, polling pause during post-action debounce, sequential PATCH queue, 502/503/504 retries, optimistic MQTT publish, `merge_with_poll`, WS-confirmed skip of post-action GET, adaptive polling.

## Supported devices

- BRP069A4x
- BRP069A61
- BRP069A62
- BRP069A78
- BRP069B4x
- BRP069C4x
- BRP069C41
- BRP069C8x

Unknown models are supported automatically via **DynamicGateway** when `system.dynamicFallback` is `true` (default).

## DynamicGateway

- `system.dynamicFallback`: auto-map API characteristics for unknown models (default `true`)
- `system.exposeReadOnly`: publish read-only sensors in dynamic mode (default `true`)
- MQTT keys: `_{embeddedId}_{dataPoint}_{path}` (e.g. `_climateControlMainZone_onOffMode`)
- Special commands: `_triggerFirmwareUpdate`, `_setPresetAway`, `_{zone}_scheduleEnabled`

If your model is not listed and `dynamicFallback` is `false`, an anonymized dump is saved under `config/newConfig/` to help add static support.

## Logs & troubleshooting

- Logs are stored in the `log` directory (`combined.log`, `error.log`, `debug.log`, ...).
- If startup fails with configuration validation errors, refer to `VALIDATION_ERRORS_DOCUMENTATION.md` for detailed explanations and examples.
- For token or authorization related issues, check the messages in the logs; Daikin2MQTT will guide you to delete invalid tokens and restart the authorization flow if needed.

## Developing

When you modify files in the `src/` directory you need to recompile Daikin2MQTT for production use:

```bash
yarn build
# or
npm run build
```

## Support & help
If you need assistance you can check [opened issues](https://github.com/ThibautTrarbach/daikintomqtt/issues). Feel free to help with Pull Requests when you were able to fix things or add new devices or just share the love on social media.
