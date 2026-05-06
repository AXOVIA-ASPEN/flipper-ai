# Flipper.ai — Release Roadmap

**Version:** 1.0
**Prepared:** 2026-05-06
**Audience:** Stephen Boyett (Founder)
**Purpose:** Single source of truth for current project status, the path to a public v1 launch, and the post-launch growth plan. Sections marked with **[ACTION]** require something from you. **[QUESTION]** sections have an answer space — fill those in directly in this file and I'll incorporate them on the next pass.

---

## 0. How To Use This Document

1. Skim **Section 1 (Executive Summary)** for the headline.
2. Read **Section 2 (Feature Status)** to see exactly what's built, tested, and shippable.
3. Use **Section 3 (Pre-Launch Checklist)** as your active to-do list — every line is either green (done) or actionable (with a link).
4. Answer the **[QUESTION]** prompts inline. I'll re-plan around your answers.
5. Use **Section 6 (Go-To-Market)** as a 90-day post-launch playbook.

---

## 1. Executive Summary

**TL;DR:** The product is *engineering-ready for a soft beta* but *not yet ready for a paid public launch*. The core feature surface (scrapers, AI scoring, kanban, Stripe billing, dashboards) is implemented and unit-tested at 99%+ coverage on Vercel, but three things stand between you and a confident v1 release: **(1)** verified end-to-end production smoke, **(2)** a real domain + payment processing in live mode, and **(3)** a tested onboarding funnel that actually retains users.

| Dimension                     | Status                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **Codebase**                  | 53 API routes, 14 BDD feature files, 86 Playwright specs, ~2,378 unit tests, 99%+ coverage   |
| **Deployment**                | Live on Vercel preview (`flipper-ai-ten.vercel.app`); production domain not yet configured  |
| **Database**                  | PrismaPostgres provisioned; backups + connection pooling not yet verified                    |
| **AI Pipeline**               | 3-tier (GPT-4o-mini → Claude Sonnet → GPT-4o-mini) implemented, caching live                 |
| **Billing**                   | Stripe Checkout + webhook code complete; live-mode keys + end-to-end purchase not yet tested |
| **Auth**                      | NextAuth v5 (email + Google + GitHub + Facebook) — production credential setup pending      |
| **Critical Blockers**         | 2 (production smoke, domain/Stripe-live)                                                     |
| **High-Priority Gaps**        | 6 (uptime monitoring, real e2e of paid flow, FCM, SMS, scraper anti-detection in prod, etc.) |
| **Realistic launch window**   | **Soft beta in 7-10 days; public Product Hunt launch in 4-6 weeks**                          |

---

## 2. Feature Status Matrix

Legend: ✅ Implemented & tested · 🟡 Implemented but not e2e-verified · 🟠 Partially built · ⛔ Not started · 🔵 Phase 2 / post-launch

### 2.1 Core Functionality (MVP)

