# GCP Secret Manager — Pre-Launch Required-Secrets Checklist

**Purpose:** Before the first production Cloud Run deploy, every required secret must exist in GCP Secret Manager and be readable by the Cloud Run service account.

**Project:** `axovia-flipper`
**Console:** https://console.cloud.google.com/security/secret-manager?project=axovia-flipper
**Naming convention:** `{ENV}_{CATEGORY}_{KEY}` (e.g., `PROD_DB_URL`, `STAGING_STRIPE_SECRET_KEY`)

> The `helpers/secrets.py` module (or `EnvSecretManager` class — branch-dependent) loads these at container startup based on `BUILD_ENV`. Any missing required secret should *fail closed* — i.e., the container refuses to start, not silently runs without the dependency. Verify this is the case before deploying.

---

## How to use this checklist

For each row:

1. **Confirm the secret exists** in Secret Manager (link in the row).
2. **Verify the value is correct** (e.g., live Stripe key, not test).
3. **Confirm Cloud Run service account has `secretmanager.secretAccessor`** on each one.
4. **Tick the "Verified" box.**

When every required row is ticked, you're ready to deploy.

---

## §1 — Database (REQUIRED)

| Secret name              | Purpose                                                           | Where to get it                                                                                              | Verified |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| `PROD_DB_URL`            | Postgres connection string (Cloud SQL via Unix socket or proxy)   | Cloud SQL console: https://console.cloud.google.com/sql/instances?project=axovia-flipper                     | [ ]      |
| `PROD_DB_DIRECT_URL`     | Direct connection (for Prisma migrations, bypasses connection pooler) | Same Cloud SQL instance                                                                                  | [ ]      |
| `PROD_DB_POOL_SIZE`      | Connection pool max (recommend `2` per Cloud Run instance)        | Set explicitly in Secret Manager (default 5 is too high for serverless)                                      | [ ]      |

**Verification command:**
```bash
gcloud secrets versions access latest --secret=PROD_DB_URL --project=axovia-flipper | head -c 30
# Expected: starts with "postgresql://" — never log the rest
```

---

## §2 — Auth & Sessions (REQUIRED)

| Secret name                         | Purpose                                                     | Where to get it                                                                                | Verified |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| `PROD_ENCRYPTION_SECRET`            | At-rest encryption key for user-supplied API keys           | `openssl rand -base64 32`                                                                       | [ ]      |
| `PROD_FIREBASE_CLIENT_EMAIL`        | Firebase Admin SDK service account email                    | Firebase console → Project settings → Service accounts → Generate new private key              | [ ]      |
| `PROD_FIREBASE_PRIVATE_KEY`         | Firebase Admin SDK private key                              | Same JSON download — copy the `private_key` field, including `\n` line breaks                  | [ ]      |
| `PROD_HCAPTCHA_SECRET`              | hCaptcha server-side secret (login + register protection)   | https://dashboard.hcaptcha.com/ → Site → Secret key                                             | [ ]      |
| `PROD_HCAPTCHA_SITE_KEY`            | hCaptcha public site key (used client-side; can be public)  | Same hCaptcha dashboard                                                                         | [ ]      |

**Sanity check:**
```bash
# Test that Firebase Admin SDK can mint a custom token
gcloud secrets versions access latest --secret=PROD_FIREBASE_PRIVATE_KEY --project=axovia-flipper > /tmp/firebase-key.txt
# Then in a quick node REPL with firebase-admin: admin.auth().createCustomToken('test-uid')
# Should not throw.
```

---

## §3 — OAuth Providers (REQUIRED if you advertise the provider)

| Secret name                          | Purpose                                  | Where to get it                                                                              | Verified |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `PROD_GOOGLE_CLIENT_ID`              | Google OAuth client ID                   | https://console.cloud.google.com/apis/credentials?project=axovia-flipper                     | [ ]      |
| `PROD_GOOGLE_CLIENT_SECRET`          | Google OAuth client secret               | Same Cloud Console credentials page                                                           | [ ]      |
| `PROD_GITHUB_CLIENT_ID`              | GitHub OAuth app client ID               | https://github.com/settings/developers → your OAuth App                                       | [ ]      |
| `PROD_GITHUB_CLIENT_SECRET`          | GitHub OAuth app secret                  | Same GitHub OAuth Apps page                                                                  | [ ]      |
| `PROD_FACEBOOK_APP_ID`               | Facebook app ID (for marketplace token + login) | https://developers.facebook.com/apps/                                                  | [ ]      |
| `PROD_FACEBOOK_APP_SECRET`           | Facebook app secret                      | Same Facebook developers app dashboard                                                       | [ ]      |
| `PROD_FACEBOOK_REDIRECT_URI`         | OAuth callback URI                       | Set to `https://<your-domain>/api/auth/facebook/callback`                                    | [ ]      |

