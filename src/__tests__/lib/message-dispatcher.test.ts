/**
 * @file src/__tests__/lib/message-dispatcher.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Tests for the message dispatch stub.
 *
 * @description
 * Verifies that dispatchMessage loads the message, logs the dispatch intent
 * for SENT messages, returns stub results, and does NOT update message status.
 */
import { dispatchMessage } from '@/lib/message-dispatcher';
import prisma from '@/lib/db';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('dispatchMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads message by ID', async () => {
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      status: 'SENT',
      platform: 'craigslist',
      sellerName: 'Seller A',
    });

    await dispatchMessage('msg-1');

    expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
  });

  it('returns success stub for SENT message', async () => {
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      status: 'SENT',
      platform: 'craigslist',
      sellerName: 'Seller A',
    });

    const result = await dispatchMessage('msg-1');

    expect(result).toEqual({ success: true, stub: true });
  });

  it('does NOT update message status', async () => {
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      status: 'SENT',
      platform: 'craigslist',
      sellerName: 'Seller A',
    });

    await dispatchMessage('msg-1');

    expect(mockPrisma.message.update).not.toHaveBeenCalled();
    expect(mockPrisma.message.updateMany).not.toHaveBeenCalled();
  });

  it('returns failure for non-existent message', async () => {
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await dispatchMessage('msg-nonexistent');

    expect(result).toEqual({ success: false, stub: true, error: 'not_found' });
  });

  it('returns failure for non-SENT message', async () => {
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      status: 'DRAFT',
      platform: 'craigslist',
      sellerName: 'Seller A',
    });

    const result = await dispatchMessage('msg-1');

    expect(result).toEqual({ success: false, stub: true, error: 'invalid_status' });
  });

  it('logs dispatch intent', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      status: 'SENT',
      platform: 'craigslist',
      sellerName: 'Seller A',
    });

    await dispatchMessage('msg-1');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[message-dispatcher] STUB: Would dispatch msg-1')
    );
    consoleSpy.mockRestore();
  });
});
