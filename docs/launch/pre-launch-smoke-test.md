# Pre-Launch Smoke Test Checklist

**When to run:** After your first production Cloud Run deploy, before the first beta invite goes out.
**How long it takes:** ~45-60 minutes if everything works on the first try.
**Who runs it:** You. Don't delegate the first prod smoke test.

> Print this out (or open on a second device). Each step takes 1-3 minutes. Tick boxes as you go. If anything fails, **stop and fix before continuing** — most failures cascade.

---

## Setup (5 min)

- [ ] **Open these tabs:**
  - Production app: `https://<your-domain>/`
  - Sentry issues feed (so you can watch errors land in real time): https://sentry.io/issues/
  - Stripe live-mode dashboard: https://dashboard.stripe.com/dashboard
  - Cloud Run logs: https://console.cloud.google.com/run?project=axovia-flipper
  - Cloud SQL queries: https://console.cloud.google.com/sql?project=axovia-flipper
  - Email inbox (the one you'll use for the test signups)

- [ ] **Have ready:**
  - A real credit card (your own — you'll refund yourself)
  - Three fresh email addresses (Gmail aliases work: `you+smoke1@gmail.com`, `you+smoke2@gmail.com`, `you+smoke3@gmail.com`)
  - A separate browser profile or incognito window for each test account

- [ ] **Run the secrets check first:**
  ```bash
  ./scripts/deploy/check-secrets.sh
  ```
  All required secrets present, Stripe key is `sk_live_…`, no warnings on AI providers.

---

## §1 — Public surfaces load (5 min)

- [ ] `https://<your-domain>/` — landing page renders, hero CTA works
- [ ] `https://<your-domain>/pricing` — all three tiers (FREE / FLIPPER / PRO) display
- [ ] `https://<your-domain>/login` — login form renders, OAuth buttons visible
- [ ] `https://<your-domain>/register` — registration form renders, hCaptcha visible
- [ ] `https://<your-domain>/privacy` — privacy policy renders
- [ ] `https://<your-domain>/terms` — terms of service render
- [ ] `https://<your-domain>/api/health` — returns 200 with `{"status":"ok"}` shape
- [ ] `https://<your-domain>/api/health/ready` — returns 200 (DB reachable, Firebase Admin SDK initialized)
- [ ] `https://<your-domain>/health` — status dashboard renders all green

**Sentry check:** Zero new errors landed in the last 5 minutes. If errors are landing, fix before continuing.

---

## §2 — Email + password signup (5 min)

Use **Account A** — `you+smoke1@gmail.com`.

- [ ] Click "Sign up" → fill email + password (12+ chars) → solve hCaptcha → submit
- [ ] Verification email arrives in inbox within 60 seconds
  - From address: `stephen@<your-domain>` (or whatever you set as `RESEND_FROM_DOMAIN`)
  - Sender displays as a name, not just an email
  - Renders correctly in HTML view AND plain-text view
- [ ] Click verification link → redirected to dashboard or onboarding
- [ ] Onboarding wizard walks through (welcome → marketplaces → categories → budget → location → complete)
- [ ] Settings page loads with the email + name populated correctly
- [ ] Log out → log back in with the same credentials → success

**Cloud SQL check:** New row in `User` table, `emailVerified` field populated, `createdAt` matches now.

---

## §3 — Google OAuth (5 min)

Use **Account B** — a Google account different from Account A.

- [ ] Click "Sign up with Google" → consent screen displays your app name (not "axovia-flipper" raw)
- [ ] Approve → redirected back to onboarding
- [ ] Email field is pre-populated from Google profile
- [ ] Logout → "Continue with Google" on login page → 1-click signs you back in

**If consent screen says "axovia-flipper" or shows the raw OAuth client ID**, you forgot to set the OAuth consent screen branding. Fix at https://console.cloud.google.com/apis/credentials/consent?project=axovia-flipper.

---

## §4 — GitHub OAuth (3 min)

Use **Account C** — your GitHub account.

- [ ] Click "Sign up with GitHub" → consent screen → approve
- [ ] Lands in onboarding or dashboard
- [ ] Logout → "Continue with GitHub" → re-auth works

---

## §5 — Marketplace scrapers — live data (15 min)

This is the highest-risk smoke test. Marketplaces change selectors regularly; the scrapers were last verified months ago.

Use Account A. For each scraper, run a search and confirm ≥10 results return.

- [ ] **Craigslist** — `/scraper` → New Search → Platform=Craigslist, Location=`sfbay`, Keywords=`iphone`, Price=$50-$500 → Run
  - First scan: 30-60s. Watch SSE updates land in real-time. Job status: PENDING → RUNNING → COMPLETED.
  - Result: ≥10 listings. Each has title, price, location, image, URL.

- [ ] **eBay** — Same flow. Keywords=`vintage camera`. eBay uses the Browse API not scraping, so it should be fastest.
  - Result: ≥20 listings (eBay returns more typically).

- [ ] **Facebook Marketplace** — Keywords=`dyson`, Location=`austin`. This is the slowest (Stagehand-driven browser automation).
  - Expected duration: 2-3 minutes. Don't refresh.
  - Result: ≥5 listings. **If this returns 0**, FB has likely updated something — check Sentry for selector errors.

- [ ] **OfferUp** — Keywords=`airpods`, Location detected from profile.
  - Expected: 30-60s.
  - Result: ≥10 listings.

- [ ] **Mercari** — Keywords=`nintendo switch`.
  - First tries reverse-engineered API. If 429s, falls back to browser automation (logged in `ScraperJob.errorMessage` if it falls back).
  - Result: ≥10 listings.

**For each marketplace:** click into one listing detail. Confirm:
- AI analysis ran (you see verifiedMarketValue, sellabilityScore, recommendedOffer/recommendedList populated)
- Image displays from Firebase Storage (not the original marketplace URL)
- "Add to Kanban" button works → opportunity appears in `IDENTIFIED` column

**Cloud Run logs check:** No 5xx errors during scrapes. Some 4xx is expected (the AI cache hits return 304/empty bodies).

---

## §6 — End-to-end opportunity → kanban → analytics (5 min)

- [ ] Drag an opportunity from IDENTIFIED → CONTACTED. Modal asks for nothing (CONTACTED is just a bookmark).
- [ ] Drag CONTACTED → PURCHASED. Modal prompts for purchase price + date. Enter a number, save.
- [ ] Drag PURCHASED → LISTED. Modal prompts for resale URL + listing platform. Enter a fake eBay URL, save.
- [ ] Drag LISTED → SOLD. Modal prompts for final sale price + actual fees. Enter numbers, save.
- [ ] Visit `/analytics` — Total profit, flips completed, average profit, success rate all reflect this fake flip.
- [ ] CSV export of analytics works.

**Cloud SQL check:** `Opportunity` row exists, status=`SOLD`, `actualProfit` calculated correctly.

---

## §7 — Seller communication (5 min)

- [ ] On a CONTACTED opportunity, click "Generate message" → AI drafts an inquiry message
- [ ] Edit the draft → click "Approve & send" — message goes to `PENDING_APPROVAL` then `SENT`
- [ ] Verify the message appears in `/messages` inbox under that listing's thread
- [ ] (Optional) Run AI negotiation strategy — generates an offer recommendation with reasoning

**Note:** Messages don't actually transmit to the seller's marketplace inbox in v1 — they're stored for the user to copy-paste manually. Make sure the UI is clear about this.

---

## §8 — Cross-platform listing generation (5 min)

- [ ] On a PURCHASED opportunity, click "Generate listing for eBay"
- [ ] AI produces title, description, recommended price
- [ ] Edit any field → save → status moves to LISTED
- [ ] Verify "Posting Queue" entry exists for the eBay target
- [ ] (Optional, expensive) Click "Post to eBay" — actually posts via eBay Selling API. **Skip this unless your eBay seller account is properly set up; failed listings can affect your seller score.**

---

## §9 — Stripe live-mode upgrade (5 min)

This is the moment of truth. Use Account A.

- [ ] Visit `/billing` or click "Upgrade" → Stripe Checkout opens (live mode — URL contains `checkout.stripe.com/c/pay/cs_live_…`)
- [ ] Enter your real card → complete checkout
- [ ] Redirected back to a success page with a thank-you message
- [ ] Within 60 seconds, account tier updates to `FLIPPER` or `PRO` (whichever you bought)
- [ ] Subscription appears in Stripe dashboard: https://dashboard.stripe.com/subscriptions

**Webhook verification:**
- [ ] Stripe webhook event log shows `checkout.session.completed` event delivered (200 response): https://dashboard.stripe.com/webhooks → endpoint → "Recent events"
- [ ] No `4xx`/`5xx` responses on any webhook events

**Cloud SQL check:**
- `User.subscriptionTier` = upgraded tier
- `User.stripeCustomerId` is populated
- `User.stripeSubscriptionId` is populated

**Refund yourself:** Stripe dashboard → subscription → "Cancel subscription" → "Refund customer for the most recent payment". Verify your card is refunded within 5-10 days.

---

## §10 — Tier-gated features (3 min)

After upgrading Account A:

- [ ] Try a feature gated to FLIPPER+ (e.g., 2nd marketplace, 11th scan/day) — should now succeed
- [ ] Try a feature gated to PRO (AI negotiation, cross-platform listing, analytics export) — succeeds if PRO, gracefully gates if FLIPPER

Switch to Account B (still FREE):
- [ ] Try the same FLIPPER feature → should hit a tier-gate UI (not a 500 error)
- [ ] Try to scan more than 10 times in 24h → 11th scan blocked with friendly upgrade prompt

---

## §11 — Notifications (5 min)

- [ ] **Email** — verify `welcome` email arrived for Account A (during §2)
- [ ] **Email** — trigger a high-value opportunity (run a scan that finds one) → email alert lands within 60s
- [ ] **SSE** — open `/dashboard` in one tab, run a scan in another. Watch real-time `listing.found` events render in the dashboard without refresh.
- [ ] **Push (FCM)** — *only if FCM is enabled at launch*. Subscribe in browser → trigger an event → confirm browser notification arrives.
- [ ] **SMS** — *only if Twilio is enabled and 10DLC registered*. Trigger any SMS event → confirm receipt on your real phone within 60s.

---

## §12 — Failure-mode probing (5 min)

Confirm error handling is graceful:

- [ ] Hit a non-existent route: `https://<your-domain>/asdfasdfasdf` → 404 page renders, doesn't 500
- [ ] Hit a protected route while logged out: `https://<your-domain>/dashboard` (incognito) → redirects to `/login`, doesn't 500
- [ ] Submit invalid registration (empty email): friendly validation error
- [ ] Force a deliberate Sentry error: `https://<your-domain>/api/diagnostics?throw=1` → 500 in browser, error appears in Sentry within 2 min
- [ ] Pull the rate limiter: hit `/api/health` 200 times in 60 seconds — eventually returns 429
- [ ] Submit a saved search with missing required fields → 400 with structured error response

**Sentry final check:** All deliberate errors landed correctly. No unexpected errors.

---

## §13 — Accessibility quick check (3 min)

- [ ] Tab through landing page top to bottom — focus indicators visible, order makes sense
- [ ] Login form usable with keyboard only
- [ ] Lighthouse audit on landing page: https://pagespeed.web.dev/?url=https%3A%2F%2F<your-domain>
  - Performance: ≥80
  - Accessibility: ≥95
  - Best Practices: ≥90
  - SEO: ≥90

---

## §14 — Cleanup

- [ ] Delete the 3 test accounts from Cloud SQL (or leave with a `User.testAccount = true` flag for future smoke tests)
- [ ] Cancel + refund the test Stripe subscription
- [ ] Mark all opportunities/listings created during smoke test as `archived = true` so they don't pollute beta-user analytics

---

## §15 — Sign-off

- [ ] All §1-§13 boxes ticked, no unresolved P0/P1 issues
- [ ] Sentry shows 0 unexpected errors in the last hour
- [ ] Cloud Run instance count is sane (< $50/day burn rate at idle)
- [ ] First beta invitations queued in Resend, ready to send

**Done. Soft beta is go.**

---

## Common smoke-test failures and what they mean

| Symptom                                                         | Likely cause                                                                  | Fix                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| OAuth redirect URI mismatch error                               | Production redirect URI not added to Google/GitHub/FB OAuth app dashboard     | Add `https://<your-domain>/api/auth/callback/<provider>` to authorized redirects                  |
| Verification email never arrives                                | Resend domain not verified, or `RESEND_FROM_DOMAIN` mismatched                | Resend dashboard → Domains → DNS records green → match secret value                              |
| FB Marketplace scraper returns 0                                | FB updated DOM, or Stagehand env vars missing                                 | Check Sentry for selector errors; verify `GOOGLE_API_KEY` is set (Stagehand needs Gemini)         |
| Stripe webhook returns 4xx                                      | Webhook signing secret mismatch, or wrong event types subscribed              | Stripe dashboard → endpoint → re-reveal signing secret → update Secret Manager → redeploy        |
| `/api/health/ready` returns 503                                 | DB unreachable from Cloud Run                                                 | Cloud SQL Auth Proxy / Unix socket misconfigured; verify `DB_URL` format and IAM                  |
| AI analysis never completes                                     | All AI providers failing or rate-limited                                      | Check `metrics.ts` per-provider success rates; add a fallback provider                            |
| Image displays as broken icon                                   | Firebase Storage bucket public-read missing, or CDN URL malformed              | Check Storage rules at https://console.firebase.google.com/project/axovia-flipper/storage         |
| Session expires immediately                                     | Cookie domain mismatch (e.g., set to `.example.com` but app at `app.example.com`) | Check `SESSION_COOKIE_DOMAIN` in env; should be exact match or unset                          |
| 500 on first /api/auth/* request                                | Firebase Admin SDK private key has unescaped `\n`                              | Re-store the secret with proper line breaks                                                       |
| User can scan unlimited times despite FREE tier                 | `tier-enforcement.ts` not reading from authenticated user, or DB out of sync  | Check `getCurrentUserSubscription()` — should hit DB, not cache, on tier-gated endpoints          |

---

## Want this automated?

Many of these can be encoded as Playwright smoke tests against production:

```bash
BASE_URL=https://<your-domain> pnpm test:e2e -- --grep="smoke"
```

If we add a `@smoke` tag to ~20 of the most critical Playwright specs, this becomes a 5-minute green/red gate instead of a 60-minute manual walk. Worth doing post-launch (probably v1.1).
