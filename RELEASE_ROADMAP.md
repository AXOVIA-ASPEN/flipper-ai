# Flipper.ai — Release Roadmap

**Version:** 2.0 (corrected — based on `origin/django-main` reality)
**Prepared:** 2026-05-06
**Audience:** Stephen Boyett (Founder)
**Purpose:** Single source of truth for current project status, the path to a public v1 launch, and the post-launch growth plan.

---

## ⚠️ Important — Branch Reality Check (read this first)

**My v1 of this roadmap was wrong.** It was generated from the `main` branch, which is **dramatically behind** the actual active development trunk on `origin/django-main`.

| Branch                            | Commits ahead of merge-base | State                                     |
| --------------------------------- | --------------------------- | ----------------------------------------- |
| `main`                            | 11 commits                  | Stale — last activity Feb 2026; superseded by django-main |
| `origin/django-main`              | 89 commits                  | **The real trunk.** All 13 epics done; Epic 14 (UI design system) ~60% done |
| `claude/create-release-roadmap-NCkB5` (this branch) | forked from `main`          | Roadmap-only branch. Code state matches main, **not** the live work |

**Branch name confusion:** `django-main` is **not a Django port** — the codebase is still Next.js. The branch name is misleading; treat it as the dev trunk. The 11 commits on `main` (story 4.2, 4.5, 8.2, 8.4, BDD step defs, API docs) have all been **redone or superseded** in django-main.

**Strategic implication:** Everything in **Section 1-3 below describes the django-main reality**, which is far closer to launch than the previous roadmap suggested. See **Section 4 (Branch Reconciliation)** for how to clean this up before launch.

---

## 0. How To Use This Document

1. Skim **Section 1 (Executive Summary)** — TL;DR of where you actually are.
2. **Section 2 (Feature Status)** — what's built, tested, and shippable on django-main.
3. **Section 3 (Pre-Launch Checklist)** — your active to-do list.
4. **Section 4 (Branch Reconciliation)** — how to resolve main vs django-main.
5. **Section 5 (Critical Path)** — week-by-week to launch.
6. **Section 6 (Marketing/Revenue)** — 90-day GTM playbook.
7. Answer the **[QUESTION]** prompts inline. I'll re-plan around your answers.

---

## 1. Executive Summary

**TL;DR:** The product is **technically launch-ready**. All 13 functional epics are marked done on django-main, including the Phase-2 features I previously wrote off (FCM push, Twilio SMS, Calendar, Maps). The remaining engineering blocker is **Epic 14 — Frontend Design System Migration** (5 of 10 stories left, mostly UI polish). The launch path is now: **finish UI polish → cut a release tag → deploy to Cloud Run → buy domain → launch publicly.**

| Dimension                 | Status                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Codebase**              | 1,651 files on django-main (vs 1,329 on main) · ~2,378+ unit tests · 99%+ coverage                                                                                                 |
| **Architecture**          | **Migrated already** — Firebase Hosting + Cloud Run + Cloud SQL Postgres + Firebase Auth + GCP Secret Manager. Vercel decommissioned.                                              |
| **AI Pipeline**           | **Multi-provider** — Gemini (primary, free) → Groq (fast, free) → OpenAI → Claude with automatic fallback. 12 prompts centralized in `src/lib/ai/prompts/`. Saves significant cost. |
| **Auth**                  | Firebase Auth (client sign-in → server session cookie). NextAuth fully removed.                                                                                                    |
| **Billing**               | Stripe Checkout + webhooks complete. **Not yet end-to-end tested in live mode.**                                                                                                   |
| **Push / SMS / Calendar** | All implemented (Epic 11–12 done). Compliance setup (Twilio 10DLC) likely still required.                                                                                          |
| **Critical Blockers**     | 0 hard, but ~6 launch-prep items: Epic 14 finish, branch reconciliation, domain, Stripe live test, Cloud Run prod deploy, GCP secrets seed.                                        |
| **Realistic launch window** | **Soft beta in 5-7 days; public Product Hunt launch in 3-4 weeks**                                                                                                                |

---

## 2. Feature Status Matrix (django-main reality)

Legend: ✅ Done · 🟡 Done but needs live verification · 🟠 In progress · ⛔ Not started

### 2.1 Functional Epics

