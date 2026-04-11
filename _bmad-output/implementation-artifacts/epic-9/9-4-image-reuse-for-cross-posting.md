# Story 9.4: Image Reuse for Cross-Posting

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69d6b00fc22b0918cdd24565

## Story

As a **user**,
I want my stored listing images automatically attached when cross-posting,
So that I don't need to re-upload or re-download images for each platform.

## Acceptance Criteria

1. **AC-1: Automatic image attachment from Firebase Storage**
   **Given** a listing with images stored in Firebase Storage (ListingImage records exist)
   **When** the user creates a resale listing for another platform
   **Then** the stored images are automatically attached from Firebase Storage URLs via eager-loaded `listing.images` relation

2. **AC-2: Images retrieved from Firebase Storage during posting**
   **Given** images are reused for cross-posting
   **When** the posting job runs
   **Then** images are retrieved from the eagerly-loaded `listing.images` relation (not re-downloaded from the original listing URL)
   **And** when multiple PostingQueueItems reference the same listing in a batch, images are loaded once per listing (not N+1)

3. **AC-3: Fallback for legacy listings without captured images**
   **Given** the original listing images were not captured (pre-Epic 3 legacy, no ListingImage records)
   **When** the user creates a resale listing
   **Then** if `imageUrls` (legacy JSON field) is populated, the system attempts to download from original URLs using `captureListingImages()` with a per-image timeout of 10 seconds
   **And** if download fails or no URLs exist, the posting queue API response includes `imageStatus: 'manual-upload-required'`
   **And** download failure does NOT fail the queue item — the item remains PENDING and the user can post without images or upload manually

**FRs fulfilled:** FR-RELIST-08

## Requirement Traceability

| FR | AC | Test Tag |
|---|---|---|
| FR-RELIST-08 | AC-1 | @E-009-S-28 @story-9-4 @FR-RELIST-08 |
| FR-RELIST-08 | AC-2 | @E-009-S-29 @story-9-4 @FR-RELIST-08 |
| FR-RELIST-08 | AC-3 | @E-009-S-31 @E-009-S-32 @story-9-4 @FR-RELIST-08 |

## Tasks / Subtasks

- [x] Task 1: Eager-load images in PostingQueueProcessor (AC: 1, 2)
  - [x] 1.1 Update `processQueue()` in `src/lib/posting-queue-processor.ts` to change Prisma query from `include: { listing: true }` to `include: { listing: { include: { images: { orderBy: { imageIndex: 'asc' } } } } }`
  - [x] 1.2 This provides `item.listing.images: ListingImage[]` on every queue item with zero additional queries (single JOIN)
  - [x] 1.3 Use existing `getAllListingImageUrls(item.listing)` from `src/lib/image-helpers.ts` to resolve sorted image URLs with legacy fallback — NO new service file needed

- [x] Task 2: Update PlatformPoster type and pass images to handlers (AC: 1, 2)
  - [x] 2.1 Define `ListingWithImages` type: `Listing & { images: ListingImage[] }` (or import from image-helpers.ts if already defined there)
  - [x] 2.2 Update `PlatformPoster` type signature from `(listing: Listing, queueItem: PostingQueueItem) => Promise<PostingResult>` to `(listing: ListingWithImages, queueItem: PostingQueueItem) => Promise<PostingResult>` — this is non-breaking since existing posters can simply ignore `images`
  - [x] 2.3 In `processItem()`, pass the eagerly-loaded listing (which now includes `images`) directly to the platform poster
  - [x] 2.4 Add ownership assertion at top of `processItem()`: if `item.listing.userId !== item.userId`, mark item FAILED with authorization error (defense-in-depth)

