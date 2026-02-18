/**
 * Tests for GET /api/diagnostics
 * Diagnostics endpoint for checking system health
 */

import { GET } from '../../../app/api/diagnostics/route';
import prisma from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('GET /api/diagnostics', () => {
  const mockEnv = (overrides: Partial<NodeJS.ProcessEnv> = {}) => {
    const original = process.env;
    process.env = {
      ...original,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'test-secret',
      ...overrides,
    };
    return () => {
      process.env = original;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('environment variables check', () => {
    it('reports all required env vars as set', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.envVars).toEqual({
        DATABASE_URL: '✅ Set',
        NEXTAUTH_URL: '✅ Set',
        NEXTAUTH_SECRET: '✅ Set',
      });

      restore();
    });

    it('reports missing DATABASE_URL', async () => {
      const restore = mockEnv({ DATABASE_URL: undefined });

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.envVars.DATABASE_URL).toBe('❌ Missing');

      restore();
    });

    it('reports missing NEXTAUTH_URL', async () => {
      const restore = mockEnv({ NEXTAUTH_URL: undefined });

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.envVars.NEXTAUTH_URL).toBe('❌ Missing');

      restore();
    });

    it('reports missing NEXTAUTH_SECRET', async () => {
      const restore = mockEnv({ NEXTAUTH_SECRET: undefined });

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.envVars.NEXTAUTH_SECRET).toBe('❌ Missing');

      restore();
    });
  });

  describe('database connection check', () => {
    it('reports successful database connection', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(10);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.databaseConnection).toBe('✅ Connected');
      expect(data.checks.prismaClient).toBe('✅ Initialized');
      expect(response.status).toBe(200);

      restore();
    });

    it('reports database connection failure with error message', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      const response = await GET();
      const data = await response.json();

      expect(data.checks.databaseConnection).toBe(
        '❌ Failed: Connection timeout'
      );
      expect(response.status).toBe(500);

      restore();
    });

    it('handles non-Error database connection failure', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockRejectedValue('string error');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.databaseConnection).toBe('❌ Failed: Unknown error');
      expect(response.status).toBe(500);

      restore();
    });
  });

  describe('user table check', () => {
    it('reports user table accessible with count', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(42);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.userTable).toBe('✅ Accessible (42 users)');
      expect(response.status).toBe(200);

      restore();
    });

    it('reports user table query failure', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockRejectedValue(
        new Error('Table does not exist')
      );

      const response = await GET();
      const data = await response.json();

      expect(data.checks.userTable).toBe('❌ Failed: Table does not exist');
      expect(response.status).toBe(500);

      restore();
    });

    it('handles non-Error user table failure', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockRejectedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.userTable).toBe('❌ Failed: Unknown error');
      expect(response.status).toBe(500);

      restore();
    });

    it('reports zero users correctly', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed_value');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.userTable).toBe('✅ Accessible (0 users)');
      expect(response.status).toBe(200);

      restore();
    });
  });

  describe('bcrypt check', () => {
    it('reports bcrypt working when hash succeeds', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('$2a$12$hashedpassword');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.bcrypt).toBe('✅ Working');
      expect(bcrypt.hash).toHaveBeenCalledWith('test', 12);

      restore();
    });

    it('reports bcrypt failure when hash returns empty', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.bcrypt).toBe('❌ Failed to hash');

      restore();
    });

    it('reports bcrypt error when hash throws', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockRejectedValue(new Error('bcrypt not available'));

      const response = await GET();
      const data = await response.json();

      expect(data.checks.bcrypt).toBe('❌ Failed: bcrypt not available');

      restore();
    });

    it('handles non-Error bcrypt failure', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockRejectedValue('bcrypt error');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.bcrypt).toBe('❌ Failed: Unknown error');

      restore();
    });
  });

  describe('response structure', () => {
    it('includes timestamp in response', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed');

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now()
      );

      restore();
    });

    it('includes environment in response', async () => {
      const restore = mockEnv({ NODE_ENV: 'production' });

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed');

      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('production');

      restore();
    });

    it('sets status to healthy when all checks pass', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed');

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(response.status).toBe(200);

      restore();
    });

    it('returns 500 status on database connection failure', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('DB connection failed')
      );

      const response = await GET();

      expect(response.status).toBe(500);

      restore();
    });

    it('returns 500 status on user table failure', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockRejectedValue(
        new Error('User table error')
      );

      const response = await GET();

      expect(response.status).toBe(500);

      restore();
    });
  });

  describe('edge cases', () => {
    it('handles all env vars missing', async () => {
      const restore = mockEnv({
        DATABASE_URL: undefined,
        NEXTAUTH_URL: undefined,
        NEXTAUTH_SECRET: undefined,
      });

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed');

      const response = await GET();
      const data = await response.json();

      expect(data.checks.envVars.DATABASE_URL).toBe('❌ Missing');
      expect(data.checks.envVars.NEXTAUTH_URL).toBe('❌ Missing');
      expect(data.checks.envVars.NEXTAUTH_SECRET).toBe('❌ Missing');

      restore();
    });

    it('handles empty string env vars (treated as set)', async () => {
      const restore = mockEnv({
        DATABASE_URL: '',
        NEXTAUTH_URL: '',
        NEXTAUTH_SECRET: '',
      });

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockResolvedValue('hashed');

      const response = await GET();
      const data = await response.json();

      // Empty strings are falsy, so they should be reported as missing
      expect(data.checks.envVars.DATABASE_URL).toBe('❌ Missing');
      expect(data.checks.envVars.NEXTAUTH_URL).toBe('❌ Missing');
      expect(data.checks.envVars.NEXTAUTH_SECRET).toBe('❌ Missing');

      restore();
    });

    it('completes successfully even if bcrypt check fails', async () => {
      const restore = mockEnv();

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
      (prisma.user.count as jest.Mock).mockResolvedValue(5);
      const bcrypt = require('bcryptjs');
      bcrypt.hash.mockRejectedValue(new Error('bcrypt failed'));

      const response = await GET();
      const data = await response.json();

      // bcrypt failure doesn't stop the overall health check
      expect(data.checks.bcrypt).toContain('❌ Failed');
      expect(data.checks.databaseConnection).toBe('✅ Connected');
      expect(data.status).toBe('healthy');
      expect(response.status).toBe(200);

      restore();
    });
  });
});
