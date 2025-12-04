# Validation Error Messages Documentation

## 📋 Overview

This document lists all possible error messages during configuration validation at DaikinToMQTT startup. Each error is accompanied by an explanation, examples, and solutions.

## 🔍 Error Format

All validation errors follow this format:
```
Configuration validation errors:
  - <field>: <message> (value: <current_value>)
```

## 📂 Errors by Section

### 1. General Configuration

#### `config: Configuration is empty or does not exist`

**Cause**: The configuration file is empty, corrupted, or does not exist.

**Example**:
```yaml
# Empty or non-existent file
```

**Solution**:
- Verify that the `config/settings.yml` file exists
- Verify that the file is not empty
- Copy `config/settings-default.yml` to `config/settings.yml` if necessary

---

### 2. `system` Section

#### `system: The system section is required`

**Cause**: The `system` section is missing in the configuration file.

**Example**:
```yaml
# ❌ Incorrect configuration
daikin:
  clientID: "xxx"
mqtt:
  host: "127.0.0.1"
```

**Solution**:
```yaml
# ✅ Correct configuration
system:
  logLevel: 'info'
  jeedom: false
daikin:
  clientID: "xxx"
mqtt:
  host: "127.0.0.1"
```

---

#### `system.logLevel: Log level is required`

**Cause**: The `logLevel` field is missing or empty.

**Example**:
```yaml
system:
  # logLevel missing
  jeedom: false
```

**Solution**:
```yaml
system:
  logLevel: 'info'  # Add this line
  jeedom: false
```

---

#### `system.logLevel: Log level must be one of the following: error, warn, info, debug, verbose`

**Cause**: The specified log level is not valid.

**Example**:
```yaml
system:
  logLevel: 'invalid'  # ❌ Invalid value
  jeedom: false
```

**Solution**:
```yaml
system:
  logLevel: 'info'  # ✅ Valid value among: error, warn, info, debug, verbose
  jeedom: false
```

**Accepted values**:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Information, warnings and errors (recommended)
- `debug`: All logs except verbose
- `verbose`: All logs

---

### 3. `system.polling` Section

#### `system.polling.dayInterval: Daytime polling interval is required`

**Cause**: The `dayInterval` field is missing in the `polling` section.

**Example**:
```yaml
system:
  polling:
    # dayInterval missing
    nightInterval: 20
```

**Solution**:
```yaml
system:
  polling:
    dayInterval: 10  # Add this line (in minutes)
    nightInterval: 20
```

---

#### `system.polling.dayInterval: Daytime polling interval must be a positive number (in minutes)`

**Cause**: The value is not a number or is negative/zero.

**Example**:
```yaml
system:
  polling:
    dayInterval: "10"  # ❌ String
    # or
    dayInterval: -5     # ❌ Negative number
    # or
    dayInterval: 0      # ❌ Zero
```

**Solution**:
```yaml
system:
  polling:
    dayInterval: 10  # ✅ Positive number (without quotes)
```

---

#### `system.polling.dayInterval: Daytime polling interval must be between 1 and 1440 minutes (24h)`

**Cause**: The value is outside the allowed range.

**Example**:
```yaml
system:
  polling:
    dayInterval: 2000  # ❌ Too high (> 1440)
    # or
    dayInterval: 0.5   # ❌ Too low (< 1)
```

**Solution**:
```yaml
system:
  polling:
    dayInterval: 10  # ✅ Between 1 and 1440 minutes
```

**Note**: 1440 minutes = 24 hours

---

#### `system.polling.nightInterval: Nighttime polling interval is required`

**Cause**: The `nightInterval` field is missing.

**Solution**:
```yaml
system:
  polling:
    dayInterval: 10
    nightInterval: 20  # Add this line
```

---

#### `system.polling.nightInterval: Nighttime polling interval must be a positive number (in minutes)`

**Cause**: Same issue as `dayInterval` but for nighttime.

**Solution**: Use a positive number without quotes.

---

#### `system.polling.nightInterval: Nighttime polling interval must be between 1 and 1440 minutes (24h)`

**Cause**: Same issue as `dayInterval` but for nighttime.

**Solution**: Use a value between 1 and 1440.

---

#### `system.polling.nightStart: Night period start time is required`

**Cause**: The `nightStart` field is missing.

**Solution**:
```yaml
system:
  polling:
    dayInterval: 10
    nightInterval: 20
    nightStart: 22  # Add this line (0-23)
    nightEnd: 7
```

---

#### `system.polling.nightStart: Night period start time must be an integer`