- [x] Task 3: Handle legacy listings without Firebase images (AC: 3)
  - [x] 3.1 In `processItem()`, after images are resolved via `getAllListingImageUrls()`, detect when result is empty
  - [x] 3.2 If listing has `imageUrls` (legacy JSON field) but no `ListingImage` records: attempt download from original URLs using `captureListingImages()` from `src/lib/image-capture.ts` with a **per-image timeout of 10 seconds**
  - [x] 3.3 Download failure must be **non-blocking** — if download fails, log the error and continue posting without images (do NOT fail the queue item)
  - [x] 3.4 If no images available at all (no ListingImage records, no legacy URLs, download failed): proceed with posting (some platforms allow text-only listings) and include `imageStatus` in response

- [x] Task 4: Update posting queue API for image context (AC: 1, 3)
  - [x] 4.1 Update `GET /api/posting-queue` listing select to include `images: { select: { id: true, imageIndex: true, storageUrl: true, contentType: true }, orderBy: { imageIndex: 'asc' } }` alongside existing `imageUrls` field
  - [x] 4.2 Add **computed** `imageStatus` field to API response (NOT a persisted column): `listing.images.length > 0 ? 'available' : listing.imageUrls ? 'legacy-fallback' : 'manual-upload-required'`
  - [x] 4.3 Update `GET /api/posting-queue/[id]` with same image include

- [x] Task 5: Write unit tests (AC: 1, 2, 3)
  - [x] 5.1 Test `processQueue()` with eager-loaded images — verify `listing.images` is populated on each item
  - [x] 5.2 Test `processItem()` passes `ListingWithImages` to platform poster handler
  - [x] 5.3 Test ownership assertion — item with mismatched `userId` is marked FAILED
  - [x] 5.4 Test legacy fallback — triggers `captureListingImages()` when no ListingImage records exist but `imageUrls` is populated
  - [x] 5.5 Test legacy fallback timeout — download attempt that exceeds 10s is aborted gracefully
  - [x] 5.6 Test legacy download failure is non-blocking — queue item continues to POSTED/FAILED based on platform posting, not image download
  - [x] 5.7 Test computed `imageStatus` field in API responses for all three states
  - [x] 5.8 Test batch processing — multiple queue items for same listing do NOT produce redundant image queries
  - [x] 5.9 Coverage target: all 9.4 files at 100% branches/functions/lines/statements. Global branch coverage at 92.61% — pre-existing gap from 9-3 infrastructure, not introduced by 9-4.

- [x] Task 6: Write Gherkin acceptance tests (DoD)
  - [x] 6.1 Write scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
  - [x] 6.2 Tag with `@E-009-S-<N>`, `@story-9-4`, `@FR-RELIST-08`
  - [x] 6.3 Write step definitions in `test/acceptance/step_definitions/E-009-image-reuse.steps.ts`
  - [x] 6.4 Update requirements traceability matrix

## Dev Notes

### Architecture & Patterns

- **Firebase Storage** is fully configured (`src/lib/firebase/storage.ts`). Key functions: `getPublicUrl(storagePath)`, `uploadImageFromUrl()`, `buildStoragePath()`. Storage bucket: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.
- **Image capture** from Epic 3 Story 3-9 is complete (`src/lib/image-capture.ts`). Functions: `captureListingImages()`, `saveImageMetadata()`, `hasExistingImages()`. Uses `Promise.allSettled()` for non-blocking parallel uploads.
- **Image helpers** (`src/lib/image-helpers.ts`) provide `getListingImageUrl()` and `getAllListingImageUrls()` for consistent URL resolution with legacy fallback. These are **pure synchronous functions** that take a pre-loaded `ListingWithImages` object — they do NOT query the database.
- **PostingQueueProcessor** (`src/lib/posting-queue-processor.ts`) uses a registerable handler pattern: `registerPoster(platform, handler)`. The `processItem()` function calls the registered handler. The `processQueue()` already fetches listings with `include: { listing: true }` — extend this to include images.
- **Posting Queue API** is at `app/api/posting-queue/route.ts` (180 lines). Supports single and batch creation. Feature-gated by `ebayCrossListing` subscription tier.

### Architecture Decision: Eager Loading vs New Service File

**Decision: Use eager loading + existing `getAllListingImageUrls()`. Do NOT create a new `cross-post-images.ts` file.**

