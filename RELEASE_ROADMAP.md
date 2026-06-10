# Flipper.ai — Release Roadmap

**Version:** 3.0 — fresh rebuild against `django-main` reality
**Prepared:** 2026-06-09
**Audience:** Stephen Boyett (Founder)
**Status of this doc:** Single source of truth for project status + path to launch. The launch **scope/date decision is intentionally left open** (see §6) — this roadmap lays out the options; you choose.

> Supersedes the 2026-05 roadmap (v2.0) that lived on `origin/main` and the
> `claude/create-release-roadmap-NCkB5` branch. That version called Epic 14 "the
> one blocker" — Epic 14 is now **100% done**, and it predated the entire mobile
> initiative (Epics 15–22). Treat older roadmap copies as historical.

---

## 0. How To Use This Document

1. **§1 Executive Summary** — where you actually are, in one screen.
2. **§2 Feature Status** — what's built, tested, shippable.
3. **§3 Branch & Repo Reconciliation** — the real P0; nothing deploys until this is clean.
4. **§4 Pre-Launch Checklist** — the concrete to-do list (toolkit lives in `docs/launch/`).
5. **§5 Mobile Track (Epics 15–22)** — the next phase, and how it interacts with launch.
6. **§6 Launch-Scope Decision** — the fork you still need to call.
7. **§7 Critical Path** — week-by-week once scope is chosen.
8. **§8 Go-To-Market** — pointers into the `docs/launch/` toolkit.

---

## 1. Executive Summary

**TL;DR — the web product is functionally complete and launch-ready.** All 14
functional/design epics are `done` on `django-main`, the acceptance suite is fully
green, and the architecture is already on its production target (Cloud Run +
Firebase + Cloud SQL). What remains before a public launch is **operational**, not
feature work: reconcile the branch mess, run a real production deploy, verify Stripe
live mode, buy a domain, and smoke-test the live site.

| Dimension | Status (as of 2026-06-09) |
| --- | --- |
| **Version** | v1.0.1 |
| **Active trunk** | `django-main` (⚠️ **not** a Django port — Next.js; the branch name is misleading) |
| **Functional epics (1–14)** | ✅ **All done** — infra, auth, 5 scrapers, scoring, AI intelligence, lifecycle/analytics, billing, comms/negotiation, resale listing, notifications, push/SMS, calendar/maps, AI scoring improvements, full frontend design-system migration |
| **Tests** | 685/685 acceptance scenarios green · 2,378+ unit tests · 96% FR coverage (158/164) · Playwright E2E + visual + a11y + perf + load |
| **AI pipeline** | Multi-provider router — Groq primary (text), Claude for structural analysis, OpenAI for vision; automatic fallback; **never mocked** (hard project policy) |
| **Architecture** | Already migrated: Firebase Hosting + Cloud Run + Cloud SQL Postgres + Firebase Auth + GCP Secret Manager. Vercel/NextAuth decommissioned. |
| **Billing** | Stripe checkout + portal + webhooks + tier enforcement + metering — **built, not yet verified in live mode** |
| **Mobile (Epics 15–22)** | Next phase. Epic 15 `in-progress` (5 stories `ready-for-dev`, files currently untracked locally); 16–22 `backlog` |
| **Hard blockers** | 0 feature blockers · ~6 operational pre-launch items (see §4) · 1 repo-hygiene P0 (branch reconciliation, §3) |

---

## 2. Feature Status Matrix

Legend: ✅ Done · 🟡 Done, needs live verification · 🟠 In progress · ⛔ Not started

| Epic | Stories | Status | Notes |
| --- | --- | --- | --- |
| **E1 — Production Infrastructure & Secure Deployment** | 9/9 | ✅ | GCP Secret Manager (YAML-driven), Cloud Run + Cloud SQL, Firebase Hosting + CORS + Storage + FCM, CI/CD, health checks |
| **E2 — User Registration, Auth & Onboarding** | 6/6 | ✅ | Firebase Auth; landing/login/register/reset/onboarding/settings |
| **E3 — Multi-Marketplace Scanning & Image Capture** | 9/9 | 🟡 | 5 scrapers + SSE job events + image capture. **Selectors rot — re-verify against live sites before launch (§4)** |
| **E4 — Core Scoring & Deal Evaluation** | 6/6 | ✅ | Algorithmic + LLM verification + caching + fallback |
| **E5 — Advanced Market Intelligence** | 5/5 | ✅ | Claude structural analysis, comp matching, demand trend, completeness/reputation, logistics |
| **E6 — Flip Lifecycle Management & Analytics** | 6/6 | ✅ | Dashboard, kanban, filtering, analytics, CSV/PDF export, inventory + ROI |
| **E7 — Subscription & Billing** | 4/4 | 🟡 | Stripe checkout/portal/webhooks/tiers/metering — **needs live-mode end-to-end test (§4)** |
| **E8 — Seller Communication & Negotiation** | 5/5 | ✅ | AI message gen, negotiation strategy, inbox/threads, approval, status tracking |
| **E9 — Cross-Platform Resale Listing** | 4/4 | ✅ | AI title/desc, optimal pricing, posting queue, image reuse |
| **E10 — Monitoring & Email Notifications** | 6/6 | ✅ | Scheduler, listing monitoring, Resend templates, preferences |
| **E11 — Push (FCM) & SMS (Twilio)** | 3/3 | 🟡 | Implemented. **Twilio 10DLC registration is a manual compliance step — see `docs/launch/twilio-10dlc-checklist.md`** |
| **E12 — Meeting & Logistics** | 2/2 | ✅ | Google Calendar OAuth + events; Maps route generation |
| **E13 — AI Scoring Algorithm Improvements** | 8/8 | ✅ | IQR outlier filtering, structured JSON, cache invalidation, weighted scoring, brand regex, demand velocity, cross-platform price intelligence |
| **E14 — Frontend Design System Migration** | 10/10 | ✅ | Glassmorphism dark theme; multi-theme removed; shared UI state; all pages migrated; a11y + file-header sweep |

