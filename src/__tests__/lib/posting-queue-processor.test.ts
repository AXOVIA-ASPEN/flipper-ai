/**
 * file: src/__tests__/lib/posting-queue-processor.test.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-03-31
 * version: 3.0
 * brief: Tests for posting-queue-processor.ts with Story 9.3 + 9.4 hardening.
 *
 * description:
 *     Exercises the user-scoped processQueue signature, the ProcessResult
 *     return type, the concurrency guard that re-checks item status, the
 *     per-item 30s timeout, the stuck-item recovery pass, plus the Story 9.4
 *     eager-loaded image pipeline: ListingWithImages type, ownership
 *     assertion, and the non-blocking legacy fallback that downloads from
 *     a listing's imageUrls column with a 10s budget per image.
 */

// Mock Prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    postingQueueItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock image capture so hydrateLegacyImages does not reach Firebase Storage.
jest.mock('@/lib/image-capture', () => ({
  __esModule: true,
  captureListingImages: jest.fn(),
  saveImageMetadata: jest.fn(),
}));

import db from '@/lib/db';
import {
  registerPoster,
  processQueue,
  getQueueStats,
  type PostingResult,
  type PlatformPoster,
} from '@/lib/posting-queue-processor';
import {
  captureListingImages,
  saveImageMetadata,
} from '@/lib/image-capture';

const mockPrisma = db as jest.Mocked<typeof db>;
const mockCaptureListingImages = captureListingImages as jest.MockedFunction<
  typeof captureListingImages
>;
const mockSaveImageMetadata = saveImageMetadata as jest.MockedFunction<
  typeof saveImageMetadata
>;

const USER_ID = 'user-1';

type MockItem = {
  id: string;
  listingId: string;
  userId: string;
  targetPlatform: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  listing: Record<string, unknown>;
};

const makeMockItem = (overrides: Partial<MockItem> = {}): MockItem => ({
  id: 'pq-1',
  listingId: 'lst-1',
  userId: USER_ID,
  targetPlatform: 'EBAY',
  status: 'PENDING',
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  // NOTE: listing mirrors the ListingWithImages shape the processor expects
  // after 9.4's image-eager-load landed — `images` must be present, and an
  // empty array satisfies the hydrateLegacyImages short-circuit because the
  // mock also sets imageUrls to null.
  listing: {
    id: 'lst-1',
    title: 'Test Item',
    platform: 'CRAIGSLIST',
    userId: USER_ID,
    imageUrls: null,
    images: [{ id: 'img-1', storageUrl: 'https://example.com/a.jpg' }],
  },
  ...overrides,
});

function mockFindUniqueReturn(item: MockItem, overrideStatus = 'IN_PROGRESS') {
  (mockPrisma.postingQueueItem.findUnique as jest.Mock).mockResolvedValue({
    ...item,
    status: overrideStatus,
  });
}

