# Story 10.6: Notification Preferences

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69cc20eefd97946d81876f20

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to configure which events trigger email notifications,
So that I only receive alerts that matter to me.

## Acceptance Criteria

1. **AC-1: Notification Preferences Section Loads** — Given the user navigates to Settings → Notifications, when the notification preferences section loads, then each event type is listed with an email toggle (on/off), organized by category: Flip Lifecycle, Communication, Smart Alerts, and Monitoring.
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-10-6`

2. **AC-2: Toggle Email Off Per Event Type** — Given the notification preferences, when the user toggles email off for "New flippable item found" (or any individual event type), then the preference is saved via PATCH `/api/user/settings` and no emails are sent for that event type going forward.
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-10-6`

3. **AC-3: Default Preferences for New Users** — Given default notification preferences, when a new user account is created, then all email notification toggles are enabled by default (except `notifyMessageSent` which defaults to OFF per Story 10.4).
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-10-6`

4. **AC-4: Phase 2 Channel Placeholders** — Given the notification preferences UI, when Phase 2 push/SMS toggles are not yet available, then the UI shows email toggles only, with placeholder text for "Push" and "SMS" columns showing "Coming Soon" (disabled/grayed out).
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-10-6`

5. **AC-5: Configurable Alert Thresholds** — Given the notification preferences, when the user configures "Flip Gone Cold Time" (hours, default 24) and "Flip Turned Hot #" (message count, default 3), then the values are saved to UserSettings and used by the monitoring system for cold/hot detection in Story 10.5.
   - **FR refs:** FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-09 @FR-NOTIFY-10 @FR-NOTIFY-12 @story-10-6`

## Tasks / Subtasks

- [x] Task 1: Add new notification preference fields to Prisma schema (AC: #1, #2, #3, #5)
  - [x] 1.1 Add Smart Alert notification toggle fields to `UserSettings` model in `prisma/schema.prisma`:
    - `notifyReviewReceived   Boolean @default(true)` — already added by Story 10.5
    - `notifyFlipGoneCold     Boolean @default(true)` — already added by Story 10.5
    - `notifyFlipTurnedHot    Boolean @default(true)` — already added by Story 10.5
    - `notifyListingUnavailable Boolean @default(true)` — **added by this story**
  - [x] 1.2 Add configurable alert threshold fields:
    - `flipGoneColdHours      Int     @default(24)` — already added by Story 10.5
    - `flipTurnedHotCount     Int     @default(3)` — already added by Story 10.5
  - [x] 1.3 **CHECK FIRST**: `notifyMessageReceived` already exists (added by Story 10.4). No changes needed.
  - [x] 1.4 Run `make db-sync` — schema synced with `notifyListingUnavailable`
  - [x] 1.5 Verified all defaults: `notifyListingUnavailable @default(true)` ✅

- [x] Task 2: Update Settings API to accept new fields (AC: #2, #5)
  - [x] 2.1 Added `notifyListingUnavailable` to PATCH handler body destructure with Boolean coercion
  - [x] 2.2 Numeric validation for `flipGoneColdHours` and `flipTurnedHotCount` already in place from Story 10.5
  - [x] 2.3 GET handler returns `notifyListingUnavailable` — verified
  - [x] 2.4 Added `notifyListingUnavailable` to `prisma.userSettings.update()` data object

- [x] Task 3: Redesign NotificationSettings component (AC: #1, #2, #4)
  - [x] 3.1 Full redesign of `src/components/NotificationSettings.tsx` — `'use client'` on line 21 (after JSDoc)
  - [x] 3.2 Category-based table: Flip Lifecycle, Communication, Smart Alerts, Monitoring, Digest
  - [x] 3.3 Push/SMS columns: grayed-out "Coming Soon" toggles, hidden on mobile (< sm)
  - [x] 3.4 `useToast()` for save feedback
  - [x] 3.5 Optimistic update with rollback on failure
  - [x] 3.6 Master toggle OFF: opacity-50, info banner
  - [x] 3.7 Tailwind CSS matching settings card pattern
  - [x] 3.8 WCAG AA: `role="switch"`, `aria-checked`, `aria-label`, `aria-live="polite"` on disabled banner
  - [x] 3.9 Hash anchor support: `#notifications` scroll on mount
  - [x] 3.10 Loading skeleton with `animate-pulse`

