import { GET } from '@/app/api/health/ready/route';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/metrics', () => ({
  metrics: {
    observe: jest.fn(),
    increment: jest.fn(),
  },
}));

import { prisma } from '@/lib/db';

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ready when database is reachable', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ready');
    expect(data.checks.database.status).toBe('ok');
    expect(data.checks.database.latencyMs).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it('returns not_ready when database is unreachable', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe('not_ready');
    expect(data.checks.database.status).toBe('error');
  });
});
