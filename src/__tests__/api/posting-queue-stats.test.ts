import { GET } from '@/app/api/posting-queue/stats/route';

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/posting-queue-processor', () => ({
  getQueueStats: jest.fn(),
}));

import { getAuthUserId } from '@/lib/auth-middleware';
import { getQueueStats } from '@/lib/posting-queue-processor';

describe('GET /api/posting-queue/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns queue stats for authenticated user', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
    (getQueueStats as jest.Mock).mockResolvedValue({
      pending: 5,
      processing: 2,
      completed: 10,
      failed: 1,
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.pending).toBe(5);
    expect(data.completed).toBe(10);
    expect(getQueueStats).toHaveBeenCalledWith('user-123');
  });

  it('returns 500 on internal error', async () => {
    (getAuthUserId as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
