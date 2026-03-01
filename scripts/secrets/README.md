# Secrets scripts

- **pull-from-gcp.sh** — Fetches Flipper AI secrets from GCP Secret Manager and appends missing keys to `.env`. Requires `gcloud` and `GCP_PROJECT_ID`.

  Run via Make: `make secrets-pull GCP_PROJECT_ID=your-gcp-project`

  Secret names and usage: [docs/secrets/secretmanager.md](../../docs/secrets/secretmanager.md).
