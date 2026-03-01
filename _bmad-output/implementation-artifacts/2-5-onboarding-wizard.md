# Story 2.5: Onboarding Wizard

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **new user**,
I want to complete a guided setup wizard,
so that the app is configured for my preferred marketplaces, categories, budget, and location.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. After first login, user is redirected to the onboarding wizard at step 1 of 6 `FR-DASH-11`
2. User progresses through all 6 steps (welcome, marketplaces, categories, budget, location, complete) with a progress bar reflecting current step `FR-DASH-11`
3. Each step's selections (marketplaces, categories, budget range, ZIP, radius) are persisted server-side when the user advances `FR-DASH-12`
4. If the user closes the browser and returns, progress is persisted and they resume at their last step `FR-DASH-12`
5. Clicking "Skip" on any step applies default values for that step and advances to the next `FR-DASH-11`
6. Completing step 6 and clicking "Get Started" redirects to the dashboard; the wizard does not show again `FR-DASH-11`
7. Clicking "Back" returns to the previous step with prior selections preserved `FR-DASH-11`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-DASH-11 | AC #1, #2, #5, #6, #7 | @FR-DASH-11 @story-2-5 |
| FR-DASH-12 | AC #3, #4 | @FR-DASH-12 @story-2-5 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (maintain 96%+ branch, 98%+ function, 99%+ line coverage)
- [ ] Acceptance test scenarios created with dual tags (@FR-DASH-11, @FR-DASH-12, and @story-2-5)
- [ ] Feature file: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- [ ] user_flows.feature updated (onboarding flow added)
- [ ] No regressions — existing tests still pass
- [ ] Dev notes and references are complete
- [ ] Prisma migration created and applied successfully
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [ ] Task 1: Extend database schema for onboarding preferences (AC: #3, FR: FR-DASH-12)
  - [ ] 1.1 Add fields to UserSettings: `preferredMarketplaces`, `preferredCategories`, `budgetRange`, `locationZip`, `searchRadius`
  - [ ] 1.2 Create and apply Prisma migration (`npx prisma migrate dev`)
  - [ ] 1.3 Verify migration doesn't break existing data (default values for new fields)

- [ ] Task 2: Enhance POST /api/user/onboarding to persist preferences (AC: #3, #4, FR: FR-DASH-12)
  - [ ] 2.1 Accept `marketplaces`, `categories`, `budget`, `zip`, `radius` in POST body
  - [ ] 2.2 Validate inputs with Zod schema
  - [ ] 2.3 Upsert UserSettings with preference data on each step save
  - [ ] 2.4 Update existing unit tests + add new tests for preference persistence

- [ ] Task 3: Wire frontend to persist preferences on step navigation (AC: #2, #3, #5, FR: FR-DASH-11, FR-DASH-12)
  - [ ] 3.1 Update `saveStep()` in `app/onboarding/page.tsx` to include step-specific preference data in POST body
  - [ ] 3.2 Update GET handler to return saved preferences so resume works correctly
  - [ ] 3.3 Populate step component state from GET response on mount (for resume)
  - [ ] 3.4 Ensure "Skip" sends default values for the skipped step

- [ ] Task 4: Add registration → onboarding redirect (AC: #1, FR: FR-DASH-11)
  - [ ] 4.1 Change `app/(auth)/register/page.tsx` redirect from `/settings` to `/onboarding`
  - [ ] 4.2 Add middleware rule: redirect authenticated users with `onboardingComplete=false` to `/onboarding` (except `/api/*`, `/onboarding`, static assets)
  - [ ] 4.3 Update login flow to check `onboardingComplete` and redirect accordingly

- [ ] Task 5: Write BDD acceptance tests (AC: all, FR: FR-DASH-11, FR-DASH-12)
  - [ ] 5.1 Add scenarios to `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
  - [ ] 5.2 Tag each scenario: `@E-002-S-<N> @story-2-5 @FR-DASH-11` or `@FR-DASH-12`
  - [ ] 5.3 Write step definitions
  - [ ] 5.4 Update `user_flows.feature` with onboarding flow
  - [ ] 5.5 Update requirements traceability matrix

## Dev Notes

### Critical: What Already Exists (DO NOT RECREATE)

The onboarding wizard UI is **95% built**. The dev agent MUST NOT recreate these files — only extend them:

| File | Status | What to Do |
|------|--------|------------|
| `app/onboarding/page.tsx` | 95% done | Modify `saveStep()` to include preferences, add GET response population |
| `src/components/Onboarding/WizardLayout.tsx` | Complete | DO NOT TOUCH — fully working layout with progress bar, a11y |
| `src/components/Onboarding/StepWelcome.tsx` | Complete | DO NOT TOUCH |
| `src/components/Onboarding/StepMarketplaces.tsx` | UI done | DO NOT TOUCH — already collects `marketplaces[]` in local state |
| `src/components/Onboarding/StepCategories.tsx` | UI done | DO NOT TOUCH — already collects `categories[]` in local state |
| `src/components/Onboarding/StepBudget.tsx` | UI done | DO NOT TOUCH — already collects `budget` in local state |
| `src/components/Onboarding/StepLocation.tsx` | UI done | DO NOT TOUCH — already collects `zip` and `radius` in local state |
| `src/components/Onboarding/StepComplete.tsx` | Complete | DO NOT TOUCH |
| `app/api/user/onboarding/route.ts` | Partial | EXTEND — add preference fields to POST handler, return preferences in GET |
| `src/__tests__/api/user/onboarding.test.ts` | 9 tests | EXTEND — add tests for preference persistence |

### What DOES NOT Exist Yet (Must Be Built)

1. **Database preference fields** — `UserSettings` model has NO fields for marketplaces, categories, budget, location
2. **API preference handling** — POST only saves `onboardingStep` + `onboardingComplete`, not preferences
3. **GET response with preferences** — GET only returns step progress, not saved preferences
4. **Registration redirect** — `/register` currently redirects to `/settings` (line 69, 94 in register/page.tsx)
5. **Middleware onboarding check** — `middleware.ts` has NO onboarding redirect logic
6. **BDD acceptance tests** — Zero Cucumber scenarios for onboarding workflow

### Architecture Compliance

**API Pattern** (from `src/lib/errors.ts`):
- Throw `AppError` subclasses: `ValidationError`, `NotFoundError`, `UnauthorizedError`
- Catch with `handleError(error)` → RFC 7807 `NextResponse`
- Success: `{ success: true, data: { ... } }`
- Error: `{ success: false, error: { code, detail, ... } }`

**Auth Pattern**:
- Use `getCurrentUserId()` or `requireAuth()` from `@/lib/auth-middleware`
- The existing onboarding API uses `getUserIdOrDefault()` — follow this pattern

**Database Pattern**:
- Use Prisma singleton from `@/lib/db`
- Schema: `prisma/schema.prisma` with `cuid()` IDs, `@updatedAt` timestamps
- After schema changes: `npx prisma migrate dev --name add-onboarding-preferences`

**Frontend Pattern**:
- Client components use `'use client'` directive
- Existing onboarding page is already a client component
- Imports use `@/` path alias for `src/` directory

### Existing Type Exports (Reuse These)

From `src/components/Onboarding/StepMarketplaces.tsx`:
- `MARKETPLACES` array — `['ebay', 'facebook', 'craigslist', 'offerup', 'mercari']`
- `MarketplaceId` type

From `src/components/Onboarding/StepCategories.tsx`:
- `CATEGORIES` array — `['electronics', 'clothing', 'toys', 'furniture', 'tools', 'collectibles', 'books', 'sports']`
- `CategoryId` type

From `src/components/Onboarding/StepBudget.tsx`:
- `BUDGET_RANGES` array — micro ($1-$50), small ($50-$200), medium ($200-$500), large ($500-$2K), premium ($2K+)
- `BudgetRangeId` type

### Database Schema Changes Required

Add to `UserSettings` model in `prisma/schema.prisma`:
```prisma
preferredMarketplaces String[]   @default([])
preferredCategories   String[]   @default([])
budgetRange           String     @default("small")
locationZip           String?
searchRadius          Int        @default(25)
```

Use `String[]` (array) for marketplaces/categories to store multiple selections. Use defaults that match the "Skip" behavior.

### Middleware Redirect Logic

Add to `middleware.ts`:
```
IF authenticated AND onboardingComplete === false
AND path NOT in ['/onboarding', '/api/*', '/_next/*', '/signout']
THEN redirect to /onboarding
```

IMPORTANT: The middleware must check the user's session/JWT for `onboardingComplete`. The current JWT strategy in NextAuth should include this field (verify in `src/lib/auth.ts` callbacks).

### Test Requirements

- Acceptance test feature file: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- Every scenario tagged: `@E-002-S-<N> @story-2-5 @FR-DASH-11` or `@FR-DASH-12`
- Unit test file: `src/__tests__/api/user/onboarding.test.ts` (EXTEND existing)
- Coverage thresholds: 96% branches, 98% functions, 99% lines

**Minimum Scenarios Required:**
1. New user redirected to onboarding after first login `@FR-DASH-11`
2. Wizard shows 6 steps with progress bar `@FR-DASH-11`
3. Step preferences are persisted server-side `@FR-DASH-12`
4. Progress resumes after browser close `@FR-DASH-12`
5. Skip applies defaults and advances `@FR-DASH-11`
6. Completing wizard redirects to dashboard `@FR-DASH-11`
7. Back button preserves selections `@FR-DASH-11`

### Project Structure Notes

- Onboarding page: `app/onboarding/page.tsx` (already exists)
- Wizard components: `src/components/Onboarding/` (6 step components + WizardLayout)
- API route: `app/api/user/onboarding/route.ts` (already exists)
- API tests: `src/__tests__/api/user/onboarding.test.ts` (already exists, extend)
- Acceptance tests: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- Schema: `prisma/schema.prisma` (extend UserSettings model)
- Middleware: `middleware.ts` (add onboarding redirect)
- Registration: `app/(auth)/register/page.tsx` (change redirect target)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.5]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-DASH-11]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-DASH-12]
- [Source: _bmad-output/planning-artifacts/ux-design.md#WizardLayout]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication]

### Git Intelligence

Recent commits show focus on:
- Documentation and legal pages (latest)
- Test coverage fixes and improvements
- CI/CD pipeline enhancements
- Error handling improvements

No recent onboarding-related commits. The onboarding UI was built in earlier work and has not been touched recently.

## Dev Agent Record

### Agent Model Used
<!-- To be filled by dev agent -->

### Debug Log References
<!-- To be filled by dev agent -->

### Completion Notes List
<!-- To be filled by dev agent -->

### File List
<!-- To be filled by dev agent -->