**Cause**: The value is not an integer.

**Example**:
```yaml
system:
  polling:
    nightStart: 22.5  # ❌ Decimal number
```

**Solution**:
```yaml
system:
  polling:
    nightStart: 22  # ✅ Integer
```

---

#### `system.polling.nightStart: Night period start time must be between 0 and 23`

**Cause**: The value is outside the 0-23 range.

**Example**:
```yaml
system:
  polling:
    nightStart: 24  # ❌ Too high
    # or
    nightStart: -1  # ❌ Negative
```

**Solution**:
```yaml
system:
  polling:
    nightStart: 22  # ✅ Between 0 and 23
```

---

#### `system.polling.nightEnd: Night period end time is required`

**Cause**: The `nightEnd` field is missing.

**Solution**:
```yaml
system:
  polling:
    nightEnd: 7  # Add this line (0-23)
```

---

#### `system.polling.nightEnd: Night period end time must be an integer`

**Cause**: Same issue as `nightStart`.

**Solution**: Use an integer between 0 and 23.

---

#### `system.polling.nightEnd: Night period end time must be between 0 and 23`

**Cause**: Same issue as `nightStart`.

**Solution**: Use a value between 0 and 23.

---

### 4. `daikin` Section

#### `daikin: The daikin section is required`

**Cause**: The `daikin` section is missing.

**Solution**:
```yaml
daikin:
  clientID: "your_client_id"
  clientSecret: "your_client_secret"
  clientURL: "https://your-url"
  clientPort: 8765
```

---

#### `daikin.clientID: Daikin clientID is required and cannot be empty`

**Cause**: The `clientID` is missing, empty, or contains only spaces.

**Example**:
```yaml
daikin:
  clientID: null      # ❌ null
  # or
  clientID: ""       # ❌ Empty string
  # or
  clientID: "   "    # ❌ Only spaces
```

**Solution**:
```yaml
daikin:
  clientID: "G7H1LeflCDyx1OnOWjKHMD1O"  # ✅ Your Daikin client ID
```

**Where to get the clientID**:
- Daikin developer portal: https://developer.cloud.daikineurope.com/
- Create an application and retrieve the Client ID

---

#### `daikin.clientSecret: Daikin clientSecret is required and cannot be empty`

**Cause**: The `clientSecret` is missing or empty.

**Example**:
```yaml
daikin:
  clientSecret: null  # ❌ null
```

**Solution**:
```yaml
daikin:
  clientSecret: "your_client_secret"  # ✅ Your Daikin client secret
```

**Note**: For security reasons, the actual value is not displayed in logs (replaced by `***`).

---

#### `daikin.clientURL: Client URL is required and cannot be empty`

**Cause**: The `clientURL` is missing or empty.

**Solution**:
```yaml
daikin:
  clientURL: "https://172.16.1.21"  # ✅ Complete URL with protocol
```

---

#### `daikin.clientURL: URL must use http or https protocol`

**Cause**: The URL uses an unsupported protocol.

**Example**:
```yaml
daikin:
  clientURL: "ftp://example.com"  # ❌ Unsupported protocol
```

**Solution**:
```yaml
daikin:
  clientURL: "https://172.16.1.21"  # ✅ http:// or https://
```

---

#### `daikin.clientURL: URL is not valid`

**Cause**: The URL format is invalid.

**Example**:
```yaml
daikin:
  clientURL: "not a url"  # ❌ Invalid format
```

**Solution**:
```yaml
daikin:
  clientURL: "https://172.16.1.21"  # ✅ Valid URL
```

---

#### `daikin.clientPort: Client port is required`

**Cause**: The `clientPort` is missing.

**Solution**:
```yaml
daikin:
  clientPort: 8765  # Add this line
```

---

#### `daikin.clientPort: Client port must be an integer`

**Cause**: The value is not an integer.

**Example**:
```yaml
daikin:
  clientPort: 8765.5  # ❌ Decimal number
```

**Solution**:
```yaml
daikin:
  clientPort: 8765  # ✅ Integer
```

---

#### `daikin.clientPort: Client port must be between 1 and 65535`

**Cause**: The value is outside the valid port range.

**Example**:
```yaml
daikin:
  clientPort: 0      # ❌ Too low
  # or
  clientPort: 70000  # ❌ Too high
```

**Solution**:
```yaml
daikin:
  clientPort: 8765  # ✅ Between 1 and 65535
```

---

### 5. `mqtt` Section

#### `mqtt: The mqtt section is required`