| Epic                                                      | Stories | Status   | Notes                                                                       |
| --------------------------------------------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| **E1 — Production Infrastructure & Secure Deployment**    | 9/9     | ✅        | GCP Secret Manager via YAML-driven `EnvSecretManager`; Cloud Run + Cloud SQL provisioned; Firebase Hosting CDN + CORS + Storage + FCM all live |
| **E2 — User Registration, Auth & Onboarding**             | 6/6     | ✅        | Firebase Auth migration complete; landing/login/register/reset/onboarding/settings all shipped |
| **E3 — Multi-Marketplace Scanning & Image Capture**       | 9/9     | ✅        | All 5 scrapers refactored into `src/scrapers/*` with shared helpers; SSE events for job lifecycle (3.7); image capture to Firebase Storage |
| **E4 — Core Scoring & Deal Evaluation**                   | 6/6     | ✅        | Algorithmic + LLM verification + caching + fallback                         |
| **E5 — Advanced Market Intelligence**                     | 5/5     | ✅        | Claude structural analysis, comp matching, sold-volume/demand-trend, completeness/seller-rep, logistics/shipping cost — all done |
| **E6 — Flip Lifecycle Management & Analytics**            | 6/6     | ✅        | Dashboard, kanban, filtering, analytics, CSV/PDF export, inventory + ROI    |
| **E7 — Subscription & Billing**                           | 4/4     | ✅        | Stripe checkout + portal + webhooks + tier enforcement + usage metering    |
| **E8 — Seller Communication & Negotiation**               | 5/5     | ✅        | AI message gen, negotiation strategy, inbox/threads, approval workflow, status tracking |
| **E9 — Cross-Platform Resale Listing**                    | 4/4     | ✅        | AI title/desc, optimal pricing, posting queue, image reuse                  |
| **E10 — Monitoring & Email Notifications**                | 6/6     | ✅        | Background scheduler shipped (10.1); listing monitoring; Resend templates for lifecycle/communication/smart alerts; preferences UI |
| **E11 — Push (FCM) & SMS (Twilio)**                       | 3/3     | ✅        | FCM client, Twilio integration, multi-channel preferences. **Twilio 10DLC registration is a separate manual step — see §3.2** |
| **E12 — Meeting & Logistics**                             | 2/2     | ✅        | Google Calendar OAuth + event creation; Google Maps route generation       |
| **E13 — AI Scoring Algorithm Improvements** *(new!)*      | 8/8     | ✅        | IQR outlier filtering, structured JSON LLM responses, cache-invalidation on price changes, weighted margin+absolute-profit scoring, brand-regex refinement (with Groq backtest enrichment), demand-velocity Tier-1, collaborative scoring refinement, cross-platform price intelligence |
| **E14 — Frontend Design System Migration** *(in progress)* | 6/10    | 🟠       | Glassmorphism dark theme. **Blocking launch.** See breakdown below.        |

### 2.2 Epic 14 — The One Remaining Blocker

This is the only epic blocking launch. Status from `_bmad-output/implementation-artifacts/sprint-status.yaml` on django-main:

| Story                                              | Status        | Effort estimate |
| -------------------------------------------------- | ------------- | --------------- |
| 14.1 Design tokens & base style unification        | ✅ done        | —               |
| 14.2 Remove competing multi-theme system           | ✅ done        | —               |
| 14.3 Shared UI state components                    | ✅ done        | —               |
| 14.4 Landing + auth pages rebuild                  | 🟡 in review   | 0.5 day to merge |
| 14.5 Onboarding wizard dark migration              | 🟠 in progress | 1-2 days        |
| 14.6 PriceCalculator canonical reference           | 🟡 in review   | 0.5 day to merge |
| 14.7 Opportunities/Listings/Messaging migration    | ⏸ ready-for-dev | 2-3 days        |
| 14.8 Settings component polish                     | ⏸ ready-for-dev | 1-2 days        |
| 14.9 Analytics, scraper, health, static pages      | ⏸ backlog     | 2-3 days        |
| 14.10 Accessibility + file-header sweep            | ⏸ backlog     | 1-2 days        |

**Total remaining: ~7-13 working days** of UI work to call Epic 14 done. **[QUESTION]** Are you OK shipping launch with 14.1-14.7 done and 14.8-14.10 deferred to v1.1, or do you want the full design system before public launch? My recommendation: **ship 14.1-14.7, defer 14.8-14.10** (settings polish + minor pages + a11y sweep can be backfilled post-launch without users noticing).

> *Your answer:* ____________________________________________

### 2.3 Testing Pipeline (django-main)