> Before launch, confirm the redirect URIs registered with each provider include your production domain — not just localhost. **This is the #1 cause of "OAuth works in dev, breaks in prod" bugs.**

---

## §4 — AI Providers (REQUIRED — at least one; recommended: all)

The multi-provider abstraction (`src/lib/ai/providers/`) routes to the first available. Missing one is fine; missing *all* of them breaks the AI pipeline.

| Secret name                  | Purpose                                                      | Where to get it                                                                              | Verified |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------- |
| `PROD_GOOGLE_API_KEY`        | Gemini API key (primary provider — free tier)                | https://aistudio.google.com/apikey                                                            | [ ]      |
| `PROD_GROQ_API_KEY`          | Groq API key (free + fast fallback)                          | https://console.groq.com/keys                                                                 | [ ]      |
| `PROD_OPENAI_API_KEY`        | OpenAI API key (paid fallback)                               | https://platform.openai.com/api-keys                                                          | [ ]      |
| `PROD_ANTHROPIC_API_KEY`     | Claude API key (premium tier — Tier-2 structural analysis)   | https://console.anthropic.com/settings/keys                                                  | [ ]      |

**Cost guard:** Set monthly spending caps on each provider before going live. OpenAI in particular has no default cap.
- OpenAI usage cap: https://platform.openai.com/account/limits
- Anthropic usage limit: https://console.anthropic.com/settings/limits
- Groq: free tier is rate-limited automatically

---

## §5 — Stripe Billing (REQUIRED for paid signups)

| Secret name                         | Purpose                                              | Where to get it                                                                              | Verified |
| ----------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `PROD_STRIPE_SECRET_KEY`            | Stripe secret key — **LIVE MODE**                    | https://dashboard.stripe.com/apikeys (toggle "Test mode" off first)                          | [ ]      |
| `PROD_STRIPE_PUBLISHABLE_KEY`       | Stripe publishable key — LIVE MODE (client-side)     | Same dashboard                                                                                | [ ]      |
| `PROD_STRIPE_WEBHOOK_SECRET`        | Webhook signing secret — LIVE                        | https://dashboard.stripe.com/webhooks → your endpoint → "Reveal signing secret"             | [ ]      |
| `PROD_STRIPE_PRICE_ID_FLIPPER`      | Price ID for FLIPPER tier ($19/mo)                   | Create the product live, then Products → Pricing                                              | [ ]      |
| `PROD_STRIPE_PRICE_ID_PRO`          | Price ID for PRO tier ($49/mo)                       | Same                                                                                          | [ ]      |
| `PROD_STRIPE_PRICE_ID_FLIPPER_ANNUAL` | Annual FLIPPER price (if you ship annual at launch) | Same (optional pre-launch; recommend creating now)                                           | [ ]      |
| `PROD_STRIPE_PRICE_ID_PRO_ANNUAL`   | Annual PRO price                                     | Same                                                                                          | [ ]      |
| `PROD_STRIPE_PRICE_ID_LIFETIME_FOUNDER` | Lifetime Founder one-time charge ($299)          | Create as one-time price, not subscription                                                    | [ ]      |

> **CRITICAL:** Live mode keys start with `sk_live_…` and `pk_live_…`. Test mode is `sk_test_…` and `pk_test_…`. If you ever see a `sk_test_` in production logs, halt and rotate.

**Webhook event registration** (Stripe dashboard):
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## §6 — Email & Notifications (REQUIRED)

