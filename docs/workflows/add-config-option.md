# Workflow: add a config option

When adding a new key to `settings.yml`, update **all six locations** in the same PR.

## Checklist

| # | File | Action |
|---|------|--------|
| 1 | `config/settings-default.yml` | Add key with comment and sensible default |
| 2 | `src/types/Daikin2MQTT.d.ts` | Add TypeScript type to the relevant interface |
| 3 | `src/modules/configValidator.ts` | Add validation in the appropriate `validate*Config()` function |
| 4 | `VALIDATION_ERRORS_DOCUMENTATION_EN.md` | Document error message, cause, fix example |
| 5 | `VALIDATION_ERRORS_DOCUMENTATION_FR.md` | French translation of the same entry |
| 6 | `README.md` | Document the option in the Configuration section |

Plus: read the value where it is consumed (set a runtime default if the key is optional).

## Step-by-step

### 1. Default template

Add to `config/settings-default.yml` under the correct section (`system`, `daikin`, `mqtt`, `integration`):

```yaml
system:
  myNewOption: true  # Description of what this option does
```

### 2. TypeScript interface

In `src/types/Daikin2MQTT.d.ts`, extend the matching interface:

```typescript
interface ConfigSystem {
  // ...existing fields
  myNewOption?: boolean;
}
```

Use `?` for optional keys, required fields without `?`.

### 3. Validation

In `src/modules/configValidator.ts`, add checks to `validateSystemConfig()` (or the relevant validator):

```typescript
if (system.myNewOption !== undefined && typeof system.myNewOption !== 'boolean') {
  errors.push({
    field: 'system.myNewOption',
    message: 'Must be a boolean',
    value: system.myNewOption,
  });
}
```

Error format is standardized by `ConfigValidationError`:

```
Configuration validation errors:
  - system.myNewOption: Must be a boolean (value: "yes")
```

### 4. Validation error docs

Add a section in both:
- `VALIDATION_ERRORS_DOCUMENTATION_EN.md`
- `VALIDATION_ERRORS_DOCUMENTATION_FR.md`

Include: error text, cause, incorrect YAML example, corrected YAML example.

### 5. README

Add the option to the Configuration section bullet list in `README.md` with type, default, and behavior.

### 6. Consumer default

Where the option is read, provide a fallback:

```typescript
const myOption = config.system?.myNewOption ?? true;
```

Match the default in `settings-default.yml`.

## Optional vs required

| Case | Validator | TypeScript |
|------|-----------|------------|
| Required | Push error if missing | Required field (no `?`) |
| Optional with default | Validate type only if present | Optional (`?`) |
| Deprecated | Warn in logs, keep validation | Optional, document deprecation |

## Don'ts

- Do not add validation only in the consumer — startup must fail fast with a clear message
- Do not add EN-only validation docs — always update FR too
- Do not change existing defaults without a CHANGELOG entry and version bump consideration

## Verification

```bash
npm run build
# Start with invalid config to verify error message:
# Edit config/settings.yml with bad value, run npm run run, check log output
```
