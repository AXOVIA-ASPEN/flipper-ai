/**
 * @file test/acceptance/step_definitions/E-009-image-reuse.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Step definitions for E-009 story 9.4 (image reuse for cross-posting).
 *
 * @description
 * Validates FR-RELIST-08 — eager-loaded ListingImage[] on queue items, the
 * non-blocking legacy fallback that hydrates from a listing's legacy
 * imageUrls column via captureListingImages(), the defense-in-depth
 * ownership assertion in processItem(), and the computed imageStatus helper
 * used by the posting-queue API routes. Drives the real processor module
 * with in-memory Prisma stubs plus a proxy-based override on the
 * image-capture module so no Firebase Storage calls leave the test harness.
 */

import { Given, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  registerPoster,
  imageCaptureOverrides,
  type PlatformPoster,
  type PostingResult,
  type ListingWithImages,
} from '../../../src/lib/posting-queue-processor';
import prisma from '../../../src/lib/db';
import * as imageCapture from '../../../src/lib/image-capture';
import { computeImageStatus } from '../../../src/lib/posting-queue-image-status';

// ── State ────────────────────────────────────────────────────────────────────

interface StoredItem {
  id: string;
  userId: string;
  listingId: string;
  targetPlatform: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date | null;
  postedAt: Date | null;
  externalPostId: string | null;
  externalPostUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  listing: {
    id: string;
    userId: string | null;
    platform: string;
    title: string;
    imageUrls: string | null;
    images: Array<{
      id: string;
      imageIndex: number;
      storageUrl: string;
      contentType: string;
    }>;
  };
}

interface S94State {
  items: StoredItem[];
  idCounter: number;
  defaultUserId: string;
  defaultListingId: string;
  findManyCallCount: number;
  captureCallCount: number;
  receivedListing: ListingWithImages | null;
  originalCaptureListingImages?: typeof imageCapture.captureListingImages;
  originalSaveImageMetadata?: typeof imageCapture.saveImageMetadata;
}

let s94: S94State;

function freshS94State(): S94State {
  return {
    items: [],
    idCounter: 1,
    defaultUserId: 'user-A',
    defaultListingId: 'listing-94',
    findManyCallCount: 0,
    captureCallCount: 0,
    receivedListing: null,
  };
}

function createItem(overrides: Partial<StoredItem> = {}): StoredItem {
  const id = `pq-${s94.idCounter++}`;
  const now = new Date();
  const item: StoredItem = {
    id,
    userId: overrides.userId ?? s94.defaultUserId,
    listingId: overrides.listingId ?? s94.defaultListingId,
    targetPlatform: overrides.targetPlatform ?? 'EBAY',
    status: overrides.status ?? 'PENDING',
    retryCount: overrides.retryCount ?? 0,
    maxRetries: overrides.maxRetries ?? 3,
    scheduledAt: overrides.scheduledAt ?? null,
    postedAt: null,
    externalPostId: null,
    externalPostUrl: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    listing: overrides.listing ?? {
      id: s94.defaultListingId,
      userId: overrides.userId ?? s94.defaultUserId,
      platform: 'CRAIGSLIST',
      title: 'Story 9.4 test listing',
      imageUrls: null,
      images: [],
    },
  };
  s94.items.push(item);
  return item;
}

// ── Prisma stubs ────────────────────────────────────────────────────────────

function matchesWhere(
  item: StoredItem,
  where: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(value)) {
      const anyMatch = value.some((clause: Record<string, unknown>) =>
        matchesWhere(item, clause)
      );
      if (!anyMatch) return false;
      continue;
    }
    if (key === 'updatedAt' && value && typeof value === 'object') {
      const v = value as { lt?: Date };
      if (v.lt && !(item.updatedAt < v.lt)) return false;
      continue;
    }
    if (key === 'scheduledAt' && value && typeof value === 'object') {
      const v = value as { lte?: Date };
      if (v.lte && !(item.scheduledAt && item.scheduledAt <= v.lte)) return false;
      continue;
    }
    if (key === 'scheduledAt' && value === null) {
      if (item.scheduledAt !== null) return false;
      continue;
    }
    if ((item as unknown as Record<string, unknown>)[key] !== value) {
      return false;
    }
  }
  return true;
}

