# Story 8.4: Message Approval Workflow

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Elicited with all 50 advanced elicitation methods -->

## Story

As a **user**,
I want to review and approve messages before they are sent,
so that I maintain control over all communications with sellers.

## Acceptance Criteria

1. **AC1 — Draft Status on Creation** (FR-COMM-05)
   Given an AI-generated message, when it is created, then its status is set to DRAFT

2. **AC2 — Approve with Optional Approval Gate** (FR-COMM-05)
   Given a DRAFT message, when the user reviews and approves it, then the status transitions to PENDING_APPROVAL (if user has `messageApprovalRequired` enabled in settings) or directly to SENT (if disabled). The `messageApprovalRequired` setting is evaluated at approve-time, not message-creation-time.

3. **AC3 — Confirm Send from Pending** (FR-COMM-05)
   Given a PENDING_APPROVAL message, when the user confirms sending, then the status transitions to SENT with `sentAt` timestamp

4. **AC4 — Dispatch Stub** (FR-COMM-05)
   Given a SENT message, when the dispatch stub is invoked, then it logs the dispatch intent and returns `{ success: true, stub: true }`. The message remains in SENT status. The UI must display "Queued for delivery" (not "Sent") to indicate platform delivery is not yet implemented. Real dispatch is deferred to a future story.

5. **AC5 — Edit Keeps Draft Status** (FR-COMM-05)
   Given a DRAFT message, when the user edits it, then changes are saved and the message remains in DRAFT until approved. Editing is only allowed on DRAFT messages. To edit a PENDING_APPROVAL message, reject it first — reject from PENDING_APPROVAL returns the message to DRAFT (not terminal REJECTED).

## Requirements Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-COMM-05 | AC 1, AC 2, AC 3, AC 4, AC 5 | @FR-COMM-05 @story-8-4 |

## Tasks / Subtasks

**Implementation order matters — follow this sequence. Do NOT skip ahead.**

- [ ] Task 1: Prisma migration + settings API (AC: 2) — DO FIRST
  - [ ] 1.1 Add to **`UserSettings` model** in `prisma/schema.prisma` (NOT User — all preferences live on UserSettings):
    ```prisma
    messageApprovalRequired Boolean @default(false)
    ```
  - [ ] 1.2 Add compound index to **`Message` model** for approval queue performance:
    ```prisma
    @@index([userId, status, direction])
    ```
  - [ ] 1.3 Verify migration state: run `npx prisma migrate status`. If unapplied migrations exist (e.g., `20260308000000_add_usage_tracking`), run `npx prisma migrate deploy` first
  - [ ] 1.4 Create migration: `npx prisma migrate dev --name add_message_approval_and_index`
  - [ ] 1.5a Expose in `GET /api/user/settings` — add `messageApprovalRequired` to the response `data` object inside the `NextResponse.json()` call (~lines 50-85, after `holdingCostDailyRate`). This route uses explicit field enumeration.
  - [ ] 1.5b Expose in `PATCH /api/user/settings` — add `messageApprovalRequired` to the destructuring at ~line 101
  - [ ] 1.5c Add conditional setter in PATCH: `if (messageApprovalRequired !== undefined) { updateData.messageApprovalRequired = Boolean(messageApprovalRequired); }` (~line 155)
  - [ ] 1.5d Add `messageApprovalRequired` to the PATCH response object (~line 262)
  - [ ] 1.6 Create `src/components/MessagingSettings.tsx` as Client Component (pattern: `ScoringSettings.tsx`). Toggle label: "Two-step send confirmation". Description: "When enabled, messages require an additional confirmation step after approval before being sent." When disabling with orphaned PENDING_APPROVAL messages, show info: "N messages still pending confirmation."
  - [ ] 1.7 Import `MessagingSettings` into `app/settings/page.tsx` (Server Component — toggles must be separate Client Components)