**Verdict:** Feature-complete for a web v1. The two 🟡 items (live scraper re-verify, Stripe live test) are verification tasks, not development.

---

## 3. Branch & Repo Reconciliation — the real P0

This is the single biggest hygiene problem and it blocks any clean production deploy.

### 3.1 Current branch reality

| Branch | Relationship | State |
| --- | --- | --- |
| `origin/django-main` | **the live trunk** | All 14 epics done. ⚠️ Misnamed — it is Next.js, not Django. |
| `origin/main` | GitHub **default** branch | **Stale + diverged.** +3 / −9 vs `django-main`. Its 3 unique commits are the launch-toolkit + Story-3.6 scenarios + a gitignore tweak. |
| `origin/claude/create-release-roadmap-NCkB5` | +16 / −98 vs trunk | Forked from old `main`. **Do not merge** (would delete ~193k lines). Value already salvaged: launch toolkit + this roadmap. |
| `origin/claude/fr-coverage-e2e` | +3 / −9 vs trunk | ≈ same tip as `origin/main`. Story-3.6 scenarios worth a targeted diff/cherry-pick; rest is stale. |
| `origin/backup/main-pre-reconcile-2026-05-06` | backup snapshot | Archive; ignore. |

### 3.2 The problem in one sentence

Your **default branch (`main`) is not your trunk (`django-main`)**, and they have
diverged — so a naive "deploy main" ships month-old code, and a naive "merge main
into django-main" risks regressions.

### 3.3 Recommended reconciliation (DECISION REQUIRED — see §6)

The clean fix, in order:

1. **Salvage the 3 useful `main`-only commits** onto `django-main`:
   - ✅ Launch toolkit (`docs/launch/*`, `COVERAGE_GAP_ANALYSIS.md`, `check-secrets.sh`) — **already salvaged** onto `roadmap/release-v1-plan` via `ed74bb7`.
   - ⬜ Story-3.6 acceptance scenarios (`28208ba`) — diff against current `E-003` coverage; cherry-pick only if it adds net-new scenarios.
   - ⬜ `.claude/worktrees/` gitignore (`1a8c58e`) — trivial, take it.
2. **Promote `django-main` to be the trunk of record.** Two safe options:
   - **(a) Rename:** make `django-main` the new `main` (GitHub → Settings → default branch), archive the old `main` as `main-legacy-2026-06`. Cleanest going forward.
   - **(b) Fast-forward:** force `main` to `django-main` after backing up old `main`. Keeps the `main` name.
   - Either way: **back up old `main` first** (`origin/backup/main-pre-reconcile-*` pattern already exists).
3. **Delete the stale `claude/*` branches** once their value is confirmed-salvaged.

> ⚠️ **All of §3.3 step 2–3 are destructive, outward-facing remote operations.**
> They are NOT executed by this roadmap. They require your explicit go-ahead, and
> the detailed mechanics live in `docs/launch/branch-reconciliation.md`.

---

## 4. Pre-Launch Checklist

The full toolkit for each item lives in `docs/launch/`. P0 = before any soft beta.

### 4.1 P0 — Hard blockers

- ⬜ **Reconcile branches** (§3) — gate for all deploys.
- ⬜ **Production deploy of the trunk** to Cloud Run + Firebase Hosting:
  1. Verify GCP Secret Manager seeded → `scripts/deploy/check-secrets.sh` + `docs/launch/gcp-secret-manager-checklist.md`
  2. Tag-triggered release (GitHub Actions handles the rest)
  3. Health verify: `/api/health` + `/api/health/ready`
- ⬜ **Stripe live-mode end-to-end test** (real card, real refund, verify tier change in Cloud SQL) — see `docs/launch/pricing-page-proposal.md` for SKU plan.
- ⬜ **Provision a domain** (`flipper.ai` is taken) — candidates + DNS/OAuth-redirect steps in `docs/launch/domain-and-brand-identity.md`.
- ⬜ **Live smoke test**: registration → first scan → first opportunity, across Email + Google + GitHub auth — `docs/launch/pre-launch-smoke-test.md`. Capture screenshots (→ marketing assets).
- ⬜ **Re-verify all 5 scrapers against live sites** (selectors rot; last hardened months ago).

