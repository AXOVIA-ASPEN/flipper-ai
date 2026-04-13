# GCP Secret Manager — Flipper AI

All environment secrets for Flipper AI are stored in **Google Cloud Secret Manager** and defined in `config/secretmanager.yaml` as the single source of truth.

## Overview

- **GCP Project**: `axovia-flipper`
- **Region**: `us-central1`
- **Service Account**: `flipper-secrets@axovia-flipper.iam.gserviceaccount.com` (role: `secretmanager.secretAccessor`)
- **Config**: `config/secretmanager.yaml` — YAML definition of all secrets by environment scope
- **Module**: `scripts/secretmanager.py` — `EnvSecretManager` class + CLI
- **Naming Convention**: `{SCOPE}_{SECRET_NAME}` (e.g., `PRODUCTION_DATABASE_URL`, `STAGING_STRIPE_SECRET_KEY`)
- **Version**: Always accesses `latest` version

## How It Works

1. Cloud Run container starts and runs `start.sh`
2. `start.sh` executes `python3 scripts/secretmanager.py load --env $BUILD_ENV`
3. The module reads `config/secretmanager.yaml` to know which secrets exist
4. For each secret in the target scope, pulls from GCP Secret Manager
5. Secrets are injected as `os.environ` variables
6. `exec next start` launches the Next.js app with secrets available

## CLI Commands

```bash
# Validate all secrets for an environment exist in GCP
python scripts/secretmanager.py validate --env production

# Generate a .env file from GCP secret values
python scripts/secretmanager.py populate --env staging
python scripts/secretmanager.py populate --env production --dry-run

# Detect drift between YAML config and GCP
python scripts/secretmanager.py audit

# Load secrets into env vars (container startup)
python scripts/secretmanager.py load --env production
```

## Prerequisites

- GCP project `axovia-flipper` with Secret Manager API enabled
- `gcloud` CLI installed and authenticated (local dev / CI)
- Service account with `roles/secretmanager.secretAccessor`
- `pyyaml` and `google-cloud-secret-manager` Python packages (`pip install -r scripts/requirements.txt`)

## Adding a New Secret

1. Add it to `config/secretmanager.yaml` under the correct scope:
   ```yaml
   production:
     my-new-secret:
       name: MY_NEW_SECRET
       description: What this secret is for
   ```

2. Add it to `.env.example` with a description comment

3. Create in GCP:
   ```bash
   echo -n "your-value" | gcloud secrets create PRODUCTION_MY_NEW_SECRET \
     --project=axovia-flipper --replication-policy=automatic --data-file=-
   ```

4. Verify: `python scripts/secretmanager.py validate --env production`

5. Redeploy Cloud Run to pick up the new secret

## Programmatic Usage

```python
from scripts.secretmanager import EnvSecretManager, SecretScope

mgr = EnvSecretManager()

# Get all production secrets
prod_secrets = mgr.get_secrets_by_scope(SecretScope.PROD)

# Look up a specific secret
db_secret = mgr.get_secret("DATABASE_URL")

# Download and inject into env vars
mgr.load_into_environ(SecretScope.PROD)

# Audit for drift
drift = mgr.audit_drift()
print(drift["missing_in_cloud"])  # in YAML but not GCP
print(drift["missing_in_yaml"])   # in GCP but not YAML
```

## Environment Scopes

| Scope | Purpose | Example Secrets |
|-------|---------|-----------------|
| `all` | Shared across all environments | Firebase public config (`NEXT_PUBLIC_*`) |
| `production` | Production Cloud Run | `DATABASE_URL`, `STRIPE_SECRET_KEY`, all AI keys |
| `staging` | Staging Cloud Run | Mirrors production with test-mode values |
| `dev` | Local development overrides | `DATABASE_URL` (local PostgreSQL) |

## Secret Categories

The full inventory lives in `config/secretmanager.yaml`. Key categories:

| Category | Secrets | Required |
|----------|---------|----------|
| Database | `DATABASE_URL` | Yes |
| Auth & Encryption | `ENCRYPTION_SECRET` | Yes |
| Firebase Admin | `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Production |
| OAuth | Google, GitHub, Facebook client IDs/secrets | No |
| AI Providers | `GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | No |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs | No |
| Email | `RESEND_API_KEY` | No |
| Monitoring | `SENTRY_DSN`, `MONITORING_API_KEY` | No |
| Integrations | Google Calendar, Maps, Twilio | No |

## Google Maps API Key — Provisioning SOP (Story 12.2)

**Purpose**: Server-side Directions API calls for driving route calculation in meetup departure reminders. Never exposed to the client bundle.

**Provisioning steps**:

1. Open [GCP Console - APIs & Services - Credentials](https://console.cloud.google.com/apis/credentials) in the `axovia-flipper` project.
2. Create a new **API key** (or use an existing server-side key).
3. Under **API restrictions** - **Restrict key** - select **Directions API** only.
4. Under **Application restrictions** - **IP addresses** - add the Cloud Run egress NAT IPs for `us-central1`.
5. Store in GCP Secret Manager:
   ```bash
   echo -n "AIza..." | gcloud secrets create PRODUCTION_GOOGLE_MAPS_API_KEY \
     --project=axovia-flipper --replication-policy=automatic --data-file=-
   ```
6. For staging, repeat with `STAGING_GOOGLE_MAPS_API_KEY`.
7. Redeploy Cloud Run to pick up the new secret version.

**Key rotation**: Create new key, add as new secret version, test on staging, disable old key after 30min clean traffic, delete after 24h.

## Non-Secret Environment Variables

These are set directly in Cloud Run service config (NOT in Secret Manager):

`NODE_ENV`, `BUILD_ENV`, `LOG_LEVEL`, `APP_URL`, `EMAIL_FROM`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `FACEBOOK_REDIRECT_URI`, `ENABLE_OAUTH_*`, `APP_VERSION`

## Local Development

For local development, use `.env.local` (not Secret Manager). The `scripts/secretmanager.py` module is only invoked at container startup in Cloud Run.

To authenticate locally for testing the module:
```bash
gcloud auth application-default login
python scripts/secretmanager.py populate --env staging -o .env.staging
```

## CI/CD (GitHub Actions)

The CI pipeline runs `pytest` on `scripts/test_secretmanager.py` with mocked GCP calls. No real GCP access is needed for tests.

For deployment workflows that need real secrets, use Workload Identity Federation (preferred) or a service account key stored in GitHub Secrets as `GCP_SA_KEY`.

## References

- [Secret Manager overview](https://cloud.google.com/secret-manager/docs)
- Config: `config/secretmanager.yaml`
- Module: `scripts/secretmanager.py`
- Tests: `scripts/test_secretmanager.py`
