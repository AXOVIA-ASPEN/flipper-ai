# Story 2.1: Landing Page

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a4082a843ae6d99adf7d39

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **visitor**,
I want to see a compelling landing page with features, pricing, and a call-to-action,
so that I understand the product value and can sign up.

## Acceptance Criteria

1. **Hero Section Display**
   - Given an unauthenticated user navigates to `/`
   - When the page loads
   - Then a hero section is displayed with:
     - Headline text conveying the product value proposition
     - Subheadline describing AI-powered marketplace scanning
     - Primary CTA button labeled "Get Started Free" navigating to `/register`
   - And the Flipper AI logo (🐧) and brand name are visible in the header nav

2. **Navigation Header**
   - Given the landing page is loaded
   - When the user views the header
   - Then a "Log In" link navigates to `/login`
   - And a "Get Started Free" button navigates to `/register`
   - And no authenticated-user navigation (Dashboard, Settings, etc.) is shown

3. **Features Section**
   - Given the landing page is loaded
   - When the user scrolls to the features section
   - Then at least 6 key product features are displayed, each with:
     - A lucide-react icon
     - A title
     - A description
   - And features include: Multi-Platform Scanning, AI Value Detection, Profit Calculator, Real-Time Alerts, Market Insights, and Scam Detection

4. **Pricing Section with Correct Tiers**
   - Given the landing page is loaded
   - When the user scrolls to the pricing section
   - Then three pricing tiers are displayed matching the PRD and `subscription-tiers.ts`:
     - **FREE** ($0/mo): 10 scans/day, 1 marketplace, basic AI analysis
     - **FLIPPER** ($19/mo): Unlimited scans, 3 marketplaces, AI messaging, price history
     - **PRO** ($49/mo): All marketplaces, all features, eBay cross-listing, priority support
   - And the FLIPPER tier is visually highlighted as the recommended plan
   - And each tier CTA navigates to `/register`

5. **CTA Navigation**
   - Given any CTA button on the landing page ("Get Started Free", "Start Free", tier buttons)
   - When the user clicks the CTA
   - Then they are navigated to `/register` (the registration page)
   - And the page does NOT navigate to `/auth/signup` or any non-existent route

6. **Mobile Responsive Layout**
   - Given the landing page
   - When viewed on mobile (viewport < 768px)
   - Then the layout is responsive:
     - Feature cards stack to single column
     - Pricing cards stack to single column
     - Navigation remains accessible (no content overflow)
     - All text is readable without horizontal scrolling
     - CTA buttons are tappable (min 44px touch target)

7. **Footer Links**
   - Given the landing page is loaded
   - When the user scrolls to the footer
   - Then links to Privacy Policy (`/privacy`), Terms of Service (`/terms`), and Contact are displayed
   - And the copyright notice includes current year and "Axovia AI"

8. **Theme Support**
   - Given the landing page
   - When the system theme is dark or light
   - Then the landing page renders appropriately with readable contrast
   - And the page respects the ThemeContext color scheme if the user has a saved preference

9. **Accessibility (WCAG AA)**
   - Given the landing page
   - When inspected for accessibility
   - Then all images/icons have appropriate alt text or aria-labels
   - And color contrast meets WCAG AA minimum (4.5:1 for body text, 3:1 for large text)
   - And the page is navigable via keyboard (Tab through all interactive elements)
   - And semantic HTML is used (nav, main, section, footer elements)

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-DASH-13 | AC 1, AC 2, AC 3, AC 4, AC 5, AC 6, AC 7, AC 8, AC 9 | @FR-DASH-13 @story-2-1 |

## Tasks / Subtasks