**Cause**: The `mqtt` section is missing.

**Solution**:
```yaml
mqtt:
  host: "127.0.0.1"
  port: 1883
  auth: false
  connectTimeout: 4000
  reconnectPeriod: 1000
  topic: "Daikin"
```

---

#### `mqtt.host: MQTT broker IP address or hostname is required`

**Cause**: The `host` is missing or empty.

**Solution**:
```yaml
mqtt:
  host: "127.0.0.1"  # ✅ IP address or hostname
```

---

#### `mqtt.host: IP address or hostname format is not valid`

**Cause**: The format is not valid.

**Example**:
```yaml
mqtt:
  host: "256.256.256.256"  # ❌ Invalid IP
```

**Solution**:
```yaml
mqtt:
  host: "127.0.0.1"        # ✅ IPv4
  # or
  host: "mqtt.example.com" # ✅ Hostname
  # or
  host: "localhost"        # ✅ localhost
  # or
  host: "[2001:0db8::1]"   # ✅ IPv6
```

---

#### `mqtt.port: MQTT broker port is required`

**Cause**: The `port` is missing.

**Solution**:
```yaml
mqtt:
  port: 1883  # Add this line
```

---

#### `mqtt.port: MQTT broker port must be an integer`

**Cause**: The value is not an integer.

**Solution**: Use an integer.

---

#### `mqtt.port: MQTT broker port must be between 1 and 65535`

**Cause**: The value is outside the valid range.

**Solution**:
```yaml
mqtt:
  port: 1883  # ✅ Standard MQTT port, or 8883 for MQTT over TLS
```

---

#### `mqtt.auth: The auth value must be a boolean (true/false)`

**Cause**: The value is not a boolean.

**Example**:
```yaml
mqtt:
  auth: "true"  # ❌ String
```

**Solution**:
```yaml
mqtt:
  auth: true  # ✅ Boolean
```

---

#### `mqtt.username: MQTT username is required when auth is enabled`

**Cause**: `auth` is `true` but `username` is missing or empty.

**Example**:
```yaml
mqtt:
  auth: true
  username: null  # ❌ Required if auth = true
```

**Solution**:
```yaml
mqtt:
  auth: true
  username: "my_user"  # ✅ Valid username
  password: "my_password"
```

---

#### `mqtt.password: MQTT password is required when auth is enabled`

**Cause**: `auth` is `true` but `password` is missing or empty.

**Solution**:
```yaml
mqtt:
  auth: true
  username: "my_user"
  password: "my_password"  # ✅ Valid password
```

**Note**: For security reasons, the actual value is not displayed in logs (replaced by `***`).

---

#### `mqtt.connectTimeout: Connection timeout is required`

**Cause**: The `connectTimeout` is missing.

**Solution**:
```yaml
mqtt:
  connectTimeout: 4000  # Add this line (in milliseconds)
```

---

#### `mqtt.connectTimeout: Connection timeout must be a positive number (in milliseconds)`

**Cause**: The value is not a positive number.

**Solution**:
```yaml
mqtt:
  connectTimeout: 4000  # ✅ Positive number in milliseconds
```

---

#### `mqtt.connectTimeout: Connection timeout must be between 1000 and 60000 milliseconds`

**Cause**: The value is outside the recommended range.

**Example**:
```yaml
mqtt:
  connectTimeout: 500    # ❌ Too low (< 1000ms)
  # or
  connectTimeout: 120000 # ❌ Too high (> 60000ms)
```

**Solution**:
```yaml
mqtt:
  connectTimeout: 4000  # ✅ Between 1000 and 60000 ms (1s to 60s)
```

**Recommendation**: 4000ms (4 seconds) is a reasonable value.

---

#### `mqtt.reconnectPeriod: Reconnection period is required`

**Cause**: The `reconnectPeriod` is missing.

**Solution**:
```yaml
mqtt:
  reconnectPeriod: 1000  # Add this line (in milliseconds)
```

---

#### `mqtt.reconnectPeriod: Reconnection period must be a positive number or zero (in milliseconds)`

**Cause**: The value is negative.

**Example**:
```yaml
mqtt:
  reconnectPeriod: -1000  # ❌ Negative
```

**Solution**:
```yaml
mqtt:
  reconnectPeriod: 1000  # ✅ Positive or 0
```

---

#### `mqtt.reconnectPeriod: Reconnection period should not exceed 300000 milliseconds (5 minutes)`

**Cause**: The value is too high.