| Epic / FR Group                                          | Code | Unit | BDD | E2E | Live-Verified | Notes                                                                   |
| -------------------------------------------------------- | ---- | ---- | --- | --- | ------------- | ----------------------------------------------------------------------- |
| **E1 — Production Infrastructure**                       | ✅    | ✅    | ✅   | 🟡  | 🟡            | On Vercel today; planned migration to GCP Cloud Run + Cloud SQL not yet executed (per `_bmad-output/planning-artifacts/architecture.md`) |
| **E2 — User Registration / Auth / Onboarding**           | ✅    | ✅    | 🟡  | ✅   | 🟡            | Login/signup work in preview. Reg-API 500 was reported P0 in Feb; recent commits suggest fix — **needs live retest** |
| **E3 — Multi-Marketplace Scanning** (Craigslist, eBay, FB, OfferUp, Mercari) | ✅    | ✅    | 🟡  | ✅   | 🟠            | All 5 scrapers exist (`app/api/scraper/*`). Anti-detection holds in dev; *needs validation against live platforms with current 2026 selectors* |
| **E4 — Core Scoring & Deal Evaluation**                  | ✅    | ✅    | 🟡  | ✅   | 🟡            | Algorithmic + LLM tiers implemented. Stories 4.2 and 4.5 landed recently (platform fees, sellability) |
| **E5 — Advanced Market Intelligence** (Claude structural, comps, sold-volume, seller rep, logistics) | 🟠    | 🟡    | ⛔   | 🟠   | ⛔             | `claude-analyzer.ts` exists; comparable matching + sold-volume + seller-rep gathering only partially wired |
| **E6 — Flip Lifecycle (Kanban, analytics, reports)**     | ✅    | ✅    | ✅   | ✅   | 🟡            | Kanban + drag/drop + analytics all working in preview                  |
| **E7 — Subscription & Billing**                          | ✅    | ✅    | 🟡  | ✅   | ⛔             | Stripe code complete with webhooks; **never run end-to-end with a live customer card** |
| **E8 — Seller Communication & Negotiation**              | ✅    | ✅    | 🟡  | ✅   | 🟡            | 8.2 (negotiation) + 8.4 (approval) shipped this sprint                 |
| **E9 — Cross-Platform Resale Listing**                   | ✅    | ✅    | 🟡  | ✅   | 🟠            | AI title/description gen + posting queue exist; eBay live-listing path needs auth-token validation |
| **E10 — Email Notifications + Background Jobs**          | 🟡    | ✅    | 🟡  | ✅   | 🟠            | Resend templates exist; background scheduler (cron / pg_cron) is **not deployed in production** |
| **E11 — Push (FCM) + SMS (Twilio)**                      | ⛔    | —    | —   | —   | —             | Phase 2 — not started                                                  |
| **E12 — Calendar / Maps integration**                    | ⛔    | —    | —   | —   | —             | Phase 2 — not started                                                  |

### 2.2 Source-of-truth disagreement

