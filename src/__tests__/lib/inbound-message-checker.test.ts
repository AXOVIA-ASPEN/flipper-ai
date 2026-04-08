/**
 * @file src/__tests__/lib/inbound-message-checker.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for inbound message checker service.
 *
 * @description
 * Tests platform routing, stub checkers, deduplication logic,
 * message creation on found inbound, and auto-transition to responded.
 */

import { checkForReplies, getPlatformCheckers } from '@/lib/inbound-message-checker';
import type { ListingData } from '@/lib/inbound-message-checker';

// Mock Prisma
const mockListingFindFirst = jest.fn();
const mockListingUpdate = jest.fn();
const mockMessageFindFirst = jest.fn();
const mockMessageCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findFirst: (...args: unknown[]) => mockListingFindFirst(...args),
      update: (...args: unknown[]) => mockListingUpdate(...args),
    },
    message: {
      findFirst: (...args: unknown[]) => mockMessageFindFirst(...args),
      create: (...args: unknown[]) => mockMessageCreate(...args),
    },
  },
}));

// Mock conversation-status (transitionToResponded)
const mockTransitionToResponded = jest.fn();
jest.mock('@/lib/conversation-status', () => ({
  transitionToResponded: (...args: unknown[]) => mockTransitionToResponded(...args),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const sampleListing: ListingData = {
  id: 'listing-1',
  platform: 'CRAIGSLIST',
  sellerName: 'John',
  sellerContact: 'john@example.com',
  url: 'https://craigslist.org/123',
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('inbound-message-checker', () => {
  // Snapshot of the original PLATFORM_CHECKERS registry so that tests which
  // replace a checker can be rolled back in afterEach — ensures test isolation
  // even when a test throws before its inline restore line runs.
  let originalCheckers: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
    originalCheckers = { ...getPlatformCheckers() };
  });

  afterEach(() => {
    const checkers = getPlatformCheckers() as Record<string, unknown>;
    // Restore any keys that were mutated during the test.
    for (const key of Object.keys(checkers)) {
      if (originalCheckers[key] !== undefined) {
        checkers[key] = originalCheckers[key];
      } else {
        delete checkers[key];
      }
    }
  });

  // ── getPlatformCheckers ────────────────────────────────────────────────

  describe('getPlatformCheckers', () => {
    it('has checkers for all supported platforms', () => {
      const checkers = getPlatformCheckers();
      expect(Object.keys(checkers)).toEqual(
        expect.arrayContaining(['CRAIGSLIST', 'FACEBOOK', 'EBAY', 'MERCARI', 'OFFERUP'])
      );
    });
  });

  // ── stub checkers ─────────────────────────────────────────────────────

  describe('stub checkers', () => {
    it('all stubs return found: false with empty messages', async () => {
      const checkers = getPlatformCheckers();
      for (const [platform, checker] of Object.entries(checkers)) {
        const result = await checker.checkForReplies(
          { ...sampleListing, platform },
          'user-1'
        );
        expect(result.found).toBe(false);
        expect(result.messages).toEqual([]);
        expect(result.platform).toBe(platform);
      }
    });
  });

  // ── checkForReplies ───────────────────────────────────────────────────

  describe('checkForReplies', () => {
    it('returns checked: false for unsupported platform', async () => {
      const listing = { ...sampleListing, platform: 'UNKNOWN' };
      const result = await checkForReplies(listing, 'user-1');
      expect(result.checked).toBe(false);
      expect(result.newMessages).toBe(0);
      expect(result.conversationStatus).toBeNull();
    });

    it('returns checked: true with 0 new messages for stub platforms', async () => {
      const result = await checkForReplies(sampleListing, 'user-1');
      expect(result.checked).toBe(true);
      expect(result.newMessages).toBe(0);
      expect(result.conversationStatus).toBe('pending');
    });

    it('returns current conversation status when no new messages', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      const result = await checkForReplies(sampleListing, 'user-1');
      expect(result.conversationStatus).toBe('responded');
    });

    it('returns null conversation status when listing has no status', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      const result = await checkForReplies(sampleListing, 'user-1');
      expect(result.conversationStatus).toBeNull();
    });
  });

  // ── deduplication ─────────────────────────────────────────────────────

  describe('deduplication', () => {
    it('does not create duplicate inbound messages', async () => {
      // Override the stub checker to return a found message.
      // Registry restoration is handled by afterEach — no inline rollback needed.
      const checkers = getPlatformCheckers();
      checkers['CRAIGSLIST'] = {
        async checkForReplies() {
          return {
            found: true,
            messages: [{ body: 'Is this still available?', sellerName: 'John' }],
            platform: 'CRAIGSLIST',
          };
        },
      };

      // Simulate duplicate found
      mockMessageFindFirst.mockResolvedValue({ id: 'existing-msg' });
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });

      const result = await checkForReplies(sampleListing, 'user-1');

      expect(result.newMessages).toBe(0);
      expect(mockMessageCreate).not.toHaveBeenCalled();
      expect(mockTransitionToResponded).not.toHaveBeenCalled();
    });
  });

  // ── message creation on found inbound ─────────────────────────────────

  describe('message creation on found inbound', () => {
    it('creates INBOUND DELIVERED message and transitions to responded', async () => {
      const checkers = getPlatformCheckers();
      checkers['CRAIGSLIST'] = {
        async checkForReplies() {
          return {
            found: true,
            messages: [
              {
                body: 'Yes, still available!',
                sellerName: 'John',
                receivedAt: new Date('2026-03-31T10:00:00Z'),
              },
            ],
            platform: 'CRAIGSLIST',
          };
        },
      };

      // No duplicate
      mockMessageFindFirst.mockResolvedValue(null);
      mockMessageCreate.mockResolvedValue({ id: 'new-msg' });
      mockTransitionToResponded.mockResolvedValue(undefined);
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });

      const result = await checkForReplies(sampleListing, 'user-1');

      expect(result.newMessages).toBe(1);
      expect(mockMessageCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          listingId: 'listing-1',
          direction: 'INBOUND',
          status: 'DELIVERED',
          body: 'Yes, still available!',
          sellerName: 'John',
          platform: 'CRAIGSLIST',
          sentAt: new Date('2026-03-31T10:00:00Z'),
        },
      });
      expect(mockTransitionToResponded).toHaveBeenCalledWith('listing-1', 'user-1');
      expect(result.conversationStatus).toBe('responded');
    });

    it('uses listing sellerName when message has no sellerName', async () => {
      const checkers = getPlatformCheckers();
      checkers['CRAIGSLIST'] = {
        async checkForReplies() {
          return {
            found: true,
            messages: [{ body: 'Reply without seller name' }],
            platform: 'CRAIGSLIST',
          };
        },
      };

      mockMessageFindFirst.mockResolvedValue(null);
      mockMessageCreate.mockResolvedValue({ id: 'new-msg' });
      mockTransitionToResponded.mockResolvedValue(undefined);
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });

      await checkForReplies(sampleListing, 'user-1');

      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerName: 'John',
          }),
        })
      );
    });
  });
});