| Secret name                         | Purpose                                       | Where to get it                                                                              | Verified |
| ----------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `PROD_RESEND_API_KEY`               | Transactional email (welcome, drip, alerts)   | https://resend.com/api-keys                                                                   | [ ]      |
| `PROD_RESEND_FROM_DOMAIN`           | Verified sender domain (must match your bought domain) | https://resend.com/domains → add domain → DNS verification                          | [ ]      |
| `PROD_TWILIO_ACCOUNT_SID`           | Twilio SMS account SID *(only if SMS enabled at launch)* | https://console.twilio.com/                                                       | [ ]      |
| `PROD_TWILIO_AUTH_TOKEN`            | Twilio auth token                             | Same console                                                                                  | [ ]      |
| `PROD_TWILIO_PHONE_NUMBER`          | Twilio "from" number                          | Twilio console → Phone numbers → Manage → Buy a number                                       | [ ]      |
| `PROD_FCM_SERVER_KEY`               | Firebase Cloud Messaging server key (push)    | Firebase console → Project settings → Cloud Messaging                                         | [ ]      |

> **SMS is gated by Twilio 10DLC compliance.** If you skip SMS at launch, you can omit the Twilio rows. See `docs/launch/twilio-10dlc-checklist.md`.

---

## §7 — Marketplace Integrations (REQUIRED for affected scrapers)

| Secret name                       | Purpose                                                 | Where to get it                                                                              | Verified |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `PROD_EBAY_CLIENT_ID`             | eBay developer App ID                                   | https://developer.ebay.com/my/keys                                                            | [ ]      |
| `PROD_EBAY_CLIENT_SECRET`         | eBay client secret                                      | Same                                                                                          | [ ]      |
| `PROD_EBAY_OAUTH_TOKEN`           | eBay Browse API OAuth token (rotate per their schedule) | Generate via eBay sandbox/production OAuth flow                                              | [ ]      |
| `PROD_EBAY_MARKETPLACE_ID`        | Marketplace identifier                                  | Set to `EBAY_US` for US                                                                       | [ ]      |
| `PROD_FACEBOOK_GRAPH_TOKEN`       | Facebook Marketplace access (where applicable)          | Generated via Facebook OAuth → marketplace_management scope                                   | [ ]      |
| `PROD_GOOGLE_MAPS_API_KEY`        | Google Maps SDK (Epic 12 — meeting logistics)           | https://console.cloud.google.com/apis/credentials?project=axovia-flipper                     | [ ]      |
| `PROD_GOOGLE_CALENDAR_*`          | Google Calendar OAuth client (Epic 12)                  | Same Cloud Console → OAuth 2.0 Client IDs (Web app type)                                     | [ ]      |

---

## §8 — Observability (REQUIRED)

| Secret name                       | Purpose                                       | Where to get it                                                                              | Verified |
| --------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `PROD_SENTRY_DSN`                 | Sentry project DSN                            | https://sentry.io/ → Settings → Projects → flipper-ai → Client Keys (DSN)                    | [ ]      |
| `PROD_SENTRY_AUTH_TOKEN`          | Sentry auth for source map uploads in CI      | https://sentry.io/settings/account/api/auth-tokens/                                          | [ ]      |
| `PROD_SENTRY_ORG`                 | Sentry org slug                               | URL of your Sentry org                                                                        | [ ]      |
| `PROD_SENTRY_PROJECT`             | Sentry project slug                           | `flipper-ai`                                                                                  | [ ]      |

---

## §9 — App-Level Configuration (REQUIRED)

These aren't strictly secret but live in Secret Manager for consistency.

| Secret name                       | Recommended value                                                                              | Verified |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | -------- |
| `PROD_APP_URL`                    | `https://<your-domain>` (no trailing slash)                                                     | [ ]      |
| `PROD_ALLOWED_ORIGINS`            | `https://<your-domain>,https://www.<your-domain>,https://axovia-flipper.web.app`                | [ ]      |
| `PROD_RATE_LIMIT_MAX`             | `100` (per `RATE_LIMIT_WINDOW_MS`)                                                              | [ ]      |
| `PROD_RATE_LIMIT_WINDOW_MS`       | `60000`                                                                                         | [ ]      |
| `PROD_NEXT_PUBLIC_FIREBASE_*`     | All public Firebase config keys (API key, auth domain, project ID, storage bucket, etc.)        | [ ]      |
| `PROD_NEXT_PUBLIC_VAPID_KEY`      | FCM web push public key                                                                         | [ ]      |