**Rationale:**
- `image-helpers.ts` is a pure synchronous module (no DB, no async). Creating `getImagesForCrossPost(listingId)` would add a DB-querying async function that duplicates existing logic.
- `processQueue()` already queries with `include: { listing: true }`. Changing to `include: { listing: { include: { images: true } } }` adds images to the listing object with zero additional queries (Prisma generates a JOIN).
- This avoids an N+1 query problem: the story's original plan would have produced one DB query per queue item; eager loading produces zero additional queries regardless of batch size.
- When cross-posting a single listing to 5 platforms, the original plan would query the same listing's images 5 times. Eager loading queries once.
- `getAllListingImageUrls(listing)` already handles sorting by imageIndex and legacy fallback — reusing it is DRY.

### Architecture Decision: Public Firebase Storage URLs

**Decision: Accept public URLs for cross-posting. No signed URLs needed.**

**Rationale:**
- Platform APIs (eBay, Mercari, etc.) require publicly accessible image URLs to attach to listings.
- Firebase Storage URLs are set `public: true` on upload with predictable path structure `{userId}/{platform}/{listingId}/{index}.{ext}`.
- User IDs and listing IDs are cuid values — not easily guessable but not cryptographically random.
- This is acceptable for the current use case. If private images are ever required, signed URLs with expiration would require refactoring the entire image pipeline.

### Architecture Decision: Computed imageStatus

**Decision: `imageStatus` is a computed field in API responses, NOT a persisted database column.**

**Rationale:**
- If stored on PostingQueueItem, it becomes stale when images are uploaded later.
- Computation is trivial: check `listing.images.length > 0` → `'available'`, else check `listing.imageUrls` → `'legacy-fallback'`, else `'manual-upload-required'`.
- Computed at serialization time in the API response.

### Data Models (Prisma)

**ListingImage model** (`prisma/schema.prisma`):
```prisma
model ListingImage {
  id          String   @id @default(cuid())
  listingId   String
  imageIndex  Int
  originalUrl String
  storagePath String
  storageUrl  String
  fileSize    Int
  contentType String
  width       Int?
  height      Int?
  uploadedAt  DateTime @default(now())
  listing     Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@unique([listingId, imageIndex])
  @@index([listingId])
}
```

**PostingQueueItem model** — already has `listingId` FK to `Listing` which has `images: ListingImage[]` relation. Access images via `listing.images` when eagerly loaded.

**Listing model** has both:
- `imageUrls` (String, nullable) — legacy JSON column `["url1", "url2"]`
- `images` (ListingImage[]) — modern Firebase Storage images

**No schema changes required for this story.** All needed models and relations already exist.

### Image Storage Path Convention

`{userId}/{platform}/{listingId}/{imageIndex}.{ext}`

**Note:** `buildStoragePath()` does not sanitize path segments against traversal (`../`). While `platform` comes from DB records (not direct user input), consider adding validation as defense-in-depth in a future hardening pass.

### Feature Gating

Cross-posting requires `ebayCrossListing` feature flag:
- **FREE**: Not allowed
- **FLIPPER**: Allowed
- **PRO**: Allowed

Enforcement in `POST /api/posting-queue` via `checkFeatureAccess()`.

### Error Handling

Use error hierarchy from `src/lib/errors.ts`:
- `ValidationError` — invalid image format/size
- `NotFoundError` — listing not found
- `ConfigurationError` — missing Firebase config
- `ExternalServiceError` — Firebase Storage API failures, legacy URL download failures

**Critical:** Legacy image download failures must NOT propagate as queue item failures. Catch `ExternalServiceError` from `captureListingImages()`, log it, and continue.

### Image Validation (Firebase Storage)

- Allowed content types: `image/jpeg | image/png | image/webp | image/gif`
- Max file size: 5MB
- Magic bytes validation for format verification

### Project Structure Notes

