<!--
file: docs/guides/API-KEYS-SETUP.md
author: Stephen Boyett
company: Axovia AI
date: 2026-04-13
version: 1.0
brief: Step-by-step guide for obtaining and configuring all external API keys.

description:
    Complete walkthrough for setting up every third-party API key used by
    Flipper.ai. Organized by priority tier so you can get scraping + scoring
    working first and add optional integrations later.
-->

# API Keys Setup Guide

This guide walks you through obtaining every API key Flipper.ai uses, organized by priority. Copy each key into your `.env` file (see `.env.example` for the template).

---

## Quick Start (Minimum Viable Pipeline)

To run scrapers and score listings you need **Tier 1** keys. Everything else enhances the experience but isn't blocking.

| Tier | What It Unlocks | Time to Set Up |
|------|----------------|----------------|
| **1 - Core Scraping** | eBay Browse API, Craigslist/Mercari/OfferUp (Playwright) | ~15 min |
| **2 - AI Analysis** | LLM item identification, sellability scoring, Claude Tier 2 | ~5 min |
| **3 - Payments & Email** | Stripe subscriptions, Resend transactional email | ~20 min |
| **4 - Notifications** | Twilio SMS, Firebase push, monitoring scheduler | ~15 min |
| **5 - Maps & Calendar** | Google Maps routes, Google Calendar meetup scheduling | ~20 min |
| **6 - Shipping & Monitoring** | Shippo rate estimates, Sentry error tracking | ~15 min |

---

## Tier 1: Core Scraping

### eBay Browse API (`EBAY_OAUTH_TOKEN`)

The eBay Browse API is the primary data source for pricing and sold-item comparables.