- [x] Task 4: Add configurable alert thresholds UI (AC: #5)
  - [x] 4.1 Flip Gone Cold Time input (1-168 hrs) and Flip Turned Hot Threshold input (1-20) in Smart Alerts section
  - [x] 4.2 Save on blur via `handleColdHoursBlur` and `handleHotCountBlur`
  - [x] 4.3 Inline validation error shown when value out of range

- [x] Task 5: Unit tests (AC: all)
  - [x] 5.1 Extended `src/__tests__/api/user-settings.test.ts` with `notifyListingUnavailable` tests (80 tests total, all pass)
  - [x] 5.2 Float rounding and non-numeric validation tests added
  - [x] 5.3 Updated `src/components/__tests__/NotificationSettings.test.tsx` — 25 tests covering all categories, toast, skeleton, accessibility
  - [x] 5.4 Coverage thresholds met

- [x] Task 6: Acceptance tests (AC: all)
  - [x] 6.1 Appended 8 Gherkin scenarios to E-010 feature file (@E-010-S-50 through @E-010-S-57)
  - [x] 6.2 Created `test/acceptance/step_definitions/E-010-notification-preferences.steps.ts`
  - [x] 6.3 RTM updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Architecture & Design Decisions

**Pattern: Comprehensive Notification Preferences UI**
Story 10.6 consolidates ALL notification preferences into a single, organized UI. Prior stories (10.3, 10.4, 10.5) add backend processing and may add schema fields. Story 10.6 ensures the UI exposes ALL toggles and adds any remaining fields.

**Pattern: Immediate Save on Toggle**
Each toggle change fires an immediate PATCH to `/api/user/settings`. This is the established pattern from the existing `NotificationSettings` component (no "Save" button — changes are instant). Use optimistic UI updates: toggle visually immediately, revert on API failure with a toast error.

**Pattern: Category-Based Organization**
Notification types are grouped by domain (Flip Lifecycle, Communication, Smart Alerts, Monitoring, Digest) for scannability. This matches the mental model of the features that generate these events.

**Pattern: Phase 2 Placeholder Columns**
Push and SMS columns are rendered as disabled toggle placeholders with "Coming Soon" tooltip. This prepares the UI structure for Epic 11 (Push & SMS Notifications) without functional toggles. When Epic 11 is implemented, the developer replaces placeholders with real toggles — the UI structure is already in place.

**Schema Field Mapping**
Some existing toggles map to multiple event types because the original design grouped related events:

| Email Toggle Field | Notification Events Covered | FR |
|---|---|---|
| `notifyNewDeals` | `opportunity.found` | FR-NOTIFY-01 |
| `notifySoldItems` | `flip.sold`, `flip.purchased`, `flip.shipped` | FR-NOTIFY-05, 06, 07 |
| `notifyPriceDrops` | `listing.price_changed` | FR-NOTIFY-11 |
| `notifyExpiring` | `listing.expiring` | FR-MONITOR-03 |
| `notifyWeeklyDigest` | Weekly digest email | — |
| `notifyMessageReceived` | `message.received` | FR-NOTIFY-02 |
| `notifyDraftReady` | `message.draft_ready` | FR-NOTIFY-03 |
| `notifyMessageSent` | `message.sent` | FR-NOTIFY-04 |
| `notifyReviewReceived` | `review.received` | FR-NOTIFY-08 |
| `notifyFlipGoneCold` | `flip.gone_cold` | FR-NOTIFY-09 |
| `notifyFlipTurnedHot` | `flip.turned_hot` | FR-NOTIFY-10 |
| `notifyListingUnavailable` | `listing.unavailable` | FR-MONITOR-04 |

**UI Row Mapping — Display Names → Schema Fields**
Each row in the UI maps to exactly one schema field. No two rows share a toggle.

| UI Display Name | Schema Field | Default | Description |
|---|---|---|---|
| **Flip Lifecycle** | | | |
| New Opportunity Found | `notifyNewDeals` | ON | New listing above threshold |
| Flip Lifecycle Updates | `notifySoldItems` | ON | Combined: purchased + shipped + sold events. Tooltip: "Controls email for purchase, shipping, and sale events" |
| **Communication** | | | |
| Seller Reply Received | `notifyMessageReceived` | ON | Inbound message from seller |
| AI Draft Ready | `notifyDraftReady` | ON | AI-generated draft for review |
| Message Sent | `notifyMessageSent` | OFF | Confirmation of sent message |
| **Smart Alerts** | | | |
| Review Received | `notifyReviewReceived` | ON | Review left on any platform |
| Flip Gone Cold | `notifyFlipGoneCold` | ON | No response for X hours (configurable) |
| Flip Turned Hot | `notifyFlipTurnedHot` | ON | N+ consecutive inbound messages (configurable) |
| Price Change Alert | `notifyPriceDrops` | ON | Source listing price changed |
| **Monitoring** | | | |
| Listing Expiring | `notifyExpiring` | ON | Listing nearing expiration |
| Listing Unavailable | `notifyListingUnavailable` | ON | Listing removed from platform |
| **Digest** | | | |
| Weekly Digest | `notifyWeeklyDigest` | ON | Weekly opportunity summary |

**Total: 12 toggle rows + 1 master toggle + 1 frequency selector + 2 threshold inputs = 16 interactive elements.**

**Alert Threshold Fields — Consumed by Story 10.5**
The `flipGoneColdHours` and `flipTurnedHotCount` fields are persisted by this story but consumed by Story 10.5's smart alert notification processor. The monitoring system queries `UserSettings` for these thresholds when evaluating cold/hot conditions.

### Existing Code to Reuse — DO NOT REINVENT

| What | Where | How to Reuse |
|------|-------|-------------|
| **Settings API (GET/PATCH)** | `app/api/user/settings/route.ts` | Extend PATCH handler. Boolean coercion: `if (field !== undefined) updateData.field = Boolean(field)`. Numeric validation: `const val = Number(x); if (!isFinite(val) \|\| val < min \|\| val > max) throw new ValidationError(...)`. |
| **NotificationSettings component** | `src/components/NotificationSettings.tsx` (319 lines, `'use client'`) | **REPLACE** content but preserve file. Reuse the save pattern: `fetch('/api/user/settings', { method: 'PATCH', body: JSON.stringify(updates) })`. Update internal `UserSettings` interface. |
| **NotificationSettings test** | `src/components/__tests__/NotificationSettings.test.tsx` (120+ lines) | **MUST UPDATE** — existing tests cover current toggles. Add tests for new categories, threshold inputs, toast integration. |
| **Settings API test** | `src/__tests__/api/user-settings.test.ts` | **MUST EXTEND** — uses `mockFindUnique`, `mockCreateSettings`, `mockUpdateSettings` mock pattern. Mocks `@/lib/auth-middleware`, `@/lib/crypto`, `@/lib/db`. |
| **ScoringSettings numeric inputs** | `src/components/ScoringSettings.tsx` | Reuse **onBlur save with validation** pattern for threshold fields. Pattern: `onChange` updates local state, `onBlur` validates + saves. `parseFloat(e.target.value)` with `!isNaN(value)` check. |
| **Toast system** | `src/components/ToastContainer.tsx` → `useToast()` | **USE THIS** instead of inline banners. Import: `import { useToast } from '@/components/ToastContainer'`. Call `showToast({ type, title, message, duration })`. Already wrapped in app layout. |
| **Unsubscribe endpoint** | `app/api/user/unsubscribe/route.ts` | **DO NOT MODIFY** — but be aware it sets `emailNotifications = false` from email links. Settings link in emails: `${appUrl}/settings#notifications`. |
| **Prisma singleton** | `src/lib/db.ts` → `prisma` | Import `prisma` — NEVER instantiate new PrismaClient. Pool: 2 connections. |
| **Auth helper** | `@/lib/auth-middleware` → `getAuthUserId()` | **NOT** from `@/lib/auth.ts`. Already used in settings route — no changes needed. |
| **Error hierarchy** | `src/lib/errors.ts` → `ValidationError` | For invalid threshold values. Pattern: `throw new ValidationError('flipGoneColdHours must be between 1 and 168')`. Caught by `handleError()` → 422 response. |
| **UserSettings model** | `prisma/schema.prisma` (lines 247-274) | Extend with new fields. All boolean defaults `@default(true)` except `notifyMessageSent` which is `@default(false)`. |

### Anti-Patterns — DO NOT DO THESE

- **DO NOT create a separate notification settings API endpoint** — extend the existing `app/api/user/settings/route.ts` which handles ALL UserSettings fields
- **DO NOT create a separate database table for notification preferences** — add fields to the existing `UserSettings` model in Prisma schema
- **DO NOT use `any` types in production code** — TypeScript strict mode is enforced
- **DO NOT add a "Save" button** — toggles save immediately on change via PATCH (established UX pattern from existing NotificationSettings)
- **DO NOT implement Push or SMS toggle functionality** — Phase 2 only renders "Coming Soon" placeholders. No backend, no event handling.
- **DO NOT add npm packages for UI toggle components** — use native HTML checkboxes or Tailwind-styled toggle switches (already used in existing settings components)
- **DO NOT create the notification backend processors** — this story is UI + schema only. Backend processing is handled by Stories 10.3, 10.4, 10.5.
- **DO NOT hardcode event type lists** — define a `NOTIFICATION_EVENT_TYPES` config array that maps display names → schema fields → categories. This makes it trivial to add new event types in future stories.
- **DO NOT forget the master toggle gating** — when `emailNotifications` is false, all individual toggles must be visually disabled
- **DO NOT use jsdom test environment** — Jest uses `node` environment. Component tests exist at `src/components/__tests__/NotificationSettings.test.tsx` and use the node environment.
- **DO NOT bypass the existing `handleError()` pattern** — all API errors go through `handleError(error)` from `src/lib/errors.ts`
- **DO NOT use inline success/error banners** — the app has `useToast()` from `ToastProvider`. BillingSettings already uses it. NotificationSettings must migrate to Toast for consistency.
- **DO NOT forget the `'use client'` directive** — all settings components require it. Must be line 1 of the file.
- **DO NOT forget to update the component's internal `UserSettings` interface** — it defines its own TypeScript interface matching the API response shape. New fields must be added here too.
- **DO NOT show Flip Purchased, Shipped, and Sold as 3 separate toggles** — they all map to `notifySoldItems`. Show as a single row: "Flip Lifecycle Updates" with tooltip explaining what it covers. Three separate rows that all change together is confusing UX.

### UserSettings Schema Additions

```prisma
// Smart Alert toggles (Story 10.6)
notifyReviewReceived    Boolean  @default(true)   // FR-NOTIFY-08
notifyFlipGoneCold      Boolean  @default(true)   // FR-NOTIFY-09
notifyFlipTurnedHot     Boolean  @default(true)   // FR-NOTIFY-10
notifyListingUnavailable Boolean @default(true)   // FR-MONITOR-04

// Configurable alert thresholds (Story 10.6)
flipGoneColdHours       Int      @default(24)     // Hours before "gone cold" alert
flipTurnedHotCount      Int      @default(3)      // Consecutive inbound msgs for "hot" alert

// If Story 10.4 not yet implemented, also add:
// notifyMessageReceived Boolean @default(true)    // FR-NOTIFY-02
// notifyDraftReady      Boolean @default(true)    // FR-NOTIFY-03
// notifyMessageSent     Boolean @default(false)   // FR-NOTIFY-04 (default OFF)
```

### Project Structure Notes

Files to modify:
```
prisma/schema.prisma                                        # Add 4-7 new fields to UserSettings model
app/api/user/settings/route.ts                              # Extend PATCH validation for new fields
src/components/NotificationSettings.tsx                     # FULL REDESIGN — category-based notification preferences UI
src/__tests__/api/user-settings.test.ts                     # Add tests for new toggle + threshold fields (EXISTING, flat naming)
src/components/__tests__/NotificationSettings.test.tsx      # Update component tests for redesigned UI (EXISTING, 120+ lines)
test/acceptance/features/E-010-monitoring-email-notifications.feature  # CREATE — does not exist yet
test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts  # CREATE — does not exist yet
_bmad-output/test-artifacts/requirements-traceability-matrix.md  # Update RTM
```

New files to create:
```
test/acceptance/features/E-010-monitoring-email-notifications.feature  # Epic 10 acceptance tests (start @E-010-S-1)
test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts  # Step definitions
```

**NOTE:** The acceptance test feature file and step definitions do NOT exist yet — they must be CREATED, not appended to. Previous epics (E-001 through E-008) have their own files. Tag numbering starts at `@E-010-S-1`.

### Testing Standards

- Jest test environment: `node` (NOT jsdom)
- `maxWorkers: 1` — prevents resource conflicts
- Mock Prisma client for unit tests (do NOT hit real DB). Mock pattern from existing test: `jest.mock('@/lib/db', () => ({ __esModule: true, default: { user: { findUnique: (...args) => mockFindUnique(...args) }, userSettings: { create: ..., update: ... } } }))`
- Coverage thresholds (from jest.config.js): **branches 93%, functions 99%, lines 98%, statements 98%**
- Acceptance test profile: `npm run test:bdd:acceptance` — uses `test/acceptance/features/**/*.feature` + `test/acceptance/step_definitions/` + `test/acceptance/support/`
- Feature file tag convention: `@epic-10` at feature level, `@E-010-S-<N>` per scenario (sequential starting at S-1), `@story-10-6` per story, `@FR-NOTIFY-12` per requirement
- Step definitions follow `E-010-monitoring-email-notifications.steps.ts` naming convention
- Acceptance test support: `FlipperWorld` provides `page` (Playwright), `db` (Prisma), `testData` (shared state), `screenshot()`, `waitForElement()`

### Exact Component Patterns to Follow

**State Management (match existing NotificationSettings):**
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastContainer'; // UPGRADE from inline banners

interface UserSettings {
  emailNotifications: boolean;
  notifyNewDeals: boolean;
  notifyPriceDrops: boolean;
  notifySoldItems: boolean;
  notifyExpiring: boolean;
  notifyWeeklyDigest: boolean;
  notifyFrequency: 'instant' | 'daily' | 'weekly';
  // NEW fields from Story 10.6:
  notifyReviewReceived: boolean;
  notifyFlipGoneCold: boolean;
  notifyFlipTurnedHot: boolean;
  notifyListingUnavailable: boolean;
  flipGoneColdHours: number;
  flipTurnedHotCount: number;
  // Conditional (if 10.4 not implemented):
  notifyMessageReceived?: boolean;
  notifyDraftReady?: boolean;
  notifyMessageSent?: boolean;
}

const [settings, setSettings] = useState<UserSettings | null>(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const { showToast } = useToast();
```

**Fetch Pattern (match existing):**
```typescript
useEffect(() => {
  async function fetchSettings() {
    try {
      const response = await fetch('/api/user/settings');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.detail || 'Failed to load');
      setSettings(result.data);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'Failed to load settings' });
    } finally { setLoading(false); }
  }
  fetchSettings();
}, []);
```

**Toggle Save Pattern (immediate, optimistic):**
```typescript
async function handleToggle(field: keyof UserSettings) {
  if (!settings || saving) return;
  const previousSettings = { ...settings };
  const newValue = !settings[field];
  setSettings({ ...settings, [field]: newValue }); // optimistic
  setSaving(true);
  try {
    const response = await fetch('/api/user/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newValue }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error?.detail || 'Failed to save');
    setSettings(result.data); // confirm from server
  } catch (err) {
    setSettings(previousSettings); // rollback
    showToast({ type: 'error', title: 'Error', message: 'Failed to save. Please try again.' });
  } finally { setSaving(false); }
}
```

**Numeric Save Pattern (from ScoringSettings — onBlur):**
```typescript
function handleThresholdBlur(field: string, value: number, min: number, max: number) {
  if (!settings || saving) return;
  if (isNaN(value) || value < min || value > max) {
    showToast({ type: 'error', title: 'Invalid value', message: `Must be between ${min} and ${max}` });
    return;
  }
  saveSettings({ [field]: Math.round(value) });
}
```

**Toggle Button CSS Pattern (match existing NotificationToggle):**
```
Button: relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
Active: bg-blue-600
Inactive: bg-gray-200 dark:bg-gray-700
Disabled: opacity-50 cursor-not-allowed
Slider: inline-block h-4 w-4 rounded-full bg-white transform transition-transform
        translate-x-6 (active) / translate-x-1 (inactive)
```

**Container CSS Pattern (match existing settings cards):**
```
bg-white dark:bg-gray-800 rounded-lg shadow p-6
```

### Dependencies

- **Story 10.1** (BLOCKING): Provides `NotificationEvent` model and infrastructure — required for the notification system to work at all
- **Story 10.3** (SOFT): Establishes flip lifecycle email processor — Story 10.6 toggles control these emails
- **Story 10.4** (SOFT): Adds message notification toggles — if not implemented, Story 10.6 adds the schema fields itself
- **Story 10.5** (SOFT): Consumes `flipGoneColdHours` and `flipTurnedHotCount` threshold values — Story 10.6 creates the UI to configure them
- **No external dependencies**: Uses only existing Resend integration, Prisma, and Tailwind CSS

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.6 (lines 2507-2539)] — AC and DoD
- [Source: _bmad-output/planning-artifacts/epics.md#FR-NOTIFY-12 (line 227)] — Configurable notification preferences per event type
- [Source: _bmad-output/planning-artifacts/epics.md#FR-NOTIFY-09 (line 225)] — Flip gone cold configurable duration (default 24h)
- [Source: _bmad-output/planning-artifacts/epics.md#FR-NOTIFY-10 (line 226)] — Flip turned hot configurable count (default 3)
- [Source: prisma/schema.prisma#UserSettings (lines 247-274)] — Existing notification preference fields
- [Source: src/components/NotificationSettings.tsx (319 lines)] — **EXISTING notification UI — REDESIGN completely. Has `'use client'`, internal UserSettings interface, NotificationToggle + FrequencyOption child components.**
- [Source: src/components/__tests__/NotificationSettings.test.tsx (120+ lines)] — **EXISTING component tests — MUST UPDATE**
- [Source: src/components/ScoringSettings.tsx] — Numeric input with onBlur save + validation pattern. Fee inputs: `type="number"` with `onChange` local state + `onBlur` API save.
- [Source: src/components/ToastContainer.tsx] — `useToast()` hook + `showToast({ type, title, message, duration })` — USE THIS for save feedback
- [Source: app/api/user/settings/route.ts (296 lines)] — Settings GET/PATCH. Auth: `getAuthUserId()` from `@/lib/auth-middleware`. Boolean coercion: `Boolean(field)`. Numeric: `Number()` + `isFinite()` + range check.
- [Source: src/__tests__/api/user-settings.test.ts] — **EXISTING API tests — MUST EXTEND. Uses mockFindUnique, mockCreateSettings, mockUpdateSettings.**
- [Source: app/api/user/unsubscribe/route.ts (145 lines)] — One-click unsubscribe sets `emailNotifications = false`. Links to `${appUrl}/settings#notifications`.
- [Source: app/settings/page.tsx] — Server component composing: BillingSettings → UsageDisplay → ThemeSettings → NotificationSettings → ScoringSettings → LogisticsSettings. No props passed. `space-y-8` layout.
- [Source: _bmad-output/implementation-artifacts/10-4-communication-email-notifications.md] — Message notification fields spec
- [Source: _bmad-output/implementation-artifacts/10-3-flip-lifecycle-email-notifications.md] — Flip lifecycle processor and preference mapping
- [Source: _bmad-output/implementation-artifacts/10-1-background-job-scheduler.md] — NotificationEvent infrastructure
- [Source: _bmad-output/planning-artifacts/ux-design.md (line 91, 352)] — NotificationSettings component spec + NFR-UX-02 WCAG AA compliance
- [Source: _bmad-output/planning-artifacts/wireframes.md (lines 985-995)] — Settings page wireframe with notification section
- [Source: _bmad-output/planning-artifacts/wireframes.md (lines 1020-1041)] — Responsive breakpoints: mobile (< 640px single col), sm (640), md (768 2-col), lg (1024 3-col)
- [Source: _bmad-output/planning-artifacts/PRD.md (line 314)] — NFR-PERF-01: Page loads < 2 seconds
- [Source: src/lib/errors.ts] — AppError hierarchy: `ValidationError` (422), `UnauthorizedError` (401). `handleError()` maps errors to RFC 7807 responses.
- [Source: src/lib/db.ts] — Prisma singleton, 2-connection pool
- [Source: test/acceptance/support/world.ts] — FlipperWorld: `page`, `db`, `testData`, `screenshot()`, `waitForElement()`
- [Source: jest.config.js] — Coverage: branches 93%, functions 99%, lines 98%, statements 98%. Path aliases: `@/*` → `src/*`, `@/app/*` → `app/*`

## Requirement Traceability

| FR | AC | Test Tag | Description |
|----|-----|----------|-------------|
| FR-NOTIFY-12 | AC-1, AC-2, AC-3, AC-4 | @FR-NOTIFY-12 @story-10-6 | Configurable notification preferences per event type (email toggle) |
| FR-NOTIFY-09 | AC-5 | @FR-NOTIFY-09 @story-10-6 | Flip gone cold configurable duration |
| FR-NOTIFY-10 | AC-5 | @FR-NOTIFY-10 @story-10-6 | Flip turned hot configurable threshold |

## Definition of Done (DoD)

- [ ] All ACs (1-5) have acceptance test scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
- [ ] All unit tests pass with coverage thresholds met (branches 93%, functions 99%, lines 98%, statements 98%)
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] All existing tests continue to pass (`pnpm test`)
- [ ] Prisma migration runs cleanly (new fields on UserSettings)
- [ ] Settings API PATCH accepts and persists all new notification toggle fields
- [ ] Settings API PATCH validates threshold fields (flipGoneColdHours: 1-168, flipTurnedHotCount: 1-20)
- [ ] NotificationSettings UI shows all event types organized by category (12 toggle rows)
- [ ] Master toggle disables/mutes all individual toggles when OFF
- [ ] "Coming Soon" placeholder columns for Push and SMS are visible and non-functional
- [ ] Threshold inputs (Flip Gone Cold Time, Flip Turned Hot #) accept valid ranges with inline validation
- [ ] Toggles save immediately on change (no "Save" button) with optimistic update + rollback on failure
- [ ] Toast notifications used for save feedback (not inline banners) — via `useToast()` from ToastProvider
- [ ] New users get all toggles enabled by default (except notifyMessageSent which defaults to OFF)
- [ ] Dark/light mode works correctly in notification preferences UI
- [ ] WCAG AA compliance: `role="switch"`, `aria-checked`, `aria-label` on all toggles; keyboard navigation; focus rings
- [ ] Responsive: Push/SMS columns collapse on mobile (< `sm` breakpoint)
- [ ] Hash anchor support: `#notifications` scrolls to component on mount (for email footer links)
- [ ] Loading skeleton shown during settings fetch
- [ ] Component's internal `UserSettings` interface updated with all new fields
- [ ] `'use client'` directive present on line 1
- [ ] No `any` types in production code
- [ ] Existing component test file (`src/components/__tests__/NotificationSettings.test.tsx`) updated for redesigned UI
- [ ] Existing API test file (`src/__tests__/api/user-settings.test.ts`) extended with new field tests
- [ ] RTM updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `make db-sync` used instead of `prisma migrate dev` — DB had accumulated schema drift from Stories 10.4/10.5 without migrations; `migrate dev` attempted a reset. `db-sync` (deploy + push) applied the single new field safely.
- `SettingsPage.test.tsx` required `jest.mock('@/components/ToastContainer')` after redesigned `NotificationSettings` started calling `useToast()` which requires `ToastProvider` in component tree.
- Story spec referenced `notifyPriceDrops` for "Price Change Alert" but Story 10.5 added `notifyPriceChanges`; used `notifyPriceDrops` as spec directs (UI field).
- Phase 2 push/SMS: Stories 11.1/11.2 had already implemented full push/SMS globally; preserved those sections and added "Coming Soon" columns only to per-event-type table.
- Code review (2026-04-10): `saveSettings()` was missing a catch block — errors were silently swallowed. Fixed by adding catch + error toast + boolean return value. `handleColdHoursBlur`/`handleHotCountBlur` were synchronous and showed success toast before save resolved; made async with conditional toast. PATCH response was missing `user` object (inconsistency with GET shape); added. Acceptance test threshold validation assertions used trivial string matching; replaced with regex patterns.

### Completion Notes List

- All 6 tasks implemented. 81 API tests + 28 component tests, all passing, zero regressions.
- `notifyListingUnavailable` was the only new schema field — all other Story 10.6 fields were pre-added by Stories 10.4 and 10.5.
- `src/components/NotificationSettings.tsx` fully redesigned: category-based table (Flip Lifecycle, Communication, Smart Alerts, Monitoring, Digest), optimistic toggle with toast rollback, threshold inputs, WCAG AA accessibility, loading skeleton, hash-anchor scroll.
- 8 source-inspection BDD scenarios added to E-010 feature file (@E-010-S-50 through @E-010-S-57), all passing.
- RTM updated: FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-12 now "Covered" with new scenario tags.
- Code review fixes: `saveSettings()` error handling, async blur handlers, PATCH response shape parity, acceptance test assertion quality.

### File List

**Modified:**
- `prisma/schema.prisma` — added `notifyListingUnavailable Boolean @default(true)`
- `app/api/user/settings/route.ts` — added `notifyListingUnavailable` to GET/PATCH handlers; PATCH response now includes `user` object for shape parity with GET
- `src/components/NotificationSettings.tsx` — full redesign; code review fixes: `saveSettings()` catch block + boolean return, async blur handlers, `notifyFrequency` synced from server response
- `src/__tests__/api/user-settings.test.ts` — extended with 9 new Story 10.6 tests (81 total); added PATCH response shape test
- `src/__tests__/components/SettingsPage.test.tsx` — added ToastContainer mock, updated text assertions
- `src/components/__tests__/NotificationSettings.test.tsx` — complete rewrite (28 tests); added error handling + async blur handler tests
- `test/acceptance/features/E-010-monitoring-email-notifications.feature` — appended @E-010-S-50 through @E-010-S-57
- `test/acceptance/step_definitions/E-010-notification-preferences.steps.ts` — source-inspection steps; threshold validation assertions replaced with regex patterns; company name fixed
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 10-6 status: in-progress → review
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — updated FR-NOTIFY-09/10/12 coverage

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-04-10 | 1.0 | Story implemented: NotificationSettings redesign, notifyListingUnavailable schema field, settings API extension, unit + acceptance tests, RTM updated |
| 2026-04-10 | 1.1 | Code review fixes: saveSettings() silent failure (catch block), async blur handlers (premature success toast), PATCH response user field, acceptance test assertion quality |
