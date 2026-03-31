# Story 7.2: Stripe Checkout & Customer Portal

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a46b37b0e3c9fb2bf6ebba

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to subscribe to a plan and manage my billing through Stripe,
So that payment is secure and I can update my payment method or cancel anytime.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. **Given** a FREE user clicks "Upgrade" on a pricing plan **When** the checkout flow initiates **Then** a Stripe Checkout session is created and the user is redirected to Stripe's hosted checkout page. `FR-BILLING-04`
2. **Given** a successful Stripe payment **When** the checkout completes **Then** the user is redirected back to the app with their subscription tier updated immediately. `FR-BILLING-04`
3. **Given** an authenticated subscriber **When** they click "Manage Billing" in Settings **Then** they are redirected to the Stripe Customer Portal where they can update payment method, view invoices, or cancel. `FR-BILLING-05`
4. **Given** a Stripe Checkout session **When** the user cancels or closes the checkout page **Then** no subscription is created and the user remains on their current tier. `FR-BILLING-04`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-BILLING-04 | AC #1 — Checkout session created and redirect | @FR-BILLING-04 @story-7-2 |
| FR-BILLING-04 | AC #2 — Tier updated on checkout success | @FR-BILLING-04 @story-7-2 |
| FR-BILLING-05 | AC #3 — Customer Portal redirect from Settings | @FR-BILLING-05 @story-7-2 |
| FR-BILLING-04 | AC #4 — No subscription on checkout cancel | @FR-BILLING-04 @story-7-2 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved (AI adversarial review 2026-03-29; all HIGH/MEDIUM issues fixed)
- [x] Unit tests written and passing (Jest, coverage thresholds: 96% branches, 98% functions, 99% lines)
- [x] Acceptance test scenarios created with dual tags (@FR-BILLING-04 / @FR-BILLING-05 AND @story-7-2)
- [x] user_flows.feature updated (affects the upgrade/billing user flow)
- [x] No regressions — existing tests still pass (`make test`)
- [x] Dev notes and references are complete
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Wire up `updateUserTier()` in webhook handler with actual Prisma update (AC: #2, FR: FR-BILLING-04)
  - [x] Replace placeholder stub in `app/api/webhooks/stripe/route.ts` with `prisma.user.updateMany({ where: { email }, data: { subscriptionTier: tier } })`
  - [x] Import `db` from `@/lib/db` in webhook route
  - [x] Handle case where user is not found (log warning, don't throw — webhooks must return 200)
- [x] Task 2: Add Billing section to Settings page (AC: #3, FR: FR-BILLING-05)
  - [x] Create `src/components/BillingSettings.tsx` — shows current plan, upgrade options, and "Manage Billing" button
  - [x] "Manage Billing" button calls `POST /api/checkout/portal` and redirects to returned `url`
  - [x] "Upgrade" buttons for FLIPPER/PRO call `POST /api/checkout` with `{ tier }` and redirect to returned `url`
  - [x] Import and render `<BillingSettings />` in `app/settings/page.tsx`
- [x] Task 3: Handle checkout success query param in Settings (AC: #2, FR: FR-BILLING-04)
  - [x] Settings page reads `?checkout=success&tier=FLIPPER` from URL and shows a success toast/banner
  - [x] Settings page reads `?checkout=cancelled` and shows a neutral/info toast
  - [x] Added `<CheckoutResultBanner />` client component wrapped in Suspense for toast handling
- [x] Task 4: Write Gherkin acceptance tests (AC: #1–#4)
  - [x] Add 8 scenarios (S-11 through S-18) to `test/acceptance/features/E-007-subscription-billing.feature`
  - [x] Tag each scenario with `@E-007-S-<N>`, `@story-7-2`, and `@FR-BILLING-04` or `@FR-BILLING-05`
  - [x] Add step definitions in `test/acceptance/step_definitions/E-007-stripe-checkout.steps.ts`
  - [x] Feature-level `@wip` removed from E-007 (2026-03-29); story 7.4 scenarios retain their own `@wip` where needed; all 8 story 7.2 scenarios pass
- [x] Task 5: Write Jest unit tests for API routes (AC: #1–#4)
  - [x] `src/__tests__/api/checkout.test.ts` — 9 tests covering POST /api/checkout: valid tier, invalid tier, unauthenticated, Stripe session creation, customer reuse, error handling
  - [x] `src/__tests__/api/checkout-portal.test.ts` — 6 tests covering POST /api/checkout/portal: authenticated with customer, no customer found, unauthenticated, error handling
  - [x] `src/__tests__/api/webhooks-stripe.test.ts` — Consolidated webhook route coverage (single suite; includes updateMany safety, stripeCustomerId, payment_failed, production guard)
  - [x] Updated traceability matrix: FR-BILLING-04 and FR-BILLING-05 marked Covered

### Review Follow-ups (AI) — resolved 2026-03-29

- [x] **AC #2 timing:** After `?checkout=success`, `CheckoutResultBanner` calls `router.refresh()`, polls `GET /api/usage` until tier matches (or timeout), then dispatches `flipper:subscription-updated`; `BillingSettings` refetches on that event (`src/lib/billing-events.ts`).
- [x] **POST /api/checkout:** `prisma.user.updateMany` + warn when `count === 0` (no 500 if DB row missing).
- [x] **Duplicate webhook tests:** Removed `webhook-stripe.test.ts`; canonical file is `webhooks-stripe.test.ts`.
- [x] **BDD:** Removed feature-level `@wip` from `E-007-subscription-billing.feature` (story 7.4 scenarios keep their own `@wip` where applicable).
- [x] **Dev notes:** This section updated to match current code (see below).

## Dev Notes

### Implementation status (current)

- **`app/api/webhooks/stripe/route.ts`:** `updateUserTier` uses `prisma.user.updateMany` with optional `stripeCustomerId`; logs when `count === 0`. Event handlers return 200 on success path; signature/config failures use normal error responses.
- **`app/api/checkout/route.ts`:** Persists `stripeCustomerId` via `updateMany` (warns if no row); returns `{ url }` for redirect.
- **`app/api/checkout/portal/route.ts`:** `POST` returns `{ url }` for Stripe Customer Portal.

### Response Format Note

**Checkout routes return `{ url }` directly** (not `{ success: true, data: { url } }`). This is intentional for redirect endpoints.

### Database Schema

The `User` model includes `subscriptionTier` (default `"FREE"`) and optional `stripeCustomerId` (`@unique`). Checkout persists the Stripe customer id after find/create; webhooks also set `stripeCustomerId` on `checkout.session.completed` when present.

### BillingSettings Component Design

- Current plan and scan usage come from **`GET /api/usage`** (`data.tier`, `data.scans.used`).
- `TIER_LIMITS` / `TIER_PRICING` for display and CTAs.
- After `POST /api/checkout` / `POST /api/checkout/portal` → `window.location.href = data.url`.
- Listens for **`flipper:subscription-updated`** (see `@/lib/billing-events`) to refetch after checkout return.

### Settings Page Query Params

`app/api/checkout/route.ts` sends users back to:
```
/settings?checkout=success&tier=FLIPPER
/settings?checkout=cancelled
```
The settings page must read these and show feedback. Since `app/settings/page.tsx` is a Server Component, add a client-side toast/banner handler — either convert to Client Component or add a small client wrapper `<CheckoutResultBanner />` that uses `useSearchParams()`.

### Authentication Pattern

```typescript
// Use this pattern (matches existing checkout routes):
import { getCurrentUser } from '@/lib/auth';
const sessionUser = await getCurrentUser();
if (!sessionUser?.email) {
  throw new UnauthorizedError('Unauthorized');
}
```

### Error Handling Pattern

```typescript
// Standard API route pattern:
import { handleError, ValidationError, NotFoundError, UnauthorizedError } from '@/lib/errors';
try {
  // ...
} catch (error) {
  return handleError(error, req.url);
}
```

### Test Requirements

**Acceptance tests** (`test/acceptance/features/E-007-subscription-billing.feature`):
- Story 7.2 scenarios: S-11 through S-18; tags `@story-7-2`, `@FR-BILLING-04` or `@FR-BILLING-05`, `@E-007-S-<N>`.
- Step definitions: `test/acceptance/step_definitions/E-007-stripe-checkout.steps.ts`

**Unit tests** — coverage thresholds (96% branches, 98% functions, 99% lines):
- Mock `stripe` from `@/lib/stripe` and `getCurrentUser` from `@/lib/auth`
- Mock `@/lib/db` for webhook and checkout routes
- Webhook coverage: `src/__tests__/api/webhooks-stripe.test.ts` only

### Project Structure Notes (delivered)

Key paths:
```
src/components/BillingSettings.tsx
src/components/CheckoutResultBanner.tsx
src/lib/billing-events.ts
src/__tests__/api/checkout.test.ts
src/__tests__/api/checkout-portal.test.ts
src/__tests__/api/webhooks-stripe.test.ts
src/__tests__/components/BillingSettings.test.tsx
app/api/checkout/route.ts
app/api/checkout/portal/route.ts
app/api/webhooks/stripe/route.ts
app/settings/page.tsx
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.2]
- [PRD Requirement: FR-BILLING-04 — Stripe Checkout integration]
- [PRD Requirement: FR-BILLING-05 — Stripe Customer Portal]
- [Stripe Library: src/lib/stripe.ts — client, STRIPE_PRICE_IDS, PRICE_TO_TIER, TIER_PRICING]
- [Subscription Tiers: src/lib/subscription-tiers.ts — TIER_LIMITS, getTierLimits()]
- [Auth Helper: src/lib/auth.ts — getCurrentUser(), requireAuth()]
- [Error Helpers: src/lib/errors.ts — AppError, handleError(), UnauthorizedError, NotFoundError, ValidationError]
- [Database: src/lib/db.ts — Prisma singleton]
- [Schema: prisma/schema.prisma — User.subscriptionTier field]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References

### Code Review (2026-03-29)

**Git vs File List:** Working tree may still contain unrelated changes (other epics). For release notes, only the files in this story’s File List (below) are in scope for 7.2 unless you merge a branch that includes additional work.

**Round 1 — Fixed in review**

- **CRITICAL — Billing tier in UI:** `BillingSettings` now uses `GET /api/usage` for `tier` and scan counts; `BillingSettings.test.tsx` mocks the usage shape.

**Round 2 — Follow-ups (2026-03-29)**

- Checkout `updateMany` when persisting `stripeCustomerId`; poll + `router.refresh` + `flipper:subscription-updated` after checkout success; consolidated webhook Jest to `webhooks-stripe.test.ts`; removed feature-level `@wip` on E-007; Dev Notes refreshed.

**Round 3 — Adversarial Review (2026-03-29, claude-opus-4-6)**

Fixed 2 HIGH + 3 MEDIUM issues:
- **H-1 Fixed:** File headers added/corrected on `billing-events.ts`, `checkout.test.ts`, `checkout-portal.test.ts`, `app/settings/page.tsx`
- **H-2 Fixed:** Removed `@wip` tags from 3 story 7.2 scenarios in `user_flows.feature`
- **M-1 Fixed:** Corrected indentation of try-block contents in `app/api/webhooks/stripe/route.ts`
- **M-2 Fixed:** Added error toast feedback in `BillingSettings.tsx` for failed checkout/portal API calls; updated `BillingSettings.test.tsx` with toast assertions
- **M-4 Fixed:** Added `req.url` to `handleError()` call in webhook route for log traceability
- **M-3 Downgraded:** `NEXTAUTH_URL` env var is the project-wide convention (10+ usages) — not changed
- 2 LOW issues noted (inline `<style>` tag, BDD step simulation) — not fixed, acceptable trade-offs

### Completion Notes List
- Enhanced BillingSettings with scan progress bar, trust signals, and improved daily cost framing
- Added subtle-float animation for "Most Popular" badge
- Created comprehensive BillingSettings.test.tsx (43 tests) covering all states, flows, and edge cases
- Added 3 billing user flow scenarios to user_flows.feature (story 7.2; @wip removed in Round 3 review)
- Fixed file headers on checkout and portal routes to match project standards
- All 8 BDD scenarios passing (S-11 through S-18)
- Jest: checkout, checkout-portal, webhooks-stripe, BillingSettings component suites

### File List
- `src/lib/billing-events.ts` — `BILLING_SUBSCRIPTION_SYNCED_EVENT` for post-checkout refetch
- `src/components/BillingSettings.tsx` — Usage API, subscription sync listener
- `src/components/CheckoutResultBanner.tsx` — Success/cancel toasts, usage polling, `router.refresh`
- `src/__tests__/components/BillingSettings.test.tsx` — Component tests
- `src/__tests__/api/checkout.test.ts` — Checkout API tests (includes `updateMany` no-row case)
- `src/__tests__/api/checkout-portal.test.ts` — Portal API tests
- `src/__tests__/api/webhooks-stripe.test.ts` — Consolidated webhook route tests
- `app/api/checkout/route.ts` — Stripe Checkout session; `updateMany` for `stripeCustomerId`
- `app/api/checkout/portal/route.ts` — Customer Portal session
- `app/api/webhooks/stripe/route.ts` — Webhooks + `updateUserTier`
- `app/settings/page.tsx` — BillingSettings + CheckoutResultBanner
- `test/acceptance/features/E-007-subscription-billing.feature` — Story 7.2 scenarios S-11–S-18; feature-level `@wip` removed
- `test/acceptance/step_definitions/E-007-stripe-checkout.steps.ts` — Step definitions
- `test/acceptance/features/user_flows.feature` — Billing upgrade/cancel/portal flows
