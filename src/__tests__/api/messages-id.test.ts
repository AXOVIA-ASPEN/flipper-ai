/**
 * Tests for /api/messages/[id] route
 * Covers: GET, PATCH (approve/edit/reject), DELETE
 */
import { GET, PATCH, DELETE } from '@/app/api/messages/[id]/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth-middleware');

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(method: string, body?: unknown): Request {
  return {
    method,
    json: () => Promise.resolve(body || {}),
  } as unknown as Request;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockMessage = {
  id: 'msg-1',
  userId: 'user-1',
  direction: 'OUTBOUND',
  status: 'DRAFT',
  body: 'Hello, is this still available?',
  subject: null,
  sellerName: 'Seller A',
  sellerContact: null,
  platform: 'craigslist',
  listingId: 'listing-1',
  parentId: null,
  sentAt: null,
  readAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  listing: { id: 'listing-1', title: 'iPhone 14', platform: 'craigslist', askingPrice: 500, imageUrls: '[]' },
};

describe('/api/messages/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('user-1');
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);
      const res = await GET(makeRequest('GET') as any, makeParams('msg-1'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when message not found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(makeRequest('GET') as any, makeParams('msg-999'));
      expect(res.status).toBe(404);
    });

    it('returns message when found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      const res = await GET(makeRequest('GET') as any, makeParams('msg-1'));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('msg-1');
    });

    it('handles server errors', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await GET(makeRequest('GET') as any, makeParams('msg-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    beforeEach(() => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when message not found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-999'));
      expect(res.status).toBe(404);
    });

    it('returns 400 when action is missing', async () => {
      const res = await PATCH(makeRequest('PATCH', {}) as any, makeParams('msg-1'));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid action', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'invalid' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(400);
    });

    it('approves a DRAFT message (sets SENT + sentAt)', async () => {
      const updated = { ...mockMessage, status: 'SENT', sentAt: new Date() };
      (mockPrisma.message.update as jest.Mock).mockResolvedValue(updated);

      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.action).toBe('approve');
      expect(mockPrisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        })
      );
    });

    it('edits a message body and resets to DRAFT', async () => {
      const updated = { ...mockMessage, body: 'Updated body', status: 'DRAFT' };
      (mockPrisma.message.update as jest.Mock).mockResolvedValue(updated);

      const res = await PATCH(
        makeRequest('PATCH', { action: 'edit', body: 'Updated body' }) as any,
        makeParams('msg-1')
      );
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.action).toBe('edit');
    });

    it('edits message subject', async () => {
      const updated = { ...mockMessage, subject: 'New subject', status: 'DRAFT' };
      (mockPrisma.message.update as jest.Mock).mockResolvedValue(updated);

      const res = await PATCH(
        makeRequest('PATCH', { action: 'edit', subject: 'New subject' }) as any,
        makeParams('msg-1')
      );
      expect(res.status).toBe(200);
    });

    it('returns 400 when edit has no body or subject', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'edit' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(400);
    });

    it('rejects a message (sets FAILED)', async () => {
      const updated = { ...mockMessage, status: 'FAILED' };
      (mockPrisma.message.update as jest.Mock).mockResolvedValue(updated);

      const res = await PATCH(makeRequest('PATCH', { action: 'reject' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(json.action).toBe('reject');
      expect(mockPrisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        })
      );
    });

    it('returns 409 for non-modifiable status (SENT)', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT' });
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    it('returns 409 for DELIVERED status', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'DELIVERED' });
      const res = await PATCH(makeRequest('PATCH', { action: 'reject' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    it('allows PENDING messages to be approved', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING' });
      (mockPrisma.message.update as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT' });

      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(200);
    });

    it('handles server errors', async () => {
      (mockPrisma.message.update as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);
      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-1'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when message not found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-999'));
      expect(res.status).toBe(404);
    });

    it('deletes a message', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.message.delete as jest.Mock).mockResolvedValue(mockMessage);

      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockPrisma.message.delete).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
    });

    it('handles server errors', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.message.delete as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-1'));
      expect(res.status).toBe(500);
    });
  });
});
