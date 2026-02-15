/**
 * Tests for posting-queue-processor.ts
 * Covers: registerPoster, processQueue, processItem logic, getQueueStats
 */

// Mock Prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    postingQueueItem: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import db from '@/lib/db';
import {
  registerPoster,
  processQueue,
  getQueueStats,
  type PostingResult,
  type PlatformPoster,
} from '@/lib/posting-queue-processor';

const mockPrisma = db as jest.Mocked<typeof db>;

const makeMockItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'pq-1',
  listingId: 'lst-1',
  userId: 'user-1',
  targetPlatform: 'EBAY',
  status: 'PENDING',
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: null,
  createdAt: new Date(),
  listing: {
    id: 'lst-1',
    title: 'Test Item',
    platform: 'CRAIGSLIST',
    userId: 'user-1',
  },
  ...overrides,
});

describe('posting-queue-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processQueue', () => {
    it('returns 0 when no pending items', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      const count = await processQueue();
      expect(count).toBe(0);
    });

    it('processes pending items and returns count', async () => {
      const item = makeMockItem();
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      // No poster registered for EBAY → should FAIL
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});

      const count = await processQueue();
      expect(count).toBe(1);
    });

    it('respects batchSize parameter', async () => {
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([]);
      await processQueue(5);
      expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it('marks item FAILED when no poster registered for platform', async () => {
      const item = makeMockItem({ targetPlatform: 'UNKNOWN_PLATFORM' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});

      await processQueue();

      expect(mockPrisma.postingQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'pq-1' },
        data: {
          status: 'FAILED',
          errorMessage: expect.stringContaining('No posting handler registered'),
        },
      });
    });

    it('marks item POSTED on successful posting', async () => {
      const successPoster: PlatformPoster = jest.fn().mockResolvedValue({
        success: true,
        externalPostId: 'ext-123',
        externalPostUrl: 'https://ebay.com/123',
      } as PostingResult);

      registerPoster('TEST_SUCCESS', successPoster);

      const item = makeMockItem({ targetPlatform: 'TEST_SUCCESS' });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});

      await processQueue();

      // First call: IN_PROGRESS, second call: POSTED
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

      await processQueue();

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      // Second update should set status back to PENDING (retry)
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

      await processQueue();

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.status).toBe('FAILED');
    });

    it('handles poster throwing an exception', async () => {
      const throwPoster: PlatformPoster = jest.fn().mockRejectedValue(
        new Error('Network timeout')
      );

      registerPoster('TEST_THROW', throwPoster);

      const item = makeMockItem({
        targetPlatform: 'TEST_THROW',
        retryCount: 0,
        maxRetries: 3,
      });
      (mockPrisma.postingQueueItem.findMany as jest.Mock).mockResolvedValue([item]);
      (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue({});

      await processQueue();

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.status).toBe('PENDING'); // retry
      expect(updateCalls[1][0].data.errorMessage).toBe('Network timeout');
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

      await processQueue();

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

      await processQueue();

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

      await processQueue();

      const updateCalls = (mockPrisma.postingQueueItem.update as jest.Mock).mock.calls;
      expect(updateCalls[1][0].data.errorMessage).toBe('Unknown posting error');
    });
  });

  describe('getQueueStats', () => {
    it('returns all status counts', async () => {
      (mockPrisma.postingQueueItem.count as jest.Mock)
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(2)   // inProgress
        .mockResolvedValueOnce(10)  // posted
        .mockResolvedValueOnce(1);  // failed

      const stats = await getQueueStats('user-1');

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

      const stats = await getQueueStats('user-1');
      expect(stats.total).toBe(0);
    });
  });
});