- [ ] Task 2: Create message dispatch stub (AC: 4) — BEFORE Task 3 (Task 3 imports this)
  - [ ] 2.1 Create `src/lib/message-dispatcher.ts` — define `DispatchResult` type and `dispatchMessage` function:
    ```typescript
    export interface DispatchResult { success: boolean; stub: boolean; error?: string }
    export async function dispatchMessage(messageId: string): Promise<DispatchResult> {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) { console.warn(`[message-dispatcher] Message ${messageId} not found`); return { success: false, stub: true, error: 'not_found' }; }
      if (message.status !== 'SENT') { console.warn(`[message-dispatcher] Message ${messageId} not SENT`); return { success: false, stub: true, error: 'invalid_status' }; }
      // STUB — Replace with real platform dispatch (Craigslist email relay, eBay API, etc.)
      // WARNING: Fire-and-forget is stub-only. Real dispatch needs a durable job queue with retry and FAILED_DISPATCH status.
      console.log(`[message-dispatcher] STUB: Would dispatch ${messageId} to ${message.platform} for ${message.sellerName}`);
      return { success: true, stub: true };
    }
    ```
  - [ ] 2.2 Does NOT update message status. Does NOT import OpenAI. Does NOT generate content.
  - [ ] 2.3 Validates `message.status === 'SENT'` before dispatching. Returns failure (not throw) for not-found or invalid status.

- [ ] Task 3: Update `PATCH /api/messages/:id` for two-step approval (AC: 2, 3, 5)
  - [ ] 3.0 **Add imports** at top of file:
    ```typescript
    import { checkFeatureAccess } from '@/lib/tier-enforcement';
    import { dispatchMessage } from '@/lib/message-dispatcher';
    ```
    Ensure `ConflictError` is in the errors import.
  - [ ] 3.1 Add `'confirm'` to `validActions` at line 71: `['approve', 'edit', 'reject', 'confirm']`
  - [ ] 3.2 Convert the invalid-action check (lines 73-76) from raw `NextResponse.json({ error })` to `throw new ValidationError(...)` for consistent error format through `handleError()`
  - [ ] 3.3 **Delete** the `modifiableStatuses` array and its `if` check entirely (lines 80-86). Replaced by per-action validation.
  - [ ] 3.4 **Add user+tier lookup** after ownership check, before switch:
    ```typescript
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
    const userTier = user?.subscriptionTier;
    ```
  - [ ] 3.5 Implement per-action switch cases (see code sample below). Key behaviors:
    - `approve`: DRAFT only. Check tier. Load `messageApprovalRequired` from UserSettings. Route to PENDING_APPROVAL or SENT.
    - `confirm`: PENDING_APPROVAL only. Check tier. Transition to SENT.
    - `edit`: DRAFT only. Sanitize input. Reject empty body.
    - `reject`: DRAFT → REJECTED (terminal). PENDING_APPROVAL → DRAFT (recoverable).
  - [ ] 3.6 **Atomic update**: Use `prisma.message.updateMany({ where: { id, userId, status: expectedStatus }, data: updateData })` and check `result.count === 0` → throw `ConflictError`. Then `findUnique` with include for response. (Prisma `update()` does NOT support non-PK in `where` — `updateMany` is required for atomic status guard.)
  - [ ] 3.7 Fire-and-forget dispatcher after SENT: `dispatchMessage(id).catch(err => console.error('[dispatch]', err))` — do NOT await.
  - [ ] 3.8 Return `nextAction: 'confirm'` when landing in PENDING_APPROVAL, `null` otherwise.
  - [ ] 3.9 Tier enforcement: `checkFeatureAccess(userTier, 'messaging')` for approve/confirm. Return 403 for FREE tier.
  - [ ] 3.10 Input sanitization for edit: strip HTML tags, max 2000 body / 200 subject, reject empty/whitespace body.

- [ ] Task 4: Fix `POST /api/messages/route.ts` OUTBOUND default (AC: 1)
  - [ ] 4.1 Change line 117: default OUTBOUND status from `'PENDING_APPROVAL'` to `'DRAFT'`
  - [ ] 4.2 Search codebase for all callers of `POST /api/messages` to confirm none depend on the old default

- [ ] Task 5: Add comma-separated status support to GET route (AC: 1, 2, 3)
  - [ ] 5.1 In `app/api/messages/route.ts` GET handler (~line 30): if `status` contains comma, split into array and use `{ status: { in: statuses } }` in Prisma where. Single-status continues to work.
  - [ ] 5.2 This enables the approval tab to use a single fetch: `?status=DRAFT,PENDING_APPROVAL&direction=OUTBOUND` — fixing pagination accuracy and reducing network requests from 2 to 1.

