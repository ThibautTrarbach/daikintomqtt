# Workflow: release

Manual release process. There is **no release script** — follow these steps in order.

## Version sources

| File | Role |
|------|------|
| `package.json` → `version` | **Source of truth** for semver |
| `src/modules/constants.ts` | `APP_VERSION` read from `package.json` at runtime |
| `SystemBridge.firmwareVersion` | Exposes `APP_VERSION` over MQTT |
| `CHANGELOG.md` / `CHANGELOG_FR.md` | Human-readable release notes |
| daikinRCCloud | Reads bundled `package.json` via `getDeamonVersion()` |

**All must stay in sync.** If CHANGELOG documents `[2.1.6]` but `package.json` says `2.1.5`, bump `package.json` before release.

## Release checklist

### 1. Bump version

Update `version` in `package.json` (semver: `MAJOR.MINOR.PATCH`).

### 2. Changelog entries

Add a new section at the top of **both** files:

**`CHANGELOG.md`** (English):

```markdown
## [2.1.7] - 2026-09-02

### Added
- Description of new feature

### Fixed
- Description of bug fix

---
```

**`CHANGELOG_FR.md`** (French):

```markdown
## [2.1.7] - 2026-09-02

### Ajouté
- Description

### Corrigé
- Description

---
```

Sections: `Added`/`Ajouté`, `Fixed`/`Corrigé`, `Changed`/`Modifié`.

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/).

### 3. Verify build and tests

```bash
npm run build
node test/unit/apiCoverageAudit.test.js   # if gateway changes
npm run schema:check
```

### 4. Commit

Use Conventional Commits:

```
feat: release version 2.1.7 with ...
```

or

```
chore: release version 2.1.7
```

### 5. Push to distribution branch

| Source branch | CI publishes to | Use case |
|---------------|-------------------|----------|
| `dev` | `release-dev` | Development |
| `alpha` | `release-alpha` | Early testing |
| `beta` | `release-beta` | **Default for daikinRCCloud** |
| `stable` | `release-stable` | Production |

CI workflow (`.github/workflows/build-{channel}.yml`):
1. Checkout source branch
2. `yarn install` + `yarn build`
3. Copy `package.json` + `yarn.lock` into `dist/`
4. Push `dist/` contents to `release-*` branch via `s0/git-publish-subdir-action`

Users and daikinRCCloud install from the **`release-*`** branch, not source branches.

## daikinRCCloud compatibility

- Plugin requires daemon **>= 2.0.0**
- Default dependency ref: `release-beta`
- Branches V1 (`release-stable` old format, `dev` as dependency) are **not supported**
- New datapoint mappings do **not** require a plugin release — MQTT auto-discovery handles it
- Breaking MQTT contract changes require coordinated plugin update (see [mqtt-contract.md](mqtt-contract.md))

## Commit message conventions

Observed patterns in git history:

| Prefix | Usage |
|--------|-------|
| `feat:` | New features, significant releases |
| `fix:` | Bug fixes |
| `chore:` | Version bumps, package renames, changelog-only |
| `refactor:` | Code restructuring without behavior change |

## What NOT to include in release commits

- `config/settings.yml` (user config)
- Token files
- `node_modules/`, `dist/` (dist is CI-published separately)

## Post-release

- Verify `release-*` branch contains updated `package.json` version
- daikinRCCloud users update via plugin dependency refresh or manual daemon reinstall
