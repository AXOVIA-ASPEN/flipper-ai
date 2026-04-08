# Story 11.3: Multi-Channel Notification Preferences

Status: ready-for-dev
Blocked: true
Blocked-Reason: Depends on Story 10.6 (email notification preferences UI with "Coming Soon" placeholders), Story 11.1 (FCM push notification client — provides device token storage and push delivery), and Story 11.2 (Twilio SMS integration — provides phone verification and SMS delivery). All three must be complete before push/SMS toggles can be activated.
Trello-Card-ID: 69ccace76f14a9d0f264cc25

## Story

As a **user**,
I want three independent toggles (push, email, SMS) per notification event,
So that I can customize exactly how I'm notified for each type of event.

## Acceptance Criteria

1. **AC-1: Three-Toggle UI Per Event Type** — Given the Settings → Notifications page, when Phase 2 is deployed, then each event type row shows three independent toggles: Email, Push, SMS (replacing Story 10.6's "Coming Soon" placeholders).
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-11-3`

2. **AC-2: Independent Channel Selection** — Given the three-toggle UI, when the user enables Push but disables Email and SMS for "Flip Sold", then sold events only trigger push notifications (no email, no SMS).
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-11-3`

3. **AC-3: Multi-Channel Event Routing** — Given any combination of toggles, when an event occurs, then notifications are sent only through the enabled channels for that event type.
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-11-3`

4. **AC-4: Prerequisite-Gated Toggles** — Given a user without push permission or without a verified phone number, when they view the notification preferences, then the respective toggle column is disabled with a tooltip explaining the prerequisite ("Enable push notifications to use this channel" / "Verify your phone number to enable SMS alerts").
   - **FR refs:** FR-NOTIFY-12
   - **Test tags:** `@FR-NOTIFY-12 @story-11-3`

## Tasks / Subtasks

- [ ] Task 1: Add per-event push and SMS preference fields to Prisma schema (AC: #1, #2, #3)
  - [ ] 1.1 Add master channel toggles to `UserSettings` model in `prisma/schema.prisma`:
    - `pushNotifications     Boolean  @default(false)` — Master push toggle (off by default; requires FCM permission)
    - `smsNotifications      Boolean  @default(false)` — Master SMS toggle (off by default; requires verified phone)
  - [ ] 1.2 Add per-event push notification toggle fields (matching existing email toggle field names with `push` prefix):
    - `pushNotifyNewDeals          Boolean @default(true)` — Push for new opportunity found
    - `pushNotifySoldItems         Boolean @default(true)` — Push for flip lifecycle (purchased/shipped/sold)
    - `pushNotifyMessageReceived   Boolean @default(true)` — Push for seller reply received
    - `pushNotifyDraftReady        Boolean @default(true)` — Push for AI draft ready
    - `pushNotifyMessageSent       Boolean @default(false)` — Push for message sent (default OFF, low urgency)
    - `pushNotifyReviewReceived    Boolean @default(true)` — Push for review received
    - `pushNotifyFlipGoneCold      Boolean @default(true)` — Push for flip gone cold
    - `pushNotifyFlipTurnedHot     Boolean @default(true)` — Push for flip turned hot
    - `pushNotifyPriceDrops        Boolean @default(true)` — Push for price change alert
    - `pushNotifyExpiring          Boolean @default(true)` — Push for listing expiring
    - `pushNotifyListingUnavailable Boolean @default(true)` — Push for listing unavailable
    - `pushNotifyWeeklyDigest      Boolean @default(false)` — Push for weekly digest (default OFF — digest is better as email)
  - [ ] 1.3 Add per-event SMS notification toggle fields (matching with `sms` prefix):
    - `smsNotifyNewDeals           Boolean @default(true)` — SMS for new opportunity found
    - `smsNotifySoldItems          Boolean @default(true)` — SMS for flip lifecycle
    - `smsNotifyMessageReceived    Boolean @default(true)` — SMS for seller reply received
    - `smsNotifyDraftReady         Boolean @default(false)` — SMS for AI draft ready (default OFF — too frequent)
    - `smsNotifyMessageSent        Boolean @default(false)` — SMS for message sent (default OFF)
    - `smsNotifyReviewReceived     Boolean @default(true)` — SMS for review received
    - `smsNotifyFlipGoneCold       Boolean @default(true)` — SMS for flip gone cold
    - `smsNotifyFlipTurnedHot      Boolean @default(true)` — SMS for flip turned hot
    - `smsNotifyPriceDrops         Boolean @default(false)` — SMS for price change (default OFF — too frequent)
    - `smsNotifyExpiring           Boolean @default(false)` — SMS for listing expiring (default OFF — low urgency for SMS)
    - `smsNotifyListingUnavailable Boolean @default(false)` — SMS for listing unavailable (default OFF)
    - `smsNotifyWeeklyDigest       Boolean @default(false)` — SMS for weekly digest (default OFF — digest is email-only by default)
  - [ ] 1.4 Run `npx prisma migrate dev --name add_push_sms_notification_preferences` to generate migration
  - [ ] 1.5 Verify: all push fields default to true (except `pushNotifyMessageSent`, `pushNotifyWeeklyDigest`), SMS fields are more conservative with more defaults OFF (high-frequency events default OFF for SMS to avoid alert fatigue)

- [ ] Task 2: Update Settings API to accept push/SMS toggle fields (AC: #1, #2, #3)
  - [ ] 2.1 In `app/api/user/settings/route.ts` PATCH handler, add Boolean coercion for master toggles using established pattern (lines 202-222):
    ```typescript
    if (pushNotifications !== undefined) {
      updateData.pushNotifications = Boolean(pushNotifications);
    }
    if (smsNotifications !== undefined) {
      updateData.smsNotifications = Boolean(smsNotifications);
    }
    ```
  - [ ] 2.2 Add Boolean coercion for ALL 24 per-event toggle fields (12 push + 12 SMS). Follow the exact same pattern as existing email toggles. Use a loop or mapping to avoid 48 lines of repetitive coercion code:
    ```typescript
    const pushSmsToggleFields = [
      'pushNotifyNewDeals', 'pushNotifySoldItems', 'pushNotifyMessageReceived',
      'pushNotifyDraftReady', 'pushNotifyMessageSent', 'pushNotifyReviewReceived',
      'pushNotifyFlipGoneCold', 'pushNotifyFlipTurnedHot', 'pushNotifyPriceDrops',
      'pushNotifyExpiring', 'pushNotifyListingUnavailable', 'pushNotifyWeeklyDigest',
      'smsNotifyNewDeals', 'smsNotifySoldItems', 'smsNotifyMessageReceived',
      'smsNotifyDraftReady', 'smsNotifyMessageSent', 'smsNotifyReviewReceived',
      'smsNotifyFlipGoneCold', 'smsNotifyFlipTurnedHot', 'smsNotifyPriceDrops',
      'smsNotifyExpiring', 'smsNotifyListingUnavailable', 'smsNotifyWeeklyDigest',
    ] as const;
    for (const field of pushSmsToggleFields) {
      if (body[field] !== undefined) {
        updateData[field] = Boolean(body[field]);
      }
    }
    ```
  - [ ] 2.3 Ensure GET handler returns all new fields (Prisma returns all fields by default — verify all 26 new fields appear in response)
  - [ ] 2.4 **DO NOT** add separate API endpoints for push/SMS settings — everything goes through the existing `/api/user/settings` route

- [ ] Task 3: Update NotificationSettings component — activate Push and SMS toggles (AC: #1, #2, #4)
  - [ ] 3.1 In `src/components/NotificationSettings.tsx`, update the `UserSettings` interface to include all 26 new fields (2 master + 12 push + 12 SMS)
  - [ ] 3.2 Update the `NOTIFICATION_EVENT_TYPES` config array (created by Story 10.6) to include `pushField` and `smsField` properties per event type:
    ```typescript
    {
      displayName: 'New Opportunity Found',
      emailField: 'notifyNewDeals',
      pushField: 'pushNotifyNewDeals',
      smsField: 'smsNotifyNewDeals',
      category: 'flip-lifecycle',
    }
    ```
  - [ ] 3.3 Replace the "Coming Soon" placeholder columns (Story 10.6's disabled/grayed-out toggles) with REAL functional toggles. The table header row changes from `Email | Push (Coming Soon) | SMS (Coming Soon)` to `Email | Push | SMS`
  - [ ] 3.4 Each push and SMS toggle saves immediately on change via PATCH `/api/user/settings`, using the same optimistic update + rollback + toast pattern established by email toggles in Story 10.6:
    ```typescript
    const previousSettings = { ...settings };
    setSettings({ ...settings, [field]: newValue }); // optimistic
    try { await saveSettings({ [field]: newValue }); }
    catch { setSettings(previousSettings); showToast({ type: 'error', ... }); }
    ```
  - [ ] 3.5 Add master toggle rows for Push and SMS channels (similar to existing `emailNotifications` master toggle):
    - **Push Master Toggle**: `pushNotifications` — when OFF, all push toggles below are visually disabled (`opacity-50 cursor-not-allowed`), with info text: "Enable push notifications above to configure individual push preferences"
    - **SMS Master Toggle**: `smsNotifications` — when OFF, all SMS toggles disabled, with info text: "Enable SMS notifications above to configure individual SMS preferences"
  - [ ] 3.6 **Prerequisite gating (AC-4):**
    - **Push column disabled when no permission**: Fetch push permission status via `Notification.permission` browser API (from Story 11.1). If permission is not `'granted'`, disable ALL push toggles with tooltip: "Enable push notifications in your browser to use this channel". Master push toggle should prompt browser permission request on enable.
    - **SMS column disabled when no verified phone**: Fetch `phoneVerified` status from `/api/user/settings` response (added by Story 11.2). If `phoneVerified` is false/null, disable ALL SMS toggles with tooltip: "Verify your phone number in Settings to enable SMS alerts"
  - [ ] 3.7 Mobile responsive: On screens < `sm` breakpoint, show all three toggle columns but with abbreviated headers (E / P / S) or use icon-only headers (mail icon, bell icon, phone icon)
  - [ ] 3.8 **WCAG AA Accessibility** (NFR-UX-02):
    - Push toggles: `aria-label={`Toggle ${eventDisplayName} push notification`}`
    - SMS toggles: `aria-label={`Toggle ${eventDisplayName} SMS notification`}`
    - All toggles: `role="switch"` and `aria-checked={value}`
    - Disabled toggles (prerequisite not met): `aria-disabled="true"` with `title` tooltip explaining prerequisite
    - Tab order: flows Email → Push → SMS for each row, then down to next row
  - [ ] 3.9 Dark mode: follow existing Tailwind dark utilities from Story 10.6 (`dark:bg-gray-800`, `dark:border-gray-600`, `dark:text-gray-300`)

- [ ] Task 4: Unit tests (AC: all)
  - [ ] 4.1 **Extend** `src/__tests__/api/user-settings.test.ts` — add tests for push/SMS Boolean toggle fields:
    - PATCH `pushNotifications: true` → `mockUpdateSettings` called with `{ pushNotifications: true }`
    - PATCH `pushNotifyNewDeals: false` → saved correctly
    - PATCH `smsNotifications: true` → saved correctly
    - PATCH `smsNotifyFlipGoneCold: false` → saved correctly
    - GET returns all new fields with correct defaults
    - Boolean coercion: string "true" → `true`, string "false" → `false`
  - [ ] 4.2 **Update** `src/components/__tests__/NotificationSettings.test.tsx` — add/update tests:
    - Push and SMS columns render functional toggles (not "Coming Soon")
    - Push master toggle disables individual push toggles
    - SMS master toggle disables individual SMS toggles
    - Push toggles disabled with tooltip when push permission not granted
    - SMS toggles disabled with tooltip when phone not verified
    - Individual push/SMS toggle saves via PATCH
    - Toast notifications shown on save success/failure
  - [ ] 4.3 Maintain Jest coverage thresholds: branches 93%, functions 99%, lines 98%, statements 98%

- [ ] Task 5: Acceptance tests (AC: all)
  - [ ] 5.1 Write Gherkin scenarios in `test/acceptance/features/E-011-push-sms-notifications.feature` (create or append). Continue `@E-011-S-<N>` numbering from Stories 11.1 and 11.2:
    - Scenario: Three independent toggles per event type (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
    - Scenario: Enable push only for an event disables email and SMS (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
    - Scenario: Multi-channel routing sends to enabled channels only (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
    - Scenario: Push toggles disabled without browser permission (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
    - Scenario: SMS toggles disabled without verified phone (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
    - Scenario: Master push toggle gates all push event toggles (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
    - Scenario: Master SMS toggle gates all SMS event toggles (`@E-011-S-<N> @story-11-3 @FR-NOTIFY-12`)
  - [ ] 5.2 Write step definitions in `test/acceptance/step_definitions/E-011-push-sms-notifications.steps.ts` (create or extend)
  - [ ] 5.3 Update RTM at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Architecture & Design Decisions

**Pattern: Per-Event Boolean Fields (Not JSON)**
This story follows the established pattern of individual Boolean columns per toggle (as used by Story 10.6 for email toggles). While 26 new columns seems heavy, it preserves: type-safe Prisma queries, straightforward partial PATCH updates, and zero JSON parsing complexity. The alternative (JSON channel preferences) would break the existing query pattern and require manual type assertions.

**Pattern: Conservative SMS Defaults**
SMS fields use more conservative defaults (more OFF by default) than push/email because: (1) SMS has per-message cost via Twilio, (2) SMS is more intrusive than push/email, (3) high-frequency events (price changes, draft ready, expiring) would cause alert fatigue on SMS. Only high-value events (sold items, new opportunities, seller replies, reviews, cold/hot alerts) default to ON for SMS.

**Pattern: Master Toggle Gating Per Channel**
Three independent master toggles (`emailNotifications`, `pushNotifications`, `smsNotifications`) each gate their respective column of per-event toggles. This means a user can globally disable all push without losing per-event push preferences — re-enabling the master toggle restores their previous per-event selections.

**Pattern: Prerequisite-Based Disabling**
Push toggles are disabled until `Notification.permission === 'granted'` (browser API). SMS toggles are disabled until `phoneVerified === true` (from user settings). This prevents users from configuring channels they can't receive. Tooltips explain prerequisites.

**Relationship to Story 10.6**
Story 10.6 builds the notification preferences UI with:
- Three-column layout (Email | Push "Coming Soon" | SMS "Coming Soon")
- `NOTIFICATION_EVENT_TYPES` config array mapping display names → email fields
- Optimistic toggle saves with rollback
- Master email toggle gating
- Toast notifications for save feedback
- Accessibility (ARIA) attributes

Story 11.3 transforms 10.6's UI by:
1. Replacing "Coming Soon" placeholders with real toggles
2. Adding `pushField` and `smsField` to each event type config entry
3. Adding master push/SMS toggle rows
4. Adding prerequisite-gating logic for push permission and phone verification
5. Adding 26 new schema fields + API validation

**Schema Field Mapping — Complete Three-Channel View**

| UI Display Name | Email Field | Push Field | SMS Field | Default (E/P/S) |
|---|---|---|---|---|
| **Master Toggles** | | | | |
| Email Notifications | `emailNotifications` | — | — | ON/—/— |
| Push Notifications | — | `pushNotifications` | — | —/OFF/— |
| SMS Notifications | — | — | `smsNotifications` | —/—/OFF |
| **Flip Lifecycle** | | | | |
| New Opportunity Found | `notifyNewDeals` | `pushNotifyNewDeals` | `smsNotifyNewDeals` | ON/ON/ON |
| Flip Lifecycle Updates | `notifySoldItems` | `pushNotifySoldItems` | `smsNotifySoldItems` | ON/ON/ON |
| **Communication** | | | | |
| Seller Reply Received | `notifyMessageReceived` | `pushNotifyMessageReceived` | `smsNotifyMessageReceived` | ON/ON/ON |
| AI Draft Ready | `notifyDraftReady` | `pushNotifyDraftReady` | `smsNotifyDraftReady` | ON/ON/OFF |
| Message Sent | `notifyMessageSent` | `pushNotifyMessageSent` | `smsNotifyMessageSent` | OFF/OFF/OFF |
| **Smart Alerts** | | | | |
| Review Received | `notifyReviewReceived` | `pushNotifyReviewReceived` | `smsNotifyReviewReceived` | ON/ON/ON |
| Flip Gone Cold | `notifyFlipGoneCold` | `pushNotifyFlipGoneCold` | `smsNotifyFlipGoneCold` | ON/ON/ON |
| Flip Turned Hot | `notifyFlipTurnedHot` | `pushNotifyFlipTurnedHot` | `smsNotifyFlipTurnedHot` | ON/ON/ON |
| Price Change Alert | `notifyPriceDrops` | `pushNotifyPriceDrops` | `smsNotifyPriceDrops` | ON/ON/OFF |
| **Monitoring** | | | | |
| Listing Expiring | `notifyExpiring` | `pushNotifyExpiring` | `smsNotifyExpiring` | ON/ON/OFF |
| Listing Unavailable | `notifyListingUnavailable` | `pushNotifyListingUnavailable` | `smsNotifyListingUnavailable` | ON/ON/OFF |
| **Digest** | | | | |
| Weekly Digest | `notifyWeeklyDigest` | `pushNotifyWeeklyDigest` | `smsNotifyWeeklyDigest` | ON/OFF/OFF |

**Total: 12 event rows × 3 channels = 36 toggles + 3 master toggles = 39 interactive elements (plus existing frequency selector and threshold inputs from 10.6)**

### Existing Code to Reuse — DO NOT REINVENT

| What | Where | How to Reuse |
|------|-------|-------------|
| **NotificationSettings component** | `src/components/NotificationSettings.tsx` | **MODIFY** — replace "Coming Soon" placeholders with real toggles. Add `pushField`/`smsField` to `NOTIFICATION_EVENT_TYPES`. Add master push/SMS toggles. |
| **Settings API (GET/PATCH)** | `app/api/user/settings/route.ts` | **EXTEND** PATCH handler with loop-based Boolean coercion for 24 push/SMS fields. |
| **Toast system** | `src/components/ToastContainer.tsx` → `useToast()` | Already integrated by Story 10.6. No changes needed. |
| **Optimistic update pattern** | Established in Story 10.6's toggle save logic | Reuse for push/SMS toggles — identical save/rollback/toast pattern. |
| **Accessibility pattern** | Story 10.6's ARIA attributes on email toggles | Extend to push/SMS toggles with channel-specific `aria-label`. |
| **FCM device token check** | Story 11.1's service worker / token API | Use `Notification.permission` browser API to check push capability. |
| **Phone verification status** | Story 11.2's `phoneVerified` field in UserSettings | Fetch from settings API response to gate SMS toggles. |
| **Prisma singleton** | `src/lib/db.ts` → `prisma` | Import `prisma` — NEVER instantiate new PrismaClient. |
| **Error hierarchy** | `src/lib/errors.ts` → `ValidationError` | For any invalid input. Pattern: `throw new ValidationError('...')` caught by `handleError()`. |
| **UserSettings model** | `prisma/schema.prisma` | Extend with 26 new fields. |

### Anti-Patterns — DO NOT DO THESE

- **DO NOT create a separate notification preferences table** — add Boolean fields to existing `UserSettings` model (matches established email toggle pattern)
- **DO NOT use JSON columns for channel preferences** — individual Boolean fields ensure type safety with Prisma and simple partial PATCH updates
- **DO NOT create separate API endpoints for push/SMS settings** — extend the existing `/api/user/settings` PATCH handler
- **DO NOT implement push delivery or SMS sending logic** — Stories 11.1 and 11.2 handle the delivery infrastructure. This story only manages the per-event preference toggles.
- **DO NOT duplicate the notification event type list** — extend the existing `NOTIFICATION_EVENT_TYPES` config array from Story 10.6 with `pushField` and `smsField` properties
- **DO NOT enable push/SMS master toggles by default** — both default to OFF because they require prerequisites (browser permission for push, verified phone for SMS)
- **DO NOT allow toggling push/SMS when prerequisites not met** — disable the entire column with an explanatory tooltip, not just show a warning
- **DO NOT use `any` types** — strict TypeScript. Update the component's `UserSettings` interface with all 26 new fields.
- **DO NOT write 48 lines of individual Boolean coercion in the API** — use a loop over a field name array (see Task 2.2 code pattern)
- **DO NOT forget to update tests** — both API tests and component tests must cover the new fields

### Project Structure Notes

- All changes are within existing files — no new files needed (except migration and acceptance test files)
- Follows the established split directory structure: schema in `prisma/`, API in `app/api/`, components in `src/components/`, tests in `src/__tests__/`
- Path alias: `@/*` → `./src/*`

### Requirement Traceability

| FR | AC | Test Tag |
|---|---|---|
| FR-NOTIFY-12 | AC-1, AC-2, AC-3, AC-4 | `@FR-NOTIFY-12 @story-11-3` |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 11 Stories, Story 11.3]
- [Source: _bmad-output/planning-artifacts/epics.md — FR-NOTIFY-12 definition (line 228)]
- [Source: _bmad-output/implementation-artifacts/10-6-notification-preferences.md — Story 10.6 UI structure, NOTIFICATION_EVENT_TYPES pattern, "Coming Soon" placeholders]
- [Source: _bmad-output/planning-artifacts/architecture.md — Tech stack, Prisma ORM, API patterns]
- [Source: app/api/user/settings/route.ts — Settings API PATCH handler pattern]
- [Source: src/components/NotificationSettings.tsx — Current notification preferences UI]
- [Source: prisma/schema.prisma — UserSettings model schema]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
