# GCP Secret Manager — Flipper AI

All environment secrets for Flipper AI are stored in **Google Cloud Secret Manager** and loaded at container startup by the `helpers/secrets.py` module. This is the single source of truth for secret references.

## Overview

- **GCP Project**: `axovia-flipper`
- **Region**: `us-central1`
- **Service Account**: `flipper-secrets@axovia-flipper.iam.gserviceaccount.com` (role: `secretmanager.secretAccessor`)
- **Module**: `helpers/secrets.py` — Python dataclass-based loader
- **Naming Convention**: `{BUILD_ENV}_{ENV_VAR_NAME}` (e.g., `PRODUCTION_DATABASE_URL`, `STAGING_AUTH_SECRET`)
- **Version**: Always accesses `latest` version

## How It Works

1. Cloud Run container starts and runs `start.sh`
2. `start.sh` executes `python helpers/secrets.py` (requires `BUILD_ENV` env var)
3. The module pulls all secrets for the target environment from GCP Secret Manager
4. Secrets are injected as `os.environ` variables
5. `exec next start` launches the Next.js app with secrets available

## Prerequisites

- GCP project `axovia-flipper` with Secret Manager API enabled
- `gcloud` CLI installed and authenticated (local dev / CI)
- Service account with `roles/secretmanager.secretAccessor`

## Secret Name Mappings

Naming pattern: `{BUILD_ENV.upper()}_{ENV_VAR_NAME}`

Resource path: `projects/axovia-flipper/secrets/{NAME}/versions/latest`

### DatabaseSecrets (Required)

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `DATABASE_URL` | `PRODUCTION_DATABASE_URL` | `STAGING_DATABASE_URL` | **Yes** |

### AuthSecrets

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `AUTH_SECRET` | `PRODUCTION_AUTH_SECRET` | `STAGING_AUTH_SECRET` | **Yes** |
| `ENCRYPTION_SECRET` | `PRODUCTION_ENCRYPTION_SECRET` | `STAGING_ENCRYPTION_SECRET` | **Yes** |
| `GOOGLE_CLIENT_ID` | `PRODUCTION_GOOGLE_CLIENT_ID` | `STAGING_GOOGLE_CLIENT_ID` | No |
| `GOOGLE_CLIENT_SECRET` | `PRODUCTION_GOOGLE_CLIENT_SECRET` | `STAGING_GOOGLE_CLIENT_SECRET` | No |
| `GITHUB_CLIENT_ID` | `PRODUCTION_GITHUB_CLIENT_ID` | `STAGING_GITHUB_CLIENT_ID` | No |
| `GITHUB_CLIENT_SECRET` | `PRODUCTION_GITHUB_CLIENT_SECRET` | `STAGING_GITHUB_CLIENT_SECRET` | No |
| `FACEBOOK_APP_ID` | `PRODUCTION_FACEBOOK_APP_ID` | `STAGING_FACEBOOK_APP_ID` | No |
| `FACEBOOK_APP_SECRET` | `PRODUCTION_FACEBOOK_APP_SECRET` | `STAGING_FACEBOOK_APP_SECRET` | No |
| `HCAPTCHA_SECRET_KEY` | `PRODUCTION_HCAPTCHA_SECRET_KEY` | `STAGING_HCAPTCHA_SECRET_KEY` | No |

### FirebaseSecrets

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `FIREBASE_CLIENT_EMAIL` | `PRODUCTION_FIREBASE_CLIENT_EMAIL` | `STAGING_FIREBASE_CLIENT_EMAIL` | No |
| `FIREBASE_PRIVATE_KEY` | `PRODUCTION_FIREBASE_PRIVATE_KEY` | `STAGING_FIREBASE_PRIVATE_KEY` | No |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `PRODUCTION_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `STAGING_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | No |