### 4.2 P1 — Strongly recommended before public launch

- ⬜ Cloud SQL automated backups + documented restore procedure.
- ⬜ Uptime monitoring (`.github/workflows/health-check.yml` exists — set `PRODUCTION_URL` secret).
- ⬜ Sentry release tracking + source maps on Cloud Run.
- ⬜ Twilio 10DLC registration (`docs/launch/twilio-10dlc-checklist.md`) — required for SMS at scale.
- ⬜ Public-facing pages: pricing, FAQ, status, changelog (specs in `docs/launch/`).

---

## 5. Mobile Track — Epics 15–22 (next phase)

The mobile app (Expo / React Native, pnpm-workspace monorepo) is the post-web-v1
initiative. Current state:

| Epic | Phase | Status |
| --- | --- | --- |
| **E15 — Mobile Foundation, Monorepo & Expo Bootstrap** | A | 🟠 in-progress · 5 stories `ready-for-dev` (story files currently **untracked locally** — commit them) |
| **E16 — Mobile CI/CD (EAS + Firebase + TestFlight)** | A | ⛔ backlog |
| **E17 — Mobile Auth & Session Bridge** | A | ⛔ backlog |
| **E18 — Mobile Shell, Navigation & Design System** | B | ⛔ backlog |
| **E19 — Mobile Scanning, Listings & Opportunities** | B | ⛔ backlog |
| **E20 — Mobile Flip Lifecycle & Kanban** | B | ⛔ backlog |
| **E21 — Mobile Push & Real-Time** | B | ⛔ backlog |
| **E22 — Mobile Messaging & Inbox** | C | ⛔ backlog |

**Interaction with launch:** Epic 15.1 (convert repo to pnpm-workspace monorepo)
is a structural change to the whole repo. Doing it **before** a web v1 launch means
launching from a monorepo layout; doing it **after** keeps the launch on the current
layout and isolates risk. This is part of the §6 decision.

---

## 6. Launch-Scope Decision — STILL OPEN (your call)

Per the chosen "clean up & plan first" path, no launch scope/date is committed yet.
The three live options:

- **Option A — Ship web v1 now.** Treat Epics 1–14 as v1. Reconcile → launch
  checklist → tag → public launch. Mobile (15–22) becomes v2, started after launch.
  *Fastest to revenue; lowest structural risk.*
- **Option B — Web v1 + start mobile in parallel.** Launch web while kicking off
  Epic 15 (monorepo + Expo bootstrap) on a parallel track.
  *More moving parts; monorepo conversion lands near launch.*
- **Option C — Reconcile + plan only (current).** Finish repo hygiene and this
  roadmap, review together, then pick A or B with eyes open. *(You are here.)*

**[DECISION]** After reviewing this doc, choose A or B (or adjust). The team
re-plans §7 around your answer.

> *Your answer:* ____________________________________________

---

## 7. Critical Path (fills in once §6 is chosen)

Indicative shape for **Option A** (web v1 now):

| Week | Focus |
| --- | --- |
| **W1** | Branch reconciliation (§3) · production deploy dry-run · secret-manager verify |
| **W2** | Stripe live-mode test · domain purchase + DNS/OAuth wiring · scraper re-verify |
| **W3** | Live smoke tests · P1 hardening (backups, uptime, Sentry) · soft beta to invite list (`docs/launch/beta-invitation.md`) |
| **W4** | GTM assets final (`docs/launch/`) · Product Hunt / Show HN / Reddit scheduling · public launch |

(Option B adds a parallel mobile lane starting W1 with Epic 15.)

---

## 8. Go-To-Market

The full GTM playbook is pre-written in `docs/launch/`:

- **Launch copy:** `product-hunt-listing.md`, `hacker-news-show-hn.md`, `reddit-launch-posts.md`, `twitter-launch-thread.md`
- **Lifecycle:** `email-drip-campaign.md`, `beta-invitation.md`, `launch-day-runbook.md`
- **Growth specs:** `referral-program-spec.md`, `affiliate-program.md`, `free-tools-specs.md`, `seo-content-calendar.md`
- **Public pages:** `pricing-page-proposal.md`, `public-faq.md`, `status-page-spec.md`, `changelog-page-spec.md`

---

## Appendix — Open Questions Tracker

| # | Question | Owner | Answer |
| --- | --- | --- | --- |
| Q1 | Launch scope: Option A or B? (§6) | Stephen | _____ |
| Q2 | Branch reconciliation: rename `django-main`→`main`, or fast-forward `main`? (§3.3) | Stephen | _____ |
| Q3 | Domain choice? (§4.1) | Stephen | _____ |
| Q4 | Run monorepo conversion (15.1) before or after web launch? (§5) | Stephen | _____ |
| Q5 | Stripe SKUs/pricing tiers to create in live mode? (`pricing-page-proposal.md`) | Stephen | _____ |
