/**
 * @file src/__tests__/lib/conversation-status.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for conversation status service.
 *
 * @description
 * Tests conversation status retrieval, state transitions (valid and invalid),
 * ownership enforcement, and idempotent transition behavior.
 */

import {
  getConversationStatus,
  updateConversationStatus,
  transitionToPending,
  transitionToResponded,
  transitionToPurchased,
  CONVERSATION_STATUSES,
} from '@/lib/conversation-status';

// Mock Prisma
const mockListingFindFirst = jest.fn();
const mockListingUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findFirst: (...args: unknown[]) => mockListingFindFirst(...args),
      update: (...args: unknown[]) => mockListingUpdate(...args),
    },
  },
}));

// ── Tests ───────────────────────────────────────────────────────────────────

describe('conversation-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CONVERSATION_STATUSES', () => {
    it('exports valid status constants', () => {
      expect(CONVERSATION_STATUSES).toEqual(['pending', 'responded', 'purchased']);
    });
  });

  // ── getConversationStatus ──────────────────────────────────────────────

  describe('getConversationStatus', () => {
    it('returns null when listing has no conversation status', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      const status = await getConversationStatus('listing-1', 'user-1');
      expect(status).toBeNull();
    });

    it('returns current conversation status', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
      const status = await getConversationStatus('listing-1', 'user-1');
      expect(status).toBe('pending');
    });

    it('throws NotFoundError when listing not found', async () => {
      mockListingFindFirst.mockResolvedValue(null);
      await expect(getConversationStatus('bad-id', 'user-1')).rejects.toThrow(
        'Listing not found'
      );
    });

    it('scopes query to userId for ownership', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      await getConversationStatus('listing-1', 'user-1');
      expect(mockListingFindFirst).toHaveBeenCalledWith({
        where: { id: 'listing-1', userId: 'user-1' },
        select: { conversationStatus: true },
      });
    });
  });

  // ── updateConversationStatus ───────────────────────────────────────────

  describe('updateConversationStatus', () => {
    it('transitions null → pending', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      mockListingUpdate.mockResolvedValue({});
      const result = await updateConversationStatus('listing-1', 'user-1', 'pending');
      expect(result).toBe('pending');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'pending' },
      });
    });

    it('transitions pending → responded', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
      mockListingUpdate.mockResolvedValue({});
      const result = await updateConversationStatus('listing-1', 'user-1', 'responded');
      expect(result).toBe('responded');
    });

    it('transitions pending → purchased', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
      mockListingUpdate.mockResolvedValue({});
      const result = await updateConversationStatus('listing-1', 'user-1', 'purchased');
      expect(result).toBe('purchased');
    });

    it('transitions responded → purchased', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      mockListingUpdate.mockResolvedValue({});
      const result = await updateConversationStatus('listing-1', 'user-1', 'purchased');
      expect(result).toBe('purchased');
    });

    it('returns idempotently for responded → responded (no DB update)', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      const result = await updateConversationStatus('listing-1', 'user-1', 'responded');
      expect(result).toBe('responded');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('returns idempotently for purchased → purchased (no DB update)', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'purchased' });
      const result = await updateConversationStatus('listing-1', 'user-1', 'purchased');
      expect(result).toBe('purchased');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('rejects responded → pending', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      await expect(
        updateConversationStatus('listing-1', 'user-1', 'pending')
      ).rejects.toThrow('Invalid conversation status transition: responded → pending');
    });

    it('rejects purchased → pending', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'purchased' });
      await expect(
        updateConversationStatus('listing-1', 'user-1', 'pending')
      ).rejects.toThrow('Invalid conversation status transition: purchased → pending');
    });

    it('rejects purchased → responded', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'purchased' });
      await expect(
        updateConversationStatus('listing-1', 'user-1', 'responded')
      ).rejects.toThrow('Invalid conversation status transition: purchased → responded');
    });

    it('rejects null → responded (must go through pending first)', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      await expect(
        updateConversationStatus('listing-1', 'user-1', 'responded')
      ).rejects.toThrow('Invalid conversation status transition: null → responded');
    });

    it('transitions null → purchased (direct purchase without prior messaging)', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      mockListingUpdate.mockResolvedValue({});
      const result = await updateConversationStatus('listing-1', 'user-1', 'purchased');
      expect(result).toBe('purchased');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'purchased' },
      });
    });

    it('throws NotFoundError when listing not found', async () => {
      mockListingFindFirst.mockResolvedValue(null);
      await expect(
        updateConversationStatus('bad-id', 'user-1', 'pending')
      ).rejects.toThrow('Listing not found');
    });

    it('rejects unrecognized current status (defensive fallback for unexpected DB data)', async () => {
      // Covers the isValidTransition ternary else branch: when the current status
      // is not in VALID_TRANSITIONS (e.g., stale/corrupt DB data), allowed is
      // undefined (falsy) → returns false → transition is invalid.
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'unknown_state' });
      await expect(
        updateConversationStatus('listing-1', 'user-1', 'pending')
      ).rejects.toThrow('Invalid conversation status transition: unknown_state → pending');
    });
  });

  // ── transitionToPending ────────────────────────────────────────────────

  describe('transitionToPending', () => {
    it('sets status to pending when currently null', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      mockListingUpdate.mockResolvedValue({});
      await transitionToPending('listing-1', 'user-1');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'pending' },
      });
    });

    it('does nothing when already pending', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
      await transitionToPending('listing-1', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when already responded', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      await transitionToPending('listing-1', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when listing not found (fire-and-forget safe)', async () => {
      mockListingFindFirst.mockResolvedValue(null);
      await transitionToPending('bad-id', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });
  });

  // ── transitionToResponded ──────────────────────────────────────────────

  describe('transitionToResponded', () => {
    it('sets status to responded when currently pending', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
      mockListingUpdate.mockResolvedValue({});
      await transitionToResponded('listing-1', 'user-1');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'responded' },
      });
    });

    it('does nothing when currently null', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      await transitionToResponded('listing-1', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when already responded', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      await transitionToResponded('listing-1', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when purchased (terminal)', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'purchased' });
      await transitionToResponded('listing-1', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when listing not found (fire-and-forget safe)', async () => {
      mockListingFindFirst.mockResolvedValue(null);
      await transitionToResponded('bad-id', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });
  });

  // ── transitionToPurchased ──────────────────────────────────────────────

  describe('transitionToPurchased', () => {
    it('sets status to purchased from null', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: null });
      mockListingUpdate.mockResolvedValue({});
      await transitionToPurchased('listing-1', 'user-1');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'purchased' },
      });
    });

    it('sets status to purchased from pending', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'pending' });
      mockListingUpdate.mockResolvedValue({});
      await transitionToPurchased('listing-1', 'user-1');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'purchased' },
      });
    });

    it('sets status to purchased from responded', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'responded' });
      mockListingUpdate.mockResolvedValue({});
      await transitionToPurchased('listing-1', 'user-1');
      expect(mockListingUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { conversationStatus: 'purchased' },
      });
    });

    it('does nothing when already purchased (idempotent)', async () => {
      mockListingFindFirst.mockResolvedValue({ conversationStatus: 'purchased' });
      await transitionToPurchased('listing-1', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when listing not found (fire-and-forget safe)', async () => {
      mockListingFindFirst.mockResolvedValue(null);
      await transitionToPurchased('bad-id', 'user-1');
      expect(mockListingUpdate).not.toHaveBeenCalled();
    });
  });
});