- [ ] Task 6: Create `MessageApprovalCard` component (AC: 1, 2, 3, 5)

  **Do NOT begin until Tasks 1-5 are complete and `make test` passes.**

  - [ ] 6.1 Build card layout: listing thumbnail, platform icon, subject, body snippet (`line-clamp-2`), status badge, action buttons. **Render body and subject as plain text content only — no raw HTML rendering.**
  - [ ] 6.2 Derive buttons from `message.status` — exhaustive switch:
    - DRAFT: "Approve & Send" (or "Approve" if `messageApprovalRequired` is true), "Edit", "Reject"
    - PENDING_APPROVAL: "Confirm Send" (primary `bg-blue-600`), "Edit" (returns to DRAFT via reject first), "Reject" (returns to DRAFT)
    - SENT: "Queued for delivery" label with clock icon + `sentAt` timestamp. No action buttons.
    - DELIVERED/REJECTED: no action buttons (read-only)
  - [ ] 6.3 Status badge — create `src/lib/message-constants.ts` with shared `STATUS_COLORS` map including `PENDING_APPROVAL: 'bg-amber-200 text-amber-700'`, `REJECTED: 'bg-red-200 text-red-700'`. **Update `app/messages/page.tsx` to import from `@/lib/message-constants` and delete local `STATUS_COLORS` (lines 34-41).**
  - [ ] 6.4 Inline edit: `<textarea>` with auto-resize (`min-h-[100px] max-h-[300px]`). Character count (2000 body, 200 subject). Disable Save when empty. When `isEditing`, hide approve/confirm/reject buttons.
  - [ ] 6.5 "Reject" confirmation: button text changes to "Confirm Reject?" with **5-second** auto-revert. After successful reject from DRAFT, show toast: "Message rejected." After reject from PENDING_APPROVAL, show toast: "Message returned to draft for editing."
  - [ ] 6.6 Disable action buttons during API call. Use `useRef(false)` as immediate double-click guard in handler. Track `loadingAction: 'approve' | 'confirm' | 'edit' | 'reject' | null` to show spinner on the active button.
  - [ ] 6.7 Handle null listing: "Original listing no longer available" placeholder. Keep action buttons functional.
  - [ ] 6.8 Stale listing detection: if `listing` exists and `listing.updatedAt > message.createdAt`, show yellow warning: "Listing updated since this message was drafted."
  - [ ] 6.9 "Copy Message" button: `navigator.clipboard.writeText(message.body)` — essential while dispatcher is a stub.
  - [ ] 6.10 Mobile layout: `flex-col md:flex-row` for buttons. Order on mobile: Edit (top), Approve (middle, primary), Reject (bottom, with gap). Min touch target `min-h-[44px]`, `gap-3`.
  - [ ] 6.11 Props: `message: Message & { listing: Listing | null }`, `onApprove`, `onConfirm`, `onEdit`, `onReject`, `loadingAction`, `messageApprovalRequired: boolean`

- [ ] Task 7: Integrate approval queue into messages page (AC: 1, 2, 3)
  - [ ] 7.1 Add "Approval" tab to `app/messages/page.tsx`. Tab type: `'all' | 'inbox' | 'outbox' | 'approval'`. Display as `"Approval (N)"`.
  - [ ] 7.2 Fetch: `GET /api/messages?status=DRAFT,PENDING_APPROVAL&direction=OUTBOUND&sortBy=createdAt&sortOrder=desc` (single call via Task 5). Pagination: page size 20, "Load more".
  - [ ] 7.3 Render `MessageApprovalCard` per message. Wire handlers.
  - [ ] 7.4 On success: optimistically remove card (`setMessages(prev => prev.filter(m => m.id !== id))`), decrement count. Full refetch only on error/409.
  - [ ] 7.5 Errors: 409 → "Message already updated. Refreshing..." + refetch. 403 → "Plan does not include messaging. Upgrade." 401 → redirect `/login`. Other → toast.
  - [ ] 7.6 On approve returning `nextAction: 'confirm'` → toast "Message approved. Confirm to send." Update card status locally.
  - [ ] 7.7 Count badge: fetch with `limit=0` on page mount for `pagination.total`.
  - [ ] 7.8 Empty state: "No messages pending approval. Find items to flip" → `/opportunities`.
  - [ ] 7.9 Use `fetch` + `useState` + `useCallback`. Do NOT introduce SWR.
  - [ ] 7.10 FREE tier: disable buttons, show `UpgradePrompt` banner.
  - [ ] 7.11 If approval logic > 100 lines, extract to `src/components/ApprovalQueue.tsx`.

  **CHECKPOINT: Run `make dev` and verify Approval tab renders before proceeding to tests.**

