# Design: Versioning & Release Pipeline

**Date:** 2026-04-11  
**Project:** Flipper.ai  
**Status:** Approved

---

## Overview

Establishes a lightweight, consistent versioning and release pipeline for Flipper.ai using:
- **Semantic Versioning (semver)** — `MAJOR.MINOR.PATCH`
- **Keep a Changelog** — human-curated `CHANGELOG.md`
- **Trunk-based releases** — tag `main` to cut a release
- **Tag-triggered GitHub Actions** — automation handles GitHub Release creation

---

## Files

### `VERSION.md`

Single line — the current released version number. Updated manually as part of the release commit.

```
1.0.0
```

### `CHANGELOG.md`

Follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format. `[Unreleased]` is always at the top; developers add entries there as they work. At release time the `[Unreleased]` block is promoted to a versioned heading.

```markdown
# Changelog

All notable changes to Flipper.ai are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Added

### Changed

### Fixed

## [1.0.0] - 2026-04-11

### Added
- Initial release
```

**Changelog categories** (use only what applies):
- `Added` — new features
- `Changed` — changes to existing functionality
- `Deprecated` — soon-to-be removed features
- `Removed` — removed features
- `Fixed` — bug fixes
- `Security` — vulnerability fixes

---

## Semver Bump Rules

| Change type | Bump | Example trigger |
|-------------|------|-----------------|
| Bug fixes, dependency updates, minor tweaks | `PATCH` | Fix craigslist scraper timeout |
| New features, non-breaking additions | `MINOR` | Add OfferUp scraper, new dashboard page |
| Breaking changes, major architecture shifts | `MAJOR` | Auth system rewrite, API incompatibility |

---

## Release Process (Step-by-Step)

All releases follow these steps in order. No exceptions.

```
1. Update CHANGELOG.md
   - Move all items from [Unreleased] under a new heading:
     ## [X.Y.Z] - YYYY-MM-DD
   - Leave a fresh empty [Unreleased] section at the top

2. Update VERSION.md
   - Set to the new version number (e.g., 1.4.2)

3. Commit the release prep
   git add CHANGELOG.md VERSION.md
   git commit -m "chore: release vX.Y.Z"
   git push origin main

4. Tag the release
   git tag vX.Y.Z
   git push origin vX.Y.Z

5. GitHub Actions creates the GitHub Release automatically
   - Release name: "Flipper.ai vX.Y.Z"
   - Release body: the CHANGELOG.md section for this version
```

---

## GitHub Actions Workflow

**File:** `.github/workflows/release.yml`

Triggers on any tag matching `v*.*.*`. Parses `CHANGELOG.md` to extract the release notes for the tagged version, then creates a GitHub Release.

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write

jobs:
  release:
    name: Create GitHub Release
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Extract changelog section
        id: changelog
        shell: bash
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          # Extract the block between ## [VERSION] and the next ## heading
          NOTES=$(awk "/^## \[$VERSION\]/{found=1; next} found && /^## \[/{exit} found{print}" CHANGELOG.md)
          # Write to a temp file to handle multiline safely
          echo "$NOTES" > /tmp/release_notes.md
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: "Flipper.ai v${{ steps.changelog.outputs.version }}"
          body_path: /tmp/release_notes.md
          draft: false
          prerelease: false
```

---

## What Gets Updated in Config Files

### `_bmad-output/project-context.md`
Adds a new **Versioning & Release Pipeline** section with:
- VERSION.md format
- CHANGELOG.md format and categories
- Semver bump rules table
- Full release checklist (the 5 steps above)
- GitHub Actions workflow description

### `CLAUDE.md`
Adds a concise **Versioning & Releases** reference section with:
- Pointer to project-context.md for the full spec
- The 5-step release command sequence inline for quick lookup
- Semver bump rules summary

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `VERSION.md` | Create — initial value `1.0.0` |
| `CHANGELOG.md` | Create — with `[Unreleased]` + `[1.0.0]` initial entry |
| `.github/workflows/release.yml` | Create — tag-triggered release workflow |
| `_bmad-output/project-context.md` | Modify — add Versioning & Release Pipeline section |
| `CLAUDE.md` | Modify — add concise Versioning & Releases section |