- [ ] Task 1: Fix Pricing Tiers to Match PRD (AC: #4)
  - [ ] 1.1 Update `app/page.tsx` pricing section: rename tiers to FREE / FLIPPER / PRO
  - [ ] 1.2 Set correct prices: FREE $0/mo, FLIPPER $19/mo, PRO $49/mo
  - [ ] 1.3 Update feature lists per tier to match `src/lib/subscription-tiers.ts` (FREE: 10 scans/day, 1 marketplace; FLIPPER: unlimited scans, 3 marketplaces, AI messaging; PRO: all features, eBay cross-listing)
  - [ ] 1.4 Highlight FLIPPER as "MOST POPULAR" (not "Pro" at $29)

- [ ] Task 2: Fix CTA Navigation Routes (AC: #2, #5)
  - [ ] 2.1 Change all `router.push('/auth/signup')` to `router.push('/register')`
  - [ ] 2.2 Change `<Link href="/auth/login">` to `<Link href="/login">`
  - [ ] 2.3 Verify `/register` and `/login` routes exist in `app/(auth)/` route group

- [ ] Task 3: Add Semantic HTML & Accessibility (AC: #9)
  - [ ] 3.1 Wrap hero in `<main>`, features/pricing in `<section>` with headings
  - [ ] 3.2 Add `aria-label` attributes to icon-only and decorative elements
  - [ ] 3.3 Ensure all interactive elements have visible focus rings (`focus:ring-2`)
  - [ ] 3.4 Verify WCAG AA contrast ratios (4.5:1 body, 3:1 large text)

- [ ] Task 4: Write Gherkin Acceptance Tests (AC: #1-#9, DoD)
  - [ ] 4.1 Add scenarios to `test/acceptance/features/E-002-user-registration.feature`
  - [ ] 4.2 Tag ALL scenarios with `@E-002-S-<N>` (sequential), `@story-2-1`, and `@FR-DASH-13`
  - [ ] 4.3 Cover all 9 acceptance criteria with Given/When/Then scenarios
  - [ ] 4.4 Update requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

- [ ] Task 5: Write Unit Tests (AC: #4, #5)
  - [ ] 5.1 Create `src/__tests__/landing-page.test.tsx` for LandingPage component
  - [ ] 5.2 Test pricing tier names and amounts render correctly
  - [ ] 5.3 Test CTA buttons have correct href/onClick targeting `/register`
  - [ ] 5.4 Test all 6 feature cards render with titles and icons
  - [ ] 5.5 Test footer links render correctly

- [ ] Task 6: Verify Build & Lint (DoD)
  - [ ] 6.1 Run `make build` — no TypeScript errors
  - [ ] 6.2 Run `make lint` — no lint errors
  - [ ] 6.3 Run `make test` — all existing tests pass
  - [ ] 6.4 Verify Jest coverage thresholds maintained (96% branches, 98% functions, 99% lines)

## Dev Notes

### Architecture Patterns & Constraints

- **Framework**: Next.js 16 App Router, React 19, TypeScript strict mode
- **Styling**: Tailwind CSS 4 — use utility classes, responsive prefixes (`md:`, `lg:`)
- **Icons**: lucide-react — import individually (e.g., `import { Search } from 'lucide-react'`)
- **Component Pattern**: `'use client'` directive required (uses `useState`, `useRouter`)
- **Route Group**: Auth pages use `(auth)` route group — URLs are `/login` and `/register` (NOT `/auth/login`)
- **Provider Stack**: `SessionProvider` → `ThemeProvider` → `ToastProvider` (in `app/layout.tsx`)
- **Fonts**: Geist Sans + Geist Mono (loaded via `next/font/google` in layout.tsx)
- **Custom Animations**: `animate-blob`, `animation-delay-2000`, `animation-delay-4000` defined in `app/globals.css`

### Critical Implementation Details

1. **Pricing Tier Discrepancy (MUST FIX)**:
   - Current `app/page.tsx` shows: Free ($0), Pro ($29), Business ($99)
   - PRD (FR-BILLING-03) defines: FREE ($0), FLIPPER ($19/mo), PRO ($49/mo)
   - `src/lib/subscription-tiers.ts` matches the PRD: FREE, FLIPPER, PRO
   - **The landing page MUST match the PRD and subscription-tiers.ts**

2. **CTA Route Discrepancy (MUST FIX)**:
   - Current code: `router.push('/auth/signup')` — this route does NOT exist
   - Actual registration route: `/register` (via `app/(auth)/register/page.tsx`)
   - Actual login route: `/login` (via `app/(auth)/login/page.tsx`)
   - **All CTAs must point to `/register`, login link to `/login`**

3. **Existing Implementation**: `app/page.tsx` (265 lines) is already implemented with hero, features (6 cards), pricing (3 tiers), CTA, and footer. This story is about **fixing discrepancies and adding test coverage**, not building from scratch.

4. **Subscription Tier Feature Lists** (from `src/lib/subscription-tiers.ts`):
   - FREE: 10 scans/day, 1 marketplace, 3 search configs, AI analysis, no price history, no messaging, no eBay cross-listing
   - FLIPPER: Unlimited scans, 3 marketplaces, 20 search configs, AI analysis, price history, messaging, no eBay cross-listing
   - PRO: Unlimited scans, all 5 marketplaces, unlimited search configs, all features including eBay cross-listing

### File Structure Requirements

| File | Action | Purpose |
|------|--------|---------|
| `app/page.tsx` | MODIFY | Fix pricing tiers, CTA routes, add semantic HTML |
| `test/acceptance/features/E-002-user-registration.feature` | MODIFY | Add landing page Gherkin scenarios |
| `src/__tests__/landing-page.test.tsx` | CREATE | Component unit tests |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | MODIFY | Add story 2.1 mappings |

### Components to Reuse (DO NOT recreate)

- `src/lib/subscription-tiers.ts` — Reference for tier features (do NOT import at runtime for display)
- `src/contexts/ThemeContext.tsx` — Theme provider (already in layout.tsx)
- `src/components/Navigation.tsx` — Reference for component patterns (lucide-react, Link, active state)

### Anti-Patterns to Avoid

- Do NOT hardcode pricing that differs from `subscription-tiers.ts` and the PRD
- Do NOT use routes that don't exist (`/auth/signup`)
- Do NOT create a separate landing page component in `src/components/` — keep in `app/page.tsx` per App Router convention
- Do NOT add server-side data fetching — landing page is fully static/client-side
- Do NOT import `subscription-tiers.ts` at runtime just to display prices — hardcode the display values matching the PRD (the tiers module is for backend enforcement)

### Testing Standards

**BDD Acceptance Tests:**
- Feature file: `test/acceptance/features/E-002-user-registration.feature`
- ALL scenarios MUST have three tags: `@E-002-S-<N>`, `@story-2-1`, `@FR-DASH-13`
- Sequential numbering starts at `@E-002-S-1` (file currently empty)
- Runs against production build via `start-server-and-test`

**Jest Unit Tests:**
- Location: `src/__tests__/landing-page.test.tsx`
- Coverage thresholds: 96% branches, 98% functions, 99% lines/statements
- Use `@testing-library/react` for component rendering
- Mock `next/navigation` (`useRouter`, `usePathname`)
- Mock `next/link`

**Existing BDD Pattern Reference (from Epic 1):**
```gherkin
@E-001-S-1 @story-1-1 @FR-INFRA-11
Scenario: Secrets are accessible via Secret Manager API
  Given a GCP project exists with Secret Manager API enabled
  When secrets are created with naming convention "{ENV}_{CATEGORY}_{KEY}"
  Then all secrets for the target environment are accessible via the Secret Manager API
```

### Git Intelligence

**Recent Commit Patterns (last 10):**
- Commit style: emoji prefix + category tag + description (e.g., `✅ [LEGAL] Add Privacy Policy`)
- Legal pages (privacy, terms) recently added — these are already linked from footer
- Dashboard component tests recently fixed (9/10 passing)
- Coverage thresholds recently verified at 97.5%+
- CI/CD pipeline includes database migration step

**Relevant files recently touched:**
- `app/layout.tsx` — Root layout (verify no conflicts)
- `app/dashboard/page.tsx` — Dashboard page (reference for component patterns)
- `src/components/Navigation.tsx` — Navigation component (reference)

### Latest Tech Notes

- **Next.js 16**: App Router is stable. `'use client'` required for hooks. Server Components are default.
- **React 19**: Stable. `useState`, `useRouter` from `next/navigation` work as expected.
- **Tailwind CSS 4**: Uses `@import 'tailwindcss'` instead of `@tailwind` directives. CSS variable theming via `@theme inline` block in `globals.css`.
- **lucide-react**: Tree-shakeable icon imports. Pattern: `<IconName className="w-6 h-6" />`.

### Project Structure Notes

- Landing page at `app/page.tsx` — standard Next.js App Router convention
- Auth routes at `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` — route group removes `/auth` prefix from URL
- No new components needed — all changes are in `app/page.tsx`
- Test file follows project convention: `src/__tests__/landing-page.test.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 Stories - Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR-DASH-13]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Landing Page Design]
- [Source: src/lib/subscription-tiers.ts — TIER_LIMITS]
- [Source: app/page.tsx — Existing landing page implementation (265 lines)]
- [Source: app/(auth)/login/page.tsx, app/(auth)/register/page.tsx — Auth routes]
- [Source: test/acceptance/features/E-002-user-registration.feature — BDD target file]

---

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-002-S-<N>` — sequential scenario number within Epic 2 (start at 1)
- `@story-2-1`
- Applicable requirement tags: `@FR-DASH-13`, `@NFR-UX-01`, `@NFR-UX-02`

**Gherkin Scenarios:**

```gherkin
Feature: Landing Page
  As a visitor
  I want to see a compelling landing page with features, pricing, and a call-to-action
  So that I understand the product value and can sign up

  Background:
    Given the application is running

  @E-002-S-1 @story-2-1 @FR-DASH-13
  Scenario: Hero section displays value proposition
    When I visit the landing page
    Then I should see a hero section with a headline
    And I should see a subheadline describing AI-powered marketplace scanning
    And I should see a "Get Started Free" CTA button
    And the Flipper AI logo and brand name should be visible

  @E-002-S-2 @story-2-1 @FR-DASH-13
  Scenario: Navigation header for unauthenticated users
    When I visit the landing page
    Then I should see a "Log In" link pointing to "/login"
    And I should see a "Get Started Free" button pointing to "/register"
    And I should NOT see authenticated navigation links

  @E-002-S-3 @story-2-1 @FR-DASH-13
  Scenario: Features section displays product capabilities
    When I visit the landing page
    And I scroll to the features section
    Then I should see at least 6 feature cards
    And each card should have an icon, title, and description

  @E-002-S-4 @story-2-1 @FR-DASH-13
  Scenario: Pricing section displays correct tiers matching PRD
    When I visit the landing page
    And I scroll to the pricing section
    Then I should see 3 pricing tiers:
      | Tier    | Price   | Highlighted |
      | Free    | $0/mo   | No          |
      | Flipper | $19/mo  | Yes         |
      | Pro     | $49/mo  | No          |

  @E-002-S-5 @story-2-1 @FR-DASH-13
  Scenario: CTA buttons navigate to registration page
    When I visit the landing page
    And I click "Get Started Free"
    Then I should be navigated to "/register"

  @E-002-S-6 @story-2-1 @FR-DASH-13
  Scenario: Pricing tier CTAs navigate to registration
    When I visit the landing page
    And I click the CTA on the "Flipper" tier
    Then I should be navigated to "/register"

  @E-002-S-7 @story-2-1 @FR-DASH-13 @NFR-UX-01
  Scenario: Mobile responsive layout
    Given my viewport is 375x667
    When I visit the landing page
    Then feature cards should be in a single column
    And pricing cards should be in a single column
    And no horizontal scrollbar should be present

  @E-002-S-8 @story-2-1 @FR-DASH-13
  Scenario: Footer displays required links
    When I visit the landing page
    And I scroll to the footer
    Then I should see links to "/privacy" and "/terms"
    And I should see "Axovia AI" in the copyright notice

  @E-002-S-9 @story-2-1 @FR-DASH-13 @NFR-UX-02
  Scenario: Accessibility requirements
    When I visit the landing page
    Then the page should use semantic HTML elements
    And all interactive elements should be keyboard-focusable
    And text contrast should meet WCAG AA standards
```

### Requirements Traceability Matrix

| Requirement | Type | Description | Story | Scenario ID(s) | Feature File | Status |
|------------|------|-------------|-------|----------------|--------------|--------|
| FR-DASH-13 | FR | Landing page with hero, features, pricing, CTA | 2.1 | @E-002-S-1 thru @E-002-S-9 | E-002-user-registration.feature | Pending |
| NFR-UX-01 | NFR | Mobile-responsive UI | 2.1 | @E-002-S-7 | E-002-user-registration.feature | Pending |
| NFR-UX-02 | NFR | Accessible (WCAG AA) | 2.1 | @E-002-S-9 | E-002-user-registration.feature | Pending |

### DoD Checklist

- [ ] All 9 acceptance criteria implemented and verified
- [ ] Pricing tiers match PRD: FREE ($0), FLIPPER ($19), PRO ($49)
- [ ] All CTA buttons navigate to `/register` (not `/auth/signup`)
- [ ] Login link navigates to `/login` (not `/auth/login`)
- [ ] Gherkin scenarios written in `test/acceptance/features/E-002-user-registration.feature`
- [ ] All scenarios tagged with `@E-002-S-<N>`, `@story-2-1`, and relevant `@FR-*` / `@NFR-*` tags
- [ ] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [ ] Unit tests in `src/__tests__/landing-page.test.tsx`
- [ ] Jest coverage thresholds maintained (96% branches, 98% functions, 99% lines)
- [ ] Mobile responsive verified (375px, 768px breakpoints)
- [ ] WCAG AA contrast verified
- [ ] Semantic HTML elements used (nav, main, section, footer)
- [ ] No broken links on the landing page
- [ ] `make build` succeeds with no TypeScript errors
- [ ] `make lint` passes
- [ ] All existing tests pass (`make test`)
- [ ] No regressions in existing test suite

> See `_bmad-output/planning-artifacts/epics.md` → "Definition of Done (DoD) — All Stories" for full tagging rules and examples.
> **This DoD must be verified as complete during the `/bmad-bmm-code-review` workflow. A story cannot be marked "done" without passing all DoD items.**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Story is a FIX + TEST COVERAGE story, not a greenfield build
- Existing `app/page.tsx` has 265 lines with hero, features, pricing, CTA, footer already built
- Two critical discrepancies identified: pricing tiers and CTA routes
- BDD feature file `E-002-user-registration.feature` exists but is empty — scenario numbering starts at @E-002-S-1

### File List

- `app/page.tsx` — Landing page (MODIFY)
- `test/acceptance/features/E-002-user-registration.feature` — BDD tests (MODIFY)
- `src/__tests__/landing-page.test.tsx` — Unit tests (CREATE)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — Traceability (MODIFY)