- **Modified files:**
  - `src/lib/posting-queue-processor.ts` — eager load images, update PlatformPoster type, add ownership assertion, add legacy fallback logic
  - `app/api/posting-queue/route.ts` — add images to listing select, add computed `imageStatus`
  - `app/api/posting-queue/[id]/route.ts` — add images to listing select
- **New tests:** `src/__tests__/lib/posting-queue-processor-images.test.ts` (or extend existing test file)
- **New acceptance steps:** `test/acceptance/step_definitions/E-009-image-reuse.steps.ts`
- **Feature file:** `test/acceptance/features/E-009-cross-platform-resale-listing.feature` (create if not exists)
- **NO new service files** — use existing `image-helpers.ts` and `image-capture.ts`

### Dependencies

- **Story 9.3** (Cross-Platform Posting Queue) — currently `backlog`. The posting queue API and processor already exist in code, so this story can proceed, but 9.3's formal implementation may add additional patterns.
- **Story 3.9** (Image Capture & Storage) — `done`. Firebase Storage integration and ListingImage model are complete.
- **Story 1.6** (Firebase Storage Configuration) — `done`. Firebase admin SDK and storage utilities are in place.

### Gotchas & Guardrails

1. **N+1 Prevention:** Do NOT add a separate DB query inside `processItem()` to fetch images. The eager loading in `processQueue()` handles this.
2. **Non-blocking Legacy Fallback:** `captureListingImages()` makes external HTTP requests to potentially-dead URLs. ALWAYS wrap in try/catch with a per-image timeout. NEVER let a download failure block queue processing.
3. **Type Safety:** The `PlatformPoster` type change from `Listing` to `ListingWithImages` is non-breaking — existing poster implementations can ignore the `images` field. But TypeScript will enforce that future posters have access to images.
4. **Orphaned Storage Files:** `ListingImage` has `onDelete: Cascade` on the Listing FK, but cascade only deletes DB records — Firebase Storage files are NOT automatically cleaned up. This is a pre-existing issue, not introduced by this story.
5. **Prisma select vs include:** The GET API routes use `select` (whitelist) for listing fields. Adding images requires nested `select` syntax: `images: { select: { id: true, imageIndex: true, storageUrl: true, contentType: true } }`. Do NOT switch to `include` as it would return all listing fields.

### References

- [Source: src/lib/firebase/storage.ts] — Firebase Storage upload/download/delete utilities
- [Source: src/lib/image-capture.ts] — Image capture with parallel processing and deduplication
- [Source: src/lib/image-helpers.ts] — Image URL resolution with legacy fallback (pure sync, no DB)
- [Source: src/lib/posting-queue-processor.ts] — Queue processor with registerable platform handlers
- [Source: app/api/posting-queue/route.ts] — Posting queue REST API
- [Source: prisma/schema.prisma#ListingImage] — ListingImage model definition
- [Source: prisma/schema.prisma#PostingQueueItem] — PostingQueueItem model definition
- [Source: src/lib/subscription-tiers.ts] — Feature gating for cross-posting
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.4] — Story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md] — Data architecture and deployment patterns

## Definition of Done (DoD)

- [x] All acceptance criteria (AC-1, AC-2, AC-3) are implemented and verified
- [x] All Gherkin acceptance test scenarios are written in `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
- [x] All scenarios tagged with `@E-009-S-<N>`, `@story-9-4`, and `@FR-RELIST-08`
- [x] Requirements traceability matrix updated in `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] Unit tests written for posting-queue-processor image integration and API imageStatus
- [x] No lint errors (`pnpm lint`) — no new errors; 10 pre-existing errors in unrelated files
- [x] All existing tests continue to pass (`pnpm test`) — 4057 passed, 2 skipped, 0 failed
- [x] Coverage: all 9.4 files at 100% branches/functions/lines/statements. Global branch coverage at 92.61% (pre-existing gap from 9-3 infrastructure files, not introduced by this story).

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Fixed logic bug in `processItem()`: originally checked `getAllListingImageUrls()` to trigger legacy fallback, but that helper returns legacy URLs too, so fallback never fired. Fixed to check `item.listing.images.length === 0` instead.
- Removed redundant defensive `if (listing.images.length > 0) return` in `hydrateLegacyImages()` — caller already guards with the same condition.
- Replaced `if (timer)` conditional cleanup with definite-assignment assertion (`let timer!:`) since the Promise executor always runs synchronously, eliminating two uncoverable branches.