There is a **discrepancy between the BMAD sprint tracker** (`_bmad-output/implementation-artifacts/sprint-status.yaml`, which still lists Epics 3-12 as `backlog`) **and the actual codebase** (where most of those epics' feature surface already exists with passing unit tests). The codebase is ahead of the tracker — a one-hour reconciliation pass should bring them back in sync. **[ACTION] [P2]** I can update the sprint tracker file to reflect reality if you want — say the word.

### 2.3 Testing Pipeline

| Test Layer                  | Count             | Coverage / Status                                      |
| --------------------------- | ----------------- | ------------------------------------------------------ |
| Jest unit tests             | ~2,378 tests / 116 suites | 99.25% statements, 100% branches, 100% functions, 99.20% lines (per `docs/testing/COVERAGE_VERIFICATION.md`) |
| Cucumber BDD feature files  | 14 (9 legacy + 5 new tagged) | Step definitions exist for all; traceability matrix shows Epic 1 fully covered, Epics 2-12 mostly **Pending**  |
| Playwright E2E specs        | 86 specs          | Cover full user journeys; 11 in `test/e2e/acceptance/` |
| Visual regression           | ✅ via Playwright  | Configured for chromium + firefox + webkit + mobile    |
| Accessibility (axe)         | ✅                 | `accessibility.spec.ts`, WCAG AA target                |
| Performance vitals          | ✅                 | `performance-vitals.spec.ts`                           |
| Load testing                | ✅                 | `autocannon` configured                                |

**Verdict:** Unit and E2E coverage is exceptional. The remaining gap is **acceptance-test coverage of the Functional Requirements** (the traceability matrix is mostly "Pending" outside Epic 1) — but this is a documentation/process gap, not a behavior gap. The code is exercised; the formal `@FR-XXX-NN` tags just haven't been backfilled.

---

## 3. Release Readiness — Pre-Launch Checklist

This is your **active to-do list**. Each box is either ✅ (done) or **[ACTION]** with the link/command to act on it.

### 3.1 P0 — Hard Blockers (Must Do Before Soft Beta)

- [ ] **[ACTION]** Verify the registration HTTP-500 fix in production. Recent commits (`8b8e1d2`, `1169f43`, `7e87757`) addressed the LibSQL → PostgreSQL adapter and the Auth-routes-returning-500 bug, but none of those was confirmed against a live Postgres. Run `./scripts/deploy/verify-deployment.sh https://flipper-ai-ten.vercel.app` and walk a real signup → login → first-scan flow.
  - Vercel dashboard: https://vercel.com/dashboard
  - Diagnostics endpoint: https://flipper-ai-ten.vercel.app/api/diagnostics
- [ ] **[ACTION]** Decide hosting strategy. The architecture doc plans GCP Cloud Run + Cloud SQL + Firebase Hosting; current reality is Vercel + PrismaPostgres. **Don't migrate before launch** — pick one and lock it in.
  - **[QUESTION]** Stay on Vercel for v1 (cheaper, faster to ship), or migrate to GCP now (matches architecture doc, adds 2-3 weeks)?
    > *Your answer:* ____________________________________________
- [ ] **[ACTION]** End-to-end test the **paid-customer flow** with a **real card in Stripe live mode**:
    1. Switch Stripe to live mode in dashboard: https://dashboard.stripe.com/test/dashboard → toggle off "Test mode"
    2. Create live products + price IDs for FREE / FLIPPER ($19) / PRO ($49) tiers
    3. Update env vars `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*` in Vercel
    4. Register the webhook endpoint: https://dashboard.stripe.com/webhooks (URL: `https://<your-domain>/api/webhooks/stripe`)
    5. Sign up as a real user, upgrade with a real card (use yours, refund yourself), confirm tier change in DB
- [ ] **[ACTION]** Provision a real domain.
  - **[QUESTION]** What domain? (`flipper.ai` is taken; suggested: `flipperai.app`, `getflipper.ai`, `tryflipper.com`, `flipthat.ai`)
    > *Your answer:* ____________________________________________
  - Namecheap: https://www.namecheap.com/ · Cloudflare: https://www.cloudflare.com/products/registrar/
  - Add as custom domain in Vercel: Project → Settings → Domains
  - Update `NEXTAUTH_URL`, `ALLOWED_ORIGINS`, `FACEBOOK_REDIRECT_URI` env vars accordingly

### 3.2 P1 — Strongly Recommended Before Public Launch

- [ ] **[ACTION]** Configure database backups. PrismaPostgres console: https://console.prisma.io/ → enable daily backups; document a restore procedure in `docs/dev/OPERATIONS_RUNBOOK.md`.
- [ ] **[ACTION]** Set up uptime monitoring (free tier is fine):
  - UptimeRobot: https://uptimerobot.com/ (5-min intervals, 50 free monitors)
  - Better Stack: https://betterstack.com/uptime
  - Already have GitHub Actions workflow at `.github/workflows/health-check.yml` — just set the `PRODUCTION_URL` repo secret: https://github.com/AXOVIA-ASPEN/flipper-ai/settings/secrets/actions
- [ ] **[ACTION]** Confirm Sentry alerting works.
  - Sentry: https://sentry.io/
  - Trigger a test error: `curl https://<your-domain>/api/diagnostics?throw=1`
  - Verify alert email/Slack arrives within 2 minutes
- [ ] **[ACTION]** Run all 5 marketplace scrapers against **live** sites today and capture a baseline. Marketplaces change selectors; the scrapers were last verified in February.
  ```bash
  make dev
  # then in another tab:
  curl -X POST http://localhost:3000/api/scraper/craigslist -d '{"location":"sfbay","keywords":"iphone"}' -H 'content-type: application/json'
  curl -X POST http://localhost:3000/api/scraper/ebay      -d '{"keywords":"vintage camera"}'           -H 'content-type: application/json'
  curl -X POST http://localhost:3000/api/scraper/facebook  -d '{"location":"austin","keywords":"dyson"}'  -H 'content-type: application/json'
  curl -X POST http://localhost:3000/api/scraper/offerup   -d '{"keywords":"airpods"}'                  -H 'content-type: application/json'
  curl -X POST http://localhost:3000/api/scraper/mercari   -d '{"keywords":"nintendo switch"}'          -H 'content-type: application/json'
  ```
  Expect ≥10 listings per scraper. Any zero-result scraper is a P1 selector-rot bug.
- [ ] **[ACTION]** Deploy the background job scheduler (Epic 10.1) so saved-search scans actually run on a cadence. Options:
  - Vercel Cron Jobs: https://vercel.com/docs/cron-jobs (cheapest, declared in `vercel.json`)
  - GitHub Actions on schedule (already used for health-check)
  - Upstash QStash: https://upstash.com/docs/qstash
- [ ] **[ACTION]** Backfill the **requirements traceability matrix** for Epics 2-10 with `@FR-XXX-NN` tags on the existing BDD scenarios. This is mostly tagging work — the tests already exist. Estimated 4-6 hours.
- [ ] **[ACTION]** Capture marketing assets:
  - 90-second product demo (Loom: https://www.loom.com/ or ScreenStudio: https://www.screen.studio/)
  - 8-12 product screenshots (dashboard, kanban, scanner, opportunity detail, AI analysis card)
  - Twitter/X header + Product Hunt gallery images (1270×760)

### 3.3 P2 — Nice-to-Have Before Public Launch

- [ ] OAuth: enable Google sign-in in production (https://console.cloud.google.com/apis/credentials) and GitHub (https://github.com/settings/developers) — already wired in code, just needs prod credentials in Vercel env.
- [ ] Cookie-consent banner (only required if you target EU traffic; defer if US-only beta).
- [ ] Public status page (https://status.flipperai.app via Statuspage or Better Stack — free tier).
- [ ] Support inbox: route `support@<your-domain>` to your personal email or set up Plain (https://www.plain.com/) / Crisp (https://crisp.chat/).
- [ ] Reconcile `_bmad-output/implementation-artifacts/sprint-status.yaml` with reality (mark Epics 3-9 stories as `done` where the code ships).
- [ ] Phase-2 gates (FCM push, Twilio SMS, Google Calendar/Maps, Firebase Auth migration) — explicitly out of scope for v1.

---

## 4. The Critical Path — Step-By-Step Launch Sequence

### Phase A — Soft Beta (Days 1-10)

| Day   | Task                                                                              | Owner |
| ----- | --------------------------------------------------------------------------------- | ----- |
| **1** | Buy domain (P0)                                                                   | You   |
| **1** | Confirm reg/login flow against live PG (P0)                                       | You   |
| **2** | Switch Stripe to live mode + verify a real upgrade (P0)                           | You   |
| **2** | Re-run 5 scrapers, fix any selector rot (P1)                                      | You   |
| **3** | Deploy background scheduler (P1)                                                  | You   |
| **3** | Set up UptimeRobot + Sentry alerts (P1)                                           | You   |
| **4** | Record 90s demo video (P1)                                                        | You   |
| **5** | Capture 12 marketing screenshots (P1)                                             | You   |
| **6** | Invite 10-20 hand-picked beta users (DMs in r/flipping, friends-of-friends)       | You   |
| **7** | Daily monitor: Sentry, conversion funnel, churn signals                           | You   |
| **8-10** | Iterate on top-3 user-reported pain points                                     | You   |

**Exit criteria for Phase A:**
- [ ] At least 10 beta users have signed up, run a scan, and added one opportunity
- [ ] At least 1 beta user has paid (the easiest validation that the funnel works end-to-end)
- [ ] Zero P0 bugs open in Sentry for 72 hours

### Phase B — Public Launch Prep (Days 11-25)

- [ ] Write a **2,000-word Product Hunt copy** + tagline (**[QUESTION]** — see Section 7).
- [ ] Schedule the launch tweet thread, Reddit posts (r/Flipping, r/sidehustle, r/Entrepreneur), and Hacker News "Show HN".
- [ ] Pre-line up 10 friends to upvote/comment on PH at launch (https://www.producthunt.com/).
- [ ] Build the affiliate program (see Section 6.3).
- [ ] Email a "Founder's Discount" offer to your beta users — this is your first MRR.

### Phase C — Public Launch Day (Day 26-30)

- [ ] **12:01 AM PT Tuesday**: Product Hunt goes live (https://www.producthunt.com/)
- [ ] **12:15 AM PT**: Send launch email to waitlist + Twitter thread + Reddit posts
- [ ] **All day**: Respond to every comment within 60 minutes
- [ ] **End of Day**: Post a recap thread, screenshots of Top-5 placement (target)

---

## 5. Open Risks & Mitigations

| Risk                                                                          | Likelihood | Impact | Mitigation                                                                                                                          |
| ----------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Marketplace TOS / scraper bans** (esp. Facebook, Mercari, OfferUp)          | High       | High   | Position as "user-driven assistant" (each scrape happens in user's browser context where possible); rotate IPs; respect rate limits; have a contingency to remove non-API marketplaces if cease-and-desist arrives |
| **AI cost overrun** (3-tier pipeline can run $0.05-0.30 per analysis)         | Medium     | Medium | Already have 24h cache (`AiAnalysisCache`); monitor `metrics.ts` cost tracking; cap analyses/user/day per tier in `tier-enforcement.ts` |
| **Stripe live-mode failures** at the moment of first paid signup              | Medium     | High   | Test with your own card now; add Sentry alert on `webhooks/stripe` 4xx/5xx                                                          |
| **Trademark or eBay/FB legal letter**                                         | Low-Med    | High   | LLC + ToS already drafted; have a "we comply with platform ToS" stock response ready                                                |
| **Scraper breakage during launch** (a marketplace updates selectors)          | Medium     | Medium | Selector fallbacks already coded; alert on scraper-success-rate drop; have a "Marketplace experiencing issues" banner ready          |
| **Spammy / abusive users** triggering Captcha or bans                         | Medium     | Low    | hCaptcha on signup (already in code); rate limiter; manual ban switch in admin runbook                                              |

---

## 6. Marketing & Revenue Growth Plan

The existing `docs/GO_TO_MARKET_STRATEGY.md` is a solid baseline. Below is the **expanded, opinionated playbook** layered on top, organized by leverage rather than by week.

### 6.1 Acquisition Channels — Ranked by Cost-to-First-Dollar

#### Tier 1 — Do These First (Free, High-Leverage)

1. **Reddit organic** — by far the highest-fit audience.
    - **Top targets:** r/Flipping (1.3M), r/sidehustle (500k), r/Entrepreneur (3M), r/eBay (200k), r/thrifting (300k), r/garagesale (50k)
    - **Strategy:** Don't post the product first. Spend 2 weeks **answering questions in those subs**, building karma. Then post a "I built this for myself, sharing it free for the first 100" post.
    - **Sample title:** *"After spending 3 months scrolling Craigslist for under-priced items, I built an AI that does it for me. Here's what I found."*
2. **Twitter/X #buildinpublic + #indiehackers**
    - Post a daily MRR/users update thread starting today. Builds an audience *before* you need one.
    - Engage with @arvidkahl, @levelsio, @marc_louvion, @dvassallo — flippable + dev intersection.
3. **Hacker News "Show HN"**
    - Post the day after Product Hunt. Title format: *"Show HN: Flipper.ai – I built an AI that finds underpriced items on 5 marketplaces"*. Front-page is ~$30k-50k in attention.
4. **Indie Hackers product post** — https://www.indiehackers.com/products
5. **Founder-led TikTok / YouTube Shorts**
    - Format: *"I bought this $40 lamp using AI. It sold for $400. Here's the search query."*
    - Three videos per week for 8 weeks builds compounding reach. Cost: ~$0.

#### Tier 2 — Free But Slower-Burn

6. **SEO content engine** (the long-term winner). Target queries with commercial intent:
    - "best flipping apps 2026"
    - "how to find deals on craigslist"
    - "ebay arbitrage tools"
    - "facebook marketplace flipping"
    - Publish 2x/week for 6 months. Use https://ahrefs.com/keywords-explorer (paid) or https://ubersuggest.com/ (free).
    - **Hook posts:** *"I scraped 10,000 Craigslist listings — here are the 50 most profitable categories"* (datajournalism = backlinks).
7. **YouTube long-form** — start a "Flipper AI Diaries" channel, document a real $200 → $2,000 challenge using the tool. 1 video/week. Each video doubles as a testimonial + a sales pitch.
8. **Newsletter sponsorships** (low-cost, high-fit):
    - The Hustle (https://thehustle.co) – $$
    - Side Hustle Stack (https://www.sidehustlestack.co/)
    - Reseller's Roundup (small newsletters $50-200)

#### Tier 3 — Paid (Only After Channel Validation)

9. **Facebook/Instagram ads** — interest-targeted to "eBay sellers", "Mercari", "Poshmark sellers". Run a $50/day test only after free channels saturate.
10. **Google Search Ads** — keywords: "flipping software", "ebay scanner", "marketplace scraper". Expect $2-5 CPC.
11. **Reddit promoted posts** — only after you've already had a successful organic post in the same sub.

### 6.2 Pricing & Packaging Optimizations

Current tiers: FREE (10 scans/day, 1 marketplace) · FLIPPER $19/mo · PRO $49/mo. Suggested adjustments:

| Suggestion                                  | Rationale                                                                                              | Effort |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| **Add an annual plan** at 20% off            | Captures higher LTV upfront. ~30% of SaaS revenue typically comes from annual.                         | 2h     |
| **Add a "Lifetime Founder" deal** ($299 once) for the first 100 customers | Signals scarcity, generates immediate cash, gives early advocates skin in the game | 1h     |
| **Add a per-flip success-fee tier** ("Hustler" — $0/mo + 5% of profit on tracked flips) | Lower-friction entry, captures value when users *actually* succeed, hard for competitors to copy | 2 weeks |
| **Free-tier limit: switch from "10 scans/day" to "1 saved search"**       | A saved search converts → addiction faster than scan-quota grinds                       | 4h     |
| **Add "PRO Team" at $99/mo** — 3 seats + shared inventory                 | Captures the family-business / partner segment (~10% of the reseller market)            | 1 week |

### 6.3 Retention & Expansion Mechanics

- **Aha-moment instrumentation** — define "first profitable opportunity scored" as the activation event. Track in `analytics-service.ts`. Alert when activation rate <40%.
- **Win-streak emails** — the first time a user moves an opportunity to SOLD, send a "🎉 You made $X — here's what to flip next" email.
- **Loss-streak emails** — at day 14 with zero opportunities created, automatically email: "Your saved search isn't finding much — want me to suggest better filters?"
- **Onboarding upgrade prompts** — gate 1 PRO-tier feature in onboarding (e.g., "We found a high-confidence flip — unlock to see the recommended offer price"). 3-5x the upgrade rate of in-app upgrade buttons.
- **Public dashboard / share button** — let PRO users share a redacted "I made $X this month with Flipper.ai" graphic. Free word-of-mouth.

### 6.4 Referral & Affiliate

- **Referral**: 1 free month per referred paid customer; referee gets 20% off month 1. Implement via unique signup codes in `User.referralCode`. Estimated effort: ~1 week.
- **Affiliate**: 30% recurring for 12 months. Recruit:
    - YouTubers in the flipping niche: search "flipping ebay tutorial" on YouTube, DM channels with 5-50k subs.
    - Reseller bloggers (https://www.fleamarketflipper.com/, https://www.thethriftylane.com/).
    - Use Rewardful (https://www.rewardful.com/) or Tolt (https://tolt.io/) — both integrate cleanly with Stripe in <1 hour.

### 6.5 Free Tools as Top-of-Funnel

Build *one* of these and you'll get permanent SEO traffic. They cost a weekend each.

- **eBay Sold Price Lookup** — public widget at `/tools/ebay-price-check`. Already have `market-price.ts` doing the lookup.
- **Flip Profit Calculator** — input buy price, sell price, platform → outputs profit after fees. Already have `roi-calculator.ts`.
- **Marketplace Fee Comparison** — table of eBay vs Mercari vs FB fees at different price points.

Each tool has a "Find more deals like this automatically with Flipper.ai →" CTA. Free tools historically convert at 3-7% to signups.

### 6.6 Adjacent Revenue Streams (Months 6-12)

Once MRR is ≥$3k, consider:

- **Sponsored deal alerts** — partners (eBay, StockX, etc.) pay to surface their deals in user feeds. CPM model.
- **Affiliate revenue** — when a user buys an item recommended by Flipper, take a small cut from eBay Partner Network, Amazon Associates, etc.
- **Data product** — aggregated, anonymized "what's hot in flipping" market reports sold to retail / wholesale buyers. $99/mo or $999/yr.
- **Flipper Academy** — a $199 course on flipping fundamentals, sold to free-tier users. Cohort-based via https://www.maven.com/.
- **API-as-a-product** — expose the deal scoring API to other reseller tool builders. $0.01/call. Already have OpenAPI spec at `/docs`.

### 6.7 Defensibility — Why This Is Hard To Copy

| Moat                         | Status                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------ |
| **Multi-marketplace coverage** | Strong — most competitors do 1-2 platforms; you have 5                       |
| **3-tier AI pipeline**        | Strong — most do single-LLM scoring; verified market data is the differentiator |
| **Network effects**           | Weak today — strengthen via shared "Hot Deals" feed (PRO tier)                 |
| **Brand + content library**   | Currently zero — see 6.1 (this is your highest-leverage next bet)              |
| **Switching cost**            | Medium — saved searches + tracked opportunities + flip history are all sticky  |

---

## 7. Open Questions for You

Please answer these inline. Each one changes the plan in a non-trivial way.

### 7.1 Strategic

> **Q1.** What's your launch budget for the first 90 days? (Determines paid-ads viability and whether we keep scope tight.)
>
> *Your answer:* ____________________________________________

> **Q2.** What's your target MRR by end of Month 3? (Sets pricing tier and acquisition aggressiveness.)
>
> *Your answer:* ____________________________________________

> **Q3.** Are you going full-time on this, or is it a side project? (Affects support response time, content cadence, what we build next.)
>
> *Your answer:* ____________________________________________

> **Q4.** Vercel for v1, or migrate to GCP Cloud Run + Cloud SQL + Firebase Auth (per architecture doc)? My recommendation: **stay on Vercel until $1k MRR**, then migrate. The architecture doc is correct *long-term* but adds 2-3 weeks of pre-launch risk for no user-visible benefit.
>
> *Your answer:* ____________________________________________

### 7.2 Product

> **Q5.** Do you want to ship the **Phase 2 features** (FCM push, Twilio SMS, Calendar/Maps integration) in v1, or hold for v1.1? My recommendation: **hold**. They each add 1-2 weeks and SMS in particular has compliance overhead (10DLC registration in the US).
>
> *Your answer:* ____________________________________________

> **Q6.** How aggressive on the scrapers? Two postures:
> - **Conservative** — only run the eBay Browse API + Craigslist (both lowest legal risk). Drop FB/Mercari/OfferUp until we have a pro plan.
> - **Aggressive** — keep all 5 marketplaces. Higher reach, higher legal exposure.
>
> *Your answer:* ____________________________________________

> **Q7.** Pricing — keep current ($19 / $49) or shift to suggested ($29 / $79 + Lifetime Founder $299)? Lower price = more conversions; higher price = better unit economics + signaling.
>
> *Your answer:* ____________________________________________

### 7.3 Marketing

> **Q8.** Are you willing to be **the face** of the brand (TikTok, YouTube, founder-led content)? This is by far the cheapest growth lever, but only works if you're personally in the videos. If you don't want to, we hire a creator on Upwork ($500-1500 first month).
>
> *Your answer:* ____________________________________________

> **Q9.** Do you have an existing Twitter/X audience, email list, or Reddit account with karma? (Determines whether we go cold or warm into launch.)
>
> *Your answer:* ____________________________________________

> **Q10.** Domain preference — `flipperai.app`, `getflipper.ai`, `tryflipper.com`, `flipthat.ai`, or your own?
>
> *Your answer:* ____________________________________________

### 7.4 Operational

> **Q11.** Who is your support email going to come from, and where should incoming emails route? (Need this for Resend "from" address + for `support@<domain>` MX.)
>
> *Your answer:* ____________________________________________

> **Q12.** Comfort level with you-as-on-call for the first 30 days? (Realistically, P0 bugs will happen and the fastest fix is the founder fixing them. Plan for 1-2 hour response time.)
>
> *Your answer:* ____________________________________________

> **Q13.** Want me to (a) reconcile the BMAD sprint tracker against the codebase, (b) backfill the requirements traceability matrix, (c) draft the Product Hunt copy, (d) all of the above? Each is independent.
>
> *Your answer:* ____________________________________________

---

## 8. Summary Recommendation

If you want a **single recommendation** for what to do tomorrow:

1. **Buy a domain today** (15 minutes).
2. **Run the 5-scraper smoke test** (1 hour).
3. **Sign up + upgrade as a real user with your own card on Stripe live mode** (1 hour). This catches 80% of launch-day disasters.
4. **Pick 10 beta users from your network** and DM them a private link this weekend.
5. **Answer the questions in Section 7** so I can give you a tighter v1.1 plan.

Everything else can wait. The product is far more ready than the docs let on; the gap is deployment hygiene + a real first paying customer, not features.

---

*Ping me with answers in Section 7 (or just edit them in this file and tell me to re-read it) and I'll generate v2 of this roadmap with concrete dates, ad budgets, and the next 6 weeks of stories scoped against your answers.*