> **Note:** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` has a `NEXT_PUBLIC_` prefix, meaning it is exposed in the client bundle. Consider setting it as a non-secret Cloud Run env var instead.

### ApiKeySecrets

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `OPENAI_API_KEY` | `PRODUCTION_OPENAI_API_KEY` | `STAGING_OPENAI_API_KEY` | No |
| `ANTHROPIC_API_KEY` | `PRODUCTION_ANTHROPIC_API_KEY` | `STAGING_ANTHROPIC_API_KEY` | No |
| `CLAUDE_API_KEY` | `PRODUCTION_CLAUDE_API_KEY` | `STAGING_CLAUDE_API_KEY` | No |
| `GOOGLE_API_KEY` | `PRODUCTION_GOOGLE_API_KEY` | `STAGING_GOOGLE_API_KEY` | No |
| `FLIPPER_API_KEYS` | `PRODUCTION_FLIPPER_API_KEYS` | `STAGING_FLIPPER_API_KEYS` | No |
| `EBAY_OAUTH_TOKEN` | `PRODUCTION_EBAY_OAUTH_TOKEN` | `STAGING_EBAY_OAUTH_TOKEN` | No |

### PaymentSecrets

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `STRIPE_SECRET_KEY` | `PRODUCTION_STRIPE_SECRET_KEY` | `STAGING_STRIPE_SECRET_KEY` | No |
| `STRIPE_WEBHOOK_SECRET` | `PRODUCTION_STRIPE_WEBHOOK_SECRET` | `STAGING_STRIPE_WEBHOOK_SECRET` | No |

### EmailSecrets

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `RESEND_API_KEY` | `PRODUCTION_RESEND_API_KEY` | `STAGING_RESEND_API_KEY` | No |

### MonitoringSecrets

| Env Var | GCP Secret (Production) | GCP Secret (Staging) | Required |
|---------|------------------------|---------------------|----------|
| `SENTRY_DSN` | `PRODUCTION_SENTRY_DSN` | `STAGING_SENTRY_DSN` | No |
| `SENTRY_AUTH_TOKEN` | `PRODUCTION_SENTRY_AUTH_TOKEN` | `STAGING_SENTRY_AUTH_TOKEN` | No |
| `METRICS_TOKEN` | `PRODUCTION_METRICS_TOKEN` | `STAGING_METRICS_TOKEN` | No |

## Non-Secret Environment Variables

These are set directly in Cloud Run service config (NOT in Secret Manager):

`NODE_ENV`, `BUILD_ENV`, `LOG_LEVEL`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `APP_URL`, `EMAIL_FROM`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `NEXTAUTH_URL`, `FACEBOOK_REDIRECT_URI`, `ENABLE_OAUTH_GOOGLE`, `ENABLE_OAUTH_GITHUB`, `ENABLE_OAUTH_FACEBOOK`, `APP_VERSION`

## Managing Secrets via gcloud CLI

```bash
# Create a new secret
echo -n "your-value" | gcloud secrets create PRODUCTION_DATABASE_URL \
  --project=axovia-flipper --replication-policy=automatic --data-file=-

# Update an existing secret (add new version)
echo -n "new-value" | gcloud secrets versions add PRODUCTION_DATABASE_URL \
  --project=axovia-flipper --data-file=-

# Read a secret value
gcloud secrets versions access latest --secret=PRODUCTION_DATABASE_URL \
  --project=axovia-flipper
```

## Local Development

For local development, use `.env.local` (not Secret Manager). The `helpers/secrets.py` module is only invoked at container startup in Cloud Run.

To authenticate locally for testing the module:
```bash
gcloud auth application-default login
BUILD_ENV=staging python helpers/secrets.py
```

## CI/CD (GitHub Actions)

The CI pipeline runs `pytest` on `helpers/test_secrets.py` with mocked GCP calls. No real GCP access is needed for tests.

For deployment workflows that need real secrets, use Workload Identity Federation (preferred) or a service account key stored in GitHub Secrets as `GCP_SA_KEY`.

## References

- [Secret Manager overview](https://cloud.google.com/secret-manager/docs)
- Module source: `helpers/secrets.py`
- Tests: `helpers/test_secrets.py`