- [ ] Task 8: Write unit tests (AC: 1-5)
  - [ ] 8.1 `src/__tests__/components/MessageApprovalCard.test.tsx`
    - **`/** @jest-environment jsdom */` docblock at top**
    - Mock: `jest.fn()` for callbacks. `@testing-library/react` for render.
    - Assert: (a) DRAFT renders Approve/Edit/Reject, not Confirm; (b) PENDING_APPROVAL renders Confirm/Reject, not Approve; (c) SENT shows "Queued for delivery", no buttons; (d) REJECTED: no buttons; (e) Edit toggles textarea; (f) status badge colors; (g) null listing placeholder; (h) stale listing warning; (i) Copy button calls clipboard
  - [ ] 8.2 `src/__tests__/components/ApprovalQueue.test.tsx` (or messages page approval tab test)
    - **`/** @jest-environment jsdom */` docblock**
    - Mock `global.fetch` with `jest.spyOn(global, 'fetch')`.
    - Assert: (a) fetch with `status=DRAFT,PENDING_APPROVAL`; (b) renders cards; (c) empty state; (d) count badge; (e) error retry
  - [ ] 8.3a **Update `src/__tests__/api/messages-id.test.ts`** — extend mock factory:
    ```typescript
    userSettings: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    message: { findFirst: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    ```
    `beforeEach`: `mockPrisma.userSettings.findUnique.mockResolvedValue({ messageApprovalRequired: false })`, `mockPrisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' })`, `mockPrisma.message.updateMany.mockResolvedValue({ count: 1 })`
  - [ ] 8.3b Verify existing approve test (~line 116) still passes with new defaults: `status: 'SENT'`
  - [ ] 8.3c Test: `messageApprovalRequired: true` → approve → `PENDING_APPROVAL`, no `sentAt`
  - [ ] 8.3d Test: `confirm` on PENDING_APPROVAL → SENT with `sentAt`
  - [ ] 8.3e Test: `confirm` on DRAFT → 409 ConflictError
  - [ ] 8.3f Test: `approve` on PENDING_APPROVAL → 409 ConflictError
  - [ ] 8.3g Test: `edit` on PENDING_APPROVAL → 409 ConflictError
  - [ ] 8.3h Test: edit with empty body → 400 ValidationError
  - [ ] 8.3i Test: `confirm` accepted by validActions (does NOT return "invalid action")
  - [ ] 8.3j Test: race condition — `updateMany` returns `count: 0` → 409 ConflictError
  - [ ] 8.3k **Delete** "allows PENDING messages to be approved" test (~line 190) — phantom status
  - [ ] 8.3l Test: `reject` on PENDING_APPROVAL → returns to DRAFT (not REJECTED)
  - [ ] 8.4 `src/__tests__/lib/message-dispatcher.test.ts` — (a) loads message; (b) logs dispatch; (c) returns `{ success: true, stub: true }`; (d) does NOT update status; (e) returns failure for non-existent; (f) returns failure for non-SENT
  - [ ] 8.5 In `src/__tests__/api/user-settings.test.ts`: GET includes field; PATCH persists; default `false`
  - [ ] 8.6 In `src/__tests__/api/messages.test.ts`: OUTBOUND defaults to DRAFT; multi-status `?status=DRAFT,PENDING_APPROVAL` returns union
  - [ ] 8.7 In `src/__tests__/api/user-settings.test.ts`: toggle change does NOT auto-transition existing PENDING_APPROVAL

- [ ] Task 9: Write acceptance tests (AC: 1-5)
  - [ ] 9.1 Check current highest `@E-008-S-N` in feature file. Start from next available.
  - [ ] 9.2 Add scenarios for all ACs. Tag: `@epic-8 @story-8-4 @FR-COMM-05 @E-008-S-{N}`
  - [ ] 9.3 Create `test/acceptance/step_definitions/E-008-message-approval.steps.ts`
  - [ ] 9.4 Tag AC4 scenarios with `@stub`

