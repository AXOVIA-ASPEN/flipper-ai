---
stepsCompleted: [1, 2, 3, 4]
status: complete
parentDocument: _bmad-output/planning-artifacts/epics.md
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/PRD.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design.md
  - CLAUDE.md
  - _bmad-output/project-context.md
scope: Native iOS + Android mobile app via Expo / React Native / EAS, reusing the existing Cloud Run / Next.js backend untouched at v1
---

# Flipper AI - Mobile App Epic Breakdown

## Overview

This document is a **child of `epics.md`** focused exclusively on the mobile-app track. It contains the complete epic and story breakdown for delivering Flipper.ai as a native iOS + Android application using Expo / React Native / EAS Build + EAS Submit + EAS Update, reusing the existing Cloud Run / Next.js backend.

Mobile epics are numbered **15 through 29**, sequenced into four release phases (A → D), with the fastest-path-to-release principle baked into the ordering: the pipeline stands up BEFORE any feature work so every story from Epic 18 onward is shippable to testers within minutes of merge.

| Phase | Epics | Headline Deliverable |
|---|---|---|
| **A — Rails up** | 15, 16, 17 | Monorepo + EAS pipeline + auth bridge. Stub-but-real binary lands on TestFlight + Firebase App Distribution at the end of Phase A. |
| **B — Lovable beta** | 18, 19, 20, 21 | App shell, scanning, lifecycle Kanban, push notifications. **First product-grade closed beta** at the end of Phase B. |
| **C — Feature parity** | 22, 23, 24, 25, 26, 27 | Messaging, cross-platform posting, analytics, IAP subscriptions, settings + a11y, native meetups. **Open beta — parity with web** at the end of Phase C. |
| **D — Production launch** | 28, 29 | Camera, offline polish, tablet support, App Store + Play Store GA. **v2.0.0 GA** at the end of Phase D. |

> **Cross-reference:** Web-app epics (1–14) and the canonical FR / NFR inventory live in [`epics.md`](./epics.md). Functional requirements and NFRs declared here are **additive** to that inventory.

---

## Definition of Done (DoD) — All Stories

**Every story in this document MUST meet ALL of the following criteria before it can be marked as `done`.** This DoD mirrors the canonical web DoD in `epics.md` § "Definition of Done (DoD) — All Stories" and is non-negotiable.

### Acceptance Test Requirements

1. **Gherkin Acceptance Tests:** Every Acceptance Criterion (AC) in a story MUST have at least one corresponding Gherkin scenario in the epic's `.feature` file. No AC may be left untested.

2. **Feature File Location & Naming:** Each epic has its own feature file under the existing `test/acceptance/features/` tree (single source of truth across web + mobile):

   - `test/acceptance/features/E-015-mobile-foundation.feature`
   - `test/acceptance/features/E-016-mobile-cicd.feature`
   - `test/acceptance/features/E-017-mobile-auth.feature`
   - `test/acceptance/features/E-018-mobile-shell.feature`
   - `test/acceptance/features/E-019-mobile-scanning.feature`
   - `test/acceptance/features/E-020-mobile-lifecycle.feature`
   - `test/acceptance/features/E-021-mobile-push.feature`
   - `test/acceptance/features/E-022-mobile-messaging.feature`
   - `test/acceptance/features/E-023-mobile-reposting.feature`
   - `test/acceptance/features/E-024-mobile-analytics.feature`
   - `test/acceptance/features/E-025-mobile-billing.feature`
   - `test/acceptance/features/E-026-mobile-settings.feature`
   - `test/acceptance/features/E-027-mobile-meet.feature`
   - `test/acceptance/features/E-028-mobile-polish.feature`
   - `test/acceptance/features/E-029-mobile-launch.feature`

3. **Scenario Tagging — Three Required Tags Per Scenario:**
   Every Gherkin scenario MUST have ALL THREE of the following tags (identical convention to web epics):

   - **`@E-<NNN>-S-<YYY>`** — Epic-scoped scenario ID. `NNN` = zero-padded epic number, `YYY` = sequential scenario number within that epic, starting at 1 and incrementing across ALL stories in the epic.
     - Example: `@E-019-S-1`, `@E-019-S-2`, …
     - Scenario numbers are global to the epic, NOT reset per story.

   - **`@story-<X>-<Y>`** — Story reference. `X` = epic number, `Y` = story number within the epic.
     - Example: `@story-19-3`, `@story-25-4`
     - A scenario MAY have multiple `@story-X-Y` tags if it tests acceptance criteria shared across stories.

   - **`@FR-<CATEGORY>-<NN>`** — Functional Requirement reference. Maps the scenario to the FR(s) it validates.
     - Example: `@FR-MOBILE-SCAN-05`, `@FR-RELEASE-MOBILE-06`
     - A scenario MAY have multiple `@FR-` tags if it covers multiple FRs.
     - NFRs use the tag format `@NFR-MOB-<CATEGORY>-<NN>` (e.g., `@NFR-MOB-PERF-01`, `@NFR-MOB-SEC-03`).

4. **Example Scenario (from Epic 19, Story 19.3):**
   ```gherkin
   # test/acceptance/features/E-019-mobile-scanning.feature

   Feature: Mobile Marketplace Scanning & Listings Feed
     As a mobile user
     I want to scan marketplaces and browse results in a thumb-first feed
     So that I can find deals while in the field

     @E-019-S-3 @story-19-3 @FR-MOBILE-SCAN-05
     Scenario: Listings feed renders with score-coded cards
       Given a completed scan exists with 50 listings
       When the user opens the listings feed
       Then each row displays the hero image, title, asking price, score badge, location, and age
       And high-scoring listings (≥85) use the fp-hot-card glow style

     @E-019-S-4 @story-19-3 @FR-MOBILE-SCAN-05
     Scenario: Pull-to-refresh re-runs the most recent scan
       Given the user is viewing the listings feed
       When the user pulls down past the refresh threshold
       Then the most recent scan re-runs and the feed reflects new results within 60 seconds
   ```

5. **Requirements Traceability Matrix:** ALL scenarios MUST be tracked in:
   ```
   _bmad-output/test-artifacts/requirements-traceability-matrix.md
   ```
   This matrix maps every FR and NFR to its corresponding acceptance test scenarios — same single matrix used for web epics — ensuring 100% coverage. The matrix format:

   | Requirement | Epic | Story | Scenario ID(s) | Feature File | Status |
   |---|---|---|---|---|---|
   | FR-MOBILE-SCAN-05 | Epic 19 | 19.3 | @E-019-S-3, @E-019-S-4 | E-019-mobile-scanning.feature | Pending |
   | FR-RELEASE-MOBILE-06 | Epic 16 | 16.5 | @E-016-S-9 | E-016-mobile-cicd.feature | Pending |

6. **100% Coverage Rule:** Every FR listed in the "FR Coverage Map" section below and every NFR in the "Non-Functional Requirements" section MUST appear in at least one scenario in the traceability matrix. Any gap is a blocker for story completion.

### Standard DoD Checklist (in addition to acceptance tests)

