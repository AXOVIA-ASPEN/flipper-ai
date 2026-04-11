/**
 * @file src/__tests__/lib/monitoring-job.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for MonitoringJobService.
 */

import { MonitoringJobService } from '@/lib/monitoring-job';
import { ExternalServiceError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  prisma: {
    monitoringJob: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    listing: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    facebookToken: {
      findFirst: jest.fn().mockResolvedValue({ id: 'fb-token-valid' }),
    },
    $transaction: jest.fn(),
  },
  default: {
    monitoringJob: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    listing: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    facebookToken: {
      findFirst: jest.fn().mockResolvedValue({ id: 'fb-token-valid' }),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/listing-tracker', () => ({
  getTrackableListings: jest.fn().mockResolvedValue([]),
  detectSoldStatus: jest.fn().mockReturnValue(false),
  extractCurrentPrice: jest.fn().mockReturnValue(null),
  classifyHttpResponse: jest.fn().mockReturnValue('ok'),
  classifyUnavailableReason: jest.fn().mockReturnValue('removed'),
  isPriceChangeMeaningful: jest.fn().mockReturnValue(false),
  updateListingStateWithEvent: jest.fn().mockResolvedValue(undefined),
  updatePlatformParseStats: jest.fn(),
  isAnomalyThresholdExceeded: jest.fn().mockReturnValue(false),
  TRACKABLE_STATUSES: ['NEW', 'ANALYZING', 'OPPORTUNITY', 'CONTACTED', 'PURCHASED', 'LISTED'],
}));