function installPrismaStubs(): void {
  const dbModule = require('../../../src/lib/db');
  const fakePrisma = {
    postingQueueItem: {
      findMany: async ({
        where,
        take,
        orderBy,
        include,
      }: {
        where: Record<string, unknown>;
        take?: number;
        orderBy?: { createdAt: 'asc' | 'desc' };
        include?: { listing?: { include?: { images?: { orderBy?: { imageIndex?: 'asc' | 'desc' } } } } };
      }) => {
        s94.findManyCallCount += 1;
        let results = s94.items.filter((i) => matchesWhere(i, where));
        if (orderBy?.createdAt === 'asc') {
          results = results.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          );
        }
        if (take !== undefined) results = results.slice(0, take);
        // Honor the eager-load contract: when callers ask for
        // `include: { listing: { include: { images: { orderBy: { imageIndex: 'asc' } } } } }`
        // we must return the listing.images sorted by imageIndex (matching real Prisma).
        const imagesOrder = include?.listing?.include?.images?.orderBy?.imageIndex;
        if (imagesOrder) {
          const dir = imagesOrder === 'asc' ? 1 : -1;
          results = results.map((item) => ({
            ...item,
            listing: {
              ...item.listing,
              images: [...item.listing.images].sort((a, b) => (a.imageIndex - b.imageIndex) * dir),
            },
          }));
        }
        return results;
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        s94.items.find((i) => i.id === id) ?? null,
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const item = s94.items.find((i) => i.id === id);
        if (!item) throw new Error(`item ${id} not found`);
        for (const [k, v] of Object.entries(data)) {
          if (
            k === 'retryCount' &&
            v &&
            typeof v === 'object' &&
            'increment' in (v as object)
          ) {
            item.retryCount += (v as { increment: number }).increment;
          } else {
            (item as unknown as Record<string, unknown>)[k] = v;
          }
        }
        item.updatedAt = new Date();
        return item;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const item of s94.items) {
          if (matchesWhere(item, where)) {
            for (const [k, v] of Object.entries(data)) {
              (item as unknown as Record<string, unknown>)[k] = v;
            }
            item.updatedAt = new Date();
            count += 1;
          }
        }
        return { count };
      },
    },
  };
  dbModule.default = fakePrisma;
  Object.assign(prisma as unknown as Record<string, unknown>, fakePrisma);
}

function stubImageCapture(
  capturedCount: number,
  behavior: 'ok' | 'throw' = 'ok'
): void {
  // Preserve originals only once so a subsequent scenario can re-install.
  // We override via the processor's `imageCaptureOverrides` indirection layer
  // because tsx/cjs creates immutable getter-defined namespace exports — direct
  // mutation of the `imageCapture.*` namespace silently fails.
  if (!s94.originalCaptureListingImages) {
    s94.originalCaptureListingImages = imageCaptureOverrides.captureListingImages;
    s94.originalSaveImageMetadata = imageCaptureOverrides.saveImageMetadata;
  }
  imageCaptureOverrides.captureListingImages = (async (
    listingId: string,
    userId: string,
    platform: string,
    urls: string[]
  ) => {
    s94.captureCallCount += 1;
    if (behavior === 'throw') {
      throw new Error('Legacy CDN returned 404');
    }
    return {
      captured: Array.from({ length: capturedCount }, (_, i) => ({
        originalUrl: urls[i] ?? `https://orig/${i}.jpg`,
        storagePath: `${userId}/${platform}/${listingId}/${i}.jpg`,
        storageUrl: `https://fb.storage/${userId}/${platform}/${listingId}/${i}.jpg`,
        fileSize: 1024,
        contentType: 'image/jpeg',
        imageIndex: i,
      })),
      failed: [],
    };
  }) as unknown as typeof imageCapture.captureListingImages;
  imageCaptureOverrides.saveImageMetadata = (async () => undefined) as unknown as typeof imageCapture.saveImageMetadata;
}

