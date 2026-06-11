# `.secrets/` — Local Secret Material (never committed)

This directory is the **single local home** for raw credential files that are
pasted/downloaded during setup and then loaded into GCP Secret Manager — e.g.
Firebase service-account JSONs, downloaded API-key files, OAuth client secrets.

## Rules

- **The entire directory is gitignored.** Only this `README.md` is tracked
  (see the `.secrets/*` + `!.secrets/README.md` rules in the root `.gitignore`).
- **Nothing here is the source of truth.** The canonical store is **GCP Secret
  Manager** (`config/secretmanager.yaml` declares the schema). Files here are
  transient — used to wire a secret in, then ideally deleted.
- **`.env` stays at the repo root** (Next.js / tooling read it there) and is
  separately gitignored. This directory does not replace `.env`; it centralizes
  the loose credential *files* that would otherwise litter the project root.

## Files in this directory

- **`production-secrets.env`** — local ledger of production secrets captured by
  paste/download, mirroring GCP Secret Manager. Each line is
  `PRODUCTION_<NAME>=<value>`. This is a backup/audit record, **not** the source
  of truth. Gitignored.
- **`*.json`** (e.g. `firebase-admin-prod.json`) — downloaded service-account /
  credential files, kept for reference until verified in the cloud. Gitignored.

## Typical flow

1. Download/export a credential (e.g. Firebase → Service Accounts → Generate key).
2. Drop the file in `.secrets/`.
3. Load its value into Secret Manager with the `PRODUCTION_<NAME>` convention
   (`gcloud secrets versions add ...` or `scripts/secretmanager.py`).
4. Delete the local file once verified in the cloud.

## Verify nothing leaked

```bash
git status --porcelain .secrets/        # should show nothing but README.md (if changed)
git check-ignore .secrets/whatever.json # should echo the path (= ignored)
```