### Completion Notes List
- **AC-1 (Automatic image attachment):** `processQueue()` eager-loads `listing.images` via Prisma nested include with `orderBy: { imageIndex: 'asc' }`. Every queue item carries a fully hydrated `ListingWithImages` — zero N+1 queries.
- **AC-2 (Images from eager-loaded relation):** `PlatformPoster` type updated to accept `ListingWithImages`. Existing stub posters are backward-compatible. Single `findMany` serves the entire batch.
- **AC-3 (Legacy fallback):** `hydrateLegacyImages()` downloads from legacy `imageUrls` JSON column via `captureListingImages()` with a budget timeout of 10s per URL. Failures are swallowed (console.warn) — queue item continues to post without images. Three-state `imageStatus` computed field (`available` / `legacy-fallback` / `manual-upload-required`) exposed by both GET routes.
- **Ownership assertion:** Defense-in-depth check at top of `processItem()` prevents cross-tenant posting if `listing.userId !== item.userId`.
- **32 unit tests** in posting-queue-processor.test.ts (16 new for 9.4), 7 tests in posting-queue-image-status.test.ts, plus imageStatus tests in posting-queue.test.ts and posting-queue-id.test.ts.
- **7 Gherkin scenarios** (E-009-S-28 through E-009-S-34) with step definitions in E-009-image-reuse.steps.ts.

### File List
**Modified:**
- `src/lib/posting-queue-processor.ts` — eager load images, PlatformPoster type → ListingWithImages, ownership assertion, legacy fallback with hydrateLegacyImages()
- `app/api/posting-queue/route.ts` — images in listing select, computed imageStatus in GET response
- `app/api/posting-queue/[id]/route.ts` — images in listing select, computed imageStatus in GET response
- `src/__tests__/lib/posting-queue-processor.test.ts` — 16 new Story 9.4 tests (image pipeline, ownership, legacy fallback, N+1)
- `src/__tests__/api/posting-queue.test.ts` — 4 new imageStatus tests for GET route
- `src/__tests__/api/posting-queue-id.test.ts` — 4 new imageStatus tests for GET /:id route
- `src/__tests__/api/posting-queue-process.test.ts` — 1 new test (null user branch coverage)
- `test/acceptance/features/E-009-cross-platform-resale-listing.feature` — 7 new scenarios for story 9.4
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 9-4 status → in-progress → review
- `_bmad-output/implementation-artifacts/epic-9/9-4-image-reuse-for-cross-posting.md` — task checkboxes, dev agent record

**New:**
- `src/lib/posting-queue-image-status.ts` — computeImageStatus() helper (3-state computed field)
- `src/__tests__/lib/posting-queue-image-status.test.ts` — 7 tests for imageStatus helper
- `test/acceptance/step_definitions/E-009-image-reuse.steps.ts` — step definitions for story 9.4 scenarios

### Change Log
- 2026-04-08: Story 9.4 implementation complete. Eager-loaded images on PostingQueueItem, PlatformPoster type updated, ownership assertion, legacy fallback, computed imageStatus field. 32 unit tests, 7 acceptance scenarios.
- 2026-04-08: Code review completed. Fixed: (1) computeImageStatus() false 'legacy-fallback' for empty JSON arrays — now parses JSON to verify actual URLs exist; (2) RTM updated with scenario IDs @E-009-S-28 through @E-009-S-34; (3) story traceability table updated from @E-009-S-TBD to actual values; (4) Trello card created and added to F-009 checklist; (5) 4 new edge-case tests for computeImageStatus. Status → done.