**Example**:
```yaml
mqtt:
  reconnectPeriod: 600000  # ❌ Too high (> 5 minutes)
```

**Solution**:
```yaml
mqtt:
  reconnectPeriod: 1000  # ✅ Between 0 and 300000 ms (0 to 5 minutes)
```

**Recommendation**: 1000ms (1 second) is a reasonable value.

---

#### `mqtt.topic: Base MQTT topic is required and cannot be empty`

**Cause**: The `topic` is missing or empty.

**Solution**:
```yaml
mqtt:
  topic: "Daikin"  # ✅ Base topic
```

---

#### `mqtt.topic: MQTT topic cannot contain the characters #, + or $`

**Cause**: The topic contains forbidden MQTT wildcard characters.

**Example**:
```yaml
mqtt:
  topic: "Daikin/#"     # ❌ Contains #
  # or
  topic: "Daikin/+/set" # ❌ Contains +
  # or
  topic: "Daikin$"      # ❌ Contains $
```

**Solution**:
```yaml
mqtt:
  topic: "Daikin"           # ✅ No wildcards
  # or
  topic: "daikin/devices"   # ✅ Alphanumeric characters and /
```

**Note**: The wildcards `#` and `+` are reserved for MQTT subscriptions, not for base topics.

---

### 6. `integration` Section (optional)

#### `integration.jeedom: The value must be a boolean (true/false)`

**Cause**: The value is not a boolean.

**Example**:
```yaml
integration:
  jeedom: "true"  # ❌ String instead of boolean
```

**Solution**:
```yaml
integration:
  jeedom: true  # ✅ Boolean (without quotes)
```

---

#### `integration.homeassistant.enabled: The enabled value must be a boolean (true/false)`

**Cause**: The value is not a boolean.

**Solution**:
```yaml
integration:
  homeassistant:
    enabled: true  # ✅ Boolean
```

---

#### `integration.homeassistant.discoveryPrefix: Discovery prefix must be a non-empty string`

**Cause**: The `discoveryPrefix` is empty or contains only spaces.

**Example**:
```yaml
integration:
  homeassistant:
    discoveryPrefix: ""  # ❌ Empty
```

**Solution**:
```yaml
integration:
  homeassistant:
    discoveryPrefix: "homeassistant"  # ✅ Non-empty string
```

---

#### `integration.homeassistant.discoveryPrefix: Discovery prefix can only contain letters, numbers, dashes and underscores`

**Cause**: The prefix contains forbidden characters.

**Example**:
```yaml
integration:
  homeassistant:
    discoveryPrefix: "home-assistant!"  # ❌ Contains !
```

**Solution**:
```yaml
integration:
  homeassistant:
    discoveryPrefix: "homeassistant"   # ✅ Only letters, numbers, - and _
    # or
    discoveryPrefix: "home_assistant"  # ✅ With underscore
```

---

## 🔧 Quick Error Resolution

### Verification Checklist

1. ✅ All required sections are present (`system`, `daikin`, `mqtt`)
2. ✅ All mandatory fields are filled
3. ✅ Data types are correct (booleans without quotes, numbers without quotes)
4. ✅ Values are within allowed ranges
5. ✅ Formats are valid (URL, IP, MQTT topic, etc.)

### Complete Valid Configuration Example

```yaml
system:
  logLevel: 'info'
  polling:
    dayInterval: 10
    nightInterval: 20
    nightStart: 22
    nightEnd: 7

integration:
  jeedom: false
  homeassistant:
    enabled: false
    discoveryPrefix: "homeassistant"

daikin:
  clientID: "your_client_id"
  clientSecret: "your_client_secret"
  clientURL: "https://172.16.1.21"
  clientPort: 8765

mqtt:
  host: "127.0.0.1"
  port: 1883
  auth: false
  username: null
  password: null
  connectTimeout: 4000
  reconnectPeriod: 1000
  topic: "Daikin"
```

## 📝 Important Notes

1. **Security**: Sensitive values (`clientSecret`, `password`) are never displayed in logs (replaced by `***`)

2. **Data types**:
   - Booleans: `true` or `false` (without quotes)
   - Numbers: `123` (without quotes)
   - Strings: `"text"` (with quotes)

3. **Null values**: Use `null` (without quotes) for optional undefined values

4. **Startup validation**: All errors are detected and displayed together at startup

## 🆘 Getting Help

If you encounter errors not documented here:
1. Check the complete logs at startup
2. Verify that you are using the latest version
3. Compare with `config/settings-default.yml`
4. Open an issue on GitHub with complete error logs