| Test Layer                  | Status                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Jest unit tests             | 2,378+ tests, 99%+ coverage (statements/branches/functions/lines)                                  |
| Cucumber BDD                | **14 epic-tagged feature files** at `test/acceptance/features/E-NNN-*.feature` (E-001 through E-014). Old top-level `test/features/*` is removed. |
| Playwright E2E              | 86 spec files including 11 in `test/e2e/acceptance/`                                                |
| Visual regression           | ✅ chromium + firefox + webkit + mobile                                                              |
| Accessibility (axe)         | ✅ E14.10 will tighten this further                                                                  |
| Performance vitals          | ✅                                                                                                   |
| Load testing                | ✅ via autocannon                                                                                    |
| Requirements traceability   | Updated on django-main per `33e951a chore(bmad): status hygiene + planning/RTM updates`             |

**Verdict:** Test coverage is excellent. The previous "traceability matrix mostly Pending" finding from v1 of this doc was a `main`-branch artifact — django-main has fixed it.

---

## 3. Release Readiness — Pre-Launch Checklist

### 3.1 P0 — Hard Blockers (Must Do Before Soft Beta)

- [ ] **[ACTION]** Decide branch strategy and reconcile (see §4). Until done, no production deploys go out.
- [ ] **[ACTION]** Finish Epic 14 to your chosen scope (see §2.2 question above).
- [ ] **[ACTION]** Run a full production deploy of django-main to Cloud Run + Firebase Hosting:
    1. Verify GCP Secret Manager is seeded with all production secrets. List: `gcloud secrets list --project=axovia-flipper`
    2. Test `helpers/secrets.py` (or the equivalent `EnvSecretManager` ts module) loads them correctly with `BUILD_ENV=production`
    3. Trigger CI deploy via tag: `git tag v1.1.0 && git push origin v1.1.0` (the GitHub Actions release workflow takes it from there per `7ccb893 ci: add tag-triggered GitHub Release workflow`)
    4. Verify health: `curl https://axovia-flipper.web.app/api/health` and `https://<cloud-run-url>/api/health/ready`
- [ ] **[ACTION]** End-to-end test the **paid-customer flow** in **Stripe live mode** with a real card:
    1. Switch Stripe to live mode: https://dashboard.stripe.com/dashboard
    2. Create live products + price IDs for FREE / FLIPPER ($19) / PRO ($49) tiers (and any annual / Lifetime Founder SKUs you want — see §6.2)
    3. Seed `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (live), `STRIPE_PRICE_ID_*` into GCP Secret Manager
    4. Register the webhook endpoint: https://dashboard.stripe.com/webhooks (URL: `https://<your-domain>/api/webhooks/stripe`)
    5. Sign up as a real user, upgrade with your own card, refund yourself, verify tier change in Cloud SQL
- [ ] **[ACTION]** Provision a real domain.
    > **[QUESTION]** What domain? `flipper.ai` is taken — candidates: `flipperai.app`, `getflipper.ai`, `tryflipper.com`, `flipthat.ai`, `flipper.app`, `useflipper.ai`. *Your answer:* ____________________________________________
    - Namecheap: https://www.namecheap.com/ · Cloudflare: https://www.cloudflare.com/products/registrar/
    - Add custom domain in Firebase Hosting: https://console.firebase.google.com/project/axovia-flipper/hosting
    - Update `APP_URL`, `ALLOWED_ORIGINS`, OAuth redirect URIs (Firebase Auth, Google, GitHub, Facebook) in GCP Secret Manager
- [ ] **[ACTION]** Smoke test the **registration → first scan → first opportunity** journey on the live deployment with three accounts (one Email/password, one Google OAuth, one GitHub OAuth). Capture screenshots — these become marketing assets.

### 3.2 P1 — Strongly Recommended Before Public Launch

- [ ] **[ACTION]** Confirm Cloud SQL automated backups are enabled. Console: https://console.cloud.google.com/sql/instances?project=axovia-flipper → instance → Backups → Enable automated backups (daily, 7-day retention minimum). Document a restore procedure in `docs/dev/OPERATIONS_RUNBOOK.md`.
- [ ] **[ACTION]** Set up uptime monitoring:
    - UptimeRobot (free): https://uptimerobot.com/
    - Better Stack: https://betterstack.com/uptime
    - Or: set the `PRODUCTION_URL` repo secret on the existing GitHub Actions health-check workflow at https://github.com/AXOVIA-ASPEN/flipper-ai/settings/secrets/actions
