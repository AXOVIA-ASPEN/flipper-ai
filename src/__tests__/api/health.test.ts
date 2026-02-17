/**
 * Tests for GET /api/health
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
  });

  it('uses APP_VERSION when set', async () => {
    const originalVersion = process.env.APP_VERSION;
    process.env.APP_VERSION = '1.2.3';
    try {
      const res = await GET();
      const data = await res.json();
      expect(data.version).toBe('1.2.3');
    } finally {
      if (originalVersion === undefined) {
        delete process.env.APP_VERSION;
      } else {
        process.env.APP_VERSION = originalVersion;
      }
    }
  });

  it('falls back to 0.1.0 when APP_VERSION is not set', async () => {
    const originalVersion = process.env.APP_VERSION;
    delete process.env.APP_VERSION;
    try {
      const res = await GET();
      const data = await res.json();
      expect(data.version).toBe('0.1.0');
    } finally {
      if (originalVersion !== undefined) {
        process.env.APP_VERSION = originalVersion;
      }
    }
  });

  it('returns NODE_ENV in response', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.environment).toBeDefined();
    expect(typeof data.environment).toBe('string');
  });

  it('falls back to development when NODE_ENV is not set', async () => {
    const originalEnv = process.env.NODE_ENV;
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    try {
      const res = await GET();
      const data = await res.json();
      expect(data.environment).toBe('development');
    } finally {
      if (originalEnv !== undefined) {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      }
    }
  });
});