- [ ] Task 10: Update traceability matrix
  - [ ] 10.1 Update FR-COMM-05 in `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Existing Infrastructure — DO NOT Recreate

| What | File | Key Details |
|---|---|---|
| Message model | `prisma/schema.prisma` (~lines 288-312) | status default DRAFT, listingId nullable, no cascade |
| Message CRUD | `app/api/messages/route.ts` | **POST defaults OUTBOUND to PENDING_APPROVAL (Task 4 fixes)**. GET supports single status (Task 5 adds multi) |
| Message actions | `app/api/messages/[id]/route.ts` | `validActions` line 71 (add `confirm`). `modifiableStatuses` line 80 (DELETE). Lines 73-76 raw error (convert to throw). **No tier check exists — add** |
| AI generation | `app/api/messages/generate/route.ts` | Creates DRAFT. Tier-gated. **DO NOT duplicate** |
| Generator lib | `src/lib/message-generator.ts` | **Dispatcher must NOT import this** |
| Auth | `src/lib/auth-middleware.ts` | `getAuthUserId()` → Prisma user ID |
| Tier enforcement | `src/lib/tier-enforcement.ts` | `checkFeatureAccess(tier, 'messaging')` |
| Errors | `src/lib/errors.ts` | `ValidationError`, `ForbiddenError`, `ConflictError`, `handleError()` |
| Settings API | `app/api/user/settings/route.ts` | **Explicit field enumeration** GET (~50-85), PATCH (~101, ~155, ~262) |
| Messages page | `app/messages/page.tsx` | Tabs: All/Inbox/Outbox. `STATUS_COLORS` lines 34-41 (missing PENDING_APPROVAL, REJECTED) |
| UpgradePrompt | `src/components/UpgradePrompt.tsx` | Reuse for FREE tier |

### Status Flow

```
DRAFT ──approve──> SENT                      (approval setting OFF)
DRAFT ──approve──> PENDING_APPROVAL ──confirm──> SENT  (approval setting ON)
DRAFT ──edit────> DRAFT                      (update body/subject)
DRAFT ──reject──> REJECTED                   (terminal)
PENDING_APPROVAL ──reject──> DRAFT           (recoverable — can edit and re-approve)
SENT: stub logs intent. UI shows "Queued for delivery".
```

**Invariants:**
- `approve` only on DRAFT. `confirm` only on PENDING_APPROVAL. `edit` only on DRAFT.
- `reject` from DRAFT = terminal REJECTED. `reject` from PENDING_APPROVAL = back to DRAFT.
- Status mismatches throw `ConflictError` (409), not `ValidationError` (422).
- `null` UserSettings → `messageApprovalRequired` defaults `false`.

### PATCH Route Code Sample

```typescript
// NEW IMPORTS:
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { dispatchMessage } from '@/lib/message-dispatcher';
// Ensure ConflictError in errors import

// Line 71:
const validActions = ['approve', 'edit', 'reject', 'confirm'];

// Lines 73-76 — normalize:
if (!validActions.includes(action)) {
  throw new ValidationError(`Invalid action: ${action}. Must be: ${validActions.join(', ')}`);
}

// DELETE lines 80-86 (modifiableStatuses) entirely.

// User+tier lookup (after ownership check):
const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
const userTier = user?.subscriptionTier;

let updateData: Record<string, unknown> = {};
const expectedStatus = existing.status;

switch (action) {
  case 'approve': {
    if (existing.status !== 'DRAFT') throw new ConflictError('Can only approve DRAFT messages');
    const tierCheck = checkFeatureAccess(userTier, 'messaging');
    if (!tierCheck.allowed) throw new ForbiddenError(tierCheck.reason || 'Messaging requires Flipper plan');
    const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { messageApprovalRequired: true } });
    // null settings = new user = no approval gate
    if (settings?.messageApprovalRequired) {
      updateData = { status: 'PENDING_APPROVAL' };
    } else {
      updateData = { status: 'SENT', sentAt: new Date() };
    }
    break;
  }
  case 'confirm': {
    if (existing.status !== 'PENDING_APPROVAL') throw new ConflictError('Only PENDING_APPROVAL messages can be confirmed');
    const tierCheck = checkFeatureAccess(userTier, 'messaging');
    if (!tierCheck.allowed) throw new ForbiddenError(tierCheck.reason || 'Messaging requires Flipper plan');
    updateData = { status: 'SENT', sentAt: new Date() };
    break;
  }
  case 'edit': {
    if (existing.status !== 'DRAFT') throw new ConflictError('Can only edit DRAFT messages');
    if (newBody === undefined && newSubject === undefined) throw new ValidationError('Edit requires body or subject');
    if (newBody !== undefined && newBody.trim() === '') throw new ValidationError('Message body cannot be empty');
    const sanitizedBody = newBody ? newBody.replace(/<[^>]*>/g, '').slice(0, 2000) : undefined;
    const sanitizedSubject = newSubject ? newSubject.replace(/<[^>]*>/g, '').slice(0, 200) : undefined;
    updateData = { ...(sanitizedBody && { body: sanitizedBody }), ...(sanitizedSubject && { subject: sanitizedSubject }), status: 'DRAFT' };
    break;
  }
  case 'reject': {
    if (existing.status === 'DRAFT') {
      updateData = { status: 'REJECTED' }; // Terminal
    } else if (existing.status === 'PENDING_APPROVAL') {
      updateData = { status: 'DRAFT' }; // Recoverable — can edit and re-approve
    } else {
      throw new ConflictError(`Cannot reject message with status: ${existing.status}`);
    }
    break;
  }
}