jest.mock('@/lib/notification-events', () => ({
  NotificationEventType: {
    LISTING_SOLD: 'listing.sold',
    LISTING_PRICE_CHANGED: 'listing.price_changed',
    LISTING_EXPIRING: 'listing.expiring',
    LISTING_UNAVAILABLE: 'listing.unavailable',
  },
  createNotificationEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/listing-expiry', () => ({
  getExpiringListings: jest.fn().mockResolvedValue([]),
  computeEstimatedExpiry: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/sse-emitter', () => ({
  sseEmitter: {
    emit: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('@/scrapers/ebay/scraper', () => ({
  callEbayApi: jest.fn().mockResolvedValue({ itemSummaries: [] }),
  getEbayToken: jest.fn().mockReturnValue('test-token'),
}));

jest.mock('@/scrapers/ebay/types', () => ({}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    timed: jest.fn(() => jest.fn()),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db';
import { RateLimitError } from '@/lib/errors';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMonitoringJob = (mockPrisma.monitoringJob as any);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock fetch for HTML platform checks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeMockResponse(status: number, body: string) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve({}),
  } as Response);
}

// ---------------------------------------------------------------------------
// Mock listings for batch testing
// ---------------------------------------------------------------------------

const makeListing = (overrides: Partial<{
  id: string; platform: string; url: string; askingPrice: number;
  userId: string; title: string; status: string; lastMonitoredAt: Date | null;
}> = {}) => ({
  id: 'listing-1',
  title: 'Test Item',
  platform: 'CRAIGSLIST',
  url: 'https://craigslist.org/item/123',
  askingPrice: 100,
  status: 'NEW',
  userId: 'user-1',
  lastMonitoredAt: null,
  ...overrides,
});

describe('MonitoringJobService', () => {
  let service: MonitoringJobService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MonitoringJobService();
  });

  // -----------------------------------------------------------------------
  // reapStaleJobs
  // -----------------------------------------------------------------------

  describe('reapStaleJobs()', () => {
    it('updates stale RUNNING jobs to FAILED', async () => {
      mockMonitoringJob.findMany.mockResolvedValueOnce([{ id: 'job-stale-1' }]);
      mockMonitoringJob.update.mockResolvedValue({});

      await service.reapStaleJobs();

      expect(mockMonitoringJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'RUNNING' }),
        })
      );
      expect(mockMonitoringJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-stale-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Reaped: exceeded maximum run duration',
          }),
        })
      );
    });

    it('does nothing when no stale jobs exist', async () => {
      mockMonitoringJob.findMany.mockResolvedValueOnce([]);
      await service.reapStaleJobs();
      expect(mockMonitoringJob.update).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // startJob — atomic concurrent-run guard
  // -----------------------------------------------------------------------

  describe('startJob()', () => {
    it('creates a RUNNING job and returns its id', async () => {
      mockMonitoringJob.create.mockResolvedValueOnce({ id: 'job-123' });
      const id = await service.startJob();
      expect(id).toBe('job-123');
      expect(mockMonitoringJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RUNNING' }),
        })
      );
    });

    it('throws MONITORING_CONCURRENT error on P2002 (concurrent job running)', async () => {
      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockMonitoringJob.create.mockRejectedValueOnce(p2002);

      await expect(service.startJob()).rejects.toMatchObject({
        code: 'MONITORING_CONCURRENT',
        message: 'A monitoring job is already running.',
      });
    });

    it('throws ExternalServiceError for other Prisma known request errors', async () => {
      const { Prisma } = jest.requireActual('@/generated/prisma') as { Prisma: { PrismaClientKnownRequestError: typeof import('@/generated/prisma').Prisma.PrismaClientKnownRequestError } };
      // Simulate a non-P2002 Prisma error by mocking create to reject with a DB error
      mockMonitoringJob.create.mockRejectedValueOnce(
        new ExternalServiceError('database', 'Connection failed')
      );

      await expect(service.startJob()).rejects.toBeInstanceOf(ExternalServiceError);
    });

    it('throws ExternalServiceError when startJob create rejects with PrismaClientInitializationError', async () => {
      const { Prisma } = jest.requireActual('@/generated/prisma') as {
        Prisma: { PrismaClientInitializationError: new (message: string, clientVersion: string) => Error };
      };
      const initErr = new Prisma.PrismaClientInitializationError('DB engine failed to start', 'test');
      mockMonitoringJob.create.mockRejectedValueOnce(initErr);

      await expect(service.startJob()).rejects.toBeInstanceOf(ExternalServiceError);
    });
  });

  // -----------------------------------------------------------------------
  // completeJob
  // -----------------------------------------------------------------------

  describe('completeJob()', () => {
    it('updates job to COMPLETED with stats', async () => {
      mockMonitoringJob.update.mockResolvedValueOnce({});

      await service.completeJob('job-1', {
        listingsChecked: 10,
        eventsCreated: 2,
        expiryEventsCreated: 1,
        errorsEncountered: 0,
        platformStats: {},
        skippedPlatforms: {},
        completedEarly: false,
        canaryWarning: false,
      });

      expect(mockMonitoringJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            listingsChecked: 10,
            eventsCreated: 3, // 2 + 1 expiryEventsCreated
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // failJob
  // -----------------------------------------------------------------------

  describe('failJob()', () => {
    it('updates job to FAILED with error message', async () => {
      mockMonitoringJob.update.mockResolvedValueOnce({});

      await service.failJob('job-2', 'Something went wrong');

      expect(mockMonitoringJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-2' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Something went wrong',
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // run() — integration of the full monitoring run
  // -----------------------------------------------------------------------

  describe('run()', () => {
    beforeEach(() => {
      // Default: no stale jobs, create succeeds, no listings
      mockMonitoringJob.findMany.mockResolvedValue([]);
      mockMonitoringJob.create.mockResolvedValue({ id: 'run-job-1' });
      mockMonitoringJob.update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValue([]);
    });

    it('completes successfully with no listings', async () => {
      const summary = await service.run();

      expect(summary.status).toBe('COMPLETED');
      expect(summary.listingsChecked).toBe(0);
      expect(summary.eventsCreated).toBe(0);
      expect(summary.jobId).toBe('run-job-1');
    });

    it('calls reapStaleJobs before creating the job', async () => {
      const reapSpy = jest.spyOn(service, 'reapStaleJobs').mockResolvedValue(undefined);
      const startSpy = jest.spyOn(service, 'startJob').mockResolvedValue('job-x');
      jest.spyOn(service, 'completeJob').mockResolvedValue(undefined);

      await service.run();

      expect(reapSpy.mock.invocationCallOrder[0]).toBeLessThan(
        startSpy.mock.invocationCallOrder[0]
      );
    });

    it('calls failJob and rethrows on unexpected error', async () => {
      const failSpy = jest.spyOn(service, 'failJob').mockResolvedValue(undefined);
      jest.spyOn(service, 'startJob').mockResolvedValue('job-err');

      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      getTrackableListings.mockRejectedValueOnce(new Error('DB exploded'));

      await expect(service.run()).rejects.toThrow('DB exploded');
      expect(failSpy).toHaveBeenCalledWith('job-err', expect.stringContaining('DB exploded'));
    });

    it('processes HTML platform listing and updates lastMonitoredAt on no-change', async () => {
      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        classifyHttpResponse: jest.Mock;
        detectSoldStatus: jest.Mock;
        extractCurrentPrice: jest.Mock;
        isPriceChangeMeaningful: jest.Mock;
        isAnomalyThresholdExceeded: jest.Mock;
      };
      const listing = makeListing();
      getTrackableListings.mockResolvedValueOnce([listing]);

      // Mock fetch — healthy 200 response
      mockFetch.mockImplementationOnce(() => makeMockResponse(200, 'iPhone 14 - $100'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValue([]);

      const summary = await service.run();
      expect(summary.listingsChecked).toBe(1);
      expect(summary.eventsCreated).toBe(0);
    });

    it('processes listing sold state change', async () => {
      const { getTrackableListings, detectSoldStatus } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        detectSoldStatus: jest.Mock;
        classifyHttpResponse: jest.Mock;
        extractCurrentPrice: jest.Mock;
        updateListingStateWithEvent: jest.Mock;
        isAnomalyThresholdExceeded: jest.Mock;
        updatePlatformParseStats: jest.Mock;
      };
      const listing = makeListing();
      getTrackableListings.mockResolvedValueOnce([listing]);

      mockFetch.mockImplementationOnce(() => makeMockResponse(200, 'This posting has been deleted'));
      detectSoldStatus.mockReturnValueOnce(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.listingsChecked).toBe(1);
      expect(summary.eventsCreated).toBe(1);
    });

    it('handles rate-limited response — increments circuit breaker, no event', async () => {
      const { getTrackableListings, classifyHttpResponse } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        classifyHttpResponse: jest.Mock;
      };
      const listing = makeListing();
      getTrackableListings.mockResolvedValueOnce([listing]);

      mockFetch.mockImplementationOnce(() => makeMockResponse(429, 'Rate limited'));
      classifyHttpResponse.mockReturnValueOnce('rate_limited');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});

      const summary = await service.run();
      // Rate-limited listing should be logged as an error, not as an event
      expect(summary.eventsCreated).toBe(0);
    });

    it('handles listing check error gracefully and continues batch', async () => {
      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      const listing1 = makeListing({ id: 'listing-1' });
      const listing2 = makeListing({ id: 'listing-2' });
      getTrackableListings.mockResolvedValueOnce([listing1, listing2]);

      // First listing fetch fails, second succeeds
      mockFetch
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => makeMockResponse(200, 'iPhone - $100'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});

      const summary = await service.run();
      // Should process both listings, first has errors
      expect(summary.listingsChecked).toBe(2);
      expect(summary.errorsEncountered).toBeGreaterThan(0);
    });

    it('skips EBAY platform when daily budget exhausted (pre-flight)', async () => {
      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      const ebayListing = makeListing({ platform: 'EBAY', url: 'https://ebay.com/itm/123456789012' });
      getTrackableListings.mockResolvedValueOnce([ebayListing]);

      // Mock DB budget check to show exhausted budget
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockEbayBudgetQuery = jest.fn().mockResolvedValueOnce([
        { platformStats: { EBAY: { checked: 2001 } } },
      ]);
      mockMonitoringJob.findMany
        .mockResolvedValueOnce([]) // stale jobs check
        .mockImplementationOnce(mockEbayBudgetQuery); // budget check

      const summary = await service.run();
      expect(summary.skippedPlatforms['EBAY']).toBe('daily_budget_exhausted');
    });
  });

  // -----------------------------------------------------------------------
  // Story 10.2: Expiry detection pass
  // -----------------------------------------------------------------------

  describe('run() — expiry detection (Story 10.2)', () => {
    beforeEach(() => {
      mockMonitoringJob.findMany.mockResolvedValue([]);
      mockMonitoringJob.create.mockResolvedValue({ id: 'expiry-job-1' });
      mockMonitoringJob.update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});
    });

    it('creates expiry events for listings approaching expiry', async () => {
      const expiringListing = {
        id: 'listing-exp-1',
        title: 'iPhone',
        platform: 'CRAIGSLIST',
        url: 'https://cl/1',
        userId: 'user-1',
        postedAt: new Date('2026-01-01'),
        estimatedExpiresAt: new Date(Date.now() + 12 * 3_600_000),
        askingPrice: 100,
      };

      const { getExpiringListings } = jest.requireMock('@/lib/listing-expiry') as {
        getExpiringListings: jest.Mock;
      };
      getExpiringListings.mockResolvedValueOnce([expiringListing]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.expiryEventsCreated).toBe(1);
    });

    it('backfills estimatedExpiresAt lazily for listings with postedAt but no expiry', async () => {
      // Listing that has postedAt but no estimatedExpiresAt — should be backfilled
      // via the separate prisma.listing.findMany({ where: { estimatedExpiresAt: null } }) query
      const listingWithoutExpiry = {
        id: 'listing-exp-2',
        platform: 'CRAIGSLIST',
        postedAt: new Date('2026-01-01'),
      };

      const { computeEstimatedExpiry } = jest.requireMock('@/lib/listing-expiry') as {
        computeEstimatedExpiry: jest.Mock;
      };

      const computed = new Date(Date.now() + 10 * 3_600_000);
      // Backfill query (prisma.listing.findMany WHERE estimatedExpiresAt IS NULL) returns the listing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValueOnce([listingWithoutExpiry]);
      computeEstimatedExpiry.mockReturnValueOnce(computed);
      // getExpiringListings returns nothing after backfill (no expiry events this run)

      const summary = await service.run();

      expect(computeEstimatedExpiry).toHaveBeenCalledWith('CRAIGSLIST', listingWithoutExpiry.postedAt);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockPrisma.listing as any).update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-exp-2' },
          data: expect.objectContaining({ estimatedExpiresAt: computed }),
        })
      );
      expect(summary.status).toBe('COMPLETED');
    });

    it('skips expiry events for listings without a userId', async () => {
      const orphanListing = {
        id: 'listing-exp-3',
        title: 'Orphan',
        platform: 'CRAIGSLIST',
        url: 'https://cl/3',
        userId: null,
        postedAt: new Date('2026-01-01'),
        estimatedExpiresAt: new Date(Date.now() + 12 * 3_600_000),
        askingPrice: 50,
      };

      const { getExpiringListings } = jest.requireMock('@/lib/listing-expiry') as {
        getExpiringListings: jest.Mock;
      };
      getExpiringListings.mockResolvedValueOnce([orphanListing]);

      const summary = await service.run();
      expect(summary.expiryEventsCreated).toBe(0);
    });

    it('continues run when expiry detection pass throws', async () => {
      const { getExpiringListings } = jest.requireMock('@/lib/listing-expiry') as {
        getExpiringListings: jest.Mock;
      };
      getExpiringListings.mockRejectedValueOnce(new Error('DB timeout'));

      const summary = await service.run();
      expect(summary.status).toBe('COMPLETED');
      expect(summary.expiryEventsCreated).toBe(0);
    });

    it('treats unavailable reason from checkHtmlPlatformListing as the event reason (Story 10.2)', async () => {
      const { getTrackableListings, classifyHttpResponse, classifyUnavailableReason } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        classifyHttpResponse: jest.Mock;
        classifyUnavailableReason: jest.Mock;
      };
      const listing = makeListing();
      getTrackableListings.mockResolvedValueOnce([listing]);

      mockFetch.mockImplementationOnce(() => makeMockResponse(404, 'Not found'));
      classifyHttpResponse.mockReturnValueOnce('removed');
      classifyUnavailableReason.mockReturnValueOnce('deleted');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.eventsCreated).toBe(1);
      expect(classifyUnavailableReason).toHaveBeenCalledWith(404, 'Not found');
    });

    it('handles per-listing expiry event failure without aborting the pass', async () => {
      const listingA = {
        id: 'listing-exp-4',
        title: 'A',
        platform: 'CRAIGSLIST',
        url: 'https://cl/4',
        userId: 'user-1',
        postedAt: new Date('2026-01-01'),
        estimatedExpiresAt: new Date(Date.now() + 6 * 3_600_000),
        askingPrice: 75,
      };
      const listingB = { ...listingA, id: 'listing-exp-5', title: 'B' };

      const { getExpiringListings } = jest.requireMock('@/lib/listing-expiry') as {
        getExpiringListings: jest.Mock;
      };
      getExpiringListings.mockResolvedValueOnce([listingA, listingB]);

      // First transaction fails, second succeeds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any)
        .mockRejectedValueOnce(new Error('transaction failed'))
        .mockImplementationOnce((fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            listing: { update: jest.fn().mockResolvedValue({}) },
            notificationEvent: { create: jest.fn().mockResolvedValue({}) },
          })
        );

      const summary = await service.run();
      expect(summary.expiryEventsCreated).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // eBay batch handling (Story 10.1 coverage gaps)
  // -----------------------------------------------------------------------

  describe('run() — eBay batch paths', () => {
    beforeEach(() => {
      mockMonitoringJob.findMany.mockResolvedValue([]);
      mockMonitoringJob.create.mockResolvedValue({ id: 'ebay-job-1' });
      mockMonitoringJob.update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});
    });

    const makeEbayListing = (id: string, askingPrice = 100) => ({
      id,
      title: `eBay Item ${id}`,
      platform: 'EBAY',
      url: `https://ebay.com/itm/${id.padStart(12, '9')}`,
      askingPrice,
      status: 'NEW',
      userId: 'user-1',
      lastMonitoredAt: null,
    });

    it('processes eBay listings via the Browse API and emits sold events', async () => {
      const listing = makeEbayListing('998877665544');

      const { getTrackableListings, detectSoldStatus } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        detectSoldStatus: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      detectSoldStatus.mockReturnValue(true);

      const { callEbayApi } = jest.requireMock('@/scrapers/ebay/scraper') as {
        callEbayApi: jest.Mock;
      };
      callEbayApi.mockResolvedValueOnce({
        itemSummaries: [
          { itemId: '998877665544', itemEndDate: '2026-04-08T10:00:00Z', price: { value: '100' } },
        ],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.eventsCreated).toBe(1);
      expect(summary.listingsChecked).toBe(1);
    });

    it('detects price changes on eBay listings', async () => {
      const listing = makeEbayListing('112233445566', 100);

      const { getTrackableListings, isPriceChangeMeaningful } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        isPriceChangeMeaningful: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      isPriceChangeMeaningful.mockReturnValue(true);

      const { callEbayApi } = jest.requireMock('@/scrapers/ebay/scraper') as {
        callEbayApi: jest.Mock;
      };
      callEbayApi.mockResolvedValueOnce({
        itemSummaries: [
          { itemId: '112233445566', price: { value: '75' } }, // price dropped from 100 → 75
        ],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.eventsCreated).toBe(1);
    });

    it('marks eBay listings not in API response as unavailable', async () => {
      const listing = makeEbayListing('223344556677');

      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);

      const { callEbayApi } = jest.requireMock('@/scrapers/ebay/scraper') as {
        callEbayApi: jest.Mock;
      };
      callEbayApi.mockResolvedValueOnce({ itemSummaries: [] });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.eventsCreated).toBe(1);
    });

    it('handles eBay API failures gracefully (marks all as parse failure, no events)', async () => {
      const listing = makeEbayListing('334455667788');

      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);

      const { callEbayApi } = jest.requireMock('@/scrapers/ebay/scraper') as {
        callEbayApi: jest.Mock;
      };
      callEbayApi.mockRejectedValueOnce(new Error('eBay API timeout'));

      const summary = await service.run();
      // No events — all results marked as parse failure, not unavailable
      expect(summary.eventsCreated).toBe(0);
      expect(summary.listingsChecked).toBe(1);
    });

    it('skips eBay listings whose URL lacks a valid item ID', async () => {
      const invalidListing = {
        ...makeEbayListing('zz'),
        url: 'https://ebay.com/malformed',
      };

      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([invalidListing]);

      const summary = await service.run();
      expect(summary.listingsChecked).toBe(1);
      expect(summary.eventsCreated).toBe(0);
    });

    it('suppresses eBay unavailable events when the anomaly threshold is exceeded', async () => {
      const listing = makeEbayListing('445566778899');

      const { getTrackableListings, updatePlatformParseStats, isAnomalyThresholdExceeded } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        updatePlatformParseStats: jest.Mock;
        isAnomalyThresholdExceeded: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      // Simulate the platformStats being populated
      updatePlatformParseStats.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stats: Record<string, any>, platform: string) => {
          if (!stats[platform]) stats[platform] = { checked: 0, parsed: 0, events: 0, unavailable: 0 };
          stats[platform].checked++;
          stats[platform].unavailable++;
        }
      );
      isAnomalyThresholdExceeded.mockReturnValueOnce(true);

      const { callEbayApi } = jest.requireMock('@/scrapers/ebay/scraper') as {
        callEbayApi: jest.Mock;
      };
      callEbayApi.mockResolvedValueOnce({ itemSummaries: [] }); // listing not found → unavailable

      const summary = await service.run();
      expect(summary.canaryWarning).toBe(true);
      expect(summary.eventsCreated).toBe(0);
    });

    it('handles per-listing transaction failures in eBay batch without aborting', async () => {
      const listing = makeEbayListing('556677889900');

      const { getTrackableListings, detectSoldStatus } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        detectSoldStatus: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      detectSoldStatus.mockReturnValue(true);

      const { callEbayApi } = jest.requireMock('@/scrapers/ebay/scraper') as {
        callEbayApi: jest.Mock;
      };
      callEbayApi.mockResolvedValueOnce({
        itemSummaries: [
          { itemId: '556677889900', itemEndDate: '2026-04-08T10:00:00Z', price: { value: '100' } },
        ],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockRejectedValueOnce(new Error('tx failed'));

      const summary = await service.run();
      expect(summary.errorsEncountered).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTML platform batch processing (Story 10.1 coverage gaps)
  // -----------------------------------------------------------------------

  describe('run() — HTML platform coverage gaps', () => {
    beforeEach(() => {
      mockMonitoringJob.findMany.mockResolvedValue([]);
      mockMonitoringJob.create.mockResolvedValue({ id: 'html-job-1' });
      mockMonitoringJob.update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValue([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).update.mockResolvedValue({});
    });

    it('emits a price-change event when isPriceChangeMeaningful returns true', async () => {
      const listing = makeListing({ askingPrice: 100 });

      const {
        getTrackableListings,
        extractCurrentPrice,
        isPriceChangeMeaningful,
        classifyHttpResponse,
      } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        extractCurrentPrice: jest.Mock;
        isPriceChangeMeaningful: jest.Mock;
        classifyHttpResponse: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      // Reset any persistent overrides from prior tests, then use mockReturnValue so
      // every call during this test returns the new price
      classifyHttpResponse.mockReturnValue('ok');
      extractCurrentPrice.mockReturnValue(80); // price dropped 20%
      isPriceChangeMeaningful.mockReturnValue(true);

      mockFetch.mockImplementation(() => makeMockResponse(200, 'iPhone - $80'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(summary.eventsCreated).toBe(1);
    });

    it('exercises direction:decrease (price drops meaningfully)', async () => {
      const listing = makeListing({ askingPrice: 100 });

      const {
        getTrackableListings,
        extractCurrentPrice,
        isPriceChangeMeaningful,
        classifyHttpResponse,
        detectSoldStatus,
      } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        extractCurrentPrice: jest.Mock;
        isPriceChangeMeaningful: jest.Mock;
        classifyHttpResponse: jest.Mock;
        detectSoldStatus: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      classifyHttpResponse.mockReturnValue('ok');
      detectSoldStatus.mockReturnValue(false);
      extractCurrentPrice.mockReturnValue(75);
      isPriceChangeMeaningful.mockReturnValue(true);

      mockFetch.mockImplementation(() => makeMockResponse(200, 'On sale - $75'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(isPriceChangeMeaningful).toHaveBeenCalled();
      expect(summary.eventsCreated).toBe(1);
    });

    it('exercises direction:increase branch when price increases meaningfully', async () => {
      const listing = makeListing({ askingPrice: 100 });

      const {
        getTrackableListings,
        extractCurrentPrice,
        isPriceChangeMeaningful,
        classifyHttpResponse,
        detectSoldStatus,
      } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        extractCurrentPrice: jest.Mock;
        isPriceChangeMeaningful: jest.Mock;
        classifyHttpResponse: jest.Mock;
        detectSoldStatus: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      classifyHttpResponse.mockReturnValue('ok');
      detectSoldStatus.mockReturnValue(false);
      extractCurrentPrice.mockReturnValue(130);
      isPriceChangeMeaningful.mockReturnValue(true);

      mockFetch.mockImplementation(() => makeMockResponse(200, 'Listing - $130'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$transaction as any).mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          listing: { update: jest.fn().mockResolvedValue({}) },
          notificationEvent: { create: jest.fn().mockResolvedValue({}) },
        })
      );

      const summary = await service.run();
      expect(isPriceChangeMeaningful).toHaveBeenCalled();
      expect(summary.eventsCreated).toBe(1);
    });

    it('suppresses unavailable events when anomaly threshold is exceeded in processOneListing', async () => {
      const listing = makeListing();

      const { getTrackableListings, classifyHttpResponse, isAnomalyThresholdExceeded, classifyUnavailableReason } =
        jest.requireMock('@/lib/listing-tracker') as {
          getTrackableListings: jest.Mock;
          classifyHttpResponse: jest.Mock;
          isAnomalyThresholdExceeded: jest.Mock;
          classifyUnavailableReason: jest.Mock;
        };
      getTrackableListings.mockResolvedValueOnce([listing]);
      classifyHttpResponse.mockReturnValueOnce('removed');
      classifyUnavailableReason.mockReturnValueOnce('removed');
      isAnomalyThresholdExceeded.mockReturnValueOnce(true);

      mockFetch.mockImplementationOnce(() => makeMockResponse(404, 'Not found'));

      const summary = await service.run();
      expect(summary.eventsCreated).toBe(0); // suppressed by anomaly detection
      expect(summary.listingsChecked).toBe(1);
    });

    it('sets completedEarly when max run duration is exceeded before an HTML batch', async () => {
      const listing = makeListing();

      const { getTrackableListings } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);

      // Mock Date.now(): first call sets runStart=0; all subsequent calls return a value
      // exceeding maxRunDurationMs (600_000ms default), triggering completedEarly.
      const nowSpy = jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0)      // runStart = 0
        .mockReturnValue(700_000);   // all later calls: 700s > maxRunDurationMs (600s)

      try {
        const summary = await service.run();
        expect(summary.completedEarly).toBe(true);
        // processOneListing should not have been called — we broke before reaching it
        expect(mockFetch).not.toHaveBeenCalled();
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('trips the circuit breaker after N consecutive failures', async () => {
      // 25 listings — bigger than batchSize (20) so the inter-batch circuit-breaker
      // check after batch 1 fires before batch 2 starts
      const listings = Array.from({ length: 25 }, (_, i) =>
        makeListing({ id: `failing-${i}`, url: `https://cl/${i}` })
      );

      const { getTrackableListings, classifyHttpResponse } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        classifyHttpResponse: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce(listings);

      // Suppress setTimeout delays inside withRetry to keep the test fast
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(((cb: () => void) => {
          cb();
          return 0 as unknown as NodeJS.Timeout;
        }) as any);

      try {
        // classifyHttpResponse throws → processOneListing catches, marks hadError
        classifyHttpResponse.mockImplementation(() => {
          throw new Error('classify failure');
        });
        mockFetch.mockImplementation(() => makeMockResponse(200, 'ok body'));

        const summary = await service.run();
        expect(summary.errorsEncountered).toBeGreaterThan(0);
        expect(summary.skippedPlatforms['CRAIGSLIST']).toBe('circuit_breaker_tripped');
      } finally {
        setTimeoutSpy.mockRestore();
        // Reset the classifyHttpResponse implementation for subsequent tests
        classifyHttpResponse.mockImplementation(() => 'ok');
      }
    }, 30000);

    it('triggers canary warning when parse success rate drops below 50%', async () => {
      // Need 5+ checked listings so the canary check runs. Use 6 listings
      // all parseSuccess=false to drop parse rate to 0%
      const listings = Array.from({ length: 6 }, (_, i) =>
        makeListing({ id: `canary-${i}`, url: `https://cl/canary/${i}` })
      );

      const {
        getTrackableListings,
        extractCurrentPrice,
        updatePlatformParseStats,
      } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        extractCurrentPrice: jest.Mock;
        updatePlatformParseStats: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce(listings);
      extractCurrentPrice.mockReturnValue(null);

      // Populate platformStats realistically — 6 checks, 0 parsed
      updatePlatformParseStats.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stats: Record<string, any>, platform: string, parsed: boolean) => {
          if (!stats[platform]) stats[platform] = { checked: 0, parsed: 0, events: 0, unavailable: 0 };
          stats[platform].checked++;
          if (parsed) stats[platform].parsed++;
        }
      );

      mockFetch.mockImplementation(() => makeMockResponse(200, 'no price info here'));

      const summary = await service.run();
      expect(summary.canaryWarning).toBe(true);
    });

    it('rethrows RateLimitError from processOneListing to increment circuit breaker counter', async () => {
      const listing = makeListing();

      const { getTrackableListings, classifyHttpResponse } = jest.requireMock('@/lib/listing-tracker') as {
        getTrackableListings: jest.Mock;
        classifyHttpResponse: jest.Mock;
      };
      getTrackableListings.mockResolvedValueOnce([listing]);
      classifyHttpResponse.mockReturnValue('rate_limited');

      mockFetch.mockImplementation(() => makeMockResponse(429, 'Too many requests'));

      const summary = await service.run();
      expect(summary.errorsEncountered).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // completeJob / failJob error handling
  // -----------------------------------------------------------------------

  describe('completeJob() / failJob() error handling', () => {
    it('wraps non-Prisma errors from completeJob update as-is', async () => {
      mockMonitoringJob.update.mockRejectedValueOnce(new Error('plain error'));

      await expect(
        service.completeJob('job-1', {
          listingsChecked: 0,
          eventsCreated: 0,
          expiryEventsCreated: 0,
          errorsEncountered: 0,
          platformStats: {},
          skippedPlatforms: {},
          completedEarly: false,
          canaryWarning: false,
        })
      ).rejects.toThrow('plain error');
    });

    it('wraps non-Prisma errors from failJob update as-is', async () => {
      mockMonitoringJob.update.mockRejectedValueOnce(new Error('plain fail error'));

      await expect(service.failJob('job-2', 'reason')).rejects.toThrow('plain fail error');
    });

    it('wraps PrismaClientKnownRequestError from completeJob as ExternalServiceError', async () => {
      const { Prisma } = jest.requireActual('@/generated/prisma') as {
        Prisma: { PrismaClientKnownRequestError: new (...args: unknown[]) => Error };
      };
      const prismaErr = new Prisma.PrismaClientKnownRequestError(
        'DB constraint violation',
        { code: 'P1000', clientVersion: 'test' }
      );
      mockMonitoringJob.update.mockRejectedValueOnce(prismaErr);

      await expect(
        service.completeJob('job-3', {
          listingsChecked: 0,
          eventsCreated: 0,
          expiryEventsCreated: 0,
          errorsEncountered: 0,
          platformStats: {},
          skippedPlatforms: {},
          completedEarly: false,
          canaryWarning: false,
        })
      ).rejects.toBeInstanceOf(ExternalServiceError);
    });

    it('wraps PrismaClientKnownRequestError from failJob as ExternalServiceError', async () => {
      const { Prisma } = jest.requireActual('@/generated/prisma') as {
        Prisma: { PrismaClientKnownRequestError: new (...args: unknown[]) => Error };
      };
      const prismaErr = new Prisma.PrismaClientKnownRequestError(
        'DB constraint violation',
        { code: 'P1001', clientVersion: 'test' }
      );
      mockMonitoringJob.update.mockRejectedValueOnce(prismaErr);

      await expect(service.failJob('job-4', 'reason')).rejects.toBeInstanceOf(ExternalServiceError);
    });
  });

  // -----------------------------------------------------------------------
  // Preflight error paths (Story 10.1 coverage gaps)
  // -----------------------------------------------------------------------

  describe('run() — preflight coverage gaps', () => {
    beforeEach(() => {
      mockMonitoringJob.findMany.mockResolvedValue([]);
      mockMonitoringJob.create.mockResolvedValue({ id: 'preflight-job-1' });
      mockMonitoringJob.update.mockResolvedValue({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockResolvedValue([]);
    });

    it('marks FACEBOOK_MARKETPLACE skipped when no valid Facebook token exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma as any).facebookToken.findFirst.mockResolvedValueOnce(null);

      const summary = await service.run();
      expect(summary.skippedPlatforms['FACEBOOK_MARKETPLACE']).toBe('no_valid_token');
    });

    it('proceeds when eBay budget check throws (catch block)', async () => {
      // First call is stale-jobs check (inside the service), next call is budget check.
      // Simulate budget check failure by making monitoringJob.findMany reject on the 2nd call.
      mockMonitoringJob.findMany
        .mockResolvedValueOnce([]) // stale jobs check
        .mockRejectedValueOnce(new Error('budget query failed')); // getRemainingEbayBudget

      const summary = await service.run();
      // Should still complete — the catch block logs the failure and proceeds
      expect(summary.status).toBe('COMPLETED');
      expect(summary.skippedPlatforms['EBAY']).toBeUndefined();
    });

    it('marks FACEBOOK_MARKETPLACE as token_check_failed when facebookToken.findFirst throws', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma as any).facebookToken.findFirst.mockRejectedValueOnce(new Error('DB error'));

      const summary = await service.run();
      expect(summary.skippedPlatforms['FACEBOOK_MARKETPLACE']).toBe('token_check_failed');
    });
  });

  // -----------------------------------------------------------------------
  // Backfill error catch — expiry step
  // -----------------------------------------------------------------------

  describe('run() — backfill error handling', () => {
    beforeEach(() => {
      mockMonitoringJob.findMany.mockResolvedValue([]);
      mockMonitoringJob.create.mockResolvedValue({ id: 'backfill-job-1' });
      mockMonitoringJob.update.mockResolvedValue({});
    });

    it('continues the run when the lazy backfill findMany throws', async () => {
      // The backfill calls prisma.listing.findMany directly (not via getTrackableListings mock).
      // Making it reject exercises the backfill catch block (logger.warn), then the run continues.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.listing as any).findMany.mockRejectedValueOnce(new Error('Backfill DB error'));

      const summary = await service.run();
      expect(summary.status).toBe('COMPLETED');
    });
  });

});