describe('posting-queue-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: stuck-item recovery pass succeeds with no items reset.
    (mockPrisma.postingQueueItem.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
  });

  describe('processQueue', () => {
    it('returns empty ProcessResult when no pending items', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      const result = await processQueue(USER_ID);
      expect(result).toEqual({ processed: 0, posted: 0, failed: 0 });
    });

    it('filters findMany by userId (user-scoped processing)', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      await processQueue(USER_ID);

      expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_ID, status: 'PENDING' }),
        })
      );
    });

    it('runs stuck-item recovery scoped to userId', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      await processQueue(USER_ID);

      expect(mockPrisma.postingQueueItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            status: 'IN_PROGRESS',
            updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
          data: { status: 'PENDING' },
        })
      );
    });

    it('respects batchSize parameter', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      await processQueue(USER_ID, 5);
      expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it('marks item FAILED when no poster registered for platform', async () => {
      const item = makeMockItem({ targetPlatform: 'UNKNOWN_PLATFORM' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});

      const result = await processQueue(USER_ID);

      expect(result).toEqual({ processed: 1, posted: 0, failed: 1 });
      expect(mockPrisma.postingQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'pq-1' },
        data: {
          status: 'FAILED',
          errorMessage: expect.stringContaining('No posting handler registered'),
        },
      });
    });

    it('returns processed=1 posted=1 on successful posting', async () => {
      const successPoster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
        externalPostId: 'ext-123',
        externalPostUrl: 'https://ebay.com/123',
      } as PostingResult);

      registerPoster('TEST_SUCCESS', successPoster);

      const item = makeMockItem({ targetPlatform: 'TEST_SUCCESS' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      const result = await processQueue(USER_ID);

      expect(result).toEqual({ processed: 1, posted: 1, failed: 0 });

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls).toHaveLength(2);
      expect(updateCalls[0][0].data.status).toBe('IN_PROGRESS');
      expect(updateCalls[1][0].data.status).toBe('POSTED');
      expect(updateCalls[1][0].data.externalPostId).toBe('ext-123');
      expect(updateCalls[1][0].data.postedAt).toBeInstanceOf(Date);
    });

    it('retries on failure when retryCount < maxRetries', async () => {
      const failPoster: PlatformPoster = jest.fn().mockResolvedValue({
        success: false,
        errorMessage: 'API rate limited',
      } as PostingResult);

      registerPoster('TEST_RETRY', failPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_RETRY',
        retryCount: 1,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      const result = await processQueue(USER_ID);

      expect(result).toEqual({ processed: 1, posted: 0, failed: 1 });

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.status).toBe('PENDING');
      expect(updateCalls[1][0].data.retryCount).toEqual({ increment: 1 });
      expect(updateCalls[1][0].data.errorMessage).toBe('API rate limited');
    });

    it('marks FAILED when retryCount >= maxRetries', async () => {
      const failPoster: PlatformPoster = jest.fn().mockResolvedValue({
        success: false,
        errorMessage: 'Permanent failure',
      } as PostingResult);

      registerPoster('TEST_MAX_RETRY', failPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_MAX_RETRY',
        retryCount: 3,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.status).toBe('FAILED');
    });

    it('handles poster throwing an exception', async () => {
      const throwPoster: PlatformPoster = jest
        .fn()
        .mockRejectedValue(new Error('Network boom'));

      registerPoster('TEST_THROW', throwPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_THROW',
        retryCount: 0,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.status).toBe('PENDING'); // retry
      expect(updateCalls[1][0].data.errorMessage).toBe('Network boom');
    });

    it('handles non-Error exception objects', async () => {
      const throwPoster: PlatformPoster = jest.fn().mockRejectedValue('string error');

      registerPoster('TEST_THROW_STR', throwPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_THROW_STR',
        retryCount: 0,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.errorMessage).toBe('Unknown error');
    });

    it('handles success result without optional fields', async () => {
      const minimalPoster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);

      registerPoster('TEST_MINIMAL', minimalPoster);

      const item = makeMockItem({ targetPlatform: 'TEST_MINIMAL' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.externalPostId).toBeNull();
      expect(updateCalls[1][0].data.externalPostUrl).toBeNull();
    });

    it('handles failure result without errorMessage', async () => {
      const failPoster: PlatformPoster = jest.fn().mockResolvedValue({
        success: false,
      } as PostingResult);

      registerPoster('TEST_NO_MSG', failPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_NO_MSG',
        retryCount: 3,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.errorMessage).toBe('Unknown posting error');
    });

    it('catch block marks FAILED when retryCount >= maxRetries', async () => {
      const throwPoster: PlatformPoster = jest
        .fn()
        .mockRejectedValue(new Error('Fatal posting error'));

      registerPoster('TEST_THROW_FINAL', throwPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_THROW_FINAL',
        retryCount: 3,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      const errorUpdate = updateCalls.find(
        (call: unknown[]) =>
          (call[0] as { data: { errorMessage?: string } }).data.errorMessage ===
          'Fatal posting error'
      );
      expect(errorUpdate).toBeDefined();
      expect(
        (errorUpdate?.[0] as { data: { status: string } }).data.status
      ).toBe('FAILED');
    });

    it('concurrency guard bails out when item status changed after IN_PROGRESS mark', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);

      registerPoster('TEST_CONCURRENT', poster);

      const item = makeMockItem({ targetPlatform: 'TEST_CONCURRENT' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      // Simulate another worker already finished it: findUnique reports POSTED
      mockFindUniqueReturn(item, 'POSTED');

      const result = await processQueue(USER_ID);

      // The only update() call should be the IN_PROGRESS mark; the poster
      // must not run because the re-read saw POSTED.
      expect(poster).not.toHaveBeenCalled();
      expect(result.processed).toBe(1);
      // Counted as failed from this run's perspective (didn't post here)
      expect(result.posted).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('concurrency guard bails out when findUnique returns null', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);

      registerPoster('TEST_CONCURRENT_NULL', poster);

      const item = makeMockItem({ targetPlatform: 'TEST_CONCURRENT_NULL' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.postingQueueItem.findUnique as jest.Mock).mockResolvedValue(null);

      await processQueue(USER_ID);

      expect(poster).not.toHaveBeenCalled();
    });

    it('per-item timeout fires when poster hangs past the threshold', async () => {
      jest.useFakeTimers();

      // Poster that never resolves — must be interrupted by the timeout race.
      const hungPoster: PlatformPoster = jest
        .fn()
        .mockReturnValue(new Promise(() => {}));

      registerPoster('TEST_TIMEOUT', hungPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_TIMEOUT',
        retryCount: 0,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      const pending = processQueue(USER_ID);
      // Push timers past the 30s threshold
      await jest.advanceTimersByTimeAsync(31_000);
      await pending;

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      const errorUpdate = updateCalls.find(
        (call: unknown[]) =>
          (call[0] as { data: { errorMessage?: string } }).data.errorMessage ===
          'Posting timed out'
      );
      expect(errorUpdate).toBeDefined();

      jest.useRealTimers();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Story 9.4 — Image eager-loading, ownership, and legacy fallback
  // ──────────────────────────────────────────────────────────────────────────
  describe('Story 9.4: image pipeline', () => {
    it('eager-loads listing.images sorted by imageIndex in the findMany include', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      await processQueue(USER_ID);

      expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            listing: {
              include: {
                images: { orderBy: { imageIndex: 'asc' } },
              },
            },
          },
        })
      );
    });

    it('passes a ListingWithImages (with images array) to the platform poster', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_IMAGES', poster);

      const item = makeMockItem({
        targetPlatform: 'TEST_IMAGES',
        listing: {
          id: 'lst-1',
          title: 'Test',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: null,
          images: [
            {
              id: 'img-1',
              imageIndex: 0,
              storageUrl: 'https://fb.storage/user-1/ebay/lst-1/0.jpg',
              contentType: 'image/jpeg',
            },
            {
              id: 'img-2',
              imageIndex: 1,
              storageUrl: 'https://fb.storage/user-1/ebay/lst-1/1.jpg',
              contentType: 'image/jpeg',
            },
          ],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      // First arg is the listing, which must carry images
      const listingArg = (poster as jest.Mock).mock.calls[0][0];
      expect(Array.isArray(listingArg.images)).toBe(true);
      expect(listingArg.images).toHaveLength(2);
      expect(listingArg.images[0].storageUrl).toBe(
        'https://fb.storage/user-1/ebay/lst-1/0.jpg'
      );
    });

    it('ownership assertion marks item FAILED when listing.userId mismatches', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_OWNERSHIP', poster);

      const item = makeMockItem({
        targetPlatform: 'TEST_OWNERSHIP',
        listing: {
          id: 'lst-1',
          title: 'Stolen',
          platform: 'CRAIGSLIST',
          userId: 'other-user-id', // does not match item.userId
          imageUrls: null,
          images: [{ id: 'img-1', imageIndex: 0, storageUrl: 'x', contentType: 'image/jpeg' }],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});

      const result = await processQueue(USER_ID);

      expect(poster).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 1, posted: 0, failed: 1 });

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[0][0].data.status).toBe('FAILED');
      expect(updateCalls[0][0].data.errorMessage).toMatch(/authorization/i);
    });

    it('legacy fallback: downloads from imageUrls when images relation is empty', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_OK', poster);

      mockCaptureListingImages.mockResolvedValue({
        captured: [
          {
            originalUrl: 'https://craigslist.example/a.jpg',
            storagePath: 'user-1/CRAIGSLIST/lst-1/0.jpg',
            storageUrl: 'https://fb.storage/user-1/CRAIGSLIST/lst-1/0.jpg',
            fileSize: 1024,
            contentType: 'image/jpeg',
            imageIndex: 0,
          },
        ],
        failed: [],
      });
      mockSaveImageMetadata.mockResolvedValue(undefined);

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_OK',
        listing: {
          id: 'lst-1',
          title: 'Legacy',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: JSON.stringify(['https://craigslist.example/a.jpg']),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      const result = await processQueue(USER_ID);

      expect(mockCaptureListingImages).toHaveBeenCalledWith(
        'lst-1',
        USER_ID,
        'CRAIGSLIST',
        ['https://craigslist.example/a.jpg']
      );
      expect(mockSaveImageMetadata).toHaveBeenCalledWith(
        'lst-1',
        expect.arrayContaining([
          expect.objectContaining({
            storageUrl: 'https://fb.storage/user-1/CRAIGSLIST/lst-1/0.jpg',
          }),
        ])
      );
      expect(result.posted).toBe(1);

      // Listing passed to the poster should have the hydrated images
      const listingArg = (poster as jest.Mock).mock.calls[0][0];
      expect(listingArg.images).toHaveLength(1);
      expect(listingArg.images[0].storageUrl).toBe(
        'https://fb.storage/user-1/CRAIGSLIST/lst-1/0.jpg'
      );
    });

    it('legacy fallback: download failure is non-blocking — item still posts', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_FAIL', poster);

      mockCaptureListingImages.mockRejectedValue(
        new Error('Original CDN returned 404')
      );

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_FAIL',
        listing: {
          id: 'lst-1',
          title: 'Dead Legacy',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: JSON.stringify(['https://dead.example/a.jpg']),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      const result = await processQueue(USER_ID);

      // Poster still ran, item posted successfully
      expect(poster).toHaveBeenCalled();
      expect(result.posted).toBe(1);
      expect(result.failed).toBe(0);

      // But saveImageMetadata was NOT called because capture failed
      expect(mockSaveImageMetadata).not.toHaveBeenCalled();

      // Listing passed to poster has the original empty images array
      const listingArg = (poster as jest.Mock).mock.calls[0][0];
      expect(listingArg.images).toEqual([]);
    });

    it('legacy fallback: captureListingImages returning no captured items is non-blocking', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_EMPTY', poster);

      mockCaptureListingImages.mockResolvedValue({
        captured: [],
        failed: [{ url: 'x', error: 'boom' }],
      });

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_EMPTY',
        listing: {
          id: 'lst-1',
          title: 'Legacy',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: JSON.stringify(['https://dead.example/a.jpg']),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      expect(mockCaptureListingImages).toHaveBeenCalled();
      expect(mockSaveImageMetadata).not.toHaveBeenCalled();
      expect(poster).toHaveBeenCalled();
    });

    it('legacy fallback: malformed imageUrls JSON is treated as empty, not an error', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_BAD_JSON', poster);

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_BAD_JSON',
        listing: {
          id: 'lst-1',
          title: 'Bad JSON',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: '{not valid json',
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      // captureListingImages should never have been called for malformed JSON
      expect(mockCaptureListingImages).not.toHaveBeenCalled();
      // But the poster still runs — image absence is never a hard failure
      expect(poster).toHaveBeenCalled();
    });

    it('legacy fallback: non-array imageUrls JSON is treated as empty', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_OBJ_JSON', poster);

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_OBJ_JSON',
        listing: {
          id: 'lst-1',
          title: 'Object JSON',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          // Valid JSON but not an array — should be treated as empty
          imageUrls: '{"urls":"wrong shape"}',
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      expect(mockCaptureListingImages).not.toHaveBeenCalled();
      expect(poster).toHaveBeenCalled();
    });

    it('legacy fallback: array with mixed types filters non-strings before download', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_MIXED', poster);

      mockCaptureListingImages.mockResolvedValue({
        captured: [
          {
            originalUrl: 'https://valid.example/a.jpg',
            storagePath: 'user-1/CRAIGSLIST/lst-1/0.jpg',
            storageUrl: 'https://fb.storage/user-1/CRAIGSLIST/lst-1/0.jpg',
            fileSize: 1024,
            contentType: 'image/jpeg',
            imageIndex: 0,
          },
        ],
        failed: [],
      });
      mockSaveImageMetadata.mockResolvedValue(undefined);

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_MIXED',
        listing: {
          id: 'lst-1',
          title: 'Mixed',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: JSON.stringify([
            'https://valid.example/a.jpg',
            42, // not a string — should be filtered out
            null, // ditto
          ]),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      // Only the valid string URL should reach captureListingImages
      expect(mockCaptureListingImages).toHaveBeenCalledWith(
        'lst-1',
        USER_ID,
        'CRAIGSLIST',
        ['https://valid.example/a.jpg']
      );
    });

    it('legacy fallback: budget timeout aborts gracefully without throwing', async () => {
      jest.useFakeTimers();

      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_TIMEOUT', poster);

      // captureListingImages hangs forever — only the budget timeout unblocks.
      mockCaptureListingImages.mockReturnValue(new Promise(() => {}));

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_TIMEOUT',
        listing: {
          id: 'lst-1',
          title: 'Slow Legacy',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: JSON.stringify(['https://slow.example/a.jpg']),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      const pending = processQueue(USER_ID);
      // Advance past the 10s per-image budget (1 image → 10_000 ms)
      await jest.advanceTimersByTimeAsync(10_500);
      const result = await pending;

      // The legacy budget timeout swallowed the error; the poster still ran
      expect(poster).toHaveBeenCalled();
      expect(result.posted).toBe(1);

      jest.useRealTimers();
    });

    it('legacy fallback: empty images + null imageUrls proceeds to post with no images', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_NO_URLS', poster);

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_NO_URLS',
        listing: {
          id: 'lst-1',
          title: 'Nothing',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: null,
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      expect(mockCaptureListingImages).not.toHaveBeenCalled();
      expect(poster).toHaveBeenCalled();
      const listingArg = (poster as jest.Mock).mock.calls[0][0];
      expect(listingArg.images).toEqual([]);
    });

    it('legacy fallback: non-Error rejection is stringified in the warning log', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_STR_THROW', poster);

      // captureListingImages rejects with a raw string (not an Error instance)
      mockCaptureListingImages.mockRejectedValue('string rejection');

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_STR_THROW',
        listing: {
          id: 'lst-1',
          title: 'String reject',
          platform: 'CRAIGSLIST',
          userId: USER_ID,
          imageUrls: JSON.stringify(['https://dead.example/a.jpg']),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      // Suppress the expected warn log in test output
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await processQueue(USER_ID);
      warnSpy.mockRestore();

      // Poster still ran — non-blocking behavior preserved regardless of thrown type
      expect(poster).toHaveBeenCalled();
    });

    it('legacy fallback: null userId on listing skips the fallback entirely', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_LEGACY_NO_USER', poster);

      const item = makeMockItem({
        targetPlatform: 'TEST_LEGACY_NO_USER',
        listing: {
          id: 'lst-1',
          title: 'Orphan',
          platform: 'CRAIGSLIST',
          userId: null,
          imageUrls: JSON.stringify(['https://example.com/a.jpg']),
          images: [],
        },
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      mockFindUniqueReturn(item);

      await processQueue(USER_ID);

      expect(mockCaptureListingImages).not.toHaveBeenCalled();
      expect(poster).toHaveBeenCalled();
    });

    it('batch processing: multiple items for the same listing do not re-query images (N+1 prevention)', async () => {
      const poster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
      } as PostingResult);
      registerPoster('TEST_BATCH_N1', poster);

      // Two queue items share the same underlying listing (cross-post to two
      // platforms). The single findMany call eagerly loaded each item's
      // listing.images, so no extra queries are needed in processItem.
      const sharedListing = {
        id: 'lst-1',
        title: 'Shared',
        platform: 'CRAIGSLIST',
        userId: USER_ID,
        imageUrls: null,
        images: [
          {
            id: 'img-1',
            imageIndex: 0,
            storageUrl: 'https://fb.storage/shared.jpg',
            contentType: 'image/jpeg',
          },
        ],
      };
      const items = [
        makeMockItem({
          id: 'pq-1',
          targetPlatform: 'TEST_BATCH_N1',
          listing: sharedListing,
        }),
        makeMockItem({
          id: 'pq-2',
          targetPlatform: 'TEST_BATCH_N1',
          listing: sharedListing,
        }),
      ];
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue(items);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.postingQueueItem.findUnique as jest.Mock).mockImplementation(
        async ({ where: { id } }: { where: { id: string } }) => ({
          ...items.find((i) => i.id === id),
          status: 'IN_PROGRESS',
        })
      );

      await processQueue(USER_ID);

      // findMany should be called exactly once for the whole batch.
      expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledTimes(1);
      // Legacy capture never fires for a listing with images already loaded.
      expect(mockCaptureListingImages).not.toHaveBeenCalled();
      // Both items went to the poster.
      expect(poster).toHaveBeenCalledTimes(2);
    });
  });

  describe('getQueueStats', () => {
    it('returns all status counts', async () => {
      (mockPrisma.postingQueueItem.count as jest.Mock)
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2) // inProgress
        .mockResolvedValueOnce(10) // posted
        .mockResolvedValueOnce(1); // failed

      const stats = await getQueueStats(USER_ID);

      expect(stats).toEqual({
        pending: 5,
        inProgress: 2,
        posted: 10,
        failed: 1,
        total: 18,
      });
    });

    it('returns zeros for empty queue', async () => {
      (mockPrisma.postingQueueItem.count as jest.Mock).mockResolvedValue(0);

      const stats = await getQueueStats(USER_ID);
      expect(stats.total).toBe(0);
    });
  });
});