// ATOMIC UPDATE (updateMany supports non-PK in where; update() does NOT):
const result = await prisma.message.updateMany({ where: { id, userId, status: expectedStatus }, data: updateData });
if (result.count === 0) throw new ConflictError('Message status changed. Refresh and try again.');

// Fetch updated record for response:
const updated = await prisma.message.findUnique({
  where: { id },
  include: { listing: { select: { id: true, title: true, platform: true, askingPrice: true, updatedAt: true } } },
});

// Fire-and-forget dispatch:
if (updated?.status === 'SENT') {
  dispatchMessage(id).catch(err => console.error('[dispatch]', err));
}

return NextResponse.json({ success: true, data: updated, action, nextAction: updated?.status === 'PENDING_APPROVAL' ? 'confirm' : null });
```

### Testing Mock Factory

```typescript
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: { findFirst: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    userSettings: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));
// beforeEach defaults:
mockPrisma.userSettings.findUnique.mockResolvedValue({ messageApprovalRequired: false });
mockPrisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
```

### Project Structure

**New files:**
- `src/components/MessageApprovalCard.tsx`
- `src/components/MessagingSettings.tsx`
- `src/components/ApprovalQueue.tsx` (if >100 lines)
- `src/lib/message-dispatcher.ts`
- `src/lib/message-constants.ts`
- `src/__tests__/components/MessageApprovalCard.test.tsx`
- `src/__tests__/components/ApprovalQueue.test.tsx`
- `src/__tests__/lib/message-dispatcher.test.ts`
- `test/acceptance/step_definitions/E-008-message-approval.steps.ts`

**Modified files:**
- `prisma/schema.prisma` — `messageApprovalRequired` on UserSettings + compound index on Message
- `app/api/messages/[id]/route.ts` — confirm, per-action guards, tier, updateMany, sanitization, dispatch
- `app/api/messages/route.ts` — fix OUTBOUND default + multi-status GET
- `app/api/user/settings/route.ts` — expose `messageApprovalRequired`
- `app/messages/page.tsx` — Approval tab, import STATUS_COLORS from shared constant
- `app/settings/page.tsx` — import MessagingSettings
- `src/__tests__/api/messages-id.test.ts` — mock factory, new tests, delete phantom test
- `src/__tests__/api/user-settings.test.ts` — messageApprovalRequired tests
- `src/__tests__/api/messages.test.ts` — OUTBOUND default + multi-status tests

### Known Limitations & Future Work

- **Batch approve/reject**: Deferred. Individual review forces users to read AI content.
- **Real dispatch**: DELIVERED deferred. When replacing stub, implement retry queue + FAILED_DISPATCH status.
- **Undo reject from DRAFT**: Terminal by design. "Copy Message" button is the workaround.
- **Auto-approve by confidence**: Future — route standard inquiries to auto-send, queue only negotiations.
- **Keyboard shortcuts**: Out of scope for this story.
- **Team/multi-user approval**: Out of scope. Setting is per-user.

## Definition of Done

- [ ] All 5 ACs have acceptance test scenarios in the epic feature file
- [ ] Every scenario tagged with `@E-008-S-<N>`, `@story-8-4`, and `@FR-COMM-05`
- [ ] Requirements traceability matrix updated for FR-COMM-05
- [ ] All acceptance test scenarios pass
- [ ] All unit/integration tests pass (including updated existing approve test)
- [ ] Build succeeds (`make build`)
- [ ] No regressions in existing test suite
- [ ] Prisma migration applied (field + compound index)
- [ ] Coverage thresholds maintained
- [ ] POST route OUTBOUND default fixed to DRAFT
- [ ] GET route supports comma-separated status
- [ ] STATUS_COLORS shared and includes all statuses
- [ ] SENT messages display "Queued for delivery"
- [ ] Phantom PENDING test deleted
- [ ] Reject from PENDING_APPROVAL returns to DRAFT

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
