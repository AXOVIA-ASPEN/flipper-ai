/**
 * Integration Test Setup
 *
 * This file configures a separate test database (test.db) for integration tests.
 * Uses better-sqlite3 directly to avoid ESM issues with the generated Prisma client.
 */

import '@testing-library/jest-dom';
import Database from 'better-sqlite3';
import path from 'path';

// Set test environment
process.env.NODE_ENV = 'test';

// Create test database connection
const dbPath = path.join(process.cwd(), 'test.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Create a Prisma-like client interface for testing
 * This wraps better-sqlite3 to provide the same API as Prisma
 */
function createTestClient() {
  return {
    listing: {
      findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number; include?: Record<string, boolean> }) => {
        let sql = 'SELECT * FROM Listing';
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (args?.where) {
          for (const [key, value] of Object.entries(args.where)) {
            if (typeof value === 'object' && value !== null && 'gte' in value) {
              conditions.push(`${key} >= ?`);
              params.push((value as { gte: number }).gte);
            } else {
              conditions.push(`${key} = ?`);
              params.push(value);
            }
          }
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        if (args?.orderBy) {
          const [key, order] = Object.entries(args.orderBy)[0];
          sql += ` ORDER BY ${key} ${order.toUpperCase()}`;
        }

        if (args?.take) {
          sql += ` LIMIT ${args.take}`;
        }

        if (args?.skip) {
          sql += ` OFFSET ${args.skip}`;
        }

        const rows = db.prepare(sql).all(...params);

        // Include opportunity relation if requested
        if (args?.include?.opportunity) {
          return rows.map((row: Record<string, unknown>) => {
            const opportunity = db.prepare('SELECT * FROM Opportunity WHERE listingId = ?').get(row.id) || null;
            return { ...row, opportunity };
          });
        }

        return rows;
      },

      findUnique: async (args: { where: { id?: string; platform_externalId?: { platform: string; externalId: string } }; include?: Record<string, boolean> }) => {
        let row;
        if (args.where.id) {
          row = db.prepare('SELECT * FROM Listing WHERE id = ?').get(args.where.id);
        } else if (args.where.platform_externalId) {
          row = db.prepare('SELECT * FROM Listing WHERE platform = ? AND externalId = ?').get(
            args.where.platform_externalId.platform,
            args.where.platform_externalId.externalId
          );
        }

        if (row && args.include?.opportunity) {
          const opportunity = db.prepare('SELECT * FROM Opportunity WHERE listingId = ?').get((row as Record<string, unknown>).id) || null;
          return { ...row, opportunity };
        }

        return row || null;
      },

      count: async (args?: { where?: Record<string, unknown> }) => {
        let sql = 'SELECT COUNT(*) as count FROM Listing';
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (args?.where) {
          for (const [key, value] of Object.entries(args.where)) {
            if (typeof value === 'object' && value !== null && 'gte' in value) {
              conditions.push(`${key} >= ?`);
              params.push((value as { gte: number }).gte);
            } else {
              conditions.push(`${key} = ?`);
              params.push(value);
            }
          }
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        const result = db.prepare(sql).get(...params) as { count: number };
        return result.count;
      },

      create: async (args: { data: Record<string, unknown> }) => {
        const id = args.data.id || `cltest${Date.now()}${Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        const data = { id, scrapedAt: now, ...args.data };

        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO Listing (${keys.join(', ')}) VALUES (${placeholders})`;

        db.prepare(sql).run(...Object.values(data));
        return db.prepare('SELECT * FROM Listing WHERE id = ?').get(id);
      },

      upsert: async (args: { where: { platform_externalId: { platform: string; externalId: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existing = db.prepare('SELECT * FROM Listing WHERE platform = ? AND externalId = ?').get(
          args.where.platform_externalId.platform,
          args.where.platform_externalId.externalId
        );

        if (existing) {
          const id = (existing as Record<string, unknown>).id;
          const updates = Object.entries(args.update).map(([key]) => `${key} = ?`).join(', ');
          const sql = `UPDATE Listing SET ${updates} WHERE id = ?`;
          db.prepare(sql).run(...Object.values(args.update), id);
          return db.prepare('SELECT * FROM Listing WHERE id = ?').get(id);
        } else {
          const id = `cltest${Date.now()}${Math.random().toString(36).slice(2)}`;
          const now = new Date().toISOString();
          const data = { id, scrapedAt: now, ...args.create };

          const keys = Object.keys(data);
          const placeholders = keys.map(() => '?').join(', ');
          const sql = `INSERT INTO Listing (${keys.join(', ')}) VALUES (${placeholders})`;

          db.prepare(sql).run(...Object.values(data));
          return db.prepare('SELECT * FROM Listing WHERE id = ?').get(id);
        }
      },

      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const updates = Object.entries(args.data).map(([key]) => `${key} = ?`).join(', ');
        const sql = `UPDATE Listing SET ${updates} WHERE id = ?`;
        db.prepare(sql).run(...Object.values(args.data), args.where.id);
        return db.prepare('SELECT * FROM Listing WHERE id = ?').get(args.where.id);
      },

      delete: async (args: { where: { id: string } }) => {
        db.prepare('DELETE FROM Listing WHERE id = ?').run(args.where.id);
        return { id: args.where.id };
      },

      deleteMany: async () => {
        db.prepare('DELETE FROM Listing').run();
        return { count: 0 };
      },
    },

    opportunity: {
      findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number; include?: Record<string, boolean> }) => {
        let sql = 'SELECT * FROM Opportunity';
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (args?.where) {
          for (const [key, value] of Object.entries(args.where)) {
            conditions.push(`${key} = ?`);
            params.push(value);
          }
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        if (args?.orderBy) {
          const [key, order] = Object.entries(args.orderBy)[0];
          sql += ` ORDER BY ${key} ${order.toUpperCase()}`;
        }

        if (args?.take) {
          sql += ` LIMIT ${args.take}`;
        }

        if (args?.skip) {
          sql += ` OFFSET ${args.skip}`;
        }

        const rows = db.prepare(sql).all(...params);

        if (args?.include?.listing) {
          return rows.map((row: Record<string, unknown>) => {
            const listing = db.prepare('SELECT * FROM Listing WHERE id = ?').get(row.listingId) || null;
            return { ...row, listing };
          });
        }

        return rows;
      },

      findUnique: async (args: { where: { id?: string; listingId?: string }; include?: Record<string, boolean>; select?: Record<string, boolean> }) => {
        let row;
        if (args.where.id) {
          row = db.prepare('SELECT * FROM Opportunity WHERE id = ?').get(args.where.id);
        } else if (args.where.listingId) {
          row = db.prepare('SELECT * FROM Opportunity WHERE listingId = ?').get(args.where.listingId);
        }

        if (row && args.include?.listing) {
          const listing = db.prepare('SELECT * FROM Listing WHERE id = ?').get((row as Record<string, unknown>).listingId) || null;
          return { ...row, listing };
        }

        return row || null;
      },

      count: async () => {
        const result = db.prepare('SELECT COUNT(*) as count FROM Opportunity').get() as { count: number };
        return result.count;
      },

      aggregate: async () => {
        const result = db.prepare(`
          SELECT
            COUNT(*) as count,
            COALESCE(SUM(actualProfit), 0) as sumActualProfit,
            COALESCE(SUM(purchasePrice), 0) as sumPurchasePrice,
            COALESCE(SUM(resalePrice), 0) as sumResalePrice
          FROM Opportunity
        `).get() as { count: number; sumActualProfit: number; sumPurchasePrice: number; sumResalePrice: number };

        return {
          _count: result.count,
          _sum: {
            actualProfit: result.sumActualProfit,
            purchasePrice: result.sumPurchasePrice,
            resalePrice: result.sumResalePrice,
          },
        };
      },

      create: async (args: { data: Record<string, unknown>; include?: Record<string, boolean> }) => {
        const id = `cltest${Date.now()}${Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        const data = { id, createdAt: now, updatedAt: now, ...args.data };

        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO Opportunity (${keys.join(', ')}) VALUES (${placeholders})`;

        db.prepare(sql).run(...Object.values(data));

        const row = db.prepare('SELECT * FROM Opportunity WHERE id = ?').get(id);

        if (args.include?.listing) {
          const listing = db.prepare('SELECT * FROM Listing WHERE id = ?').get((row as Record<string, unknown>).listingId) || null;
          return { ...row, listing };
        }

        return row;
      },

      update: async (args: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, boolean> }) => {
        const now = new Date().toISOString();
        const data = { ...args.data, updatedAt: now };
        const updates = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
        const sql = `UPDATE Opportunity SET ${updates} WHERE id = ?`;
        db.prepare(sql).run(...Object.values(data), args.where.id);

        const row = db.prepare('SELECT * FROM Opportunity WHERE id = ?').get(args.where.id);

        if (args.include?.listing) {
          const listing = db.prepare('SELECT * FROM Listing WHERE id = ?').get((row as Record<string, unknown>).listingId) || null;
          return { ...row, listing };
        }

        return row;
      },

      delete: async (args: { where: { id: string } }) => {
        db.prepare('DELETE FROM Opportunity WHERE id = ?').run(args.where.id);
        return { id: args.where.id };
      },

      deleteMany: async () => {
        db.prepare('DELETE FROM Opportunity').run();
        return { count: 0 };
      },
    },

    scraperJob: {
      findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number }) => {
        let sql = 'SELECT * FROM ScraperJob';
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (args?.where) {
          for (const [key, value] of Object.entries(args.where)) {
            conditions.push(`${key} = ?`);
            params.push(value);
          }
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        if (args?.orderBy) {
          const [key, order] = Object.entries(args.orderBy)[0];
          sql += ` ORDER BY ${key} ${order.toUpperCase()}`;
        }

        if (args?.take) {
          sql += ` LIMIT ${args.take}`;
        }

        return db.prepare(sql).all(...params);
      },

      findUnique: async (args: { where: { id: string } }) => {
        return db.prepare('SELECT * FROM ScraperJob WHERE id = ?').get(args.where.id) || null;
      },

      create: async (args: { data: Record<string, unknown> }) => {
        const id = `cltest${Date.now()}${Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        const data = { id, createdAt: now, listingsFound: 0, opportunitiesFound: 0, ...args.data };

        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ScraperJob (${keys.join(', ')}) VALUES (${placeholders})`;

        db.prepare(sql).run(...Object.values(data));
        return db.prepare('SELECT * FROM ScraperJob WHERE id = ?').get(id);
      },

      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const updates = Object.entries(args.data).map(([key]) => `${key} = ?`).join(', ');
        const sql = `UPDATE ScraperJob SET ${updates} WHERE id = ?`;
        db.prepare(sql).run(...Object.values(args.data), args.where.id);
        return db.prepare('SELECT * FROM ScraperJob WHERE id = ?').get(args.where.id);
      },

      delete: async (args: { where: { id: string } }) => {
        db.prepare('DELETE FROM ScraperJob WHERE id = ?').run(args.where.id);
        return { id: args.where.id };
      },

      deleteMany: async () => {
        db.prepare('DELETE FROM ScraperJob').run();
        return { count: 0 };
      },
    },

    searchConfig: {
      findMany: async (args?: { where?: { enabled?: boolean }; orderBy?: Record<string, string> }) => {
        let sql = 'SELECT * FROM SearchConfig';
        const params: unknown[] = [];

        if (args?.where?.enabled !== undefined) {
          sql += ' WHERE enabled = ?';
          params.push(args.where.enabled ? 1 : 0);
        }

        if (args?.orderBy) {
          const [key, order] = Object.entries(args.orderBy)[0];
          sql += ` ORDER BY ${key} ${order.toUpperCase()}`;
        }

        return db.prepare(sql).all(...params);
      },

      findUnique: async (args: { where: { id: string } }) => {
        return db.prepare('SELECT * FROM SearchConfig WHERE id = ?').get(args.where.id) || null;
      },

      create: async (args: { data: Record<string, unknown> }) => {
        const id = `cltest${Date.now()}${Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();
        const data = { id, createdAt: now, updatedAt: now, enabled: 1, ...args.data };
        // Convert boolean to integer for SQLite
        if (typeof data.enabled === 'boolean') {
          data.enabled = data.enabled ? 1 : 0;
        }

        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO SearchConfig (${keys.join(', ')}) VALUES (${placeholders})`;

        db.prepare(sql).run(...Object.values(data));
        const row = db.prepare('SELECT * FROM SearchConfig WHERE id = ?').get(id) as Record<string, unknown>;
        // Convert enabled back to boolean
        return { ...row, enabled: Boolean(row.enabled) };
      },

      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const now = new Date().toISOString();
        const data = { ...args.data, updatedAt: now };
        // Convert boolean to integer for SQLite
        if (typeof data.enabled === 'boolean') {
          data.enabled = data.enabled ? 1 : 0;
        }
        const updates = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
        const sql = `UPDATE SearchConfig SET ${updates} WHERE id = ?`;
        db.prepare(sql).run(...Object.values(data), args.where.id);
        const row = db.prepare('SELECT * FROM SearchConfig WHERE id = ?').get(args.where.id) as Record<string, unknown>;
        // Convert enabled back to boolean
        return { ...row, enabled: Boolean(row.enabled) };
      },

      delete: async (args: { where: { id: string } }) => {
        db.prepare('DELETE FROM SearchConfig WHERE id = ?').run(args.where.id);
        return { id: args.where.id };
      },

      deleteMany: async () => {
        db.prepare('DELETE FROM SearchConfig').run();
        return { count: 0 };
      },
    },

    priceHistory: {
      deleteMany: async () => {
        db.prepare('DELETE FROM PriceHistory').run();
        return { count: 0 };
      },
    },

    $transaction: async (operations: Promise<unknown>[]) => {
      const results = await Promise.all(operations);
      return results;
    },

    $disconnect: async () => {
      db.close();
    },
  };
}

export const testPrisma = createTestClient();

/**
 * Reset the database by deleting all records from all tables.
 * Tables are deleted in order to respect foreign key constraints.
 */
export async function resetDatabase(): Promise<void> {
  await testPrisma.opportunity.deleteMany();
  await testPrisma.listing.deleteMany();
  await testPrisma.scraperJob.deleteMany();
  await testPrisma.searchConfig.deleteMany();
  await testPrisma.priceHistory.deleteMany();
}

// Global test timeout for integration tests
jest.setTimeout(30000);

// Mock the db module to use test database
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: testPrisma,
  prisma: testPrisma,
}));