// ── Given steps ──────────────────────────────────────────────────────────────

Given(
  'a pending posting queue item for platform {string} with {int} Firebase Storage images',
  function (platform: string, imageCount: number) {
    s94 = freshS94State();
    installPrismaStubs();
    createItem({
      targetPlatform: platform,
      listing: {
        id: s94.defaultListingId,
        userId: s94.defaultUserId,
        platform: 'CRAIGSLIST',
        title: 'Multi-image listing',
        imageUrls: null,
        images: Array.from({ length: imageCount }, (_, i) => ({
          id: `img-${i}`,
          imageIndex: imageCount - 1 - i, // reversed so we can prove sort
          storageUrl: `https://fb.storage/user-A/ebay/listing-94/${imageCount - 1 - i}.jpg`,
          contentType: 'image/jpeg',
        })),
      },
    });
  }
);

Given(
  '{int} pending posting queue items for platforms {string} sharing one listing',
  function (count: number, platformsCsv: string) {
    s94 = freshS94State();
    installPrismaStubs();
    const platforms = platformsCsv.split(',').map((p) => p.trim());
    assert.strictEqual(count, platforms.length);
    const sharedListing = {
      id: s94.defaultListingId,
      userId: s94.defaultUserId,
      platform: 'CRAIGSLIST',
      title: 'Shared listing',
      imageUrls: null,
      images: [
        {
          id: 'img-0',
          imageIndex: 0,
          storageUrl: 'https://fb.storage/shared.jpg',
          contentType: 'image/jpeg',
        },
      ],
    };
    for (const p of platforms) {
      createItem({ targetPlatform: p, listing: sharedListing });
    }
  }
);

Given(
  'a pending posting queue item whose listing belongs to a different user',
  function () {
    s94 = freshS94State();
    installPrismaStubs();
    createItem({
      targetPlatform: 'EBAY',
      userId: s94.defaultUserId,
      listing: {
        id: s94.defaultListingId,
        userId: 'other-user-id',
        platform: 'CRAIGSLIST',
        title: 'Stolen listing',
        imageUrls: null,
        images: [
          {
            id: 'img-0',
            imageIndex: 0,
            storageUrl: 'https://fb.storage/x.jpg',
            contentType: 'image/jpeg',
          },
        ],
      },
    });
  }
);

Given(
  'a pending posting queue item whose listing has only legacy imageUrls',
  function () {
    s94 = freshS94State();
    installPrismaStubs();
    createItem({
      targetPlatform: 'EBAY',
      listing: {
        id: s94.defaultListingId,
        userId: s94.defaultUserId,
        platform: 'CRAIGSLIST',
        title: 'Legacy listing',
        imageUrls: JSON.stringify(['https://craigslist.example/a.jpg']),
        images: [],
      },
    });
  }
);

Given('the legacy image downloader returns one captured image', function () {
  stubImageCapture(1, 'ok');
});

Given('the legacy image downloader throws an error', function () {
  stubImageCapture(0, 'throw');
});

Given(
  'the posting queue image status helper exists at {string}',
  function (relative: string) {
    const absolute = path.resolve(__dirname, '..', '..', '..', relative);
    assert.ok(fs.existsSync(absolute), `missing ${relative}`);
  }
);

Given(
  'the posting queue processor exists at {string}',
  function (relative: string) {
    const absolute = path.resolve(__dirname, '..', '..', '..', relative);
    assert.ok(fs.existsSync(absolute), `missing ${relative}`);
  }
);

// ── When steps ───────────────────────────────────────────────────────────────
// "the posting queue processor runs for the authenticated user" is defined
// in E-009-posting-queue.steps.ts and reused here — do not redefine it.