- [ ] **[ACTION]** Configure Sentry release tracking + source maps for Cloud Run deploy. Test by triggering an error in production and verifying it appears in Sentry within 2 min: https://sentry.io/
- [ ] **[ACTION]** Run all 5 marketplace scrapers against **live** sites and capture a baseline (selectors rot frequently — last verified Feb-March; we're now in May).
    ```bash
    # On a fresh deploy, use the in-app scraper UI or curl:
    curl -X POST https://<your-domain>/api/scraper/craigslist -H 'cookie: <session>' -d '{"location":"sfbay","keywords":"iphone"}'
    curl -X POST https://<your-domain>/api/scraper/ebay      -H 'cookie: <session>' -d '{"keywords":"vintage camera"}'
    curl -X POST https://<your-domain>/api/scraper/facebook  -H 'cookie: <session>' -d '{"location":"austin","keywords":"dyson"}'
    curl -X POST https://<your-domain>/api/scraper/offerup   -H 'cookie: <session>' -d '{"keywords":"airpods"}'
    curl -X POST https://<your-domain>/api/scraper/mercari   -H 'cookie: <session>' -d '{"keywords":"nintendo switch"}'
    ```
    Expect ≥10 listings each. Any zero-result is a P1 selector bug.
- [ ] **[ACTION]** Twilio 10DLC registration (if you intend to send SMS notifications in the US). Without registration, A2P SMS messages are throttled or rejected. Process: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc — typically 7-14 days end-to-end. **[QUESTION]** Are you sure you need SMS at launch? Many users prefer push + email; SMS adds compliance overhead and per-message cost.
    > *Your answer:* ____________________________________________
- [ ] **[ACTION]** Capture marketing assets:
    - 90-second product demo (Loom: https://www.loom.com/ or ScreenStudio: https://www.screen.studio/)
    - 8-12 product screenshots (dashboard, kanban, scanner, opportunity detail, AI analysis card, settings)
    - Twitter/X header + Product Hunt gallery images (1270×760)
    - Drafts for all written marketing copy are in `docs/launch/` (see §6.7)

### 3.3 P2 — Nice-to-Have Before Public Launch

- [ ] OAuth: confirm production Google + GitHub + Facebook credentials are valid and redirect URIs match the new domain.
- [ ] Cookie-consent banner (only required if you target EU; defer if US-only beta).
- [ ] Public status page (https://status.<your-domain> via Statuspage or Better Stack — free tier).
- [ ] Support inbox: route `support@<your-domain>` to your personal email or set up Plain (https://www.plain.com/) / Crisp (https://crisp.chat/).
- [ ] Finish Epic 14 stories 14.8-14.10 if you held them for v1.1.
- [ ] Customer-facing changelog on `https://<your-domain>/changelog` rendered from `CHANGELOG.md`.

---

## 4. Branch Reconciliation — main vs django-main

This needs to be resolved **before** any production deploy.

### 4.1 The current situation

```
              merge-base (191ae1d "wrapping up epic 1")
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
     main                   origin/django-main
   (11 commits)              (89 commits)
   - sprint stories 4.2,     - Vercel → Firebase Hosting + Cloud Run migration
     4.5, 8.2, 8.4           - NextAuth → Firebase Auth migration
   - API doc generation      - Multi-provider AI (Gemini/Groq/OpenAI/Claude)
   - 5 BDD step defs         - All 13 functional epics done
                             - Epic 13 (AI scoring) added
                             - Epic 14 (UI design) ~60% done
                             - Major security hardening
                             - Glassmorphism UI redesign
```

### 4.2 The 11 commits on main not in django-main

| Commit  | What it adds                                                    | django-main equivalent?                                  |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| b605779 | API documentation section to README                             | Already covered in django-main's CHANGELOG + new docs    |
| c62148f | Generate comprehensive API documentation                        | django-main has its own docs/api/ tree                   |
| 9d7700f | [8.4] Message Approval Workflow                                 | ✅ Story 8.4 marked `done` on django-main (refactored)    |
| f128429 | Set up GitHub Actions CI/CD pipeline                            | django-main has more workflows (release.yml, etc.)       |
| 299f707 | Refactor E-004 step definitions                                 | django-main has reorganized step defs entirely           |
| 8e89dcb | E-004 BDD step definitions for sellability                      | Same — superseded                                        |
| 58064b3 | [8.2] AI Negotiation Strategy                                   | ✅ Story 8.2 marked `done` on django-main                 |
| 5824764 | Fix BDD test failures - offline server fallback                 | Likely no longer relevant on django-main                 |
| bbda617 | [4.5] BDD scenarios for LLM Sellability                         | ✅ Story 4.5 done on django-main                          |
| b731495 | [4.5] Configurable undervalue discount threshold                | ✅ Same                                                   |
| a3a4aeb | [4.2] Platform-specific fees & opportunity threshold            | ✅ Story 4.2 done on django-main                          |

**My read:** Every meaningful change on `main` has already been done — usually better — on `django-main`. There is no work on main that needs to be saved.

### 4.3 Recommended path

**Option A (recommended) — Fast-forward main to django-main:**

```bash
# Backup main first (paranoia)
git push origin main:refs/heads/backup/main-2026-05-06

# Reset main to django-main
git checkout main
git reset --hard origin/django-main
git push origin main --force-with-lease

# (Optional) Delete or archive django-main now that main matches it
git push origin --delete django-main
# or rename to legacy/
git push origin origin/django-main:refs/heads/legacy/django-main-pre-merge
git push origin --delete django-main
```

**Risks:** Anyone watching `main` will see 89 commits land at once. Force-push rewrites history (the `main` commits become orphaned, recoverable from the backup branch).

**Option B (safer if collaborators are watching main) — Merge django-main into main:**

```bash
git checkout main
git merge --no-ff origin/django-main -m "merge: integrate django-main (Epic 1-13 complete, Epic 14 in progress)"
git push origin main
```

**Risks:** Creates a merge commit; 89 commits get authored under main with their original hashes preserved. Cleaner history, but the 11 main-only commits remain even though they're functionally redundant.

> **[QUESTION]** Option A or Option B? My recommendation: **Option A** (force-reset). The 11 commits on main don't add anything not already on django-main, and a clean trunk makes future BMAD sprint planning unambiguous.
>
> *Your answer:* ____________________________________________

> **[QUESTION]** Should this `claude/create-release-roadmap-NCkB5` branch (which contains only this RELEASE_ROADMAP.md) be merged into main *after* the reconciliation, so the roadmap lives on the canonical trunk?
>
> *Your answer:* ____________________________________________

> **[QUESTION]** What's the rationale for the `django-main` name? Is there a Django port planned? Or is the name purely historical?
>
> *Your answer:* ____________________________________________

---

## 5. The Critical Path — Step-By-Step Launch Sequence

### Phase A — Soft Beta (Days 1-7)

| Day   | Task                                                                                     | Owner |
| ----- | ---------------------------------------------------------------------------------------- | ----- |
| **1** | Reconcile main ↔ django-main (Option A)                                                  | You   |
| **1** | Buy domain                                                                               | You   |
| **2** | Finish Epic 14.4-14.7 (or land your chosen scope)                                        | You   |
| **3** | Cloud Run production deploy via release tag                                              | You   |
| **3** | Verify GCP Secret Manager has all production secrets seeded                              | You   |
| **3** | Run 5-scraper smoke test in production                                                   | You   |
| **4** | Stripe live mode + real-card upgrade test                                                | You   |
| **4** | UptimeRobot + Sentry alerts wired                                                        | You   |
| **5** | Record 90s demo video + capture 12 product screenshots                                   | You   |
| **6** | Send beta invitations to 10-20 hand-picked users (template: `docs/launch/beta-invitation.md`) | You   |
| **7** | Daily Sentry/funnel monitor; iterate on first-day feedback                              | You   |

**Exit criteria for Phase A:**
- [ ] At least 10 beta users signed up, ran a scan, added one opportunity
- [ ] At least 1 beta user paid (the easiest validation that the funnel works end-to-end)
- [ ] Zero P0 bugs open in Sentry for 72 hours

### Phase B — Public Launch Prep (Days 8-21)

- [ ] Land Epic 14.8-14.10 if not already (or accept v1.1 deferral)
- [ ] Schedule Product Hunt launch for a Tuesday at 12:01 AM PT
- [ ] Pre-line up 10 friends for upvotes/comments
- [ ] Affiliate program live (Rewardful + Stripe in <1 hour)
- [ ] "Founder's Discount" email to beta users
- [ ] Marketing copy bundle reviewed and queued (`docs/launch/`)

### Phase C — Public Launch Day (Days 22-26)

- [ ] **12:01 AM PT Tuesday**: Product Hunt goes live
- [ ] **12:15 AM PT**: Send launch email + Twitter thread + Reddit posts
- [ ] **All day**: Respond to every comment within 60 minutes
- [ ] **End of day**: Recap thread with screenshots of placement (target Top-5)

Hour-by-hour playbook: see `docs/launch/launch-day-runbook.md`.

---

## 6. Open Risks & Mitigations

| Risk                                                                              | Likelihood | Impact | Mitigation                                                                                                                                      |
| --------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketplace TOS / scraper bans (esp. Facebook, Mercari, OfferUp)                  | High       | High   | Position as "user-driven assistant"; respect rate limits; rotate IPs; have a contingency to disable non-API marketplaces if cease-and-desist arrives |
| AI cost overrun                                                                   | Low-Med    | Medium | Mostly mitigated — multi-provider with **Gemini free as primary** + 24h cache. Monitor `metrics.ts`; cap analyses/tier in `tier-enforcement.ts`  |
| Stripe live-mode failures at first paid signup                                    | Medium     | High   | Test with your own card before launch; Sentry alert on `webhooks/stripe` 4xx/5xx                                                                |
| Trademark or eBay/FB legal letter                                                 | Low-Med    | High   | LLC + ToS already drafted; "we comply with platform ToS" stock response ready                                                                  |
| Scraper breakage during launch (selector update on a marketplace)                  | Medium     | Medium | Selector fallbacks already coded; alert on scraper-success-rate drop                                                                            |
| Twilio SMS rejected without 10DLC registration                                    | High if SMS used at launch | Medium | Either complete 10DLC registration *now* (7-14 days) or disable SMS for launch                                                                  |
| Cloud Run cold starts hurting first-impression latency                            | Medium     | Low-Med | Set `--min-instances=1` for the prod service (small cost, big UX gain)                                                                          |
| GCP Secret Manager misconfig at deploy time                                       | Medium     | High   | Run `helpers/secrets.py`-equivalent in CI as a pre-deploy gate; fail closed if any required secret missing                                      |

---

## 7. Marketing & Revenue Growth Plan

The previous version of this section is preserved largely unchanged — the channel ranking and pricing recommendations don't depend on which branch you're on. Concrete asset drafts for everything below are now in `docs/launch/`.

### 7.1 Acquisition Channels — Ranked by Cost-to-First-Dollar

#### Tier 1 — Do These First (Free, High-Leverage)

1. **Reddit organic** — r/Flipping (1.3M), r/sidehustle (500k), r/Entrepreneur (3M), r/eBay (200k), r/thrifting (300k), r/garagesale (50k). Drafts in `docs/launch/reddit-launch-posts.md`.
2. **Twitter/X #buildinpublic + #indiehackers** — Daily MRR/users update thread starting today. Engage @arvidkahl, @levelsio, @marc_louvion, @dvassallo. Thread drafts in `docs/launch/twitter-launch-thread.md`.
3. **Product Hunt** — Drafts in `docs/launch/product-hunt-listing.md`.
4. **Hacker News "Show HN"** — Drafts in `docs/launch/hacker-news-show-hn.md`.
5. **Indie Hackers product post** — https://www.indiehackers.com/products
6. **Founder-led TikTok / YouTube Shorts** — Three videos/week for 8 weeks; format: *"I bought this $40 lamp using AI. It sold for $400."*

#### Tier 2 — Free But Slower-Burn

7. **SEO content engine** — Target queries with commercial intent ("best flipping apps 2026", "ebay arbitrage tools", etc.). 2x/week for 6 months.
8. **YouTube long-form** — "Flipper AI Diaries": $200 → $2,000 challenge using the tool, 1/week.
9. **Newsletter sponsorships** — The Hustle, Side Hustle Stack, small reseller newsletters $50-200.

#### Tier 3 — Paid (Only After Channel Validation)

10. **Facebook/Instagram ads** — interest: "eBay sellers", "Mercari", "Poshmark sellers". $50/day after free channels saturate.
11. **Google Search Ads** — keywords: "flipping software", "ebay scanner". Expect $2-5 CPC.
12. **Reddit promoted posts** — only after a successful organic post in the same sub.

### 7.2 Pricing & Packaging Optimizations

Current tiers: FREE (10 scans/day, 1 marketplace) · FLIPPER $19/mo · PRO $49/mo. Suggested adjustments:

| Suggestion                                                                  | Rationale                                                                              | Effort |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| **Add an annual plan** at 20% off                                           | Captures higher LTV upfront. ~30% of SaaS revenue typically comes from annual.         | 2h     |
| **Add a "Lifetime Founder" deal** ($299 once) for first 100 customers       | Signals scarcity, generates immediate cash, gives early advocates skin in the game     | 1h     |
| **Add a per-flip success-fee tier** ($0/mo + 5% of profit on tracked flips) | Lower-friction entry, captures value when users *actually* succeed                     | 2 weeks |
| **Free-tier limit: switch from "10 scans/day" to "1 saved search"**         | A saved search converts to addiction faster than scan-quota grinds                     | 4h     |
| **Add "PRO Team" at $99/mo** — 3 seats + shared inventory                   | Captures the family-business / partner segment (~10% of the reseller market)           | 1 week |

### 7.3 Retention & Expansion Mechanics

- **Aha-moment instrumentation** — define "first profitable opportunity scored" as the activation event. Track in `analytics-service.ts`. Alert when activation rate <40%.
- **Win-streak emails** — first time a user moves an opportunity to SOLD, send "🎉 You made $X — here's what to flip next".
- **Loss-streak emails** — at day 14 with zero opportunities, auto-email "Your saved search isn't finding much — want me to suggest better filters?"
- **Onboarding upgrade prompts** — gate 1 PRO feature in onboarding ("We found a high-confidence flip — unlock to see the recommended offer price"). 3-5x the upgrade rate of in-app upgrade buttons.
- **Public dashboard / share button** — let PRO users share a redacted "I made $X this month with Flipper.ai" graphic. Free word-of-mouth.

### 7.4 Referral & Affiliate

- **Referral**: 1 free month per referred paid customer; referee gets 20% off month 1. Implement via unique signup codes in `User.referralCode`. ~1 week.
- **Affiliate**: 30% recurring for 12 months. Recruit YouTubers in flipping niche (5-50k subs); reseller bloggers. Use Rewardful (https://www.rewardful.com/) or Tolt (https://tolt.io/) — both integrate with Stripe in <1 hour.

### 7.5 Free Tools as Top-of-Funnel

Build *one* of these and you'll get permanent SEO traffic. They cost a weekend each.

- **eBay Sold Price Lookup** — public widget at `/tools/ebay-price-check`. Already have `market-price.ts`.
- **Flip Profit Calculator** — input buy/sell/platform → outputs profit after fees. Already have `roi-calculator.ts`.
- **Marketplace Fee Comparison** — table of eBay vs Mercari vs FB fees at different price points.

Each tool has a "Find more deals like this with Flipper.ai →" CTA. Free tools historically convert at 3-7% to signups.

### 7.6 Adjacent Revenue Streams (Months 6-12)

Once MRR ≥$3k, consider:

- **Sponsored deal alerts** — partners pay to surface their deals. CPM model.
- **Affiliate revenue** — eBay Partner Network / Amazon Associates cut on user purchases.
- **Data product** — anonymized "what's hot in flipping" market reports. $99/mo or $999/yr.
- **Flipper Academy** — $199 course on flipping fundamentals via Maven (https://www.maven.com/).
- **API-as-a-product** — expose deal scoring API to other tool builders. $0.01/call. OpenAPI spec already at `/docs`.

### 7.7 Marketing Assets — Drafted For You

I've drafted ready-to-edit copy for all of the launch channels — they live in `docs/launch/`:

| File                                       | Purpose                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `docs/launch/product-hunt-listing.md`      | PH title, tagline, description, gallery captions, maker comment          |
| `docs/launch/hacker-news-show-hn.md`       | "Show HN" post title + body + comment-thread response template          |
| `docs/launch/reddit-launch-posts.md`       | 4 posts tailored to r/Flipping, r/sidehustle, r/Entrepreneur, r/eBay     |
| `docs/launch/twitter-launch-thread.md`     | 12-tweet launch thread + 30 days of #buildinpublic prompts               |
| `docs/launch/email-drip-campaign.md`       | Welcome → Day 2 → Day 5 → Day 10 → Day 14 sequence (5 emails)           |
| `docs/launch/beta-invitation.md`           | DM/email template for inviting 10-20 hand-picked beta users              |
| `docs/launch/launch-day-runbook.md`        | Hour-by-hour Tuesday playbook (T-24h through T+72h)                      |

You can edit/personalize these directly — they're written in your voice (founder-direct, no corporate fluff).

### 7.8 Defensibility — Why This Is Hard To Copy

| Moat                                | Status                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Multi-marketplace coverage**       | **Strong** — most competitors do 1-2 platforms; you have 5                                            |
| **3-tier AI pipeline + multi-provider** | **Stronger now** — auto-fallback across 4 providers, free-tier Gemini primary makes you cost-competitive at any scale |
| **Network effects**                  | Weak today — strengthen via shared "Hot Deals" feed (PRO tier)                                        |
| **Brand + content library**          | Currently zero — see §7.1 (this is your highest-leverage next bet)                                    |
| **Switching cost**                   | Medium — saved searches + tracked opportunities + flip history are sticky                             |

---

## 8. Open Questions for You

Please answer these inline. Each one changes the plan in a non-trivial way.

### 8.1 Branch / Engineering

> **Q1.** Branch reconciliation: Option A (force-reset main to django-main) or Option B (merge django-main into main)?
>
> *Your answer:* ____________________________________________

> **Q2.** What's the rationale for the `django-main` name? Is there a Django port planned, or is this purely historical?
>
> *Your answer:* ____________________________________________

> **Q3.** Should `claude/create-release-roadmap-NCkB5` (this branch, RELEASE_ROADMAP.md only) be merged into main after reconciliation?
>
> *Your answer:* ____________________________________________

> **Q4.** Epic 14 scope at launch: ship 14.1-14.7, defer 14.8-14.10 to v1.1 (recommended) — or hold the launch until all 10 stories are done?
>
> *Your answer:* ____________________________________________

### 8.2 Product

> **Q5.** Are you including SMS notifications at launch, or holding for v1.1? SMS adds Twilio 10DLC compliance overhead (7-14 days). Push + email cover ~95% of the value with no compliance work.
>
> *Your answer:* ____________________________________________

> **Q6.** Scraper posture: Conservative (only eBay API + Craigslist) or Aggressive (all 5 marketplaces)? Aggressive = more reach + more legal exposure.
>
> *Your answer:* ____________________________________________

> **Q7.** Pricing: keep current ($19 / $49) or shift to suggested ($29 / $79 + Lifetime Founder $299)?
>
> *Your answer:* ____________________________________________

### 8.3 Strategic

> **Q8.** Launch budget for first 90 days?
>
> *Your answer:* ____________________________________________

> **Q9.** Target MRR by end of Month 3?
>
> *Your answer:* ____________________________________________

> **Q10.** Full-time on this, or side project? Affects support response time, content cadence.
>
> *Your answer:* ____________________________________________

### 8.4 Marketing

> **Q11.** Willing to be **the face** of the brand (TikTok, YouTube, founder-led content)? Cheapest growth lever, but requires you on camera. Alternative: hire a creator on Upwork ($500-1500 first month).
>
> *Your answer:* ____________________________________________

> **Q12.** Existing audience? (Twitter/X followers, email list, Reddit karma — determines warm vs cold launch)
>
> *Your answer:* ____________________________________________

> **Q13.** Domain preference — `flipperai.app`, `getflipper.ai`, `tryflipper.com`, `flipthat.ai`, `flipper.app`, `useflipper.ai`, or your own?
>
> *Your answer:* ____________________________________________

### 8.5 Operational

> **Q14.** Support email — what's the "from" address (e.g. `stephen@<domain>`, `support@<domain>`, `hello@<domain>`)? And where should incoming `support@` mail route?
>
> *Your answer:* ____________________________________________

> **Q15.** Comfort with you-as-on-call for the first 30 days? P0 bugs will happen; founder-fix is fastest. 1-2 hour response window?
>
> *Your answer:* ____________________________________________

---

## 9. Summary Recommendation

If you want a **single recommendation** for what to do tomorrow:

1. **Decide branch strategy** (Q1) — without this, no production deploy goes out.
2. **Buy a domain** (Q13) — 15 minutes.
3. **Finish Epic 14.4-14.7** — your biggest engineering item.
4. **Run a Cloud Run production deploy** with seeded GCP Secret Manager credentials.
5. **Stripe live-mode test with your own card.**
6. **Pick 10 beta users** from your network and DM them this weekend (template ready in `docs/launch/beta-invitation.md`).
7. **Answer the questions in §8** so I can deliver v3 of this roadmap with concrete dates and ad budgets scoped to your answers.

Everything else can wait. The product is **far** more ready than the previous roadmap implied; the gap is deployment hygiene + finishing Epic 14 + a real first paying customer, not features.

---

*Reply with your §8 answers (or just edit them in this file and tell me to re-read) and I'll generate v3 with concrete dates, an ad budget, and the next 4 weeks of Epic 14 + launch stories scoped against your answers.*