1. Go to [developer.ebay.com](https://developer.ebay.com/) and sign in (or create an account)
2. Click **Hi [Name]** > **Application access keys**
3. Click **Create a keyset** for the **Production** environment
4. Note your **App ID (Client ID)** and **Cert ID (Client Secret)**
5. Generate an OAuth **Application token** (client credentials grant):
   - Go to **User Tokens** > **Get a Token from eBay via Your Application**
   - Select **Production** environment
   - Under **OAuth Scopes**, select `https://api.ebay.com/oauth/api_scope`
   - Click **Generate Token**
   - Copy the token (it's long, ~2000+ chars)
6. Add to `.env`:
   ```
   EBAY_OAUTH_TOKEN="v^1.1#i^1#p^3#r^1..."
   EBAY_BROWSE_API_BASE_URL="https://api.ebay.com/buy/browse/v1"
   EBAY_MARKETPLACE_ID="EBAY_US"
   ```

**Token expiry:** Application tokens expire after 2 hours. For development, regenerate as needed. For production, implement the [client credentials flow](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html) to auto-refresh.

**Rate limits:** 5,000 calls/day on the Browse API. The `EBAY_MONITORING_DAILY_BUDGET` env var (default: 2000) reserves capacity for monitoring jobs.

### Craigslist, Mercari, OfferUp (No API Keys Needed)

These scrapers use **Playwright browser automation** and don't require API keys. They work out of the box once the dev server is running and you're authenticated.

**Requirements:**
- Playwright browsers installed: `npx playwright install chromium`
- Dev server running: `make dev`
- Logged in via the browser UI

### Facebook Marketplace (`GOOGLE_API_KEY` + Facebook OAuth)

Facebook scraping uses **Stagehand** (AI-powered browser automation via Google Gemini).

1. **Google API Key** (for Gemini/Stagehand):
   - Go to [console.cloud.google.com](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Restrict the key to **Generative Language API** (Gemini)
   - Add to `.env`:
     ```
     GOOGLE_API_KEY="AIza..."
     ```

2. **Facebook OAuth** (optional, for authenticated scraping):
   - Go to [developers.facebook.com](https://developers.facebook.com/)
   - Create an app (type: **Consumer**)
   - Add **Facebook Login** product
   - Under Settings > Basic, note the **App ID** and **App Secret**
   - Under Facebook Login > Settings, add Valid OAuth Redirect URI:
     `http://localhost:3000/api/auth/facebook/callback`
   - Add to `.env`:
     ```
     FACEBOOK_APP_ID="123456789"
     FACEBOOK_APP_SECRET="abc123..."
     FACEBOOK_REDIRECT_URI="http://localhost:3000/api/auth/facebook/callback"
     ENABLE_OAUTH_FACEBOOK="true"
     ```

---

## Tier 2: AI Analysis

### Anthropic / Claude (`ANTHROPIC_API_KEY`)

Powers Claude-based structural analysis (Tier 2 enrichment), description generation, and negotiation strategy.

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Navigate to **API Keys**
3. Click **Create Key**, name it (e.g., "flipper-dev")
4. Copy the key (starts with `sk-ant-`)
5. Add to `.env`:
   ```
   ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

**Model:** Defaults to `claude-sonnet-4-5-20250929`. Override with `CLAUDE_MODEL` if needed.

**Fallback:** The codebase also checks `CLAUDE_API_KEY` as an alias.

### OpenAI (`OPENAI_API_KEY`)

Powers LLM item identification, sellability assessment, and demand analysis.

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Navigate to **API Keys** (left sidebar)
3. Click **Create new secret key**, name it (e.g., "flipper-dev")
4. Copy the key (starts with `sk-`)
5. Add to `.env`:
   ```
   OPENAI_API_KEY="sk-..."
   ```

**Model used:** GPT-4o-mini (`temperature: 0.3`). Two-layer cache (L1 in-memory LRU, L2 database with 24h TTL) minimizes API calls.

### Groq (Optional Free Alternative) (`GROQ_API_KEY`)

Free-tier AI inference using Llama 3.3 70B. Good for development to save on OpenAI costs.

1. Go to [console.groq.com](https://console.groq.com/)
2. Navigate to **API Keys**
3. Click **Create API Key**
4. Copy the key
5. Add to `.env`:
   ```
   GROQ_API_KEY="gsk_..."
   ```

**Rate limits:** Free tier: 30 requests/minute, 14,400 requests/day.

---

## Tier 3: Payments & Email

### Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

Handles subscription billing (Free/Pro/Enterprise tiers).

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com/)
2. Toggle to **Test mode** (top-right switch)
3. Navigate to **Developers** > **API keys**
4. Copy the **Secret key** (starts with `sk_test_`)
5. For webhooks:
   - Go to **Developers** > **Webhooks**
   - Click **Add endpoint**
   - URL: `http://localhost:3000/api/webhooks/stripe` (use Stripe CLI for local dev)
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy the **Signing secret** (starts with `whsec_`)
6. Create price IDs for subscription tiers:
   - Go to **Products** > **Add product**
   - Create "Flipper" and "Pro" products with monthly prices
   - Copy the Price IDs
7. Add to `.env`:
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   STRIPE_PRICE_FLIPPER="price_..."
   STRIPE_PRICE_PRO="price_..."
   ```

**Local webhook testing:** Install [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Resend (`RESEND_API_KEY`)

Transactional email (flip lifecycle notifications, alerts).

1. Go to [resend.com](https://resend.com/) and sign up
2. Navigate to **API Keys**
3. Click **Create API Key** (name: "flipper-dev", permission: Sending access)
4. Copy the key (starts with `re_`)
5. Add to `.env`:
   ```
   RESEND_API_KEY="re_..."
   ```

**Fallback:** If not configured, emails are logged to console instead of sent.

---

## Tier 4: Notifications

### Twilio SMS (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)

SMS notifications for high-value opportunities and alerts.

1. Go to [console.twilio.com](https://console.twilio.com/) and sign up
2. From the dashboard, copy your **Account SID** and **Auth Token**
3. Navigate to **Phone Numbers** > **Buy a number** (or use trial number)
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID="AC..."
   TWILIO_AUTH_TOKEN="..."
   TWILIO_FROM_NUMBER="+12025550100"
   ```

### Firebase Cloud Messaging (`NEXT_PUBLIC_FIREBASE_VAPID_KEY`)

Push notifications (browser + mobile). The core Firebase keys should already be in your `.env` from initial setup.

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) > Your project
2. Navigate to **Project Settings** > **Cloud Messaging**
3. Under **Web Push certificates**, click **Generate key pair**
4. Copy the key (starts with `B`, ~88 chars)
5. Add to `.env`:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY="BNr..."
   ```

### Monitoring & Notification API Keys

These are **self-generated** secrets for authenticating internal Cloud Scheduler jobs.

```bash
# Generate two distinct 64-char hex keys:
openssl rand -hex 32  # Use for MONITORING_API_KEY
openssl rand -hex 32  # Use for NOTIFICATION_PROCESSOR_API_KEY
```

Add to `.env`:
```
MONITORING_API_KEY="<64-char hex>"
NOTIFICATION_PROCESSOR_API_KEY="<different 64-char hex>"
```

**Important:** These two keys MUST be different from each other (minimum 32 characters each).

---

## Tier 5: Maps & Calendar

### Google Maps (`GOOGLE_MAPS_API_KEY`)

Driving directions for meetup/pickup planning.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Enable **Directions API**
4. Navigate to **Credentials** > **Create Credentials** > **API Key**
5. Restrict the key to **Directions API** only
6. Add to `.env`:
   ```
   GOOGLE_MAPS_API_KEY="AIza..."
   ```

**Note:** If you already have a `GOOGLE_API_KEY` for Gemini, you can use the same key but add the Directions API to its restrictions. Or create a separate key for better access control.

### Google Calendar (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`)

Scheduling meetups directly from the app.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Enable **Google Calendar API**
4. Navigate to **Credentials** > **Create Credentials** > **OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/integrations/google-calendar/callback`
7. Copy the **Client ID** and **Client Secret**
8. Add to `.env`:
   ```
   GOOGLE_CALENDAR_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
   GOOGLE_CALENDAR_CLIENT_SECRET="GOCSPX-..."
   GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:3000/api/integrations/google-calendar/callback"
   ```

---

## Tier 6: Shipping & Monitoring

### Shippo (`SHIPPO_API_TOKEN`)

USPS/UPS/FedEx shipping rate estimation for logistics analysis.

1. Go to [goshippo.com](https://goshippo.com/) and sign up
2. Navigate to **Settings** > **API** (or **Developers**)
3. Copy the **Test token** (starts with `shippo_test_`)
4. Add to `.env`:
   ```
   SHIPPO_API_TOKEN="shippo_test_..."
   SHIPPO_FROM_ZIP="98101"  # Your zip code
   ```

### Sentry (`SENTRY_DSN`)

Error tracking and performance monitoring.

1. Go to [sentry.io](https://sentry.io/) and sign up
2. Create a project (platform: **Next.js**)
3. Copy the **DSN** from the project settings
4. Add to `.env`:
   ```
   SENTRY_DSN="https://abc123@o123456.ingest.sentry.io/123456"
   NEXT_PUBLIC_SENTRY_DSN="https://abc123@o123456.ingest.sentry.io/123456"
   ```

For source map uploads during production builds:
```
SENTRY_ORG="your-org"
SENTRY_PROJECT="flipper-ai"
SENTRY_AUTH_TOKEN="sntrys_..."
```

### hCaptcha (`HCAPTCHA_SECRET_KEY`)

CAPTCHA verification for registration and sensitive actions.

1. Go to [hcaptcha.com](https://www.hcaptcha.com/) and sign up
2. Add a new site, note the **Site Key** and **Secret Key**
3. Add to `.env`:
   ```
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY="your-site-key"
   HCAPTCHA_SECRET_KEY="0x..."
   ```

**Development shortcut:** Use the hCaptcha test keys for local dev:
```
NEXT_PUBLIC_HCAPTCHA_SITE_KEY="10000000-ffff-ffff-ffff-000000000001"
HCAPTCHA_SECRET_KEY="0x0000000000000000000000000000000000000000"
```

---

## Verification

After configuring keys, verify your setup:

```bash
# 1. Start the database
make db-up

# 2. Run migrations
make db-setup

# 3. Start the dev server
make dev

# 4. Open the app and log in
open http://localhost:3000

# 5. Try a scraper run from the Scraper page
#    - Select a category and marketplace
#    - Click "Start Scan"
#    - Check the terminal for any API key errors
```

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `EBAY_OAUTH_TOKEN not set` | Missing eBay token | Add to `.env`, restart dev server |
| `401 Unauthorized` from eBay | Token expired | Regenerate at developer.ebay.com |
| `OPENAI_API_KEY not configured` | Missing OpenAI key | Add to `.env`; LLM features will be skipped without it |
| `Cannot reach database` | Postgres not running | `make db-up` |
| `FirebaseError: auth/invalid-api-key` | Wrong Firebase config | Check NEXT_PUBLIC_FIREBASE_* vars match your project |

---

## Environment Variable Reference

See `.env.example` for the complete template with all variables and their defaults.
