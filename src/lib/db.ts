import { PrismaClient as PrismaClientBase } from '@prisma/client';
import type { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Pool math: db-f1-micro max ~25 connections.
  // Reserve 5 for admin/migrations = 20 available.
  // Cloud Run max-instances=10 → max=2 per instance (20/10=2).
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  return new PrismaClientBase({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }) as unknown as PrismaClient;
}

// Lazy singleton — createPrismaClient() is only called on first property access,
// not at module-import time. This prevents DATABASE_URL errors when the module
// is imported by code that doesn't actually query the database (e.g. BDD step defs).
const handler: ProxyHandler<object> = {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
};

export const prisma = new Proxy({}, handler) as PrismaClient;

export default prisma;

/**
 * For testing only: directly override the prisma singleton inside this module's
 * globalForPrisma closure. This is the only reliable way to stub prisma in
 * service-level Cucumber tests that run in the same process as the module.
 *
 * @internal Do NOT use in production code.
 */
export function _overridePrismaForTesting(mock: unknown): void {
  globalForPrisma.prisma = mock as PrismaClient;
}