- [ ] All acceptance criteria are implemented and verified on BOTH iOS Simulator AND Android Emulator
- [ ] All Gherkin acceptance test scenarios are written in the epic's `.feature` file
- [ ] All scenarios are tagged with `@E-NNN-S-YYY`, `@story-X-Y`, and `@FR-MOBILE-*` / `@FR-RELEASE-MOBILE-*` / `@NFR-MOB-*`
- [ ] Requirements traceability matrix is updated in `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [ ] Unit tests written for all new business logic (`mobile/src/__tests__/`); ≥ 80% statements / 70% branches on new modules
- [ ] No lint errors (`pnpm --filter mobile lint` AND `make lint` for combined web+mobile lint)
- [ ] TypeScript strict mode passes (`pnpm --filter mobile typecheck`)
- [ ] `expo doctor` passes with zero warnings
- [ ] EAS preview build succeeds for both iOS and Android (`make mobile-build-ios` and `make mobile-build-android`)
- [ ] Maestro E2E smoke flow for the story passes on both iOS Simulator and Android Emulator
- [ ] Sentry source maps uploaded for the test build (verified in Sentry UI)
- [ ] Story-relevant accessibility check passes — VoiceOver (iOS) and TalkBack (Android) navigation order is logical; touch targets meet 44pt / 48dp minimum; color contrast ≥ WCAG AA
- [ ] All existing tests continue to pass (`make test` AND `make test-acceptance`) — zero regression on web
- [ ] AI provider calls (when story touches AI endpoints) exercise the real Groq → Gemini → OpenAI fallback chain — NEVER mocked, per project policy in CLAUDE.md
- [ ] File headers present on every new `.ts` / `.tsx` file per the project File Header Standard (`@file`, `@author Stephen Boyett`, `@description`, `@Copyright © 2026 Axovia LLC. All Rights Reserved.`)
- [ ] Trello card moved to Done list (trello-axovia board)
- [ ] If story changes user-visible behavior: `mobile/CHANGELOG.md` `[Unreleased]` entry added under the appropriate category (Added / Changed / Fixed / Removed / Security / Deprecated)

---

## Requirements Inventory

> **Inventory scope:** Mobile-track FRs and NFRs only. These are **additive** to the canonical inventory in `epics.md` — web FRs (FR-SCAN-*, FR-SCORE-*, FR-COMM-*, FR-RELIST-*, FR-DASH-*, FR-MONITOR-*, FR-NOTIFY-*, FR-MEET-*, FR-BILLING-*, FR-INFRA-*, FR-UI-DESIGN-*) and web NFRs (NFR-PERF-*, NFR-SEC-*, NFR-SCALE-*, NFR-RELY-*, NFR-TEST-*, NFR-UX-*) are referenced where mobile parity is required but are NOT re-declared here.

### Functional Requirements

**FR-MOBILE-FOUNDATION: Mobile App Foundation, Expo & Monorepo**

FR-MOBILE-FOUNDATION-01: Repository shall be reorganized as a `pnpm` workspace monorepo with a new `mobile/` workspace at the project root, alongside the existing root Next.js workspace (`app/`, `src/`). Shared packages shall live in `packages/` (e.g. `packages/types/`, `packages/design-tokens/`)
FR-MOBILE-FOUNDATION-02: Mobile workspace shall use Expo SDK 53+ in managed workflow with `expo-router` for file-based navigation. Entry point shall be `mobile/app/_layout.tsx` and route groups shall mirror the web App Router structure (e.g. `(tabs)`, `(auth)`)
FR-MOBILE-FOUNDATION-03: Mobile workspace shall use TypeScript strict mode with `tsconfig.json` extending the project base config, and shall reuse the path alias convention (`@/*` → `mobile/src/*`, `@shared/*` → `packages/*/src/*`)
FR-MOBILE-FOUNDATION-04: Shared TypeScript domain types (`Listing`, `Opportunity`, `ScraperJob`, `User`, `SubscriptionTier`, `Message`, `PostingJob`) shall be extracted into `packages/types/` and consumed by BOTH the web app and the mobile app — no type duplication
FR-MOBILE-FOUNDATION-05: Shared design tokens (color, spacing, radius, typography, glass-surface alpha values) shall be extracted into `packages/design-tokens/` as a framework-agnostic JS module consumable by Tailwind config (web), NativeWind config (mobile), and any future native styling layer
FR-MOBILE-FOUNDATION-06: Mobile workspace shall use NativeWind v4+ to consume the shared design tokens as Tailwind utility classes in React Native, preserving the canonical dark-glassmorphism design language (`fp-glass`, `fp-glass-sm`, `fp-glow-card`, purple accent `#7c3aed`, dark background `#080b14`)
FR-MOBILE-FOUNDATION-07: Mobile workspace shall enforce the same File Header Standard as the web codebase — every `.ts` / `.tsx` file under `mobile/app/` and `mobile/src/` shall begin with the canonical JSDoc header (`@file`, `@author Stephen Boyett`, `@description`, `@Copyright`)
FR-MOBILE-FOUNDATION-08: Mobile workspace shall include ESLint flat config inheriting from the project's existing ESLint config, with React Native + Expo-specific plugins. `make lint` shall lint BOTH web and mobile workspaces
FR-MOBILE-FOUNDATION-09: Mobile workspace shall include Prettier configuration matching the project root, and `pnpm format` / `pnpm format:check` shall format BOTH web and mobile workspaces
FR-MOBILE-FOUNDATION-10: Mobile workspace shall include a `mobile/Makefile` (or top-level Makefile targets) for: `make mobile-dev`, `make mobile-build-ios`, `make mobile-build-android`, `make mobile-test`, `make mobile-test-e2e`, `make mobile-submit-ios`, `make mobile-submit-android`

**FR-MOBILE-AUTH: Mobile Authentication & Session Bridge**

FR-MOBILE-AUTH-01: Mobile app shall authenticate users via `@react-native-firebase/auth` (or Firebase JS SDK with `firebase/auth`) using the SAME Firebase project as the web app. User UIDs (`User.firebaseUid` in Prisma) shall be identical between web and mobile
FR-MOBILE-AUTH-02: Mobile app shall authenticate to the backend by sending the Firebase ID token in an `Authorization: Bearer <token>` header on every API call. The backend's `getCurrentUserId()` (in `src/lib/firebase/session.ts`) shall accept EITHER the existing `__session` cookie OR a Bearer token, with token validation via Firebase Admin SDK's `verifyIdToken()`
FR-MOBILE-AUTH-03: Mobile app shall persist the Firebase ID token securely using `expo-secure-store` (iOS Keychain / Android Keystore). Token refresh shall be handled automatically via Firebase SDK's `onIdTokenChanged()` listener, with refreshed tokens written back to secure storage
FR-MOBILE-AUTH-04: Mobile app shall support email/password sign-up, email/password sign-in, password reset (via email link), and OAuth sign-in (Google, Apple — Apple is REQUIRED by App Store policy if other social sign-ins exist). GitHub and Facebook OAuth from web are optional on mobile
FR-MOBILE-AUTH-05: Mobile app shall support biometric re-authentication via `expo-local-authentication` (Face ID, Touch ID, Android fingerprint/face) as an optional convenience setting; biometric auth shall ONLY unlock a cached Firebase session, never replace the underlying Firebase credential
FR-MOBILE-AUTH-06: Mobile app shall handle sign-out by (a) calling Firebase `signOut()`, (b) deleting the secure-stored token, (c) clearing the local TanStack Query cache, and (d) navigating to the auth stack
FR-MOBILE-AUTH-07: Mobile onboarding wizard shall mirror the web 6-step wizard (`mobile/app/(auth)/onboarding/`) but reflow for portrait/touch: large-tap targets ≥44pt, swipe-between-steps gesture, progress dots, "Skip for now" affordance. State shall persist to the same backend endpoint (`/api/onboarding/*`) so a user who onboards on web is treated as already onboarded on mobile
FR-MOBILE-AUTH-08: Mobile app shall implement an `AuthGuard` higher-order layout that redirects unauthenticated users to `(auth)/login`, mirroring the web `FirebaseAuthProvider` pattern
FR-MOBILE-AUTH-09: Mobile app shall include hCaptcha (or Firebase App Check) on sign-up and password-reset forms to deter abuse, parity with the web hCaptcha requirement (NFR-SEC-09)
FR-MOBILE-AUTH-10: Mobile app shall track authentication events (sign-up, sign-in, sign-out, password-reset request) in Sentry breadcrumbs for crash diagnostics

**FR-MOBILE-SHELL: Mobile App Shell, Navigation & Design System**

FR-MOBILE-SHELL-01: Mobile app shall use `expo-router` with a tab-based root layout (`mobile/app/(tabs)/_layout.tsx`) exposing five primary tabs: Dashboard, Scanner, Opportunities, Messages, More (Settings/Analytics/Account live under More)
FR-MOBILE-SHELL-02: Mobile app shall implement a shared `<Screen>` wrapper component that applies the canonical dark mesh background (`fp-bg-mesh`/`fp-bg-grid` equivalents), safe-area insets via `react-native-safe-area-context`, and pull-to-refresh affordances on data-driven screens
FR-MOBILE-SHELL-03: Mobile app shall reuse the canonical glass-surface utility classes through NativeWind: `fp-glass`, `fp-glass-sm`, `fp-glass-nav`, `fp-glow-card`, `fp-hot-card`, `fp-btn-primary`, `fp-btn-ghost`, `fp-btn-hot`, `fp-input`, `fp-badge-*`, `fp-grad-*`, `fp-alert-*` shall all exist as NativeWind utilities sourced from the shared design tokens
FR-MOBILE-SHELL-04: Mobile app shall include shared state components matching the web's `LoadingSkeleton`, `ErrorBanner`, `EmptyState`, `ScoreRing` — built on React Native primitives (`<View>`, `<ActivityIndicator>`, `<Svg>`) and consuming the same design tokens
FR-MOBILE-SHELL-05: Mobile app shall include a global toast system mirroring the web `ToastProvider`, with toast types: success, error, info, alert, opportunity. Implementation may use `react-native-toast-message` or a custom provider, but the API shape and visual design shall match the web
FR-MOBILE-SHELL-06: Mobile app shall implement a global error boundary that captures uncaught errors, reports to Sentry, and presents a recoverable fallback UI matching the canonical `.fp-alert-danger` style
FR-MOBILE-SHELL-07: Mobile app shall include a splash screen (`mobile/assets/splash.png`) rendering the Flipper.ai mark on the dark mesh background, configured via `expo-splash-screen` and dismissed only after the auth state hydrates from secure storage
FR-MOBILE-SHELL-08: Mobile app shall include adaptive app icons for iOS (1024×1024 master) and Android (foreground/background layers for adaptive icons), generated from a single source asset and configured in `app.json` / `app.config.ts`
FR-MOBILE-SHELL-09: Mobile app shall support light/dark mode honoring the OS-level preference via `useColorScheme()` AND an in-app override (Settings → Appearance), persisting the override in `AsyncStorage`. Light mode shall be a "lite-dark" palette (slate background) rather than pure white, preserving brand identity
FR-MOBILE-SHELL-10: Mobile app shall implement universal deep links via `expo-linking` and Expo Router conventions. Supported deep links shall include: `flipper://opportunities/:id`, `flipper://messages/:threadId`, `flipper://scanner/run/:jobId`, `flipper://settings`. Universal links via Apple App Site Association and Android App Links shall be configured for `flipper.ai/m/*`
FR-MOBILE-SHELL-11: Mobile app shall honor reduced-motion OS settings — purple-glow animations, score-ring fill, and screen transitions shall disable or shorten when `AccessibilityInfo.isReduceMotionEnabled()` is true
FR-MOBILE-SHELL-12: Mobile app shall include haptic feedback via `expo-haptics` on key interactions: successful posting, lifecycle stage advance, opportunity-threshold crossing on a scan result, error states. Haptics shall be toggleable in Settings

**FR-MOBILE-SCAN: Mobile Marketplace Scanning & Listings**

FR-MOBILE-SCAN-01: Mobile app shall provide a Scanner screen letting the user trigger a scrape job against any configured marketplace (Craigslist, eBay, Facebook, Mercari, OfferUp). Triggering invokes the same `/api/scraper/start` endpoint used by the web app
FR-MOBILE-SCAN-02: Mobile app shall surface saved SearchConfigs (from `/api/search-configs`) as quick-select chips on the Scanner screen, allowing one-tap re-runs of saved searches
FR-MOBILE-SCAN-03: Mobile app shall consume the same SSE event stream (`/api/events`) used by the web app for live scrape progress. Implementation shall use `react-native-event-source` or a fetch-based SSE polyfill; if SSE proves unreliable on cellular, fall back to short-interval polling of `/api/scraper/jobs/:id`
FR-MOBILE-SCAN-04: Mobile app shall display in-flight scrape jobs with: marketplace icon, keyword, elapsed time, listing-found count, and a live progress indicator (animated glow). Tapping a running job drills into a job-detail screen
FR-MOBILE-SCAN-05: Mobile app shall present scan results in a paginated, infinite-scroll feed with each row showing: hero image, title, asking price, algorithmic score (color-coded), location, age. Pull-to-refresh shall re-run the most recent scan
FR-MOBILE-SCAN-06: Mobile app shall provide a filter sheet (modal bottom sheet) allowing users to filter the feed by: marketplace, score threshold, price range, distance radius, category, condition. Filter state shall persist in `AsyncStorage` per-user
FR-MOBILE-SCAN-07: Mobile app shall provide a listing-detail screen rendering: image gallery (swipeable, pinch-to-zoom via `react-native-gesture-handler`), full description, score breakdown, comparable sold items, sellability assessment, "Open original listing" deep-link to the marketplace platform
FR-MOBILE-SCAN-08: Mobile app shall let users save a listing as an Opportunity (POST `/api/opportunities`) from the listing-detail screen with a single tap. Saving triggers a haptic-success pulse and a confirmation toast
FR-MOBILE-SCAN-09: Mobile app shall let users dismiss / pass on a listing, marking it as `passedAt` in the database so it doesn't reappear in future scans
FR-MOBILE-SCAN-10: Mobile app shall cache the most recent 200 listings + 50 opportunities + 20 active jobs in TanStack Query's persistent cache (via `react-native-mmkv` adapter) so the feed renders instantly on app launch before refresh completes

**FR-MOBILE-LIFECYCLE: Mobile Flip Lifecycle Tracking**

FR-MOBILE-LIFECYCLE-01: Mobile app shall provide an Opportunities screen presenting all current opportunities (state ∈ {IDENTIFIED, PURCHASED, LISTED, SOLD}) as either a Kanban-style horizontally-scrollable column view OR a swipeable card stack — user shall be able to toggle between the two views, with the choice persisted
FR-MOBILE-LIFECYCLE-02: Mobile app shall let users advance an opportunity to the next lifecycle stage via a long-press → action sheet OR a horizontal swipe gesture (left swipe = advance, right swipe = revert one stage). State changes call the same `/api/opportunities/:id` PATCH endpoint used by the web app
FR-MOBILE-LIFECYCLE-03: When advancing to PURCHASED, mobile app shall prompt for purchase price (numeric input, prefilled with asking price), purchase date (defaulting to today), and optional purchase notes
FR-MOBILE-LIFECYCLE-04: When advancing to LISTED, mobile app shall prompt for the resale URL and resale platform (radio: eBay, Mercari, Facebook, OfferUp, Craigslist, Other), and shall offer to trigger the cross-platform posting flow (FR-MOBILE-RELIST-*)
FR-MOBILE-LIFECYCLE-05: When advancing to SOLD, mobile app shall prompt for final sale price and shall display the computed net profit (sale - cost - fees) with a celebratory haptic + animated checkmark + "$$$" badge
FR-MOBILE-LIFECYCLE-06: Mobile app shall provide an Inventory view (filtered subset of Opportunities) showing only PURCHASED + LISTED items, with running totals: total cost basis, days-held, projected profit, holding-cost drag
FR-MOBILE-LIFECYCLE-07: Mobile app shall support pull-to-refresh on the Opportunities and Inventory screens, and shall subscribe to the SSE `/api/events` stream for real-time lifecycle updates from the web app or other devices
FR-MOBILE-LIFECYCLE-08: Mobile app shall provide an "Activity" detail screen per opportunity showing: timeline of stage transitions, captured prices, attached messages, posting jobs, monitoring events — pulled from the same models that drive the web detail page

**FR-MOBILE-NOTIFY: Mobile Push Notifications & Real-Time**

FR-MOBILE-NOTIFY-01: Mobile app shall request push-notification permission on first launch (iOS APNs + Android FCM) using `expo-notifications`. Permission state shall be stored and surfaced in Settings → Notifications with a deep link to OS settings if denied
FR-MOBILE-NOTIFY-02: Mobile app shall register the device's Expo push token (and underlying FCM token) with the backend via POST `/api/users/me/devices` upon login. Backend shall store one or more `DeviceToken` records per user with platform (`ios`/`android`), token value, app version, and `lastSeenAt`
FR-MOBILE-NOTIFY-03: Backend shall extend the existing notification-dispatch pipeline (used for email in Epic 10 and FCM web push in Epic 11) so that EVERY user-facing event in `FR-NOTIFY-01..11` also dispatches a mobile push notification when the user has registered a mobile DeviceToken AND the user's preference for that event includes the push channel
FR-MOBILE-NOTIFY-04: Mobile push notifications shall include: title, body, deep-link payload (`opportunityId`, `threadId`, `jobId`, `screen` route), category (for iOS notification action buttons). Tapping a push shall open the app and deep-link to the relevant screen
FR-MOBILE-NOTIFY-05: Mobile app shall handle foreground notifications by surfacing them as in-app toasts with tap-to-navigate; background notifications shall use the OS notification tray
FR-MOBILE-NOTIFY-06: Mobile app shall implement notification action buttons where useful — "Mark Sold" on a flip-sold notification, "Approve & Send" on a draft-message notification, "Dismiss" on a price-change notification — invoking the relevant backend endpoint via background fetch
FR-MOBILE-NOTIFY-07: Mobile app shall set notification badge counts (iOS app icon badge, Android badge) reflecting the count of unread Opportunities-needing-attention + unread Messages. Badge shall clear on app foreground for screens user has visited
FR-MOBILE-NOTIFY-08: Notification preferences UI in mobile Settings shall let users toggle each notification event (mirroring `FR-NOTIFY-01..11`) per channel: email / push / SMS. Toggles shall write to the same backend endpoint (`/api/users/me/notification-preferences`) used by the web app — single source of truth
FR-MOBILE-NOTIFY-09: Mobile app shall support quiet hours configuration — users specify a daily time range during which push notifications are suppressed (the notification is still queued in-app and visible on next foreground). Quiet hours shall be enforced server-side by the dispatcher checking the user's timezone
FR-MOBILE-NOTIFY-10: Mobile app shall subscribe to the SSE `/api/events` stream when in foreground to receive real-time, non-push updates (e.g. job-progress, listing-found) without requiring push permission

**FR-MOBILE-MSG: Mobile Messaging & Negotiation**

FR-MOBILE-MSG-01: Mobile app shall provide a Messages screen presenting all conversation threads (across all marketplaces) as a unified inbox sorted by last activity, with per-thread row showing: counterparty name (or marketplace placeholder), listing thumbnail, last message preview, unread badge
FR-MOBILE-MSG-02: Tapping a thread shall open a chat-style detail view with bubbles for sent vs. received messages, timestamps, and per-message AI-generated alternates accessible via long-press
FR-MOBILE-MSG-03: Mobile app shall let users generate a new AI message via the same `/api/messages/generate` endpoint as web, picking from message types: initial-purchase-inquiry, lowball-offer, negotiation-response, scheduling-pickup, payment-confirmation, no-show-followup
FR-MOBILE-MSG-04: Mobile app shall enforce the same approval workflow as web — AI-generated messages enter DRAFT state, user must explicitly tap "Approve & Send" before the message is dispatched. Sending invokes the backend message-send endpoint
FR-MOBILE-MSG-05: Mobile app shall display negotiation strategy suggestions inline above the compose bar (e.g. "Counter at $40, anchor on shipping cost") sourced from `/api/messages/negotiation-strategy`
FR-MOBILE-MSG-06: Mobile app shall surface inbound messages via push (FR-MOBILE-NOTIFY-03) and shall update the thread in real-time when in foreground via SSE
FR-MOBILE-MSG-07: Mobile app shall let users mark a conversation as ACTIVE / STALLED / CLOSED with a swipe gesture, matching the conversation-status taxonomy in `FR-COMM-06`

**FR-MOBILE-RELIST: Mobile Cross-Platform Resale Posting**

FR-MOBILE-RELIST-01: Mobile app shall provide a Posting Queue screen listing in-flight, completed, and failed cross-platform posts (`PostingJob` model), with per-job status, target platform, retry count, last-error preview
FR-MOBILE-RELIST-02: From an Opportunity in LISTED state, mobile app shall let users generate AI-optimized title + description via `/api/listings/generate-title` and `/api/listings/generate-description`, edit inline, then queue the post via POST `/api/posting-queue`
FR-MOBILE-RELIST-03: Mobile app shall surface the optimal listing price (from `/api/listings/optimal-price`) as a recommendation, with a slider letting the user adjust ±25% before queueing
FR-MOBILE-RELIST-04: Mobile app shall let users select which marketplaces to post to (multi-select checklist: eBay, Mercari, Facebook, OfferUp, Craigslist). Posting reuses Firebase Storage image references from the original listing (FR-RELIST-08)
FR-MOBILE-RELIST-05: Mobile app shall let users add a single ad-hoc photo from the device camera roll or capture a new photo via `expo-camera`, uploaded to Firebase Storage under the user's path
FR-MOBILE-RELIST-06: Mobile app shall display posting-job status updates in real-time via SSE and push (e.g. "Listed on Mercari ✓", "Facebook posting failed — retry?")

**FR-MOBILE-ANALYTICS: Mobile Analytics & Reports**

FR-MOBILE-ANALYTICS-01: Mobile app shall provide an Analytics screen showing: total profit (lifetime, MTD, YTD), number of flips completed, average margin, total cost basis, items currently in inventory. All values pulled from `/api/analytics/summary`
FR-MOBILE-ANALYTICS-02: Mobile app shall render a profit-over-time chart (line/area chart via `victory-native` or `react-native-svg-charts`) with toggleable time ranges (7d / 30d / 90d / YTD / All-time)
FR-MOBILE-ANALYTICS-03: Mobile app shall render a marketplace-breakdown chart (donut/bar) showing profit per marketplace and per category
FR-MOBILE-ANALYTICS-04: Mobile app shall let users export a profit report as CSV/PDF via `/api/analytics/export`, with the resulting file presented through `expo-sharing` / iOS Share Sheet / Android Share Intent
FR-MOBILE-ANALYTICS-05: Mobile app shall display an "Inventory health" gauge — green if no purchased items > 30 days held; yellow if 1–3 items aged; red if ≥4 items aged. Tapping the gauge drills into the aged-inventory list

**FR-MOBILE-BILLING: Mobile Subscription & Billing (IAP)**

FR-MOBILE-BILLING-01: Mobile app shall implement in-app purchase (IAP) for subscription tiers using RevenueCat (`react-native-purchases`) as the abstraction layer over Apple StoreKit 2 and Google Play Billing. Direct Stripe Checkout via web view shall NOT be used for mobile-originated purchases (Apple/Google policy)
FR-MOBILE-BILLING-02: Tiers offered through IAP shall mirror web tiers: FREE (default), FLIPPER (monthly + annual), PRO (monthly + annual). SKU naming convention: `flipper_monthly_v1`, `flipper_annual_v1`, `pro_monthly_v1`, `pro_annual_v1` — registered identically in App Store Connect and Google Play Console
FR-MOBILE-BILLING-03: RevenueCat webhooks shall be forwarded to a new backend endpoint `/api/webhooks/revenuecat` that updates the user's `SubscriptionTier` in Prisma, mirroring how `/api/webhooks/stripe` does for web purchases. Single source of truth: the `User.subscriptionTier` field
FR-MOBILE-BILLING-04: Users who subscribed on web (Stripe) shall NOT be charged again via IAP — the mobile app shall read the user's tier from `/api/users/me` and gate features accordingly without offering IAP upgrade unless tier is FREE OR the user explicitly chooses to migrate
FR-MOBILE-BILLING-05: Users who subscribed via IAP shall be able to manage / cancel their subscription via OS-level subscription management (deep link to `https://apps.apple.com/account/subscriptions` or `https://play.google.com/store/account/subscriptions`), surfaced from Settings → Subscription
FR-MOBILE-BILLING-06: Mobile app shall enforce the SAME tier-based feature gating as web (scan rate limits, AI-analysis quotas, advanced market intelligence access). Gates shall be implemented client-side as UX (disabled buttons, upsell prompts) but enforced server-side as authoritative
FR-MOBILE-BILLING-07: Mobile app shall implement App Store-required "Restore Purchases" affordance in Settings → Subscription, invoking `Purchases.restorePurchases()`

**FR-MOBILE-SETTINGS: Mobile Settings & Preferences**

FR-MOBILE-SETTINGS-01: Mobile app shall provide a Settings screen with sections: Account, Notifications, Appearance (dark/light/system), Subscription, Marketplaces (per-platform on/off + credentials), Search Defaults, Privacy, About / Legal
FR-MOBILE-SETTINGS-02: Mobile app shall let users link / unlink their Google account, Apple account, etc. — invoking the same OAuth flows used at sign-up
FR-MOBILE-SETTINGS-03: Mobile app shall let users update profile data (display name, email, profile photo) via `/api/users/me` — profile photo capture uses `expo-image-picker`
FR-MOBILE-SETTINGS-04: Mobile app shall include a Privacy section linking to the Privacy Policy and Terms of Service URLs (App Store / Play Store also require these links at submission)
FR-MOBILE-SETTINGS-05: Mobile app shall include an About section showing app version (from `expo-application` / `Constants.expoConfig.version`), build number, and a link to the CHANGELOG
FR-MOBILE-SETTINGS-06: Mobile app shall include a "Delete my account" affordance per App Store Guideline 5.1.1(v) requirement (mandatory for apps with account creation). Deletion shall invoke a backend endpoint that schedules account purge per existing privacy policy
FR-MOBILE-SETTINGS-07: Mobile app shall include a feedback / support affordance — "Send Feedback" composes a pre-filled email via `expo-mail-composer` to `support@flipper.ai`

**FR-MOBILE-MEET: Mobile Meeting, Logistics & Native Integrations**

FR-MOBILE-MEET-01: Mobile app shall let users schedule a buy/sell meetup directly into their device calendar via `expo-calendar`, in addition to (or instead of) the existing Google Calendar OAuth path (`FR-MEET-01`). User chooses whether to use the OS calendar, Google Calendar, or both
FR-MOBILE-MEET-02: Mobile app shall let users open driving directions to a meetup location via deep link to `maps://?daddr={lat},{lng}` (Apple Maps) or `geo:0,0?q={lat},{lng}` (Google Maps) — user's OS default maps app handles the routing
FR-MOBILE-MEET-03: Mobile app shall include a "Notify me when I'm 10 minutes away" affordance using `expo-location` geofencing to remind the user to bring the cash / item before arriving
FR-MOBILE-MEET-04: Mobile app shall integrate with the iOS Share Sheet and Android Share Intent so users can share an Opportunity (image + title + url) to Messages, WhatsApp, etc. via `expo-sharing`
FR-MOBILE-MEET-05: Mobile app shall offer a "Quick capture" share-extension entry point — receiving a URL or image shared from another app (e.g. Safari, Chrome) creates a draft Opportunity in IDENTIFIED state for evaluation

**FR-MOBILE-CAMERA: Mobile Camera Capture**

FR-MOBILE-CAMERA-01: Mobile app shall provide an in-app camera flow via `expo-camera` letting users capture photos of an in-hand item for resale-listing image upload, with auto-cropping, flash control, and a multi-shot capture mode (up to 12 photos per listing)
FR-MOBILE-CAMERA-02: Captured photos shall be uploaded to Firebase Storage under `/{userId}/captured/{opportunityId}/{shotIndex}.jpg` and registered in the existing Image model

**FR-MOBILE-POLISH: Mobile Offline, Optimistic UI, Tablet & Native Polish**

> **Naming note:** During the initial draft, these requirements lived under `FR-MOBILE-CAMERA-03..06`. They were renamed to `FR-MOBILE-POLISH-*` because they describe offline / optimistic-UI / tablet / OS-search concerns — not camera concerns. Epic 28 still bundles camera + polish for delivery, but the requirement prefixes are now accurate.

FR-MOBILE-POLISH-01: Mobile app shall offer an offline-mode for the Opportunities + Inventory screens — the most recent server snapshot is rendered from local cache (FR-MOBILE-SCAN-10), edits made offline (stage transitions, captured prices) shall be queued and replayed on reconnect via a write-through queue persisted in `react-native-mmkv`
FR-MOBILE-POLISH-02: Mobile app shall implement an "Optimistic UI" pattern for all lifecycle mutations — the local state advances immediately, with a background sync to the backend, and a rollback toast on failure
FR-MOBILE-POLISH-03: Mobile app shall support landscape orientation on iPad / Android tablets, reflowing the Kanban into a 4-column desktop-style layout; phone-class devices remain portrait-locked
FR-MOBILE-POLISH-04: Mobile app shall implement universal "Search in Flipper" via Spotlight (iOS Core Spotlight) and Android App Indexing where feasible, surfacing Opportunities and Listings in OS-level search

**FR-MOBILE-A11Y: Mobile Accessibility**

FR-MOBILE-A11Y-01: All interactive controls shall have `accessibilityLabel` and `accessibilityRole` attributes per React Native accessibility guidance; touch targets shall be ≥44×44 points (iOS HIG) / ≥48dp (Android Material)
FR-MOBILE-A11Y-02: Mobile app shall pass `expo doctor` accessibility checks and shall be tested with VoiceOver (iOS) and TalkBack (Android) for every screen; navigation order shall be logical and consistent
FR-MOBILE-A11Y-03: Color-contrast ratios shall meet WCAG AA — minimum 4.5:1 for body text, 3:1 for large text and UI components — verified against the dark + light palettes
FR-MOBILE-A11Y-04: Mobile app shall honor system Dynamic Type / font-scale settings, reflowing without truncation up to 200% scale on key screens (Dashboard, Opportunities, Settings)
FR-MOBILE-A11Y-05: Mobile app shall provide alt text / `accessibilityLabel` on all listing images so screen reader users hear "Listing photo: {title}, {price}"

**FR-RELEASE-MOBILE: Mobile CI/CD, EAS Pipeline, Versioning & Store Release**

FR-RELEASE-MOBILE-01: Mobile workspace shall be configured with EAS (`eas.json`) defining three build profiles: `development` (development client + dev server), `preview` (internal QA build, distributed via Firebase App Distribution + TestFlight internal), `production` (App Store + Play Store release)
FR-RELEASE-MOBILE-02: EAS Build shall produce signed binaries for iOS (`.ipa`) and Android (`.aab` for Play, `.apk` for App Distribution) for each profile. Code signing credentials shall be managed by EAS (Apple App Store Connect API key + Android upload keystore)
FR-RELEASE-MOBILE-03: A GitHub Actions workflow `.github/workflows/mobile-ci.yml` shall run on every PR touching `mobile/**` or `packages/**`: lint (`eslint`), typecheck (`tsc --noEmit`), unit tests (`jest`), and `expo doctor` health checks
FR-RELEASE-MOBILE-04: A GitHub Actions workflow `.github/workflows/mobile-preview-build.yml` shall trigger on every push to `main` touching `mobile/**` or `packages/**`: invoke `eas build --profile preview --platform all --non-interactive --no-wait`, capture the build IDs, and post a comment on the PR / commit with build URLs
FR-RELEASE-MOBILE-05: Preview builds shall be auto-distributed: iOS preview builds shall upload to TestFlight via `eas submit --profile preview --platform ios` (TestFlight internal tester group); Android preview builds shall upload to Firebase App Distribution via the Firebase CLI plugin or `eas submit --profile preview --platform android` (App Distribution tester groups)
FR-RELEASE-MOBILE-06: A GitHub Actions workflow `.github/workflows/mobile-production-release.yml` shall trigger on a tag matching `mobile-v*.*.*` — invoking `eas build --profile production --platform all`, then `eas submit --profile production --platform all` to push the iOS build to App Store Review and the Android build to Play Console production track
FR-RELEASE-MOBILE-07: Mobile workspace shall include `mobile/VERSION.md` as the canonical version source — read by `app.config.ts` to populate `expo.version`, `expo.ios.buildNumber`, and `expo.android.versionCode`. Versioning shall follow semver. Major bumps require an updated user-data migration plan
FR-RELEASE-MOBILE-08: Mobile workspace shall include `mobile/CHANGELOG.md` following the Keep-a-Changelog format identical to the web CHANGELOG, with a `[Unreleased]` channel and per-version sections. Cutting a mobile release shall promote `[Unreleased]` → `[X.Y.Z] — YYYY-MM-DD` and tag `mobile-vX.Y.Z`
FR-RELEASE-MOBILE-09: The mobile-production-release workflow shall auto-extract the changelog section for the version being released and post it as the GitHub Release notes AND the App Store / Play Store "What's New" copy via `eas submit` metadata fields
FR-RELEASE-MOBILE-10: Mobile workspace shall configure EAS Update (OTA) for over-the-air JavaScript/asset updates between binary releases. Update channels shall mirror profiles: `development`, `preview`, `production`. Production OTA updates shall be gated behind a "soft launch" rollout (start at 10% → 25% → 50% → 100%) controlled by EAS Update branch promotion
FR-RELEASE-MOBILE-11: EAS Update shall be configurable with an emergency rollback affordance — `eas update --branch production --message "rollback" --republish <prior-update-id>` shall be documented in `mobile/docs/RELEASE_PLAYBOOK.md` and reachable via a Makefile target `make mobile-rollback`
FR-RELEASE-MOBILE-12: Mobile app shall include a runtime version check on launch — if the server reports a minimum supported version greater than the device's installed version, the user is shown a force-upgrade screen with a deep link to the App Store / Play Store listing. Backend endpoint `/api/mobile/min-version` returns the minimum supported version per platform
FR-RELEASE-MOBILE-13: Sentry shall be configured in the mobile app with release/version tagging matching the EAS build version. Source maps shall be uploaded to Sentry automatically on every EAS build via the Sentry Expo plugin
FR-RELEASE-MOBILE-14: Mobile workspace shall include a `mobile/PRIVACY.md` mapping the data the app collects (per Apple App Privacy "Nutrition Label" and Google Play Data Safety form) — categories: contact info, identifiers, usage data, diagnostics, location (if user grants), photos (if user grants). Store submission tooling shall reference this manifest
FR-RELEASE-MOBILE-15: Pre-submission checklist (`mobile/docs/STORE_SUBMISSION_CHECKLIST.md`) shall enumerate every Apple App Store Review Guideline and Google Play Policy item that applies: account deletion (5.1.1(v)), Sign in with Apple if other social sign-ins exist (4.8), Privacy Nutrition Label, App Tracking Transparency prompt (if any tracking), restored-purchases affordance, fair-use guidelines for marketplace scraping (we surface scraping disclaimers in-app and link to TOS)

### Non-Functional Requirements

NFR-MOB-PERF-01: Mobile app cold start (icon tap → first interactive frame) shall be ≤ 2.5 seconds on a mid-tier device (Pixel 5 / iPhone 12) on a warm cache
NFR-MOB-PERF-02: Mobile app warm start (background → foreground) shall be ≤ 800 ms
NFR-MOB-PERF-03: Mobile app shall sustain ≥ 55 fps on the Opportunities Kanban scroll and the listings feed scroll on the reference devices
NFR-MOB-PERF-04: Mobile app initial JS bundle (without OTA-deferred chunks) shall be ≤ 8 MB; total install size shall be ≤ 80 MB
NFR-MOB-PERF-05: Mobile app shall maintain a Sentry crash-free-users rate ≥ 99.5% over rolling 7-day windows in production

NFR-MOB-SEC-01: Firebase ID tokens shall be stored exclusively in `expo-secure-store` (iOS Keychain / Android Keystore), NEVER in `AsyncStorage` or plain files
NFR-MOB-SEC-02: All network traffic shall be HTTPS-only; cleartext HTTP shall be disabled (iOS NSAllowsArbitraryLoads=false, Android `networkSecurityConfig` enforcing cleartext-disabled)
NFR-MOB-SEC-03: Certificate pinning for the production API host (`api.flipper.ai`) shall be configured via Expo's `expo-network` / native pinning module, with a documented rotation procedure
NFR-MOB-SEC-04: Mobile app shall not log Firebase tokens, OAuth tokens, or user PII to Sentry, console, or analytics — verified via a runtime safety filter in the Sentry beforeSend hook
NFR-MOB-SEC-05: App shall pass `expo doctor` and EAS security checks; no critical CVEs in production dependencies (verified by `pnpm audit` in CI)

NFR-MOB-A11Y-01: Mobile app shall pass WCAG AA on every screen — color contrast, dynamic type, screen-reader compatibility, focus traversal order
NFR-MOB-A11Y-02: All interactive controls shall have appropriate `accessibilityRole` and `accessibilityLabel`; touch targets shall meet platform minimums (44pt iOS / 48dp Android)

NFR-MOB-RELEASE-01: Mobile release cadence shall support: hot-fixes via EAS Update in ≤ 30 minutes (rollback in ≤ 5 minutes); standard binary releases iOS in ≤ 7 days through TestFlight + App Review; Android in ≤ 3 days through Play Console
NFR-MOB-RELEASE-02: Every production binary release shall have a corresponding GitHub Release with notes auto-extracted from `mobile/CHANGELOG.md`
NFR-MOB-RELEASE-03: Mobile app store submissions shall comply with Apple App Store Review Guidelines (current edition) and Google Play Developer Program Policies in effect at submission time
NFR-MOB-RELEASE-04: Mobile app shall surface its semantic version + build number visibly in Settings → About for support reproducibility

NFR-MOB-TEST-01: Mobile workspace unit-test coverage shall be ≥ 80% statements / 70% branches on new modules
NFR-MOB-TEST-02: Mobile E2E suite (Maestro flows + Gherkin scenarios) shall cover every Acceptance Criterion at the appropriate level — UI-visible ACs hit Maestro; logic-only ACs hit Jest service tests
NFR-MOB-TEST-03: Mobile E2E suite shall run on both iOS Simulator and Android Emulator in CI on every PR to main touching `mobile/**`; smoke pack shall complete in ≤ 8 minutes wall-clock
NFR-MOB-TEST-04: Mobile traceability matrix entries shall appear in the same `_bmad-output/test-artifacts/requirements-traceability-matrix.md` used by the web workspace — one matrix, full coverage

### Additional Requirements

**From the Architecture document (mobile-relevant):**
- AR-MOB-01: Backend remains Cloud Run + Cloud SQL with PrismaPg adapter — no schema changes for v1 except adding a `DeviceToken` model
- AR-MOB-02: Firebase project is shared between web and mobile (single source of `User.firebaseUid`)
- AR-MOB-03: `getCurrentUserId()` extended to accept `Authorization: Bearer <Firebase ID token>` alongside the existing `__session` cookie path
- AR-MOB-04: SSE `/api/events` is the canonical real-time channel; mobile clients use it in foreground, push for background

**From the UX Design document (mobile-relevant):**
- UX-MOB-01: Mobile design language follows the canonical dark-glassmorphism from `app/globals.css` `.fp-*` utility classes — reused via NativeWind in mobile
- UX-MOB-02: Touch targets ≥ 44pt (iOS) / 48dp (Android); WCAG AA contrast on every screen
- UX-MOB-03: Thumb-first navigation — primary CTAs reachable with one-handed grip on a 6.7" device
- UX-MOB-04: Skeleton loading states on every data-driven screen

**From CLAUDE.md and project-context.md (project-wide policy):**
- POL-01: AI provider calls (Groq / Gemini / OpenAI / Anthropic) MUST NEVER be mocked in mobile tests — same policy as web. Tests exercise the real fallback chain through the backend `/api/ai/*` endpoints
- POL-02: File header standard applies to every `.ts` / `.tsx` file in `mobile/` (`@file`, `@author Stephen Boyett`, `@description`, `@Copyright`)
- POL-03: Trello board `trello-axovia` is the single source of truth for story state; every story card in this document must be created on that board per the BMAD Trello Integration rules

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-MOBILE-FOUNDATION-01..10 | Epic 15 | Monorepo + Expo bootstrap, shared types & design tokens, NativeWind, file headers, Makefile |
| FR-RELEASE-MOBILE-01..05, 13 | Epic 16 | EAS profiles, GitHub Actions CI workflows, App Distribution + TestFlight, Sentry source maps |
| FR-RELEASE-MOBILE-06..11 | Epic 16 | Versioning, CHANGELOG.md, tag-triggered production release, EAS Update OTA, phased rollout, rollback |
| FR-MOBILE-AUTH-01..10 | Epic 17 | Mobile Firebase Auth, Bearer-token bridge, secure storage, biometric, mobile onboarding, Sentry breadcrumbs |
| FR-MOBILE-SHELL-01..12 | Epic 18 | App shell, tab nav, NativeWind design tokens, shared state components, splash + icon, deep links, haptics |
| FR-MOBILE-SCAN-01..10 | Epic 19 | Mobile scanner, SSE/polling, listings feed, filter sheet, detail screen, save/pass, persistent cache |
| FR-MOBILE-LIFECYCLE-01..08 | Epic 20 | Mobile Kanban + swipe stack, lifecycle transitions, PURCHASED/LISTED/SOLD prompts, inventory, activity timeline |
| FR-MOBILE-NOTIFY-01..10 | Epic 21 | Mobile push (FCM/APNs), device-token registration, dispatcher integration, deep links, badges, quiet hours |
| FR-MOBILE-MSG-01..07 | Epic 22 | Mobile inbox, chat-style threads, AI message generation, approval workflow, negotiation strategy, status |
| FR-MOBILE-RELIST-01..06 | Epic 23 | Mobile cross-platform posting queue, AI title/description, optimal pricing, multi-marketplace post, photo capture |
| FR-MOBILE-ANALYTICS-01..05 | Epic 24 | Mobile analytics dashboards, profit-over-time chart, breakdown chart, export via share sheet, inventory health |
| FR-MOBILE-BILLING-01..07 | Epic 25 | RevenueCat IAP, entitlement reconciliation (web ↔ IAP), OS-level subscription management, restore purchases |
| FR-MOBILE-SETTINGS-01..07 | Epic 26 | Mobile settings, account mgmt, delete-account, privacy + about, feedback |
| FR-MOBILE-A11Y-01..05 | Epic 26 | Mobile accessibility (WCAG AA, screen readers, dynamic type, alt text) |
| FR-MOBILE-MEET-01..05 | Epic 27 | Mobile calendar (OS + Google), maps directions, geofencing reminder, share sheet, quick-capture share-extension |
| FR-MOBILE-CAMERA-01..02 | Epic 28 | In-app camera + Firebase Storage upload pipeline |
| FR-MOBILE-POLISH-01..04 | Epic 28 | Offline mode write-through queue, optimistic UI, tablet 4-column Kanban, Spotlight / App Indexing |
| FR-RELEASE-MOBILE-12, 14, 15 | Epic 29 | Force-upgrade min-version check, App Privacy nutrition label / Data Safety form, store-submission checklist |

> **Coverage cross-reference:** The full project requirements traceability matrix lives at `_bmad-output/test-artifacts/requirements-traceability-matrix.md` and is updated per-story as part of each story's DoD.

---

## Epic List

### Epic 15: Mobile Foundation, Monorepo & Expo Bootstrap (Phase A)

Engineering can develop and build a native iOS + Android Flipper.ai app from a single `mobile/` workspace inside the existing monorepo, sharing TypeScript types and design tokens with the web app and inheriting all linting / formatting / file-header conventions.

**FRs covered:** FR-MOBILE-FOUNDATION-01, FR-MOBILE-FOUNDATION-02, FR-MOBILE-FOUNDATION-03, FR-MOBILE-FOUNDATION-04, FR-MOBILE-FOUNDATION-05, FR-MOBILE-FOUNDATION-06, FR-MOBILE-FOUNDATION-07, FR-MOBILE-FOUNDATION-08, FR-MOBILE-FOUNDATION-09, FR-MOBILE-FOUNDATION-10
**NFRs addressed:** NFR-MOB-PERF-04 (bundle size), NFR-MOB-SEC-05 (CVE scanning), NFR-MOB-TEST-01 (test scaffolding)
**Implementation notes:** Convert root repo to `pnpm` workspaces; add `mobile/` with Expo SDK 53+, expo-router, TypeScript strict; extract `packages/types/` and `packages/design-tokens/`; configure NativeWind v4 to consume tokens. Bootstrap MUST land before any feature work so all subsequent epics build on stable rails.

### Epic 16: Mobile CI/CD — EAS Build + Firebase App Distribution + TestFlight (Phase A)

Engineering can ship a signed mobile build into testers' hands automatically on every merge to `main`, with a separate one-command path for production store releases tagged `mobile-vX.Y.Z`.

**FRs covered:** FR-RELEASE-MOBILE-01, FR-RELEASE-MOBILE-02, FR-RELEASE-MOBILE-03, FR-RELEASE-MOBILE-04, FR-RELEASE-MOBILE-05, FR-RELEASE-MOBILE-06, FR-RELEASE-MOBILE-07, FR-RELEASE-MOBILE-08, FR-RELEASE-MOBILE-09, FR-RELEASE-MOBILE-10, FR-RELEASE-MOBILE-11, FR-RELEASE-MOBILE-13
**NFRs addressed:** NFR-MOB-RELEASE-01, NFR-MOB-RELEASE-02, NFR-MOB-RELEASE-04, NFR-MOB-TEST-03
**Implementation notes:** `eas.json` with development/preview/production profiles; three GitHub Actions workflows (`mobile-ci.yml`, `mobile-preview-build.yml`, `mobile-production-release.yml`); App Store Connect API key + Android upload keystore stored in EAS credentials manager; Sentry source map upload on every build; `mobile/VERSION.md` + `mobile/CHANGELOG.md` versioning. **This epic is the fastest-path keystone — pipeline lands BEFORE feature parity so every subsequent mobile feature is shippable end-to-end.**

### Epic 17: Mobile Auth & Session Bridge — Firebase ID Tokens (Phase A)

Users can sign up, sign in (email/password + Google + Apple), reset password, complete onboarding, and stay signed in across launches on the mobile app, with the SAME Firebase identity as the web app and the SAME backend session contract.

**FRs covered:** FR-MOBILE-AUTH-01, FR-MOBILE-AUTH-02, FR-MOBILE-AUTH-03, FR-MOBILE-AUTH-04, FR-MOBILE-AUTH-05, FR-MOBILE-AUTH-06, FR-MOBILE-AUTH-07, FR-MOBILE-AUTH-08, FR-MOBILE-AUTH-09, FR-MOBILE-AUTH-10
**NFRs addressed:** NFR-MOB-SEC-01, NFR-MOB-SEC-02, NFR-MOB-SEC-04, NFR-SEC-09 (parity with web)
**Implementation notes:** Backend story 17.1 extends `src/lib/firebase/session.ts` to accept `Authorization: Bearer <ID token>` in addition to `__session` cookie. Apple Sign-In is REQUIRED by App Store policy when Google is offered. Onboarding state syncs to existing `/api/onboarding/*` endpoints so web and mobile share state.

### Epic 18: Mobile Shell, Navigation & Design System (Phase B)

Users open the app to a polished, dark-glassmorphism shell with tab navigation, safe-area insets, splash screen, deep links, haptic feedback, and the project's canonical design language rendered natively.

**FRs covered:** FR-MOBILE-SHELL-01, FR-MOBILE-SHELL-02, FR-MOBILE-SHELL-03, FR-MOBILE-SHELL-04, FR-MOBILE-SHELL-05, FR-MOBILE-SHELL-06, FR-MOBILE-SHELL-07, FR-MOBILE-SHELL-08, FR-MOBILE-SHELL-09, FR-MOBILE-SHELL-10, FR-MOBILE-SHELL-11, FR-MOBILE-SHELL-12
**NFRs addressed:** NFR-MOB-PERF-01, NFR-MOB-PERF-02, NFR-MOB-PERF-03, NFR-UX-01 (mobile-responsive parity), NFR-UX-04 (toasts), NFR-UX-05 (error boundary)
**Implementation notes:** Shared design tokens already live in `packages/design-tokens/` from Epic 15 — this epic builds the NativeWind plugin/preset that exposes them as utility classes. Five tab routes; deep links via Expo Router conventions; splash + app icon assets generated from one source.

### Epic 19: Mobile Marketplace Scanning, Listings & Opportunities (Phase B)

Users can trigger a marketplace scrape from the mobile app, watch progress in real time, browse the scan results in a thumb-first feed, view full listing details, save listings as opportunities, and pass on listings.

**FRs covered:** FR-MOBILE-SCAN-01, FR-MOBILE-SCAN-02, FR-MOBILE-SCAN-03, FR-MOBILE-SCAN-04, FR-MOBILE-SCAN-05, FR-MOBILE-SCAN-06, FR-MOBILE-SCAN-07, FR-MOBILE-SCAN-08, FR-MOBILE-SCAN-09, FR-MOBILE-SCAN-10
**NFRs addressed:** NFR-PERF-04 (SSE delivery latency parity), NFR-MOB-PERF-03 (60 fps scroll), NFR-RELY-02 (retry/backoff parity)
**Implementation notes:** No backend changes required — mobile consumes the same `/api/scraper/*`, `/api/listings`, `/api/opportunities`, `/api/events` endpoints as web. SSE fallback to polling on flaky cellular. AI calls (sellability, identification) hit `/api/ai/*` — and per project policy, AI is NEVER mocked even in mobile tests.

### Epic 20: Mobile Flip Lifecycle, Kanban & Swipeable Cards (Phase B)

Users can track every flip from IDENTIFIED → PURCHASED → LISTED → SOLD on a mobile-native Kanban (horizontal columns) or a swipeable card stack, advance/revert stages via swipe gestures, capture purchase/sale prices, and see a per-flip activity timeline.

**FRs covered:** FR-MOBILE-LIFECYCLE-01, FR-MOBILE-LIFECYCLE-02, FR-MOBILE-LIFECYCLE-03, FR-MOBILE-LIFECYCLE-04, FR-MOBILE-LIFECYCLE-05, FR-MOBILE-LIFECYCLE-06, FR-MOBILE-LIFECYCLE-07, FR-MOBILE-LIFECYCLE-08
**NFRs addressed:** NFR-MOB-PERF-03 (60 fps), NFR-UX-01 (mobile-responsive parity for FR-DASH-02)
**Implementation notes:** Reuses the same Prisma Opportunity model + `/api/opportunities/*` endpoints. Swipe-to-advance uses `react-native-gesture-handler` + `react-native-reanimated` for buttery animations. Toggleable view persists in `AsyncStorage`.

### Epic 21: Mobile Push Notifications & Real-Time Updates (Phase B)

Users receive push notifications on iOS + Android for every alert event the web app supports (new opportunity, inbound message, flip sold, price change, etc.), with deep links into the relevant screen, per-channel preferences, and quiet hours.

**FRs covered:** FR-MOBILE-NOTIFY-01, FR-MOBILE-NOTIFY-02, FR-MOBILE-NOTIFY-03, FR-MOBILE-NOTIFY-04, FR-MOBILE-NOTIFY-05, FR-MOBILE-NOTIFY-06, FR-MOBILE-NOTIFY-07, FR-MOBILE-NOTIFY-08, FR-MOBILE-NOTIFY-09, FR-MOBILE-NOTIFY-10
**NFRs addressed:** NFR-PERF-04 (real-time delivery)
**Implementation notes:** Backend story 21.2 extends the existing dispatcher (Epic 10/11) with a new `MobilePushChannel` that resolves the user's registered `DeviceToken` records and calls Expo's push API (which fans out to APNs + FCM). **End of Epic 21 = closed-beta release — Phases A + B complete, app shipped to TestFlight + Play Internal Testing.**

### Epic 22: Mobile Messaging, Negotiation & Inbox (Phase C)

Users can browse a unified inbox across all marketplaces, generate AI-drafted messages, approve and send them, see negotiation strategy suggestions inline, and manage conversation status — all on mobile.

**FRs covered:** FR-MOBILE-MSG-01, FR-MOBILE-MSG-02, FR-MOBILE-MSG-03, FR-MOBILE-MSG-04, FR-MOBILE-MSG-05, FR-MOBILE-MSG-06, FR-MOBILE-MSG-07
**NFRs addressed:** NFR-UX-01 (mobile-responsive parity for FR-COMM-*)
**Implementation notes:** Reuses `/api/messages/*` endpoints and the same AI prompts in `src/lib/ai/prompts/`. AI calls go through the live router (Groq primary, never mocked).

### Epic 23: Mobile Cross-Platform Resale Posting Queue (Phase C)

Users can generate AI-optimized titles + descriptions for an opportunity, accept or adjust the recommended price, select target marketplaces, and post across multiple platforms from mobile — with status visibility in a Posting Queue view.

**FRs covered:** FR-MOBILE-RELIST-01, FR-MOBILE-RELIST-02, FR-MOBILE-RELIST-03, FR-MOBILE-RELIST-04, FR-MOBILE-RELIST-05, FR-MOBILE-RELIST-06
**NFRs addressed:** NFR-RELY-02 (retry parity), NFR-PERF-04 (SSE parity)
**Implementation notes:** Reuses `/api/posting-queue/*` and Firebase Storage image references; optional ad-hoc photo capture from camera roll or `expo-camera`.

### Epic 24: Mobile Analytics, Reports & Insights (Phase C)

Users can see lifetime / MTD / YTD profit, completed flips count, average margin, an inventory-health gauge, and time-series + breakdown charts on mobile — and can export reports via the device share sheet.

**FRs covered:** FR-MOBILE-ANALYTICS-01, FR-MOBILE-ANALYTICS-02, FR-MOBILE-ANALYTICS-03, FR-MOBILE-ANALYTICS-04, FR-MOBILE-ANALYTICS-05
**NFRs addressed:** NFR-UX-01 (mobile-responsive parity for FR-DASH-07/08)
**Implementation notes:** `victory-native` or `react-native-svg-charts` for charts; `expo-sharing` for CSV/PDF export distribution. Reuses `/api/analytics/*` endpoints.

### Epic 25: Mobile Subscription & Billing (RevenueCat IAP) (Phase C)

Users can subscribe to FLIPPER or PRO tiers via Apple StoreKit / Google Play Billing on mobile (mediated through RevenueCat), restore purchases, and manage subscriptions at the OS level — with tier sync to the backend's existing `User.subscriptionTier` source of truth.

**FRs covered:** FR-MOBILE-BILLING-01, FR-MOBILE-BILLING-02, FR-MOBILE-BILLING-03, FR-MOBILE-BILLING-04, FR-MOBILE-BILLING-05, FR-MOBILE-BILLING-06, FR-MOBILE-BILLING-07
**NFRs addressed:** NFR-SEC-08 (webhook signature parity), NFR-MOB-RELEASE-03 (store policy compliance)
**Implementation notes:** New `/api/webhooks/revenuecat` endpoint mirrors Stripe webhook handler. Mobile reads tier from `/api/users/me` — single source of truth. Sign-in-with-Apple gating for new users (App Store policy). Web users with active Stripe subs are NOT offered IAP upgrades to avoid double-billing.

### Epic 26: Mobile Settings, Notification Preferences & Accessibility (Phase C)

Users can configure their account, notification preferences (per-event × per-channel), appearance, marketplaces, search defaults, privacy, and subscription; the app meets WCAG AA across every screen with screen-reader + dynamic-type compatibility on both iOS and Android.

**FRs covered:** FR-MOBILE-SETTINGS-01, FR-MOBILE-SETTINGS-02, FR-MOBILE-SETTINGS-03, FR-MOBILE-SETTINGS-04, FR-MOBILE-SETTINGS-05, FR-MOBILE-SETTINGS-06, FR-MOBILE-SETTINGS-07, FR-MOBILE-A11Y-01, FR-MOBILE-A11Y-02, FR-MOBILE-A11Y-03, FR-MOBILE-A11Y-04, FR-MOBILE-A11Y-05
**NFRs addressed:** NFR-MOB-A11Y-01, NFR-MOB-A11Y-02, NFR-UX-02 (WCAG AA parity)
**Implementation notes:** Notification preferences write to the same backend endpoint as web. "Delete my account" implements App Store Guideline 5.1.1(v). Privacy + Terms links satisfy store submission requirements.

### Epic 27: Mobile Meeting, Logistics & Native Integrations (Phase C)

Users can schedule meetups directly into the OS calendar (or Google Calendar), get driving directions in their preferred maps app, receive a 10-minute geofence reminder, share opportunities through the iOS / Android share sheet, and quick-capture URLs/images from other apps into Flipper.

**FRs covered:** FR-MOBILE-MEET-01, FR-MOBILE-MEET-02, FR-MOBILE-MEET-03, FR-MOBILE-MEET-04, FR-MOBILE-MEET-05
**NFRs addressed:** NFR-UX-01 (mobile-responsive parity for FR-MEET-*)
**Implementation notes:** `expo-calendar`, `expo-location` geofencing, `expo-sharing` and an iOS/Android share-extension target (configured via `expo-share-extension`). **End of Epic 27 = open-beta release — feature parity with web.**

### Epic 28: Mobile Camera Capture, Offline & Native Polish (Phase D)

Users can capture in-hand photos via the in-app camera for resale listings (multi-shot, flash, crop), view recent data offline, advance lifecycle stages offline with auto-sync on reconnect, and benefit from optimistic UI on every mutation. Tablets get a desktop-style 4-column Kanban.

**FRs covered:** FR-MOBILE-CAMERA-01, FR-MOBILE-CAMERA-02, FR-MOBILE-POLISH-01, FR-MOBILE-POLISH-02, FR-MOBILE-POLISH-03, FR-MOBILE-POLISH-04
**NFRs addressed:** NFR-MOB-PERF-01, NFR-MOB-PERF-02, NFR-MOB-PERF-05 (crash-free rate)
**Implementation notes:** `expo-camera`, `react-native-mmkv` for the offline write-through queue, Spotlight integration via `expo-spotlight-search` (or a small native module). Optimistic UI uses TanStack Query mutations with rollback toasts on failure.

### Epic 29: Mobile Production Launch — App Store + Google Play GA (Phase D)

Flipper.ai mobile is publicly available on the Apple App Store and Google Play Store as v2.0.0, with marketing assets, screenshots, app reviews monitoring, post-launch crash triage, and a documented release-playbook for the operations team.

**FRs covered:** FR-RELEASE-MOBILE-12, FR-RELEASE-MOBILE-14, FR-RELEASE-MOBILE-15
**NFRs addressed:** NFR-MOB-RELEASE-01, NFR-MOB-RELEASE-02, NFR-MOB-RELEASE-03, NFR-MOB-RELEASE-04
**Implementation notes:** App Store + Play Store listings (screenshots, descriptions, keywords, support URL, privacy policy URL, App Privacy "Nutrition Label", Data Safety form). Phased rollout via App Store Connect + Play Console (10% → 25% → 50% → 100%). Crash monitoring via Sentry mobile project. Post-launch playbook documents the rollback procedure (FR-RELEASE-MOBILE-11) and a "minimum supported version" force-upgrade flow (FR-RELEASE-MOBILE-12).

---

## Epic 15 Stories: Mobile Foundation, Monorepo & Expo Bootstrap

### Story 15.1: Convert Repo to pnpm Workspace Monorepo

As a **developer**,
I want the repository to be a pnpm workspace monorepo with `mobile/` and shared `packages/`,
So that the mobile app can share types, design tokens, and tooling with the web app without duplication.

**Acceptance Criteria:**

**Given** the project root contains the existing Next.js workspace
**When** `pnpm-workspace.yaml` is added declaring workspaces `.`, `mobile`, `packages/*`
**Then** `pnpm install` resolves all workspaces and creates a unified `node_modules` with hoisted shared deps

**Given** existing root-level scripts (`make dev`, `make test`, `make build`, `make lint`)
**When** the monorepo is in place
**Then** all existing scripts continue to operate against the web workspace unchanged

**Given** the path alias convention from CLAUDE.md
**When** a developer imports from a shared package
**Then** `@shared/types` and `@shared/design-tokens` resolve via tsconfig path mapping in both web and mobile workspaces

**FRs fulfilled:** FR-MOBILE-FOUNDATION-01, FR-MOBILE-FOUNDATION-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-015-mobile-foundation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-015-S-<N>` (sequential within Epic 15), `@story-15-1`, and `@FR-MOBILE-FOUNDATION-01` / `@FR-MOBILE-FOUNDATION-03`. Scenarios shall verify `pnpm-workspace.yaml` declares the expected workspaces, `pnpm install` exits 0, and the web workspace `make build` still passes. Update the requirements traceability matrix. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and the standard DoD checklist.

---

### Story 15.2: Extract Shared `packages/types/` and `packages/design-tokens/`

As a **developer**,
I want all shared TypeScript domain types and design tokens in framework-agnostic packages,
So that web and mobile consume one canonical definition.

**Acceptance Criteria:**

**Given** the existing types in `src/lib/types.ts` and prisma-generated types
**When** a `packages/types/` workspace is created
**Then** it exports `Listing`, `Opportunity`, `ScraperJob`, `User`, `SubscriptionTier`, `Message`, `PostingJob`, `Notification`, `DeviceToken`, plus enums (`LifecycleStage`, `MessageStatus`, `PostingStatus`)

**Given** the canonical design tokens in `app/globals.css` (`:root` CSS variables)
**When** a `packages/design-tokens/` workspace is created
**Then** it exports a TypeScript object with `colors`, `spacing`, `radius`, `typography`, `glass` (alpha levels), `animation`, mirroring the CSS variables with identical values

**Given** the web app's Tailwind config
**When** the web workspace consumes `packages/design-tokens/`
**Then** the existing canonical `.fp-*` utility classes resolve to identical values and existing visual tests pass

**FRs fulfilled:** FR-MOBILE-FOUNDATION-04, FR-MOBILE-FOUNDATION-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-015-mobile-foundation.feature`. Tag with `@E-015-S-<N>`, `@story-15-2`, `@FR-MOBILE-FOUNDATION-04` / `@FR-MOBILE-FOUNDATION-05`. Include a visual-regression-style check that `.fp-glass` background color matches the token value, and a TypeScript-import scenario verifying the `Opportunity` type is structurally identical when imported from `@shared/types` and from prisma-generated. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 15.3: Bootstrap `mobile/` Workspace with Expo + Expo Router + NativeWind

As a **developer**,
I want a working Expo SDK 53+ mobile workspace with file-based routing and NativeWind-powered design tokens,
So that I can build app screens against the canonical design system using familiar Tailwind utilities.

**Acceptance Criteria:**

**Given** the monorepo is configured (Story 15.1)
**When** `mobile/` is bootstrapped with `create-expo-app` using the TypeScript template + expo-router
**Then** `mobile/app/_layout.tsx` exists, `mobile/app/index.tsx` renders a "Hello Flipper Mobile" screen, and `pnpm --filter mobile dev` starts the Metro bundler

**Given** the shared design tokens (Story 15.2)
**When** NativeWind v4 is configured in `mobile/tailwind.config.ts` consuming `@shared/design-tokens`
**Then** className strings like `className="fp-glass fp-btn-primary"` resolve to native styles matching the web's visual output (sampled via a snapshot test)

**Given** TypeScript strict mode
**When** `pnpm --filter mobile typecheck` runs
**Then** it exits 0 with zero errors

**Given** the project's File Header Standard
**When** any `.ts` / `.tsx` file is created under `mobile/`
**Then** it begins with the canonical JSDoc file header (`@file`, `@author Stephen Boyett`, `@description`, `@Copyright © 2026 Axovia LLC. All Rights Reserved.`)

**FRs fulfilled:** FR-MOBILE-FOUNDATION-02, FR-MOBILE-FOUNDATION-06, FR-MOBILE-FOUNDATION-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-015-mobile-foundation.feature`. Tag with `@E-015-S-<N>`, `@story-15-3`, `@FR-MOBILE-FOUNDATION-02` / `@FR-MOBILE-FOUNDATION-06` / `@FR-MOBILE-FOUNDATION-07`. Include a Maestro smoke flow that boots the dev client and verifies the "Hello Flipper Mobile" screen renders on both iOS Simulator and Android Emulator. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 15.4: Mobile Lint, Format & Test Scaffolding

As a **developer**,
I want ESLint, Prettier, and Jest configured in the mobile workspace consistent with the project root,
So that mobile code meets the same quality bar as web code and runs through the same gates.

**Acceptance Criteria:**

**Given** the project root ESLint flat config
**When** `mobile/eslint.config.js` extends the root config plus `eslint-plugin-react-native` and `@react-native/eslint-config`
**Then** `make lint` lints BOTH workspaces in a single command and exits 0 on clean code

**Given** the existing Prettier config
**When** Prettier runs against `mobile/**`
**Then** formatting matches the rest of the codebase

**Given** Jest setup in the root workspace
**When** `mobile/jest.config.js` is added using `jest-expo` preset with `@testing-library/react-native`
**Then** `pnpm --filter mobile test` runs and a sample unit test (e.g. testing a pure utility) passes

**Given** the project's file-header validator
**When** `make check-headers` is run with mobile included in scope
**Then** all mobile `.ts`/`.tsx` files pass the header check

**FRs fulfilled:** FR-MOBILE-FOUNDATION-08, FR-MOBILE-FOUNDATION-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-015-mobile-foundation.feature`. Tag with `@E-015-S-<N>`, `@story-15-4`, `@FR-MOBILE-FOUNDATION-08` / `@FR-MOBILE-FOUNDATION-09`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 15.5: Top-Level Mobile Makefile Targets

As a **developer**,
I want top-level `make` targets for every common mobile development workflow,
So that mobile development follows the same operator UX as the web app.

**Acceptance Criteria:**

**Given** the existing project Makefile
**When** mobile targets are added
**Then** the following targets exist and work: `make mobile-dev`, `make mobile-test`, `make mobile-test-e2e`, `make mobile-typecheck`, `make mobile-build-ios`, `make mobile-build-android`, `make mobile-submit-ios`, `make mobile-submit-android`, `make mobile-rollback`

**Given** the developer runs `make help`
**When** help output is rendered
**Then** all mobile targets appear in a dedicated "Mobile" section

**FRs fulfilled:** FR-MOBILE-FOUNDATION-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-015-mobile-foundation.feature`. Tag with `@E-015-S-<N>`, `@story-15-5`, `@FR-MOBILE-FOUNDATION-10`. Verify each target's existence and a successful `--dry-run` (or equivalent) invocation. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 16 Stories: Mobile CI/CD — EAS Build + Firebase App Distribution + TestFlight

### Story 16.1: EAS Build Profiles & Credentials Setup

As a **release engineer**,
I want EAS configured with development / preview / production profiles and managed signing credentials,
So that any developer can produce a signed binary for any platform with one command.

**Acceptance Criteria:**

**Given** the mobile workspace
**When** `mobile/eas.json` is created with three profiles
**Then** the file defines `development` (development client + dev URL), `preview` (internal QA, `distribution: internal`), `production` (App Store + Play Store, `distribution: store`)

**Given** an Apple Developer account
**When** `eas credentials` is configured for iOS
**Then** an App Store Connect API key is stored in EAS for automated submission and a managed iOS distribution certificate + provisioning profile exist

**Given** a Google Play developer account
**When** `eas credentials` is configured for Android
**Then** an Android upload keystore is stored in EAS and a Google service account JSON is configured for automated Play Console uploads

**Given** all three profiles
**When** `eas build --profile preview --platform all --non-interactive` is run locally
**Then** both iOS and Android builds queue and complete successfully

**FRs fulfilled:** FR-RELEASE-MOBILE-01, FR-RELEASE-MOBILE-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-016-mobile-cicd.feature`. Tag with `@E-016-S-<N>`, `@story-16-1`, `@FR-RELEASE-MOBILE-01` / `@FR-RELEASE-MOBILE-02`. Scenarios shall inspect `eas.json` content and verify `eas build:list` returns expected profile rows. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 16.2: GitHub Actions `mobile-ci.yml` — PR Validation

As a **release engineer**,
I want a CI workflow that runs lint, typecheck, unit tests, and `expo doctor` on every PR touching mobile or shared packages,
So that broken mobile code never lands on `main`.

**Acceptance Criteria:**

**Given** an open PR that touches `mobile/**` or `packages/**`
**When** the workflow `.github/workflows/mobile-ci.yml` triggers
**Then** it runs in this order on `ubuntu-latest`: pnpm install (cached), `pnpm --filter mobile lint`, `pnpm --filter mobile typecheck`, `pnpm --filter mobile test`, `pnpm --filter mobile exec expo doctor`

**Given** any step fails
**When** the workflow completes
**Then** the PR shows a failing required-check and merge is blocked

**Given** the workflow succeeds
**When** the developer reviews the run
**Then** the test summary shows unit test counts and lint zero-warnings

**FRs fulfilled:** FR-RELEASE-MOBILE-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-016-mobile-cicd.feature`. Tag with `@E-016-S-<N>`, `@story-16-2`, `@FR-RELEASE-MOBILE-03`. Scenarios shall include a snapshot of the workflow YAML asserting required steps exist. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 16.3: GitHub Actions `mobile-preview-build.yml` — Auto Preview Build on `main`

As a **release engineer**,
I want every merge to `main` touching mobile to auto-build a preview binary for iOS and Android,
So that internal testers always have the latest build without manual intervention.

**Acceptance Criteria:**

**Given** a push to `main` touches `mobile/**` or `packages/**`
**When** `mobile-preview-build.yml` runs
**Then** it invokes `eas build --profile preview --platform all --non-interactive --no-wait`, captures the EAS build IDs, and waits for both to complete (with a max timeout of 45 minutes per platform)

**Given** the build completes successfully
**When** the workflow continues
**Then** it posts a comment on the merge commit (or open PR if backporting) with both build URLs and a "Builds ready for testing" message

**Given** either build fails
**When** the workflow surfaces the failure
**Then** the failing job marks the workflow red and Sentry receives a release-pipeline error event

**FRs fulfilled:** FR-RELEASE-MOBILE-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-016-mobile-cicd.feature`. Tag with `@E-016-S-<N>`, `@story-16-3`, `@FR-RELEASE-MOBILE-04`. Scenarios shall assert YAML structure (jobs, steps, trigger conditions). Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 16.4: Auto-Distribution to Firebase App Distribution + TestFlight Internal

As a **release engineer**,
I want every preview build to auto-publish to TestFlight (iOS) and Firebase App Distribution (Android) so testers receive it within minutes,
So that the closed-beta loop is friction-free.

**Acceptance Criteria:**

**Given** a successful iOS preview build (Story 16.3)
**When** the workflow runs `eas submit --profile preview --platform ios --non-interactive`
**Then** the build is uploaded to App Store Connect and assigned to the TestFlight "Internal Testers" group

**Given** a successful Android preview build
**When** the workflow runs the Firebase CLI or `eas submit` for Android with the Firebase App Distribution distribution target
**Then** the build is uploaded to App Distribution and distributed to the configured tester groups

**Given** the submission completes
**When** testers check their devices
**Then** the new build appears within ≤ 15 minutes on TestFlight (subject to Apple processing) and within ≤ 5 minutes on App Distribution

**Given** submission fails (e.g. metadata rejected, build invalid)
**When** the workflow surfaces the failure
**Then** the failure includes the platform-specific error log and a runbook link

**FRs fulfilled:** FR-RELEASE-MOBILE-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-016-mobile-cicd.feature`. Tag with `@E-016-S-<N>`, `@story-16-4`, `@FR-RELEASE-MOBILE-05`. Include a happy-path submission scenario and an error-handling case. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 16.5: Versioning, CHANGELOG.md & Tag-Triggered Production Release

As a **release engineer**,
I want a `mobile-vX.Y.Z` tag to trigger an automated production release through EAS Build + EAS Submit,
So that cutting a release is one `git tag && git push` operation away from the App Store and Play Store.

**Acceptance Criteria:**

**Given** `mobile/VERSION.md` exists and contains a semver version string
**When** `mobile/app.config.ts` is invoked
**Then** `expo.version`, `expo.ios.buildNumber`, and `expo.android.versionCode` are sourced from `VERSION.md` (build number monotonically increasing)

**Given** `mobile/CHANGELOG.md` exists in Keep-a-Changelog format with `## [Unreleased]` at the top
**When** a release is cut
**Then** the developer manually promotes `[Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, bumps `VERSION.md`, commits, then `git tag mobile-vX.Y.Z && git push origin mobile-vX.Y.Z`

**Given** a `mobile-v*.*.*` tag is pushed
**When** `.github/workflows/mobile-production-release.yml` triggers
**Then** it runs `eas build --profile production --platform all --non-interactive` then `eas submit --profile production --platform all --non-interactive`

**Given** the workflow completes
**When** the release lands
**Then** a GitHub Release is created tagged `mobile-vX.Y.Z` with the release notes auto-extracted from the CHANGELOG section for that version

**Given** the App Store / Play Store metadata fields accept "What's New" copy
**When** submission runs
**Then** the "What's New" copy is populated from the same CHANGELOG section

**FRs fulfilled:** FR-RELEASE-MOBILE-06, FR-RELEASE-MOBILE-07, FR-RELEASE-MOBILE-08, FR-RELEASE-MOBILE-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-016-mobile-cicd.feature`. Tag with `@E-016-S-<N>`, `@story-16-5`, `@FR-RELEASE-MOBILE-06` / `@FR-RELEASE-MOBILE-07` / `@FR-RELEASE-MOBILE-08` / `@FR-RELEASE-MOBILE-09`. Include scenarios verifying VERSION.md → app.config.ts wiring, CHANGELOG promotion semantics, and tag-triggered workflow YAML. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 16.6: EAS Update (OTA), Phased Rollout & Rollback Playbook

As a **release engineer**,
I want OTA JavaScript updates with phased rollout and one-command rollback,
So that hot-fixes ship in minutes (not the 7-day App Review window) and bad updates can be reverted instantly.

**Acceptance Criteria:**

**Given** EAS Update is configured
**When** branches `development`, `preview`, and `production` are created
**Then** binaries built for each profile auto-subscribe to the matching update channel

**Given** a production OTA update is published
**When** the developer follows the phased-rollout playbook in `mobile/docs/RELEASE_PLAYBOOK.md`
**Then** the update is rolled out at 10% → 25% → 50% → 100% via branch promotion, with a 24-hour bake at each stage

**Given** a regression is detected after publishing
**When** the operator runs `make mobile-rollback`
**Then** the prior stable update is re-published as the current head of the production branch within 5 minutes and Sentry receives a release-pipeline rollback event

**Given** Sentry is configured for the mobile project
**When** a production build runs
**Then** source maps are uploaded to Sentry with the matching release/version tag (Sentry Expo plugin)

**FRs fulfilled:** FR-RELEASE-MOBILE-10, FR-RELEASE-MOBILE-11, FR-RELEASE-MOBILE-13

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-016-mobile-cicd.feature`. Tag with `@E-016-S-<N>`, `@story-16-6`, `@FR-RELEASE-MOBILE-10` / `@FR-RELEASE-MOBILE-11` / `@FR-RELEASE-MOBILE-13`. Include a scenario simulating the rollback path. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 17 Stories: Mobile Auth & Session Bridge (Firebase ID Tokens)

### Story 17.1: Backend Bearer-Token Acceptance in `getCurrentUserId()`

As a **backend developer**,
I want `getCurrentUserId()` to accept either the existing `__session` cookie OR an `Authorization: Bearer <Firebase ID token>` header,
So that the mobile app can authenticate against the existing API without parallel auth implementations.

**Acceptance Criteria:**

**Given** an API route protected by `requireAuth()`
**When** a request arrives with a valid Firebase ID token in the `Authorization: Bearer` header
**Then** `getCurrentUserId()` returns the matching Prisma `User.id` and the route responds with the user's data

**Given** an API route protected by `requireAuth()`
**When** a request arrives with an invalid or expired Bearer token
**Then** the route returns 401 `Unauthorized` with the standard error envelope

**Given** a request with both a cookie AND a Bearer token
**When** the route handler resolves the user
**Then** the Bearer token takes precedence (mobile-first)

**Given** the existing web auth tests
**When** the bridge is added
**Then** all existing tests still pass — zero regression on the cookie path

**FRs fulfilled:** FR-MOBILE-AUTH-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-017-mobile-auth.feature`. Tag with `@E-017-S-<N>`, `@story-17-1`, `@FR-MOBILE-AUTH-02`. Scenarios shall hit a representative protected endpoint with a real Firebase ID token (obtained via Firebase Admin SDK in test setup) and verify success; with an invalid token and verify 401. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 17.2: Mobile Firebase Auth Provider & Secure Token Storage

As a **mobile user**,
I want my login to persist across app launches without re-entering credentials,
So that I don't have to log in every time I open the app.

**Acceptance Criteria:**

**Given** the mobile app boots
**When** `expo-secure-store` contains a refresh token
**Then** the Firebase SDK rehydrates the session and `onIdTokenChanged()` fires with a fresh ID token within 2 seconds

**Given** the user signs in for the first time
**When** Firebase emits an ID token
**Then** the token (and refresh token) is written to `expo-secure-store` exclusively — NEVER to `AsyncStorage`, NEVER to console, NEVER to Sentry events

**Given** the ID token approaches expiration (default 1 hour TTL)
**When** the Firebase SDK auto-refreshes
**Then** the refreshed token is written back to `expo-secure-store` and any in-flight API calls retry transparently

**Given** the user signs out
**When** `signOut()` completes
**Then** secure storage is cleared, the TanStack Query cache is reset, and the user is navigated to the auth stack

**FRs fulfilled:** FR-MOBILE-AUTH-01, FR-MOBILE-AUTH-03, FR-MOBILE-AUTH-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-017-mobile-auth.feature`. Tag with `@E-017-S-<N>`, `@story-17-2`, `@FR-MOBILE-AUTH-01` / `@FR-MOBILE-AUTH-03` / `@FR-MOBILE-AUTH-06`. Maestro flow: sign in → kill app → relaunch → verify still signed in. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 17.3: Mobile Sign-Up, Sign-In, Password Reset Flows

As a **new mobile user**,
I want to create an account or sign in with email/password, Google, or Apple,
So that I can use Flipper.ai on my phone.

**Acceptance Criteria:**

**Given** an unauthenticated user lands on the auth stack
**When** the user taps "Create account" and enters email + password
**Then** Firebase creates the account, the backend `/api/users/me` POST creates the matching Prisma User, and the onboarding flow begins

**Given** an unauthenticated user
**When** the user taps "Sign in with Google"
**Then** `expo-auth-session` (or `@react-native-google-signin/google-signin`) launches the OAuth flow and Firebase exchanges the Google credential for a Firebase user

**Given** the App Store requires Sign in with Apple when other social sign-ins exist
**When** the user is on the auth stack on iOS
**Then** a "Sign in with Apple" button is present with the platform-standard appearance, invoking `expo-apple-authentication`

**Given** a user has forgotten their password
**When** the user taps "Forgot password" and enters their email
**Then** Firebase sends a password-reset email and the user is shown a confirmation screen

**Given** any sign-up / sign-in / reset form
**When** the form is submitted
**Then** hCaptcha (or Firebase App Check) verifies the request is not abusive before completion

**FRs fulfilled:** FR-MOBILE-AUTH-04, FR-MOBILE-AUTH-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-017-mobile-auth.feature`. Tag with `@E-017-S-<N>`, `@story-17-3`, `@FR-MOBILE-AUTH-04` / `@FR-MOBILE-AUTH-09`. Maestro flows for each auth path (email, Google, Apple). Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 17.4: Biometric Re-Authentication

As a **returning mobile user**,
I want to unlock my cached session with Face ID / Touch ID / fingerprint,
So that I can open the app quickly without typing a password.

**Acceptance Criteria:**

**Given** the user enables "Biometric unlock" in Settings
**When** the user backgrounds and re-foregrounds the app after the configurable idle timeout (default 5 min)
**Then** the app shows a biometric prompt via `expo-local-authentication` before revealing the authenticated UI

**Given** biometric authentication succeeds
**When** the prompt dismisses
**Then** the cached session unlocks and the app continues

**Given** biometric authentication fails (or user cancels)
**When** the prompt dismisses
**Then** the user is signed out and navigated to the email/password sign-in screen

**Given** the device does not support biometrics
**When** Settings → Biometric unlock is opened
**Then** the toggle is disabled with explanatory text

**FRs fulfilled:** FR-MOBILE-AUTH-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-017-mobile-auth.feature`. Tag with `@E-017-S-<N>`, `@story-17-4`, `@FR-MOBILE-AUTH-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 17.5: Mobile Onboarding Wizard (Touch-First Reflow)

As a **new mobile user**,
I want a 6-step onboarding wizard tailored for one-thumb operation,
So that I can configure my preferences quickly on phone.

**Acceptance Criteria:**

**Given** a newly registered user
**When** the user lands on the onboarding stack
**Then** six steps are presented matching the web wizard: Welcome, Marketplaces, Categories, Location & Radius, Notification Preferences, Subscription Tier

**Given** the user is on any step
**When** the user swipes left
**Then** progress advances to the next step (after step validation) with a smooth animated transition; swiping right reverts to the prior step

**Given** any step
**When** the user is on it
**Then** all touch targets are ≥44pt, primary CTAs use `.fp-btn-primary`, and the progress dots update accordingly

**Given** the user completes onboarding
**When** the final step submits
**Then** the same `/api/onboarding/complete` endpoint used by the web app is invoked and the user is navigated to the Dashboard tab

**Given** a user who already onboarded on web
**When** the user signs in to mobile for the first time
**Then** the onboarding stack is skipped — the user lands directly on Dashboard

**FRs fulfilled:** FR-MOBILE-AUTH-07, FR-MOBILE-AUTH-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-017-mobile-auth.feature`. Tag with `@E-017-S-<N>`, `@story-17-5`, `@FR-MOBILE-AUTH-07` / `@FR-MOBILE-AUTH-08`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 17.6: Auth Event Sentry Breadcrumbs & Diagnostics

As an **operations engineer**,
I want all authentication events surfaced in Sentry as breadcrumbs (not as PII-bearing events),
So that I can diagnose mobile auth issues without leaking user data.

**Acceptance Criteria:**

**Given** Sentry is configured in the mobile app
**When** any auth event occurs (sign-up, sign-in, sign-out, password-reset request, biometric success/fail)
**Then** a Sentry breadcrumb is recorded with the event type and timestamp BUT NO email, no UID, no token

**Given** a `beforeSend` filter is configured
**When** any outgoing Sentry event would include a Firebase token or PII
**Then** the filter redacts those fields before transmission

**Given** an auth error
**When** Sentry captures it
**Then** the error is tagged with `auth.provider` (firebase / google / apple) and `auth.action` (signin / signup / reset / biometric)

**FRs fulfilled:** FR-MOBILE-AUTH-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-017-mobile-auth.feature`. Tag with `@E-017-S-<N>`, `@story-17-6`, `@FR-MOBILE-AUTH-10`. Include a scenario asserting `beforeSend` strips token-shaped strings. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

> **🎯 End of Phase A — Rails Up.** With Epics 15–17 complete, the monorepo is in place, the EAS pipeline auto-distributes preview builds to TestFlight + Firebase App Distribution on every merge to `main`, and a stub-but-real mobile build can authenticate against the existing backend. The platform is ready for feature work.

---

## Epic 18 Stories: Mobile Shell, Navigation & Design System

### Story 18.1: Tab Navigation & Root Layout

As a **mobile user**,
I want a tab bar at the bottom of the app with the five primary destinations,
So that I can move between sections of the app with one thumb.

**Acceptance Criteria:**

**Given** an authenticated user opens the app
**When** the root tabs layout (`mobile/app/(tabs)/_layout.tsx`) renders
**Then** five tabs are visible at the bottom: Dashboard, Scanner, Opportunities, Messages, More — each with an icon (lucide-react-native equivalent) + label

**Given** the user taps any tab
**When** the tab activates
**Then** the active state uses the canonical purple accent and a subtle glow, with a haptic-tap on switch

**Given** the user is in a deeply nested screen (e.g. opportunity detail)
**When** the user taps the active tab again
**Then** the tab pops to its root (iOS convention)

**FRs fulfilled:** FR-MOBILE-SHELL-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-018-mobile-shell.feature`. Tag with `@E-018-S-<N>`, `@story-18-1`, `@FR-MOBILE-SHELL-01`. Maestro flows asserting tab navigation, pop-to-root, and visible labels on iOS Simulator + Android Emulator. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 18.2: `<Screen>` Wrapper, Safe Areas & Pull-to-Refresh

As a **mobile user**,
I want every data-driven screen to render correctly inside safe areas with pull-to-refresh,
So that my notch / Dynamic Island / gesture bar doesn't overlap content and I can refresh by pulling.

**Acceptance Criteria:**

**Given** any screen wraps its content in `<Screen>`
**When** the screen renders
**Then** content respects top + bottom safe-area insets and the dark mesh + grid background renders behind the content

**Given** the screen is data-driven (declares `refetch`)
**When** the user pulls down on the scroll view
**Then** a pull-to-refresh spinner appears and `refetch` is invoked; on completion, a brief toast confirms or a banner shows error

**FRs fulfilled:** FR-MOBILE-SHELL-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-018-mobile-shell.feature`. Tag with `@E-018-S-<N>`, `@story-18-2`, `@FR-MOBILE-SHELL-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 18.3: Canonical NativeWind Utility Class Library

As a **developer**,
I want every canonical `.fp-*` utility class from the web codebase available as a NativeWind class in mobile,
So that mobile components stay visually identical to web without per-screen style work.

**Acceptance Criteria:**

**Given** the shared `packages/design-tokens/` module
**When** NativeWind config (`mobile/tailwind.config.ts`) is set up
**Then** the following classes exist and resolve to the canonical values: `fp-glass`, `fp-glass-sm`, `fp-glass-nav`, `fp-glow-card`, `fp-hot-card`, `fp-btn-primary`, `fp-btn-ghost`, `fp-btn-hot`, `fp-input`, `fp-badge-*`, `fp-grad-*`, `fp-alert-*`, `fp-bg-mesh`, `fp-bg-grid`, `fp-content`

**Given** a snapshot harness comparing a `<View className="fp-glass" />` resolved style to the web's CSS-resolved style
**When** the harness runs
**Then** color, opacity, border-radius, and shadow values match within 1% tolerance

**FRs fulfilled:** FR-MOBILE-SHELL-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-018-mobile-shell.feature`. Tag with `@E-018-S-<N>`, `@story-18-3`, `@FR-MOBILE-SHELL-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 18.4: Shared State Components (LoadingSkeleton, ErrorBanner, EmptyState, ScoreRing) & Toast Provider

As a **mobile user**,
I want every screen to use the same loading skeletons, error banners, empty states, score rings, and toasts,
So that the app feels coherent and polished end-to-end.

**Acceptance Criteria:**

**Given** any screen with async data
**When** data is loading
**Then** `<LoadingSkeleton>` renders using the canonical shimmer animation

**Given** any screen with async data
**When** the fetch errors
**Then** `<ErrorBanner>` renders using `fp-alert-danger` style with a "Retry" affordance

**Given** any screen with async data
**When** the result set is empty
**Then** `<EmptyState>` renders using `fp-glass` with a contextual illustration + message + primary CTA

**Given** an opportunity score
**When** rendered on the listing detail screen
**Then** `<ScoreRing>` renders a circular SVG ring filled to the score percentage using the canonical purple gradient

**Given** a user action succeeds, fails, or notifies
**When** the action handler invokes `toast.show({type, message})`
**Then** a toast appears at the top with the matching type style (success / error / info / alert / opportunity)

**FRs fulfilled:** FR-MOBILE-SHELL-04, FR-MOBILE-SHELL-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-018-mobile-shell.feature`. Tag with `@E-018-S-<N>`, `@story-18-4`, `@FR-MOBILE-SHELL-04` / `@FR-MOBILE-SHELL-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 18.5: Splash Screen, App Icon, Error Boundary, Light/Dark Mode

As a **mobile user**,
I want a branded splash screen on launch, a recognizable app icon, an error fallback when something breaks, and the option to use light or dark theme,
So that the app feels finished and respectful of my OS preferences.

**Acceptance Criteria:**

**Given** the user launches the app
**When** the bundle is loading
**Then** the splash (`mobile/assets/splash.png`) renders the Flipper.ai mark over the dark mesh background until the auth state hydrates

**Given** the device home screen
**When** the user installs the app
**Then** the app icon (iOS 1024×1024 master + Android adaptive icon foreground/background) renders the Flipper.ai mark

**Given** a runtime error occurs anywhere in the React tree
**When** the global error boundary catches it
**Then** an `fp-alert-danger`-styled recoverable fallback shows with a "Try again" CTA and Sentry captures the error

**Given** Settings → Appearance has options (System / Dark / Light)
**When** the user selects an option
**Then** the choice persists in `AsyncStorage` and the app re-renders with the chosen palette; light mode uses a "lite-dark" slate palette (not pure white)

**FRs fulfilled:** FR-MOBILE-SHELL-06, FR-MOBILE-SHELL-07, FR-MOBILE-SHELL-08, FR-MOBILE-SHELL-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-018-mobile-shell.feature`. Tag with `@E-018-S-<N>`, `@story-18-5`, `@FR-MOBILE-SHELL-06` / `@FR-MOBILE-SHELL-07` / `@FR-MOBILE-SHELL-08` / `@FR-MOBILE-SHELL-09`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 18.6: Deep Links, Reduced-Motion & Haptic Feedback

As a **mobile user**,
I want tapping a notification or universal link to open the right screen, motion to honor my OS reduce-motion setting, and meaningful interactions to provide haptic feedback,
So that the app feels native and respects my preferences.

**Acceptance Criteria:**

**Given** the user receives a deep link `flipper://opportunities/abc123`
**When** the app opens (cold or warm)
**Then** the user lands on the Opportunity detail screen for ID `abc123`

**Given** Apple App Site Association and Android App Links are configured for `flipper.ai/m/*`
**When** the user taps a `flipper.ai/m/opportunities/abc123` link in an email
**Then** the app opens (if installed) to the same screen, or the web fallback otherwise

**Given** the OS Reduce Motion accessibility setting is ON
**When** any animated transition or glow runs
**Then** the animation disables or shortens to ≤200ms with no looping motion

**Given** the user performs a meaningful action (lifecycle advance, posting send, opportunity save)
**When** the action succeeds
**Then** an `expo-haptics` success pulse fires

**Given** Settings → Haptics is toggled off
**When** any action would normally trigger a haptic
**Then** no haptic fires

**FRs fulfilled:** FR-MOBILE-SHELL-10, FR-MOBILE-SHELL-11, FR-MOBILE-SHELL-12

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-018-mobile-shell.feature`. Tag with `@E-018-S-<N>`, `@story-18-6`, `@FR-MOBILE-SHELL-10` / `@FR-MOBILE-SHELL-11` / `@FR-MOBILE-SHELL-12`. Maestro flow tests deep-link cold start. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 19 Stories: Mobile Marketplace Scanning, Listings & Opportunities

### Story 19.1: Scanner Screen & Saved Search Quick-Picks

As a **mobile user**,
I want a Scanner screen where I can pick a marketplace and a saved search and tap "Scan" to start a scrape,
So that I can find deals in seconds while standing in front of an item.

**Acceptance Criteria:**

**Given** the Scanner tab is opened
**When** the screen renders
**Then** a marketplace selector (Craigslist, eBay, Facebook, Mercari, OfferUp) appears as a horizontal row of icons + labels

**Given** the user has saved SearchConfigs
**When** the screen loads them from `/api/search-configs`
**Then** the saved searches render as quick-select chips below the marketplace selector

**Given** the user selects a marketplace + saved search and taps "Scan"
**When** the request submits
**Then** `/api/scraper/start` is invoked and the screen transitions to the active-job view

**Given** the user has free-tier rate limits
**When** the user attempts a scan beyond the limit
**Then** an upsell modal appears explaining the tier gate

**FRs fulfilled:** FR-MOBILE-SCAN-01, FR-MOBILE-SCAN-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-1`, `@FR-MOBILE-SCAN-01` / `@FR-MOBILE-SCAN-02`. Maestro flow: pick marketplace → pick saved search → tap Scan → verify job starts. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 19.2: Live Job Progress via SSE + Polling Fallback

As a **mobile user**,
I want to watch my scan progress live with current count of listings found,
So that I know the scan is working without waiting blindly.

**Acceptance Criteria:**

**Given** a scrape job has been started
**When** the active-job view subscribes to `/api/events`
**Then** each `job.progress` SSE event updates the on-screen counters (elapsed time, listings found) within 1 second

**Given** SSE connectivity fails or is unreliable
**When** the client detects ≥ 2 consecutive SSE errors within 30 seconds
**Then** the client falls back to polling `/api/scraper/jobs/:id` every 5 seconds and resumes SSE on next foreground

**Given** the job completes
**When** the `job.complete` event arrives
**Then** the view transitions to the results feed

**FRs fulfilled:** FR-MOBILE-SCAN-03, FR-MOBILE-SCAN-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-2`, `@FR-MOBILE-SCAN-03` / `@FR-MOBILE-SCAN-04`. Include a scenario simulating SSE drop-and-fallback. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 19.3: Listings Feed — Infinite Scroll & Pull-to-Refresh

As a **mobile user**,
I want to scroll through my scan results with score-coded cards and pull to refresh,
So that I can quickly skim what was found.

**Acceptance Criteria:**

**Given** scan results exist for the active scan
**When** the feed renders
**Then** each row shows: hero image, title, asking price, algorithmic score (color-coded badge), location, age — using `fp-glow-card` / `fp-hot-card` for high-scoring items

**Given** the user scrolls to the end of the loaded set
**When** more results exist
**Then** the next page is fetched via `/api/listings?cursor=…` and appended seamlessly

**Given** the user pulls down on the feed
**When** the pull-to-refresh fires
**Then** the most recent scan re-runs (or the page-1 fetch repeats) and the feed reflects new results

**Given** the feed is empty
**When** the screen renders
**Then** `<EmptyState>` shows with a "Try a new scan" CTA

**FRs fulfilled:** FR-MOBILE-SCAN-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-3`, `@FR-MOBILE-SCAN-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 19.4: Filter Sheet — Score, Price, Distance, Category, Condition

As a **mobile user**,
I want to apply a multi-axis filter to my listings feed via a bottom sheet,
So that I can narrow down to opportunities matching my flip thesis.

**Acceptance Criteria:**

**Given** the user taps the filter icon
**When** the filter bottom sheet opens
**Then** controls render for: marketplace (multi-select), score threshold (slider 0-100), price range (dual slider), distance radius (slider miles), category (multi-select), condition (multi-select)

**Given** the user changes any control and taps "Apply"
**When** the sheet dismisses
**Then** the feed re-queries with the new filter parameters and persists the filter state in `AsyncStorage` per-user

**Given** the user taps "Reset"
**When** the action fires
**Then** all controls return to defaults and the persisted filter clears

**FRs fulfilled:** FR-MOBILE-SCAN-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-4`, `@FR-MOBILE-SCAN-06`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 19.5: Listing Detail Screen — Gallery, Score Breakdown, Comparable Sold

As a **mobile user**,
I want a rich detail screen showing photos, scoring rationale, comparable sold items, sellability assessment, and a link to the original listing,
So that I can decide whether to pursue an opportunity in under 30 seconds.

**Acceptance Criteria:**

**Given** the user taps a row in the feed
**When** the detail screen opens
**Then** an image gallery appears with horizontal swipe, pagination dots, and pinch-to-zoom via gesture handler

**Given** the listing has an algorithmic + LLM analysis
**When** the screen renders
**Then** the score breakdown (category multiplier, brand boost, risk penalties, condition factor) is displayed with the ScoreRing on top

**Given** comparable sold-items data exists (`Listing.compsJSON`)
**When** the section renders
**Then** the top 5 comps are listed with thumbnail, sold price, sold date, marketplace

**Given** the listing has a sellability LLM assessment
**When** rendered
**Then** the demand level, expected days-to-sell, and recommended listing price are surfaced

**Given** the original listing URL exists
**When** the user taps "Open original listing"
**Then** the URL opens in the user's default browser (or the marketplace's native app via universal link)

**FRs fulfilled:** FR-MOBILE-SCAN-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-5`, `@FR-MOBILE-SCAN-07`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 19.6: Save as Opportunity & Pass-on-Listing

As a **mobile user**,
I want to save a promising listing as an Opportunity with one tap, or dismiss it so it never shows again,
So that I can quickly triage results.

**Acceptance Criteria:**

**Given** the user is on the listing detail
**When** the user taps "Save as Opportunity"
**Then** POST `/api/opportunities` is called with the listing ID, a success toast fires, a haptic-success pulses, and the button changes state to "Saved ✓"

**Given** the user taps "Pass"
**When** the request submits
**Then** the listing's `passedAt` timestamp is set and the listing no longer appears in future feeds for that user

**FRs fulfilled:** FR-MOBILE-SCAN-08, FR-MOBILE-SCAN-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-6`, `@FR-MOBILE-SCAN-08` / `@FR-MOBILE-SCAN-09`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 19.7: Persistent Cache for Instant Feed on Launch

As a **mobile user**,
I want my feed to appear instantly when I open the app, even before the network responds,
So that the app feels fast and reliable.

**Acceptance Criteria:**

**Given** the user has used the app previously
**When** the app launches cold
**Then** the most recent 200 listings, 50 opportunities, and 20 jobs render from the persisted TanStack Query cache (`react-native-mmkv` adapter) within 500ms

**Given** the cache is rendered
**When** the network responds with fresh data
**Then** the UI updates to the fresh data with a subtle "Updated" indicator

**Given** the cache exceeds size limits
**When** the cache eviction runs
**Then** oldest entries are evicted first preserving the 200/50/20 cap

**FRs fulfilled:** FR-MOBILE-SCAN-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-019-mobile-scanning.feature`. Tag with `@E-019-S-<N>`, `@story-19-7`, `@FR-MOBILE-SCAN-10`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 20 Stories: Mobile Flip Lifecycle, Kanban & Swipeable Cards

### Story 20.1: Opportunities Screen — Kanban + Card-Stack Toggle

As a **mobile user**,
I want to see all my opportunities organized by lifecycle stage in either Kanban columns or a swipeable card stack,
So that I can scan my pipeline at a glance OR focus on one item at a time.

**Acceptance Criteria:**

**Given** the Opportunities tab is opened
**When** the screen renders
**Then** by default a horizontally-scrollable Kanban appears with four columns (IDENTIFIED, PURCHASED, LISTED, SOLD) populated from `/api/opportunities`

**Given** a view toggle in the header
**When** the user taps the toggle to "Stack" view
**Then** the screen transitions to a Tinder-style card stack showing one opportunity at a time with action buttons at the bottom

**Given** the user's view preference
**When** the user re-opens the screen later
**Then** the last-selected view is restored from `AsyncStorage`

**FRs fulfilled:** FR-MOBILE-LIFECYCLE-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-020-mobile-lifecycle.feature`. Tag with `@E-020-S-<N>`, `@story-20-1`, `@FR-MOBILE-LIFECYCLE-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 20.2: Swipe / Long-Press Stage Transitions

As a **mobile user**,
I want to advance or revert an opportunity's stage with a swipe gesture or long-press menu,
So that updating my pipeline takes one motion.

**Acceptance Criteria:**

**Given** an opportunity in any stage
**When** the user swipes the card left
**Then** the opportunity advances one stage (IDENTIFIED → PURCHASED → LISTED → SOLD) via PATCH `/api/opportunities/:id`

**Given** an opportunity in any stage > IDENTIFIED
**When** the user swipes the card right
**Then** the opportunity reverts one stage

**Given** the user long-presses an opportunity
**When** the action sheet appears
**Then** options include: "Advance to {next}", "Revert to {prior}", "View Activity", "Open Listing", "Delete"

**Given** any stage transition
**When** it succeeds
**Then** an optimistic UI update fires immediately, a haptic-success pulse plays, and the server confirms

**FRs fulfilled:** FR-MOBILE-LIFECYCLE-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-020-mobile-lifecycle.feature`. Tag with `@E-020-S-<N>`, `@story-20-2`, `@FR-MOBILE-LIFECYCLE-02`. Maestro flow simulating swipe gestures on both iOS Simulator and Android Emulator. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 20.3: PURCHASED Stage Prompt — Price, Date, Notes

As a **mobile user**,
I want to be prompted for the purchase price and date when I mark an opportunity as PURCHASED,
So that my profit calculations stay accurate.

**Acceptance Criteria:**

**Given** the user advances an opportunity to PURCHASED
**When** the prompt appears
**Then** numeric input for purchase price (prefilled with asking price), a date picker for purchase date (default today), and an optional notes textarea are shown

**Given** the user submits the prompt
**When** the request fires
**Then** PATCH `/api/opportunities/:id` updates `purchasePrice`, `purchasedAt`, `purchaseNotes`, and the new stage

**Given** the user dismisses the prompt
**When** the prompt is canceled
**Then** the optimistic stage transition is rolled back

**FRs fulfilled:** FR-MOBILE-LIFECYCLE-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-020-mobile-lifecycle.feature`. Tag with `@E-020-S-<N>`, `@story-20-3`, `@FR-MOBILE-LIFECYCLE-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 20.4: LISTED Stage Prompt + Optional Cross-Platform Posting

As a **mobile user**,
I want to capture where I listed an item and optionally trigger the cross-platform posting flow,
So that I can keep my pipeline clean and reach more buyers.

**Acceptance Criteria:**

**Given** the user advances an opportunity to LISTED
**When** the prompt appears
**Then** inputs for resale URL (text) and resale platform (radio: eBay, Mercari, Facebook, OfferUp, Craigslist, Other) are shown, plus a "Cross-post to other marketplaces?" toggle

**Given** the cross-post toggle is ON
**When** the user submits
**Then** after saving the stage, the flow continues into the cross-platform posting screen (Epic 23) with pre-filled context

**Given** the cross-post toggle is OFF
**When** the user submits
**Then** the stage is saved and the user returns to the previous screen

**FRs fulfilled:** FR-MOBILE-LIFECYCLE-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-020-mobile-lifecycle.feature`. Tag with `@E-020-S-<N>`, `@story-20-4`, `@FR-MOBILE-LIFECYCLE-04`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 20.5: SOLD Celebration & Profit Calculation

As a **mobile user**,
I want a satisfying confirmation when I mark an item SOLD and to see my net profit immediately,
So that I feel rewarded for completing a flip.

**Acceptance Criteria:**

**Given** the user advances an opportunity to SOLD
**When** the prompt appears
**Then** numeric input for final sale price is shown (prefilled with last listed price)

**Given** the user submits the sale price
**When** the request fires
**Then** the backend computes net profit (`sale - cost - platform fees`) using the platform-specific fee rate (FR-SCORE-06)

**Given** the request succeeds
**When** the response arrives
**Then** a full-screen celebration overlay plays: animated checkmark, "+$X profit" badge, celebratory haptic, and the user shares-or-dismisses CTA

**FRs fulfilled:** FR-MOBILE-LIFECYCLE-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-020-mobile-lifecycle.feature`. Tag with `@E-020-S-<N>`, `@story-20-5`, `@FR-MOBILE-LIFECYCLE-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 20.6: Inventory View, Activity Timeline & Real-Time Updates

As a **mobile user**,
I want a focused Inventory view showing only my held items, a per-opportunity activity timeline, and live updates when state changes anywhere,
So that I can manage my held capital and audit history.

**Acceptance Criteria:**

**Given** the Opportunities tab has an "Inventory" sub-view
**When** opened
**Then** only PURCHASED + LISTED items appear with running totals: total cost basis, total days-held, projected profit, holding-cost drag

**Given** an opportunity is selected
**When** the "Activity" detail opens
**Then** a vertical timeline shows: stage transitions, captured prices, attached messages, posting jobs, monitoring events — sourced from the same Prisma models that drive the web detail page

**Given** the user is on the Opportunities or Inventory screen
**When** an SSE event arrives indicating a state change (from another device or backend job)
**Then** the relevant card updates in place without requiring a manual refresh

**FRs fulfilled:** FR-MOBILE-LIFECYCLE-06, FR-MOBILE-LIFECYCLE-07, FR-MOBILE-LIFECYCLE-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-020-mobile-lifecycle.feature`. Tag with `@E-020-S-<N>`, `@story-20-6`, `@FR-MOBILE-LIFECYCLE-06` / `@FR-MOBILE-LIFECYCLE-07` / `@FR-MOBILE-LIFECYCLE-08`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 21 Stories: Mobile Push Notifications & Real-Time Updates

### Story 21.1: Permission Request & Device Token Registration

As a **mobile user**,
I want to be asked once whether I want push notifications, with my choice respected and surfaced in Settings,
So that I have control over when the app pings me.

**Acceptance Criteria:**

**Given** a freshly installed app
**When** the user first opens the Dashboard after onboarding
**Then** `expo-notifications` requests push permission with a custom rationale screen explaining the value before the OS prompt fires

**Given** the user grants permission
**When** the Expo push token resolves
**Then** POST `/api/users/me/devices` registers the token with platform, app version, and `lastSeenAt` set to now

**Given** the user denies permission
**When** the app later detects denied state
**Then** Settings → Notifications shows the denial with a "Open OS Settings" deep link to re-enable

**Given** the token rotates (uninstall/reinstall, app reset)
**When** the new token resolves
**Then** the new token is upserted on the backend, marking older tokens as `inactive`

**FRs fulfilled:** FR-MOBILE-NOTIFY-01, FR-MOBILE-NOTIFY-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-021-mobile-push.feature`. Tag with `@E-021-S-<N>`, `@story-21-1`, `@FR-MOBILE-NOTIFY-01` / `@FR-MOBILE-NOTIFY-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 21.2: Backend Dispatcher — Mobile Push Channel

As a **backend developer**,
I want the existing notification dispatcher to fan out to mobile push when the user has registered a DeviceToken,
So that every alert event reaches the user on whichever channel they configured.

**Acceptance Criteria:**

**Given** a notification event (e.g. new-opportunity, flip-sold, draft-message-ready) fires in the backend
**When** the dispatcher resolves the user's notification preferences
**Then** for any event with `push: true` AND the user has ≥ 1 active DeviceToken, a push payload is sent via Expo's push API to each token

**Given** a push payload
**When** constructed
**Then** it includes `title`, `body`, `data: { screen, opportunityId?, threadId?, jobId? }`, `categoryIdentifier` (iOS), `channelId` (Android)

**Given** Expo's push API responds with errors (e.g. `DeviceNotRegistered`)
**When** the dispatcher receives the response
**Then** the offending DeviceToken is marked `inactive` and is not used for future sends

**Given** quiet hours are configured for the user
**When** the dispatcher evaluates whether to send
**Then** push is suppressed during the user's local quiet-hours window, the notification is queued, and surfaced when the user next opens the app

**FRs fulfilled:** FR-MOBILE-NOTIFY-03, FR-MOBILE-NOTIFY-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-021-mobile-push.feature`. Tag with `@E-021-S-<N>`, `@story-21-2`, `@FR-MOBILE-NOTIFY-03` / `@FR-MOBILE-NOTIFY-09`. Include a service-level test fanning out a new-opportunity event with the user having one valid + one stale token. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 21.3: Deep-Linking Notification Taps & In-Foreground Toasts

As a **mobile user**,
I want tapping a notification to open the relevant screen, and notifications received while I'm in the app to surface as in-app toasts I can tap,
So that I never miss an actionable alert.

**Acceptance Criteria:**

**Given** the app is backgrounded
**When** the user taps a push notification
**Then** the app opens (cold or warm) and deep-links to the screen specified in `data.screen` with the relevant ID context

**Given** the app is foregrounded
**When** a push is received
**Then** instead of the OS notification tray, a top-anchored in-app toast renders with the title + body and a "Tap to open" gesture

**Given** the user dismisses the toast
**When** the timeout expires (5s)
**Then** the toast auto-dismisses and the notification record stays in the in-app notification center for later review

**FRs fulfilled:** FR-MOBILE-NOTIFY-04, FR-MOBILE-NOTIFY-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-021-mobile-push.feature`. Tag with `@E-021-S-<N>`, `@story-21-3`, `@FR-MOBILE-NOTIFY-04` / `@FR-MOBILE-NOTIFY-05`. Maestro flows for both foreground and background tap paths. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 21.4: Notification Action Buttons & Background Actions

As a **mobile user**,
I want to act on a notification without opening the app (e.g. approve & send a drafted message),
So that I can keep my flip pipeline moving from the lock screen.

**Acceptance Criteria:**

**Given** a draft-message-ready notification is received
**When** the user expands the notification
**Then** action buttons "Approve & Send" and "Edit in App" are visible

**Given** the user taps "Approve & Send" from the notification
**When** the action handler runs in the background
**Then** the backend message-send endpoint is invoked via background fetch and a follow-up notification confirms success

**Given** a flip-sold notification is received
**When** the action buttons render
**Then** "Mark as Shipped" is visible and tapping it advances the opportunity's `shippedAt` field

**FRs fulfilled:** FR-MOBILE-NOTIFY-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-021-mobile-push.feature`. Tag with `@E-021-S-<N>`, `@story-21-4`, `@FR-MOBILE-NOTIFY-06`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 21.5: Badge Counts & Notification Preferences UI

As a **mobile user**,
I want a badge on the app icon reflecting unread items needing my attention, and a settings screen letting me toggle every notification event per channel,
So that I have complete control over what I get pinged about.

**Acceptance Criteria:**

**Given** the user has unread opportunities + unread messages
**When** the app resolves the badge count
**Then** the OS app-icon badge reflects the sum, clearing per-screen when the user visits the relevant tab

**Given** Settings → Notifications is opened
**When** the screen renders
**Then** each notification event (FR-NOTIFY-01..11) has three toggles: email / push / SMS — writing changes to `/api/users/me/notification-preferences`

**Given** the user toggles a channel for an event
**When** the request fires
**Then** the toggle persists immediately (optimistic) with a brief "Saved" microcopy

**FRs fulfilled:** FR-MOBILE-NOTIFY-07, FR-MOBILE-NOTIFY-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-021-mobile-push.feature`. Tag with `@E-021-S-<N>`, `@story-21-5`, `@FR-MOBILE-NOTIFY-07` / `@FR-MOBILE-NOTIFY-08`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 21.6: Foreground SSE Real-Time Updates

As a **mobile user**,
I want the app to receive live updates while I have it open, without needing push permission,
So that scan progress and lifecycle changes appear immediately without polling.

**Acceptance Criteria:**

**Given** the app is in foreground
**When** the user authenticates
**Then** the SSE `/api/events` connection opens and listens for `job.progress`, `job.complete`, `listing.found`, `opportunity.changed`, `message.received`

**Given** an SSE event arrives
**When** it is parsed
**Then** the relevant TanStack Query cache is invalidated/updated and the UI reflects the change without delay

**Given** the app is backgrounded
**When** detected
**Then** the SSE connection closes to conserve battery, and reopens on foreground

**FRs fulfilled:** FR-MOBILE-NOTIFY-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-021-mobile-push.feature`. Tag with `@E-021-S-<N>`, `@story-21-6`, `@FR-MOBILE-NOTIFY-10`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

> **🎯 End of Phase B — Minimum Lovable Beta.** With Epics 15–21 complete, Flipper.ai mobile ships its **first product-grade closed-beta release** to TestFlight + Play Internal Testing. The app can authenticate, scan marketplaces, render listings + opportunities, manage the full lifecycle Kanban, and pump real-time push notifications. This is the first version a real user could try.

---

## Epic 22 Stories: Mobile Messaging, Negotiation & Inbox

### Story 22.1: Unified Inbox

As a **mobile user**,
I want a single inbox showing all my conversation threads across every marketplace sorted by recent activity,
So that I never miss a buyer or seller message.

**Acceptance Criteria:**

**Given** the Messages tab is opened
**When** the screen renders
**Then** all threads (across Craigslist, eBay, Facebook, Mercari, OfferUp) are listed in one feed sorted by `lastMessageAt` descending

**Given** a thread row
**When** it renders
**Then** it shows: counterparty name (or marketplace placeholder), listing thumbnail, last message preview, timestamp, unread badge (count of unread inbound messages)

**Given** the user pulls to refresh
**When** the action fires
**Then** the latest thread state is fetched from `/api/messages/threads`

**FRs fulfilled:** FR-MOBILE-MSG-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-022-mobile-messaging.feature`. Tag with `@E-022-S-<N>`, `@story-22-1`, `@FR-MOBILE-MSG-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 22.2: Chat-Style Thread Detail with AI Message Alternates

As a **mobile user**,
I want a chat-style thread view with my messages on the right, theirs on the left, timestamps, and long-press to view AI-generated alternate phrasings,
So that I can negotiate fluidly.

**Acceptance Criteria:**

**Given** the user taps a thread row
**When** the detail opens
**Then** messages render as chat bubbles — outgoing right-aligned in purple, incoming left-aligned in glass, with timestamps and read receipts where available

**Given** a sent or drafted message
**When** the user long-presses the bubble
**Then** AI-generated alternates appear in a bottom sheet, each with a "Use this version" action

**Given** the screen is open
**When** the user scrolls to the top
**Then** older messages are paginated via `/api/messages/threads/:id?cursor=…`

**FRs fulfilled:** FR-MOBILE-MSG-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-022-mobile-messaging.feature`. Tag with `@E-022-S-<N>`, `@story-22-2`, `@FR-MOBILE-MSG-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 22.3: AI Message Generation with Type Picker

As a **mobile user**,
I want to compose a new message using AI assistance, choosing the type that fits my situation,
So that I can craft an effective message without wordsmithing.

**Acceptance Criteria:**

**Given** the user taps the compose button or "Generate AI message"
**When** the type picker opens
**Then** options include: initial-purchase-inquiry, lowball-offer, negotiation-response, scheduling-pickup, payment-confirmation, no-show-followup

**Given** the user selects a type
**When** the request fires
**Then** POST `/api/messages/generate` is invoked with the thread context and type, returning a draft message

**Given** the draft returns
**When** it renders
**Then** the editable text area is prefilled with the draft and the user can edit it inline

**Given** AI testing rules
**When** the test suite runs
**Then** the AI router is NEVER mocked — tests exercise the real Groq → Gemini → OpenAI fallback chain per project policy

**FRs fulfilled:** FR-MOBILE-MSG-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-022-mobile-messaging.feature`. Tag with `@E-022-S-<N>`, `@story-22-3`, `@FR-MOBILE-MSG-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file. **AI policy:** explicitly verify in test setup that the real AI router is reached — assert the `X-Provider-Used` response header is one of `groq` / `gemini` / `openai`.

---

### Story 22.4: Approval Workflow & Negotiation Strategy Inline

As a **mobile user**,
I want every AI message to require my explicit approval before sending and to see negotiation strategy suggestions inline,
So that I stay in control and benefit from AI tactics.

**Acceptance Criteria:**

**Given** an AI-generated message in the editor
**When** the user reviews
**Then** the action bar shows "Approve & Send" (primary) and "Save as Draft" — sending requires explicit approval, never auto-dispatch

**Given** an active thread
**When** the negotiation-strategy panel is shown above the compose bar
**Then** it surfaces suggestions sourced from POST `/api/messages/negotiation-strategy` (e.g. "Counter at $40, anchor on shipping cost")

**Given** the user taps "Approve & Send"
**When** the request fires
**Then** the message dispatches via the marketplace-specific send endpoint, the bubble appears optimistically with "Sending…" status, then resolves to "Sent" on confirmation

**FRs fulfilled:** FR-MOBILE-MSG-04, FR-MOBILE-MSG-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-022-mobile-messaging.feature`. Tag with `@E-022-S-<N>`, `@story-22-4`, `@FR-MOBILE-MSG-04` / `@FR-MOBILE-MSG-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 22.5: Inbound Real-Time Updates & Conversation Status

As a **mobile user**,
I want inbound messages to appear instantly when I'm in the app and to be able to mark a conversation as Active / Stalled / Closed,
So that my inbox reflects reality without manual sweeping.

**Acceptance Criteria:**

**Given** an inbound message arrives while the app is foregrounded
**When** the SSE `message.received` event fires
**Then** the thread row jumps to the top with the new preview, the badge increments, and a quiet toast surfaces if the user is not viewing that thread

**Given** the user is in the thread when the message arrives
**When** the event fires
**Then** the new bubble animates into view without requiring scroll, and a haptic notification plays

**Given** a thread row in the inbox
**When** the user swipes right
**Then** an action sheet offers "Mark as Active", "Mark as Stalled", "Mark as Closed" — writing to the existing conversation-status taxonomy (FR-COMM-06)

**FRs fulfilled:** FR-MOBILE-MSG-06, FR-MOBILE-MSG-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-022-mobile-messaging.feature`. Tag with `@E-022-S-<N>`, `@story-22-5`, `@FR-MOBILE-MSG-06` / `@FR-MOBILE-MSG-07`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 23 Stories: Mobile Cross-Platform Resale Posting Queue

### Story 23.1: Posting Queue Screen

As a **mobile user**,
I want a Posting Queue screen showing the live state of every cross-platform post I've queued,
So that I can track what's listed where without flipping between apps.

**Acceptance Criteria:**

**Given** the user navigates to Posting Queue (under More tab or as a CTA from a listed opportunity)
**When** the screen renders
**Then** a list of PostingJobs (in-flight, completed, failed) is shown sourced from `/api/posting-queue`, each row showing target platform icon, status badge, retry count, and "last error" preview if applicable

**Given** the user taps a failed job
**When** the detail opens
**Then** the full error message is shown with a "Retry" action

**Given** a job's status changes via SSE
**When** the event arrives
**Then** the row updates in place with the new status

**FRs fulfilled:** FR-MOBILE-RELIST-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-023-mobile-reposting.feature`. Tag with `@E-023-S-<N>`, `@story-23-1`, `@FR-MOBILE-RELIST-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 23.2: AI Title & Description Generation with Inline Edit

As a **mobile user**,
I want to generate an AI-optimized resale title and description for an opportunity and tweak them inline,
So that my listings convert without me having to write copy.

**Acceptance Criteria:**

**Given** a LISTED opportunity
**When** the user taps "Cross-post"
**Then** the resale composer screen opens and auto-generates title + description via POST `/api/listings/generate-title` and `/api/listings/generate-description`

**Given** the generated text returns
**When** it renders
**Then** both fields are editable inline with character counters showing platform-specific limits (eBay 80, Mercari 40, etc.)

**Given** the user taps "Regenerate"
**When** the request fires
**Then** the AI router (NEVER mocked) returns a new version

**FRs fulfilled:** FR-MOBILE-RELIST-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-023-mobile-reposting.feature`. Tag with `@E-023-S-<N>`, `@story-23-2`, `@FR-MOBILE-RELIST-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file. **AI policy:** tests exercise the real AI router — verify via `X-Provider-Used` response header.

---

### Story 23.3: Optimal Price Recommendation with Adjustment Slider

As a **mobile user**,
I want a recommended listing price with a slider letting me adjust ±25%,
So that I post at a competitive price quickly.

**Acceptance Criteria:**

**Given** an opportunity in the resale composer
**When** the price section renders
**Then** the recommended price (from `/api/listings/optimal-price`) is displayed prominently

**Given** the user moves the slider
**When** they release
**Then** the listed price updates and a "↑ vs. recommended" / "↓ vs. recommended" indicator shows the delta

**Given** the user selects a price outside ±25% of the recommendation
**When** they attempt to continue
**Then** a confirmation prompt warns about under/overpricing risk

**FRs fulfilled:** FR-MOBILE-RELIST-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-023-mobile-reposting.feature`. Tag with `@E-023-S-<N>`, `@story-23-3`, `@FR-MOBILE-RELIST-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 23.4: Multi-Marketplace Post & Photo Picker / Capture

As a **mobile user**,
I want to select which marketplaces to post to and either reuse existing photos or capture new ones,
So that I can post once and reach everywhere.

**Acceptance Criteria:**

**Given** the resale composer is open
**When** the marketplaces section renders
**Then** a multi-select checklist appears: eBay, Mercari, Facebook, OfferUp, Craigslist — each disabled if the user lacks marketplace credentials, with an explanatory tap to configure

**Given** the user taps "Add photo"
**When** the photo source picker opens
**Then** options are: "Use existing listing photos" (reuses Firebase Storage references), "Choose from library" (via `expo-image-picker`), "Take a photo" (via `expo-camera`)

**Given** the user taps "Post"
**When** the request fires
**Then** POST `/api/posting-queue` is invoked with the title, description, price, marketplaces, photo URIs, and PostingJob records are created for each marketplace

**FRs fulfilled:** FR-MOBILE-RELIST-04, FR-MOBILE-RELIST-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-023-mobile-reposting.feature`. Tag with `@E-023-S-<N>`, `@story-23-4`, `@FR-MOBILE-RELIST-04` / `@FR-MOBILE-RELIST-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 23.5: Real-Time Posting Status & Per-Platform Confirmations

As a **mobile user**,
I want to see live status updates as each marketplace acknowledges my post,
So that I know exactly what's listed where.

**Acceptance Criteria:**

**Given** posting jobs are in-flight
**When** SSE `posting.job.updated` events arrive
**Then** the Posting Queue rows update in place with new status

**Given** a posting completes
**When** the event fires
**Then** an in-app toast and a push notification announce: "Listed on {marketplace} ✓" with a deep-link to the live listing URL

**Given** a posting fails after exhausting retries
**When** the event fires
**Then** a push and toast announce the failure with a "Retry" action that requeues the job

**FRs fulfilled:** FR-MOBILE-RELIST-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-023-mobile-reposting.feature`. Tag with `@E-023-S-<N>`, `@story-23-5`, `@FR-MOBILE-RELIST-06`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 24 Stories: Mobile Analytics, Reports & Insights

### Story 24.1: Analytics Summary Tiles

As a **mobile user**,
I want a Dashboard with at-a-glance tiles showing my key flip metrics,
So that I see my performance instantly when I open the app.

**Acceptance Criteria:**

**Given** the Dashboard tab is opened
**When** the screen renders
**Then** glass-tile cards display: lifetime profit, MTD profit, YTD profit, flips completed, average margin %, total cost basis, items currently in inventory — all sourced from `/api/analytics/summary`

**Given** any metric
**When** the user taps the tile
**Then** the detail screen opens with the time-series chart and the underlying opportunities list

**FRs fulfilled:** FR-MOBILE-ANALYTICS-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-024-mobile-analytics.feature`. Tag with `@E-024-S-<N>`, `@story-24-1`, `@FR-MOBILE-ANALYTICS-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 24.2: Profit-Over-Time Chart with Range Toggle

As a **mobile user**,
I want a time-series chart of my profit with selectable ranges,
So that I can see my trajectory and identify trends.

**Acceptance Criteria:**

**Given** the analytics detail screen
**When** the chart section renders
**Then** an area or line chart is rendered via `victory-native` (or `react-native-svg-charts`) using the canonical purple gradient fill

**Given** range toggle controls
**When** the user picks 7d / 30d / 90d / YTD / All-time
**Then** the chart re-queries `/api/analytics/series?range=…` and animates the new data

**Given** the chart renders
**When** the user taps a data point
**Then** a popover shows the date and profit value for that point

**FRs fulfilled:** FR-MOBILE-ANALYTICS-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-024-mobile-analytics.feature`. Tag with `@E-024-S-<N>`, `@story-24-2`, `@FR-MOBILE-ANALYTICS-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 24.3: Marketplace / Category Breakdown & Inventory Health Gauge

As a **mobile user**,
I want to see where my profit comes from by marketplace and category, and a gauge for held-inventory health,
So that I can double down on what works and unblock what's stuck.

**Acceptance Criteria:**

**Given** the analytics detail screen
**When** the breakdown section renders
**Then** a donut chart (or stacked bar) shows profit-per-marketplace and an adjacent chart shows profit-per-category

**Given** the inventory health gauge
**When** rendered
**Then** green = no PURCHASED items aged > 30 days; yellow = 1-3 aged items; red = ≥ 4 aged items — tapping the gauge drills into the aged-inventory list

**FRs fulfilled:** FR-MOBILE-ANALYTICS-03, FR-MOBILE-ANALYTICS-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-024-mobile-analytics.feature`. Tag with `@E-024-S-<N>`, `@story-24-3`, `@FR-MOBILE-ANALYTICS-03` / `@FR-MOBILE-ANALYTICS-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 24.4: Export Report via Native Share Sheet

As a **mobile user**,
I want to export my profit report as a CSV or PDF and share it through the OS share sheet,
So that I can email it to my accountant or save it to cloud storage.

**Acceptance Criteria:**

**Given** the user taps "Export report"
**When** the format picker opens
**Then** options are: CSV (transactions), PDF (summary + breakdowns), JSON (raw)

**Given** the user selects a format
**When** the export runs
**Then** GET `/api/analytics/export?format=…` returns the file and `expo-sharing` opens the OS share sheet with the file attached

**Given** the share sheet
**When** the user picks a destination (Mail, Files, Drive, etc.)
**Then** the file lands successfully

**FRs fulfilled:** FR-MOBILE-ANALYTICS-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-024-mobile-analytics.feature`. Tag with `@E-024-S-<N>`, `@story-24-4`, `@FR-MOBILE-ANALYTICS-04`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 25 Stories: Mobile Subscription & Billing (RevenueCat IAP)

### Story 25.1: RevenueCat Configuration & Product Catalog

As a **release engineer**,
I want RevenueCat configured with all subscription SKUs registered in App Store Connect and Google Play Console,
So that the app can present and process IAP subscriptions.

**Acceptance Criteria:**

**Given** RevenueCat account and SDK installation
**When** `react-native-purchases` is initialized in the mobile app with the public RevenueCat API keys
**Then** `Purchases.configure({ apiKey })` is called on app boot

**Given** App Store Connect and Google Play Console
**When** subscription products are registered
**Then** SKUs `flipper_monthly_v1`, `flipper_annual_v1`, `pro_monthly_v1`, `pro_annual_v1` exist in both with identical pricing structure

**Given** the user logs in
**When** the app identifies them to RevenueCat
**Then** `Purchases.logIn(firebaseUid)` is called so the RevenueCat user ID matches the Firebase UID for entitlement tracking

**FRs fulfilled:** FR-MOBILE-BILLING-01, FR-MOBILE-BILLING-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-025-mobile-billing.feature`. Tag with `@E-025-S-<N>`, `@story-25-1`, `@FR-MOBILE-BILLING-01` / `@FR-MOBILE-BILLING-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 25.2: Backend `/api/webhooks/revenuecat` & Entitlement Sync

As a **backend developer**,
I want a webhook endpoint that updates a user's `User.subscriptionTier` based on RevenueCat entitlement events,
So that mobile-purchased subscriptions are recognized everywhere in the system.

**Acceptance Criteria:**

**Given** RevenueCat fires a webhook on a subscription event (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, REFUND)
**When** POST `/api/webhooks/revenuecat` receives the payload
**Then** the request signature is verified, the user resolved by `app_user_id` (= Firebase UID), and the matching User record's `subscriptionTier` updated

**Given** the entitlement maps to FREE / FLIPPER / PRO
**When** the user record is updated
**Then** a Sentry breadcrumb records the change and the user's tier is reflected immediately on next API call

**Given** an invalid signature
**When** the endpoint is hit
**Then** the request returns 401

**FRs fulfilled:** FR-MOBILE-BILLING-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-025-mobile-billing.feature`. Tag with `@E-025-S-<N>`, `@story-25-2`, `@FR-MOBILE-BILLING-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 25.3: Web-IAP Reconciliation — Avoid Double Billing

As a **mobile user with an active web Stripe subscription**,
I don't want to be offered IAP upgrades that would charge me a second time,
So that I'm not double-billed when I open the mobile app.

**Acceptance Criteria:**

**Given** a user whose `User.subscriptionTier > FREE` was set via Stripe webhook
**When** the user opens the Subscription screen on mobile
**Then** the IAP paywall is suppressed and a message reads: "You're subscribed via web. Manage your subscription on flipper.ai."

**Given** the user explicitly wants to migrate to IAP
**When** the user taps an opt-in
**Then** they are guided to cancel via the web Customer Portal first, then return to mobile for IAP purchase

**Given** a FREE-tier user
**When** they open the Subscription screen
**Then** IAP upgrade options are shown normally

**FRs fulfilled:** FR-MOBILE-BILLING-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-025-mobile-billing.feature`. Tag with `@E-025-S-<N>`, `@story-25-3`, `@FR-MOBILE-BILLING-04`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 25.4: OS-Level Subscription Management & Restore Purchases

As a **mobile user who subscribed via IAP**,
I want to manage / cancel via the OS subscription page and to restore purchases if I reinstall,
So that I have control and don't lose paid access.

**Acceptance Criteria:**

**Given** the user is on the Subscription screen and is an IAP subscriber
**When** the user taps "Manage subscription"
**Then** the app deep-links to `https://apps.apple.com/account/subscriptions` (iOS) or `https://play.google.com/store/account/subscriptions` (Android)

**Given** the user reinstalls the app and signs in
**When** the user taps "Restore Purchases"
**Then** `Purchases.restorePurchases()` is invoked, RevenueCat returns current entitlements, and the app reflects the tier

**Given** a fresh install
**When** the Subscription screen renders
**Then** "Restore Purchases" is always visible per App Store Review Guideline 3.1.1

**FRs fulfilled:** FR-MOBILE-BILLING-05, FR-MOBILE-BILLING-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-025-mobile-billing.feature`. Tag with `@E-025-S-<N>`, `@story-25-4`, `@FR-MOBILE-BILLING-05` / `@FR-MOBILE-BILLING-07`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 25.5: Tier-Based Feature Gating in Mobile UX

As a **mobile user**,
I want to clearly see which features I can use at my tier and which require an upgrade,
So that I'm not frustrated by hidden gates.

**Acceptance Criteria:**

**Given** any feature gated by tier (scan rate limit, advanced market intelligence, AI message generation quota, posting queue size)
**When** a FREE-tier user encounters the gate
**Then** the action is disabled with a purple upsell affordance showing the required tier and the value proposition

**Given** server-side enforcement
**When** any client bypass is attempted
**Then** the backend returns 402 Payment Required and the mobile app surfaces the upsell modal

**FRs fulfilled:** FR-MOBILE-BILLING-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-025-mobile-billing.feature`. Tag with `@E-025-S-<N>`, `@story-25-5`, `@FR-MOBILE-BILLING-06`. Include a scenario where the server rejects a free-tier action and the client surfaces the upsell. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 26 Stories: Mobile Settings, Notification Preferences & Accessibility

### Story 26.1: Settings Screen — Sectioned Layout

As a **mobile user**,
I want a Settings screen organized into logical sections,
So that I can find what I need without scrolling endlessly.

**Acceptance Criteria:**

**Given** Settings (under More tab) is opened
**When** the screen renders
**Then** the following sections appear in order: Account, Notifications, Appearance, Subscription, Marketplaces, Search Defaults, Privacy, About / Legal

**Given** any section is tapped
**When** the detail navigates in
**Then** the detail uses the canonical glass surfaces + dark mesh background

**FRs fulfilled:** FR-MOBILE-SETTINGS-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-026-mobile-settings.feature`. Tag with `@E-026-S-<N>`, `@story-26-1`, `@FR-MOBILE-SETTINGS-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 26.2: Account Management — Profile, Linked Accounts, Sign-Out

As a **mobile user**,
I want to update my profile (name, email, photo), link or unlink social accounts, and sign out,
So that I have control over my identity in the app.

**Acceptance Criteria:**

**Given** Settings → Account is opened
**When** the screen renders
**Then** display name (editable), email (read-only), profile photo (tap to change via `expo-image-picker`), linked accounts list with link/unlink toggles, and "Sign out" button are shown

**Given** the user taps the profile photo
**When** the picker fires
**Then** the user can choose from library or take a new photo; the result uploads to Firebase Storage and updates `/api/users/me`

**Given** the user signs out
**When** the action confirms
**Then** the session clears (Story 17.2 path) and the user lands on the auth stack

**FRs fulfilled:** FR-MOBILE-SETTINGS-02, FR-MOBILE-SETTINGS-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-026-mobile-settings.feature`. Tag with `@E-026-S-<N>`, `@story-26-2`, `@FR-MOBILE-SETTINGS-02` / `@FR-MOBILE-SETTINGS-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 26.3: Privacy, About, Feedback & Delete-Account Affordance

As a **mobile user**,
I want clear privacy & terms links, a visible app version, a feedback path, and the ability to delete my account,
So that the app meets store policies and my expectations.

**Acceptance Criteria:**

**Given** Settings → Privacy is opened
**When** the screen renders
**Then** "Privacy Policy" and "Terms of Service" rows deep-link to `https://flipper.ai/privacy` and `https://flipper.ai/terms`

**Given** Settings → About is opened
**When** the screen renders
**Then** the app's semantic version + build number (from `Constants.expoConfig.version`), a "What's New" link to CHANGELOG, and copyright are visible

**Given** Settings → "Send Feedback" is tapped
**When** the action fires
**Then** `expo-mail-composer` opens a pre-filled email draft to `support@flipper.ai` including app version + device info

**Given** Settings → Account → "Delete my account" is tapped
**When** the confirmation flow completes (explicit re-auth + double-confirmation)
**Then** DELETE `/api/users/me` is invoked, scheduling the account purge per the existing privacy policy — meeting App Store Guideline 5.1.1(v)

**FRs fulfilled:** FR-MOBILE-SETTINGS-04, FR-MOBILE-SETTINGS-05, FR-MOBILE-SETTINGS-06, FR-MOBILE-SETTINGS-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-026-mobile-settings.feature`. Tag with `@E-026-S-<N>`, `@story-26-3`, `@FR-MOBILE-SETTINGS-04` / `@FR-MOBILE-SETTINGS-05` / `@FR-MOBILE-SETTINGS-06` / `@FR-MOBILE-SETTINGS-07`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 26.4: Accessibility — Labels, Roles, Touch Targets

As a **mobile user using assistive technology**,
I want every interactive control to have a meaningful label, role, and minimum touch size,
So that I can use the app effectively with VoiceOver or TalkBack.

**Acceptance Criteria:**

**Given** any interactive control in the mobile app
**When** rendered
**Then** it has `accessibilityRole` (button, link, switch, slider, etc.), `accessibilityLabel` (semantic description), and meets the minimum touch-target size (44pt iOS / 48dp Android)

**Given** a screen is opened with VoiceOver active
**When** the user swipes through elements
**Then** the focus order is logical (top to bottom, left to right) and every element announces a meaningful label

**Given** a TalkBack user on Android
**When** they navigate the app
**Then** equivalent behavior holds

**FRs fulfilled:** FR-MOBILE-A11Y-01, FR-MOBILE-A11Y-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-026-mobile-settings.feature`. Tag with `@E-026-S-<N>`, `@story-26-4`, `@FR-MOBILE-A11Y-01` / `@FR-MOBILE-A11Y-02`. **Accessibility audit:** scenarios must include explicit VoiceOver and TalkBack traversal verification on every primary screen. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 26.5: Color Contrast, Dynamic Type & Alt Text on Listing Images

As a **mobile user**,
I want sufficient color contrast on all text, type sizes that scale with my OS settings, and meaningful alt text on listing images,
So that the app is usable for users with low vision.

**Acceptance Criteria:**

**Given** any screen
**When** color contrast is sampled
**Then** body text ≥ 4.5:1 ratio against background; large text and UI components ≥ 3:1 — verified for both dark and light palettes

**Given** the OS Dynamic Type is set to 200%
**When** Dashboard, Opportunities, and Settings render
**Then** text reflows without truncation and no critical control is obscured

**Given** any listing image
**When** rendered
**Then** the `accessibilityLabel` is set to: "Listing photo: {title}, {price}"

**FRs fulfilled:** FR-MOBILE-A11Y-03, FR-MOBILE-A11Y-04, FR-MOBILE-A11Y-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-026-mobile-settings.feature`. Tag with `@E-026-S-<N>`, `@story-26-5`, `@FR-MOBILE-A11Y-03` / `@FR-MOBILE-A11Y-04` / `@FR-MOBILE-A11Y-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 27 Stories: Mobile Meeting, Logistics & Native Integrations

### Story 27.1: Calendar Integration (OS Calendar + Optional Google)

As a **mobile user**,
I want to schedule a buy/sell meetup into my device calendar (or Google Calendar) directly from the opportunity,
So that I never miss a pickup or drop-off.

**Acceptance Criteria:**

**Given** an opportunity with a planned meetup
**When** the user taps "Schedule meetup"
**Then** a sheet appears with options: "OS Calendar" (default), "Google Calendar" (only if Google account linked), or both

**Given** "OS Calendar" is selected
**When** the user submits
**Then** `expo-calendar` creates an event with title, location, start time + 30-minute default duration, alert 15 min before

**Given** "Google Calendar" is selected
**When** the user submits
**Then** the existing `/api/meetings/google-calendar` endpoint creates the event in the user's Google account via OAuth

**FRs fulfilled:** FR-MOBILE-MEET-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-027-mobile-meet.feature`. Tag with `@E-027-S-<N>`, `@story-27-1`, `@FR-MOBILE-MEET-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 27.2: Maps & Directions Deep Link

As a **mobile user**,
I want to launch directions to a meetup location from my preferred maps app,
So that I can navigate without copy-pasting an address.

**Acceptance Criteria:**

**Given** an opportunity with a meetup location
**When** the user taps "Directions"
**Then** the OS opens the user's default maps app (Apple Maps on iOS, Google Maps on Android) via `maps://?daddr=…` / `geo:0,0?q=…`

**Given** the user has Google Maps installed on iOS
**When** the user changes the default in Settings → Maps → "Default maps app"
**Then** the choice is honored for subsequent direction launches

**FRs fulfilled:** FR-MOBILE-MEET-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-027-mobile-meet.feature`. Tag with `@E-027-S-<N>`, `@story-27-2`, `@FR-MOBILE-MEET-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 27.3: Geofence "10 Minutes Away" Reminder

As a **mobile user**,
I want the app to remind me about a meetup when I'm 10 minutes away,
So that I remember to bring the cash or item.

**Acceptance Criteria:**

**Given** a scheduled meetup with a location
**When** the user enables "10-min reminder" for that meetup
**Then** `expo-location` registers a geofence around the location (~3-mile radius)

**Given** the user crosses into the geofence
**When** the geofence event fires
**Then** a local notification reminds the user about the meetup with the listing title and a quick-link to directions

**Given** background-location permission is denied
**When** the user attempts to enable the reminder
**Then** a clear rationale screen explains the requirement and offers a deep-link to OS settings

**FRs fulfilled:** FR-MOBILE-MEET-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-027-mobile-meet.feature`. Tag with `@E-027-S-<N>`, `@story-27-3`, `@FR-MOBILE-MEET-03`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 27.4: Share Sheet & Share-Extension Quick Capture

As a **mobile user**,
I want to share an opportunity to other apps and to share a URL/image from another app into Flipper to create a draft opportunity,
So that capturing leads is friction-free.

**Acceptance Criteria:**

**Given** an opportunity detail screen
**When** the user taps "Share"
**Then** `expo-sharing` opens the OS share sheet with a text + URL + image bundle representing the opportunity

**Given** the user is browsing a marketplace in Safari / Chrome
**When** the user taps the OS share button and selects "Flipper"
**Then** the share-extension target receives the URL (and image if applicable) and creates a draft Opportunity in IDENTIFIED state via POST `/api/opportunities` with `source: shared`

**Given** the share-extension creates a draft
**When** the user opens the app
**Then** the new draft appears in the Opportunities feed with a "From shared link" badge

**FRs fulfilled:** FR-MOBILE-MEET-04, FR-MOBILE-MEET-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-027-mobile-meet.feature`. Tag with `@E-027-S-<N>`, `@story-27-4`, `@FR-MOBILE-MEET-04` / `@FR-MOBILE-MEET-05`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

> **🎯 End of Phase C — Feature Parity.** With Epics 22–27 complete, Flipper.ai mobile reaches functional parity with the web app — messaging, cross-platform posting, analytics, IAP subscriptions, settings, accessibility, and native integrations all in place. **Open-beta release at the end of Phase C.**

---

## Epic 28 Stories: Mobile Camera Capture, Offline & Native Polish

### Story 28.1: In-App Camera with Multi-Shot Capture

As a **mobile user**,
I want to capture photos of an item in-hand directly inside the app with auto-crop, flash, and multi-shot mode,
So that I can list items quickly without leaving the app.

**Acceptance Criteria:**

**Given** the resale composer or opportunity detail offers "Take photos"
**When** the user taps it
**Then** the in-app camera (via `expo-camera`) opens with a viewfinder, flash toggle, front/back camera switch, and a capture button

**Given** multi-shot mode
**When** the user taps the capture button repeatedly
**Then** up to 12 photos accumulate in a strip at the bottom of the viewfinder, each tappable to remove

**Given** a captured photo
**When** the auto-crop preview appears
**Then** the user can adjust crop bounds with corner handles before confirming

**FRs fulfilled:** FR-MOBILE-CAMERA-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-028-mobile-polish.feature`. Tag with `@E-028-S-<N>`, `@story-28-1`, `@FR-MOBILE-CAMERA-01`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 28.2: Firebase Storage Upload Pipeline for Captured Photos

As a **mobile user**,
I want my captured photos to upload reliably to Firebase Storage and appear in the opportunity / posting flow,
So that I never lose a captured photo even if my connection drops mid-upload.

**Acceptance Criteria:**

**Given** captured photos pending upload
**When** the user submits the form
**Then** each photo uploads to `/{userId}/captured/{opportunityId}/{shotIndex}.jpg` with resumable Firebase Storage uploads, tracked with a progress indicator per photo

**Given** any upload fails
**When** the failure is detected
**Then** an automatic retry runs up to 3 times with exponential backoff; persistent failures surface a "Tap to retry" CTA

**Given** uploads complete
**When** the server is notified
**Then** Image records are created and associated with the opportunity, matching the FR-SCAN-14/15 contract

**FRs fulfilled:** FR-MOBILE-CAMERA-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-028-mobile-polish.feature`. Tag with `@E-028-S-<N>`, `@story-28-2`, `@FR-MOBILE-CAMERA-02`. Include a scenario simulating a mid-upload network drop. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 28.3: Offline Mode — Read Cache + Write-Through Queue

As a **mobile user without connectivity**,
I want to keep using the app — viewing my opportunities, advancing stages, capturing data — and have everything sync when I'm back online,
So that the app works in basements, parking lots, and rural pickup spots.

**Acceptance Criteria:**

**Given** the app launches offline
**When** the user opens Opportunities or Inventory
**Then** the persisted TanStack Query + MMKV cache renders the last-known-good state with an offline badge

**Given** the user makes a write (stage advance, captured price, marked passed)
**When** offline
**Then** the mutation enqueues into a write-through queue persisted in `react-native-mmkv` with a timestamp

**Given** the device reconnects
**When** network is detected
**Then** the queue replays in FIFO order, with each successful write removed; conflicting writes (e.g. the same opportunity changed on web in the interim) are resolved with last-writer-wins for non-financial fields and a user-prompt for financial fields (purchase / sale price)

**Given** a queued write fails on replay
**When** the failure is recorded
**Then** the user is shown a reconcile screen listing offline changes that need attention

**FRs fulfilled:** FR-MOBILE-POLISH-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-028-mobile-polish.feature`. Tag with `@E-028-S-<N>`, `@story-28-3`, `@FR-MOBILE-POLISH-01`. Include scenarios for offline write, reconnect-replay, and conflict-prompt. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 28.4: Optimistic UI with Rollback Toasts

As a **mobile user**,
I want my actions to feel instant with an opportunity to undo if something fails,
So that the app feels fast and forgiving.

**Acceptance Criteria:**

**Given** any lifecycle mutation (advance stage, save opportunity, mark passed, approve message)
**When** the user submits
**Then** the local state updates immediately, the request fires in the background, and a transient "Saving…" indicator shows in the app shell

**Given** the server confirms
**When** the response arrives
**Then** the indicator clears

**Given** the server rejects
**When** the rejection is received
**Then** the local state rolls back, a toast appears with the error message and an "Undo Roll-back" / "Retry" action

**FRs fulfilled:** FR-MOBILE-POLISH-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-028-mobile-polish.feature`. Tag with `@E-028-S-<N>`, `@story-28-4`, `@FR-MOBILE-POLISH-02`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 28.5: Tablet Support & Spotlight / App Indexing

As a **mobile user on iPad or Android tablet**,
I want a 4-column desktop-style Kanban and OS-search integration,
So that the app uses tablet screen real estate well and my opportunities are searchable from outside the app.

**Acceptance Criteria:**

**Given** an iPad or 7"+ Android tablet
**When** the app detects the form factor
**Then** the Opportunities Kanban renders all four columns side-by-side simultaneously (no horizontal scroll) and Settings uses a master-detail layout

**Given** the device supports landscape
**When** the user rotates
**Then** the layout reflows gracefully (phone-class devices remain portrait-locked per FR-MOBILE-POLISH-03)

**Given** iOS Core Spotlight (or Android App Indexing)
**When** the user indexes Opportunities
**Then** opportunities appear in OS-level Spotlight / Google App search with deep-links back into the app

**FRs fulfilled:** FR-MOBILE-POLISH-03, FR-MOBILE-POLISH-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-028-mobile-polish.feature`. Tag with `@E-028-S-<N>`, `@story-28-5`, `@FR-MOBILE-POLISH-03` / `@FR-MOBILE-POLISH-04`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

## Epic 29 Stories: Mobile Production Launch — App Store + Google Play GA

### Story 29.1: App Store Connect + Play Console Listing Assets

As a **release engineer**,
I want complete, polished store listings for both platforms,
So that the app launches with professional marketing surface area.

**Acceptance Criteria:**

**Given** App Store Connect's app record
**When** the listing is prepared
**Then** the following are uploaded: app icon, 6.7"/6.5"/5.5" iPhone screenshots + 12.9" iPad screenshots (5–10 per device class), preview video (optional), name "Flipper.ai — Resale Profit Tracker", subtitle, keywords, description (≤4000 chars), promotional text, support URL `https://flipper.ai/support`, marketing URL `https://flipper.ai`, privacy policy URL `https://flipper.ai/privacy`

**Given** Google Play Console's app record
**When** the listing is prepared
**Then** the following are uploaded: app icon (512×512), feature graphic (1024×500), phone + tablet screenshots, short description (≤80 chars), full description (≤4000 chars), category "Shopping" or "Business", contact email, privacy policy URL

**Given** both stores require localized metadata
**When** at minimum English (en-US) is configured
**Then** other locales are stubs to be filled in post-launch

**FRs fulfilled:** FR-RELEASE-MOBILE-15 (store-listing-compliance subset)

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-029-mobile-launch.feature`. Tag with `@E-029-S-<N>`, `@story-29-1`, `@FR-RELEASE-MOBILE-15`. Scenarios shall verify the presence of each required asset/field via App Store Connect API and Play Developer API checks. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 29.2: App Privacy Nutrition Label & Data Safety Form

As a **release engineer**,
I want accurate Apple App Privacy "Nutrition Label" and Google Play Data Safety form submissions,
So that the app passes review and complies with platform privacy disclosure rules.

**Acceptance Criteria:**

**Given** `mobile/PRIVACY.md` enumerates every category the app collects
**When** the data sets are mapped to Apple's App Privacy categories
**Then** the following are declared accurately: Contact Info (email, name), Identifiers (Firebase UID, device ID), Usage Data (interactions, analytics), Diagnostics (crash data via Sentry), Location (only if user grants), Photos (only if user grants for listings), Purchases (subscription state). Each category states whether it is Linked / Not Linked and used for App Functionality / Analytics / Tracking

**Given** Google Play Data Safety form
**When** filled in
**Then** equivalent categories are declared with collection / sharing / encryption / deletion-controls answers matching the actual app behavior

**Given** the privacy disclosure
**When** verified against actual SDK behavior (Firebase, Sentry, RevenueCat, Expo modules)
**Then** every collected data point is accounted for — no under-declared category

**FRs fulfilled:** FR-RELEASE-MOBILE-14

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-029-mobile-launch.feature`. Tag with `@E-029-S-<N>`, `@story-29-2`, `@FR-RELEASE-MOBILE-14`. Include a scenario auditing the actual network calls in a captured trace against the declared categories. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 29.3: Pre-Submission Compliance Checklist & Final Production Build

As a **release engineer**,
I want a documented, verifiable compliance checklist run before submitting to either store,
So that we minimize rejection risk and time-to-market.

**Acceptance Criteria:**

**Given** `mobile/docs/STORE_SUBMISSION_CHECKLIST.md` is authored
**When** reviewed before submission
**Then** every applicable Apple App Store Review Guideline and Google Play Policy is enumerated with a pass/fail box: account deletion (5.1.1(v)), Sign in with Apple (4.8) — present, App Privacy Nutrition Label — submitted, App Tracking Transparency — none required (no tracking), restored-purchases — implemented, fair-use disclaimers — present, content moderation — for buyer/seller messages (we surface a report-message affordance), kids category — N/A, gambling — N/A

**Given** the checklist passes
**When** the developer cuts a release
**Then** they bump `mobile/VERSION.md` to `2.0.0`, promote `mobile/CHANGELOG.md` `[Unreleased]` → `[2.0.0] - YYYY-MM-DD`, commit, and `git tag mobile-v2.0.0 && git push origin mobile-v2.0.0`

**Given** the tag is pushed
**When** `mobile-production-release.yml` workflow runs (Story 16.5)
**Then** EAS Build produces production binaries and EAS Submit pushes them to App Store Review (iOS) and Play Console (Android) production track

**FRs fulfilled:** FR-RELEASE-MOBILE-15

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-029-mobile-launch.feature`. Tag with `@E-029-S-<N>`, `@story-29-3`, `@FR-RELEASE-MOBILE-15`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 29.4: Phased Rollout, Crash Monitoring & Post-Launch Playbook

As a **release engineer**,
I want a phased rollout strategy with crash monitoring and a documented post-launch playbook,
So that the launch is observable and reversible.

**Acceptance Criteria:**

**Given** App Store Connect's "Phased Release" toggle is enabled
**When** Apple approves and the build goes live
**Then** the release rolls out automatically over 7 days (1% → 2% → 5% → 10% → 20% → 50% → 100%) per Apple's algorithm

**Given** Google Play Console's "Staged Rollout"
**When** the production release is submitted
**Then** the rollout starts at 10% and progresses to 25% → 50% → 100% over ≥ 5 days, gated on crash-free-users-rate ≥ 99.5% (NFR-MOB-PERF-05) per stage

**Given** Sentry is monitoring the mobile project
**When** a crash spike is detected during phased rollout
**Then** an alert routes to the on-call engineer, who follows `mobile/docs/POST_LAUNCH_PLAYBOOK.md` — pause rollout at the current stage, ship OTA hot-fix via Story 16.6 if JS-only, or pull the binary and submit a new build otherwise

**Given** `mobile/docs/POST_LAUNCH_PLAYBOOK.md` exists
**When** reviewed
**Then** it documents: pause-rollout procedure (both stores), OTA hot-fix procedure (Story 16.6), force-upgrade procedure (Story 29.5), App Store / Play Store rejection-appeal procedure, customer support escalation paths

**FRs fulfilled:** FR-RELEASE-MOBILE-11 (rollback), NFR-MOB-RELEASE-01, NFR-MOB-RELEASE-02, NFR-MOB-PERF-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-029-mobile-launch.feature`. Tag with `@E-029-S-<N>`, `@story-29-4`, `@FR-RELEASE-MOBILE-11`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

### Story 29.5: Minimum-Version Enforcement & Force-Upgrade Path

As a **release engineer**,
I want the ability to deprecate older mobile versions and force-upgrade users when necessary,
So that we can retire builds with critical bugs or breaking API changes.

**Acceptance Criteria:**

**Given** GET `/api/mobile/min-version` is implemented on the backend
**When** the mobile app launches
**Then** the app queries the endpoint and compares the returned minimum version (per platform) against `Constants.expoConfig.version`

**Given** the device's version is below the minimum
**When** comparison resolves
**Then** the app navigates to a full-screen force-upgrade screen with a "Update Flipper" CTA deep-linking to the App Store / Play Store listing — no other paths exit this screen

**Given** the device's version is at or above the minimum
**When** comparison resolves
**Then** the app boots normally

**Given** the operator wants to bump the minimum version
**When** they edit the backend config (env var or admin UI)
**Then** changes take effect on the next mobile app launch (within ≤ 10 minutes)

**FRs fulfilled:** FR-RELEASE-MOBILE-12

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `E-029-mobile-launch.feature`. Tag with `@E-029-S-<N>`, `@story-29-5`, `@FR-RELEASE-MOBILE-12`. Update the requirements traceability matrix. See standard DoD checklist at top of file.

---

> **🎯 End of Phase D — General Availability.** Flipper.ai mobile v2.0.0 is publicly available on the Apple App Store and Google Play Store, with phased rollouts in flight, crash monitoring active, a documented post-launch playbook, and an OTA hot-fix + force-upgrade safety net. The mobile track is complete.

---

## Mobile Release Phase Summary

| Phase | Epics | Stories | Headline Deliverable | Cumulative State |
|---|---|---|---|---|
| **A — Rails up** | 15, 16, 17 | 17 stories | Monorepo + EAS pipeline + auth bridge — a stub-but-real build lands on TestFlight + Firebase App Distribution | Engineering can ship anything from this point forward |
| **B — Lovable beta** | 18, 19, 20, 21 | 25 stories | Shell + scanning + lifecycle + push — **first product-grade closed beta** | A real user can flip a real item end-to-end on mobile |
| **C — Feature parity** | 22, 23, 24, 25, 26, 27 | 28 stories | Messaging + reposting + analytics + IAP + settings + meetups — **feature parity with web, open beta** | Mobile is no longer "the mobile companion" — it's a peer |
| **D — Launch** | 28, 29 | 10 stories | Camera + offline + tablet + store launch — **v2.0.0 GA on both stores** | Public launch with crash monitoring, OTA hot-fix, and force-upgrade safety nets |

**Total:** 15 epics, 80 stories. Critical-path note: Phase A is the keystone — pipeline before product. With realistic execution velocity, Phase A ≈ 2 weeks, Phase B ≈ 6 weeks, Phase C ≈ 10 weeks, Phase D ≈ 3 weeks — total ≈ 21 weeks from kickoff to GA, with the first tester binary in hand at week 2.

---

## Cross-Document References

- Web epics (1–14) and canonical FR/NFR inventory: [`epics.md`](./epics.md)
- PRD: [`PRD.md`](./PRD.md)
- Architecture: [`architecture.md`](./architecture.md)
- UX Design: [`ux-design.md`](./ux-design.md)
- Requirements Traceability Matrix (web + mobile, single source): `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Project policy & AI-NEVER-MOCKED rule: [`CLAUDE.md`](../../CLAUDE.md) and [`project-context.md`](../project-context.md)