// ── Then steps ───────────────────────────────────────────────────────────────

Then(
  // Use a regex so both the singular "1 image" and plural "N images" forms match.
  /^the platform poster receives a listing with (\d+) images?$/,
  function (expected: number) {
    assert.ok(s94.receivedListing, 'platform poster was never invoked');
    assert.strictEqual(s94.receivedListing.images.length, expected);
  }
);

Then('the images are sorted by imageIndex ascending', function () {
  assert.ok(s94.receivedListing);
  const indexes = s94.receivedListing.images.map((i) => i.imageIndex);
  const sorted = [...indexes].sort((a, b) => a - b);
  assert.deepStrictEqual(indexes, sorted, 'images not sorted by imageIndex asc');
});

Then(
  'only one findMany call resolves both queue items with images',
  function () {
    assert.strictEqual(
      s94.findManyCallCount,
      1,
      `expected 1 findMany call, saw ${s94.findManyCallCount}`
    );
    // Both items processed.
    for (const item of s94.items) {
      assert.ok(
        item.status === 'POSTED' || item.status === 'IN_PROGRESS',
        `item ${item.id} did not advance (status ${item.status})`
      );
    }
  }
);

Then(
  'the ownership-mismatch item status becomes {string}',
  function (status: string) {
    assert.strictEqual(s94.items[0].status, status);
  }
);

Then(
  'the legacy-fallback item status becomes {string}',
  function (status: string) {
    assert.strictEqual(s94.items[0].status, status);
  }
);

Then(
  'the ownership-mismatch error message is persisted on the queue item',
  function () {
    const msg = s94.items[0].errorMessage;
    assert.ok(msg && /authorization/i.test(msg), `got: ${msg}`);
  }
);

Then('the legacy image downloader is invoked once', function () {
  assert.strictEqual(s94.captureCallCount, 1);
});

Then(
  'the helper returns {string} when the listing has ListingImage records',
  function (expected: string) {
    const out = computeImageStatus({
      images: [{ id: 'img-1' }],
      imageUrls: null,
    });
    assert.strictEqual(out, expected);
  }
);

Then(
  'the helper returns {string} when only the legacy imageUrls column is populated',
  function (expected: string) {
    const out = computeImageStatus({
      images: [],
      imageUrls: JSON.stringify(['https://x']),
    });
    assert.strictEqual(out, expected);
  }
);

Then(
  'the helper returns {string} when neither source has URLs',
  function (expected: string) {
    const out = computeImageStatus({ images: [], imageUrls: null });
    assert.strictEqual(out, expected);
  }
);

Then(
  'the processor source declares the PlatformPoster type accepts ListingWithImages',
  function () {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'src/lib/posting-queue-processor.ts'),
      'utf-8'
    );
    assert.match(src, /PlatformPoster\s*=\s*\([\s\S]*?listing:\s*ListingWithImages/);
  }
);

Then(
  'the processor source eagerly loads images ordered by imageIndex',
  function () {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'src/lib/posting-queue-processor.ts'),
      'utf-8'
    );
    assert.match(src, /images:\s*\{\s*orderBy:\s*\{\s*imageIndex:\s*'asc'/);
  }
);

// ── Wire a successful poster that captures the listing it receives ──────────

// This supplements the generic successful-poster step from the 9.3 step file:
// we register a listing-capturing poster for every platform used in 9.4
// scenarios so the Then steps can inspect what the processor passed through.
Given(
  'a listing-capturing successful platform poster registered for {string}',
  function (platform: string) {
    const poster: PlatformPoster = async (listing) => {
      s94.receivedListing = listing;
      return {
        success: true,
        externalPostId: `ext-${platform}`,
        externalPostUrl: `https://${platform.toLowerCase()}.example/listing`,
      } as PostingResult;
    };
    registerPoster(platform, poster);
  }
);