---

## §10 — IAM & Access

After all secrets exist, grant the Cloud Run service account access:

```bash
SERVICE_ACCOUNT="flipper-web@axovia-flipper.iam.gserviceaccount.com"  # adjust to your actual SA
PROJECT="axovia-flipper"

# Grant secretAccessor on every PROD_ secret
gcloud secrets list --project=$PROJECT --format="value(name)" --filter="name~^PROD_" | while read secret; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project=$PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done
```

**Verify:**
```bash
gcloud secrets get-iam-policy PROD_DB_URL --project=axovia-flipper
# Should show your Cloud Run service account in the secretAccessor binding
```

---

## §11 — Pre-Deploy Self-Test

Before pulling the trigger on the first prod deploy, run this in a fresh shell:

```bash
PROJECT="axovia-flipper"
REQUIRED_SECRETS=(
  PROD_DB_URL PROD_DB_DIRECT_URL
  PROD_ENCRYPTION_SECRET
  PROD_FIREBASE_CLIENT_EMAIL PROD_FIREBASE_PRIVATE_KEY
  PROD_HCAPTCHA_SECRET
  PROD_GOOGLE_API_KEY
  PROD_STRIPE_SECRET_KEY PROD_STRIPE_WEBHOOK_SECRET
  PROD_STRIPE_PRICE_ID_FLIPPER PROD_STRIPE_PRICE_ID_PRO
  PROD_RESEND_API_KEY PROD_RESEND_FROM_DOMAIN
  PROD_SENTRY_DSN
  PROD_APP_URL PROD_ALLOWED_ORIGINS
)

MISSING=0
for s in "${REQUIRED_SECRETS[@]}"; do
  if ! gcloud secrets describe "$s" --project=$PROJECT &>/dev/null; then
    echo "MISSING: $s"
    MISSING=$((MISSING+1))
  else
    echo "  OK: $s"
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo
  echo "❌ $MISSING required secrets missing. DO NOT DEPLOY."
  exit 1
else
  echo
  echo "✅ All required secrets present."
fi
```

This script is also saved at `scripts/deploy/check-secrets.sh` (added in this commit) — run it as the last gate before `gcloud run deploy` and as a pre-deploy step in the CI workflow.

---

## §12 — Common Mistakes to Avoid

1. **Setting secrets via `--set-env-vars` instead of `--set-secrets`.** The former is plain-text in the Cloud Run config. Always use `--set-secrets KEY=secret-name:latest`.
2. **Reusing dev/staging keys in prod.** Easy to do when copy-pasting from `.env.local`. Always *generate fresh values* for production secrets like `ENCRYPTION_SECRET`.
3. **Storing the Firebase private key without escaping `\n`.** Secret Manager preserves them literally; when read into Node `process.env`, the escapes need handling. Verify with a real round-trip before prod traffic.
4. **Enabling Stripe live mode but forgetting to update the webhook URL.** Test-mode webhook events go to one URL, live-mode events go to another. They are separate config rows in the Stripe dashboard.
5. **Setting `RESEND_FROM_DOMAIN` before completing DNS verification.** Resend will silently rate-limit unverified senders, causing the welcome email drip to fail mysteriously.
6. **Forgetting `secretmanager.secretAccessor` on the service account** — manifest as "secret not found" runtime errors at exactly the worst time (first user signup).
7. **Granting `secretmanager.admin` to the runtime service account.** That role lets the service *write* secrets, which it should never need to do. Stick to `secretAccessor`.

---

## §13 — Audit checklist before you flip the switch

- [ ] All §1-§9 rows have **Verified** ticked
- [ ] §10 IAM script run successfully
- [ ] §11 self-test outputs `✅ All required secrets present`
- [ ] No `STRIPE_SECRET_KEY` value starts with `sk_test_`
- [ ] No `OPENAI_API_KEY` is a personal key paid out of your own account (use a project-scoped key)
- [ ] At least one of `GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` is set (preferably all four for fallback)
- [ ] OAuth redirect URIs include the production domain in *every* provider's dashboard
- [ ] Resend domain DNS records (TXT, MX, DKIM) are all green in https://resend.com/domains
- [ ] Sentry "Releases" feature is enabled (so deploy events show up in the Sentry timeline)
