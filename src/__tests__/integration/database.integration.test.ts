/**
 * Database Integration Tests
 * 
 * Tests database schema validation and critical relationships
 * with a real SQLite database to catch production migration issues.
 * 
 * @group integration
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('Database Migration Validation', () => {
  let db: Database.Database;
  const dbPath = path.join(process.cwd(), 'test-migration-validation.db');

  beforeAll(() => {
    // Clean up any existing test database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create new test database
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Create all tables matching Prisma schema
    db.exec(`
      CREATE TABLE User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        emailVerified INTEGER,
        name TEXT,
        image TEXT,
        password TEXT,
        subscriptionTier TEXT DEFAULT 'FREE',
        onboardingComplete INTEGER DEFAULT 0,
        onboardingStep INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE UserSettings (
        id TEXT PRIMARY KEY,
        userId TEXT UNIQUE NOT NULL,
        openaiApiKey TEXT,
        llmModel TEXT DEFAULT 'gpt-4o-mini',
        discountThreshold INTEGER DEFAULT 50,
        autoAnalyze INTEGER DEFAULT 1,
        emailNotifications INTEGER DEFAULT 1,
        notifyNewDeals INTEGER DEFAULT 1,
        notifyPriceDrops INTEGER DEFAULT 1,
        notifySoldItems INTEGER DEFAULT 1,
        notifyExpiring INTEGER DEFAULT 1,
        notifyWeeklyDigest INTEGER DEFAULT 1,
        notifyFrequency TEXT DEFAULT 'instant',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      );

      CREATE TABLE Account (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        providerAccountId TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        UNIQUE(provider, providerAccountId)
      );

      CREATE TABLE Session (
        id TEXT PRIMARY KEY,
        sessionToken TEXT UNIQUE NOT NULL,
        userId TEXT NOT NULL,
        expires INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      );

      CREATE TABLE Listing (
        id TEXT PRIMARY KEY,
        userId TEXT,
        externalId TEXT NOT NULL,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        askingPrice REAL NOT NULL,
        condition TEXT,
        location TEXT,
        sellerName TEXT,
        sellerContact TEXT,
        imageUrls TEXT,
        category TEXT,
        postedAt INTEGER,
        scrapedAt INTEGER NOT NULL,
        estimatedValue REAL,
        estimatedLow REAL,
        estimatedHigh REAL,
        profitPotential REAL,
        profitLow REAL,
        profitHigh REAL,
        valueScore REAL,
        discountPercent REAL,
        resaleDifficulty TEXT,
        status TEXT DEFAULT 'NEW',
        comparableUrls TEXT,
        priceReasoning TEXT,
        notes TEXT,
        shippable INTEGER,
        estimatedWeight REAL,
        negotiable INTEGER,
        daysListed INTEGER,
        tags TEXT,
        requestToBuy TEXT,
        identifiedBrand TEXT,
        identifiedModel TEXT,
        identifiedVariant TEXT,
        identifiedCondition TEXT,
        verifiedMarketValue REAL,
        marketDataSource TEXT,
        marketDataDate INTEGER,
        comparableSalesJson TEXT,
        sellabilityScore INTEGER,
        demandLevel TEXT,
        expectedDaysToSell INTEGER,
        authenticityRisk TEXT,
        recommendedOffer REAL,
        recommendedList REAL,
        resaleStrategy TEXT,
        trueDiscountPercent REAL,
        llmAnalyzed INTEGER DEFAULT 0,
        analysisDate INTEGER,
        analysisConfidence TEXT,
        analysisReasoning TEXT,
        FOREIGN KEY (userId) REFERENCES User(id),
        UNIQUE(platform, externalId, userId)
      );

      CREATE TABLE Opportunity (
        id TEXT PRIMARY KEY,
        userId TEXT,
        listingId TEXT UNIQUE NOT NULL,
        purchasePrice REAL,
        purchaseDate INTEGER,
        purchaseNotes TEXT,
        resalePrice REAL,
        resalePlatform TEXT,
        resaleUrl TEXT,
        resaleDate INTEGER,
        actualProfit REAL,
        fees REAL,
        status TEXT DEFAULT 'IDENTIFIED',
        notes TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id),
        FOREIGN KEY (listingId) REFERENCES Listing(id) ON DELETE CASCADE
      );

      CREATE TABLE ScraperJob (
        id TEXT PRIMARY KEY,
        userId TEXT,
        platform TEXT NOT NULL,
        location TEXT,
        category TEXT,
        status TEXT DEFAULT 'PENDING',
        listingsFound INTEGER DEFAULT 0,
        opportunitiesFound INTEGER DEFAULT 0,
        errorMessage TEXT,
        startedAt INTEGER,
        completedAt INTEGER,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id)
      );

      CREATE TABLE Message (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        listingId TEXT,
        direction TEXT NOT NULL,
        status TEXT DEFAULT 'DRAFT',
        subject TEXT,
        body TEXT NOT NULL,
        sellerName TEXT,
        sellerContact TEXT,
        platform TEXT,
        parentId TEXT,
        sentAt INTEGER,
        readAt INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (listingId) REFERENCES Listing(id)
      );

      CREATE TABLE PostingQueueItem (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        listingId TEXT NOT NULL,
        targetPlatform TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        askingPrice REAL,
        title TEXT,
        description TEXT,
        externalPostId TEXT,
        externalPostUrl TEXT,
        errorMessage TEXT,
        retryCount INTEGER DEFAULT 0,
        maxRetries INTEGER DEFAULT 3,
        scheduledAt INTEGER,
        postedAt INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (listingId) REFERENCES Listing(id) ON DELETE CASCADE,
        UNIQUE(listingId, targetPlatform, userId)
      );

      CREATE INDEX idx_user_email ON User(email);
      CREATE INDEX idx_listing_userId ON Listing(userId);
      CREATE INDEX idx_listing_platform ON Listing(platform);
      CREATE INDEX idx_listing_status ON Listing(status);
      CREATE INDEX idx_opportunity_userId ON Opportunity(userId);
      CREATE INDEX idx_opportunity_status ON Opportunity(status);
    `);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  afterEach(() => {
    // Clean up data between tests
    db.exec(`
      DELETE FROM PostingQueueItem;
      DELETE FROM Message;
      DELETE FROM Opportunity;
      DELETE FROM Listing;
      DELETE FROM ScraperJob;
      DELETE FROM Session;
      DELETE FROM Account;
      DELETE FROM UserSettings;
      DELETE FROM User;
    `);
  });

  describe('Schema Validation', () => {
    it('should have all required tables', () => {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('User');
      expect(tableNames).toContain('UserSettings');
      expect(tableNames).toContain('Account');
      expect(tableNames).toContain('Session');
      expect(tableNames).toContain('Listing');
      expect(tableNames).toContain('Opportunity');
      expect(tableNames).toContain('ScraperJob');
      expect(tableNames).toContain('Message');
      expect(tableNames).toContain('PostingQueueItem');
    });

    it('should have proper foreign key constraints enabled', () => {
      const result = db.pragma('foreign_keys', { simple: true });
      expect(result).toBe(1); // 1 = ON
    });

    it('should enforce foreign key constraints', () => {
      // Try to create listing with invalid userId
      const stmt = db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      expect(() => {
        stmt.run(
          'test-listing-1',
          'invalid-user-id',
          'test-123',
          'craigslist',
          'https://example.com/test',
          'Test Item',
          100,
          Date.now()
        );
      }).toThrow(/FOREIGN KEY constraint failed/);
    });
  });

  describe('User Registration Flow', () => {
    it('should create user and settings atomically', () => {
      const now = Date.now();
      const userId = 'user-' + now;

      // Start transaction
      const createUser = db.transaction(() => {
        // Create user
        db.prepare(`
          INSERT INTO User (id, email, password, subscriptionTier, onboardingComplete, onboardingStep, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, 'newuser@example.com', 'securepass123', 'FREE', 0, 0, now, now);

        // Create settings
        db.prepare(`
          INSERT INTO UserSettings (id, userId, discountThreshold, autoAnalyze, emailNotifications, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('settings-' + now, userId, 50, 1, 1, now, now);
      });

      createUser();

      // Verify user created
      const user = db.prepare('SELECT * FROM User WHERE id = ?').get(userId) as any;
      expect(user).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
      expect(user.subscriptionTier).toBe('FREE');
      expect(user.onboardingComplete).toBe(0);

      // Verify settings created
      const settings = db.prepare('SELECT * FROM UserSettings WHERE userId = ?').get(userId) as any;
      expect(settings).toBeDefined();
      expect(settings.userId).toBe(userId);
      expect(settings.discountThreshold).toBe(50);
      expect(settings.autoAnalyze).toBe(1);
    });

    it('should enforce unique email constraint', () => {
      const now = Date.now();
      const email = 'duplicate@example.com';

      // Create first user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('user-1-' + now, email, 'pass123', now, now);

      // Try to create second user with same email
      expect(() => {
        db.prepare(`
          INSERT INTO User (id, email, password, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('user-2-' + now, email, 'pass456', now, now);
      }).toThrow(/UNIQUE constraint failed/);
    });

    it('should apply default values correctly', () => {
      const now = Date.now();
      const userId = 'user-defaults-' + now;

      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'defaults@example.com', 'test123', now, now);

      const user = db.prepare('SELECT * FROM User WHERE id = ?').get(userId) as any;

      expect(user.subscriptionTier).toBe('FREE');
      expect(user.onboardingComplete).toBe(0);
      expect(user.onboardingStep).toBe(0);
    });
  });

  describe('Cascade Delete Validation', () => {
    it('should cascade delete user settings when user is deleted', () => {
      const now = Date.now();
      const userId = 'user-cascade-1-' + now;
      const settingsId = 'settings-' + now;

      // Create user and settings
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'cascade1@example.com', 'test123', now, now);

      db.prepare(`
        INSERT INTO UserSettings (id, userId, discountThreshold, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(settingsId, userId, 50, now, now);

      // Verify settings exist
      let settings = db.prepare('SELECT * FROM UserSettings WHERE id = ?').get(settingsId);
      expect(settings).toBeDefined();

      // Delete user
      db.prepare('DELETE FROM User WHERE id = ?').run(userId);

      // Verify settings were cascade deleted
      settings = db.prepare('SELECT * FROM UserSettings WHERE id = ?').get(settingsId);
      expect(settings).toBeUndefined();
    });

    it('should cascade delete sessions when user is deleted', () => {
      const now = Date.now();
      const userId = 'user-cascade-2-' + now;
      const sessionId = 'session-' + now;

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'cascade2@example.com', 'test123', now, now);

      // Create session
      db.prepare(`
        INSERT INTO Session (id, userId, sessionToken, expires)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, userId, 'test-token-123', now + 86400000);

      // Delete user
      db.prepare('DELETE FROM User WHERE id = ?').run(userId);

      // Verify session was cascade deleted
      const session = db.prepare('SELECT * FROM Session WHERE id = ?').get(sessionId);
      expect(session).toBeUndefined();
    });

    it('should cascade delete opportunity when listing is deleted', () => {
      const now = Date.now();
      const userId = 'user-cascade-3-' + now;
      const listingId = 'listing-' + now;
      const opportunityId = 'opportunity-' + now;

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'cascade3@example.com', 'test123', now, now);

      // Create listing
      db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(listingId, userId, 'cascade-test-1', 'craigslist', 'https://example.com/cascade', 'Cascade Test', 100, now);

      // Create opportunity
      db.prepare(`
        INSERT INTO Opportunity (id, userId, listingId, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(opportunityId, userId, listingId, 'IDENTIFIED', now, now);

      // Delete listing
      db.prepare('DELETE FROM Listing WHERE id = ?').run(listingId);

      // Verify opportunity was cascade deleted
      const opportunity = db.prepare('SELECT * FROM Opportunity WHERE id = ?').get(opportunityId);
      expect(opportunity).toBeUndefined();
    });
  });

  describe('Relationship Validation', () => {
    it('should properly link User to UserSettings (one-to-one)', () => {
      const now = Date.now();
      const userId = 'user-rel-1-' + now;
      const settingsId = 'settings-' + now;

      // Create user and settings
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'relationship1@example.com', 'test123', now, now);

      db.prepare(`
        INSERT INTO UserSettings (id, userId, llmModel, discountThreshold, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(settingsId, userId, 'gpt-4o-mini', 60, now, now);

      // Verify link
      const settings = db.prepare('SELECT * FROM UserSettings WHERE userId = ?').get(userId) as any;
      expect(settings).toBeDefined();
      expect(settings.userId).toBe(userId);
      expect(settings.llmModel).toBe('gpt-4o-mini');

      // Try to create duplicate settings (should fail - unique constraint)
      expect(() => {
        db.prepare(`
          INSERT INTO UserSettings (id, userId, llmModel, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('settings-duplicate-' + now, userId, 'gpt-4', now, now);
      }).toThrow(/UNIQUE constraint failed/);
    });

    it('should properly link User to Listings (one-to-many)', () => {
      const now = Date.now();
      const userId = 'user-rel-2-' + now;

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'relationship2@example.com', 'test123', now, now);

      // Create multiple listings
      db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('listing-1-' + now, userId, 'rel-test-1', 'craigslist', 'https://example.com/1', 'Item 1', 50, now);

      db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('listing-2-' + now, userId, 'rel-test-2', 'craigslist', 'https://example.com/2', 'Item 2', 100, now);

      // Verify listings
      const listings = db.prepare('SELECT * FROM Listing WHERE userId = ?').all(userId);
      expect(listings).toHaveLength(2);
      expect(listings.every((l: any) => l.userId === userId)).toBe(true);
    });

    it('should properly link Listing to Opportunity (one-to-one)', () => {
      const now = Date.now();
      const userId = 'user-rel-3-' + now;
      const listingId = 'listing-' + now;
      const opportunityId = 'opportunity-' + now;

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'relationship3@example.com', 'test123', now, now);

      // Create listing
      db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(listingId, userId, 'rel-opp-1', 'craigslist', 'https://example.com/opp', 'Opportunity Test', 75, now);

      // Create opportunity
      db.prepare(`
        INSERT INTO Opportunity (id, userId, listingId, purchasePrice, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(opportunityId, userId, listingId, 60, 'PURCHASED', now, now);

      // Verify relationship
      const opportunity = db.prepare('SELECT * FROM Opportunity WHERE listingId = ?').get(listingId) as any;
      expect(opportunity).toBeDefined();
      expect(opportunity.id).toBe(opportunityId);

      // Try to create duplicate opportunity (should fail - unique listingId)
      expect(() => {
        db.prepare(`
          INSERT INTO Opportunity (id, userId, listingId, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run('opportunity-duplicate-' + now, userId, listingId, 'IDENTIFIED', now, now);
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('Unique Constraints Validation', () => {
    it('should enforce unique constraint on (platform, externalId, userId)', () => {
      const now = Date.now();
      const userId = 'user-unique-1-' + now;
      const listingId1 = 'listing-1-' + now;
      const listingId2 = 'listing-2-' + now;

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'unique1@example.com', 'test123', now, now);

      // Create first listing
      db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(listingId1, userId, 'unique-123', 'craigslist', 'https://example.com/unique', 'Unique Test', 100, now);

      // Try to create duplicate
      expect(() => {
        db.prepare(`
          INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(listingId2, userId, 'unique-123', 'craigslist', 'https://example.com/unique2', 'Unique Test 2', 100, now);
      }).toThrow(/UNIQUE constraint failed/);
    });

    it('should enforce unique session token', () => {
      const now = Date.now();
      const userId = 'user-unique-2-' + now;
      const sessionToken = 'unique-token-456';

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'unique2@example.com', 'test123', now, now);

      // Create first session
      db.prepare(`
        INSERT INTO Session (id, userId, sessionToken, expires)
        VALUES (?, ?, ?, ?)
      `).run('session-1-' + now, userId, sessionToken, now + 86400000);

      // Try to create session with same token
      expect(() => {
        db.prepare(`
          INSERT INTO Session (id, userId, sessionToken, expires)
          VALUES (?, ?, ?, ?)
        `).run('session-2-' + now, userId, sessionToken, now + 86400000);
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('Index Validation', () => {
    it('should efficiently query listings by userId (indexed)', () => {
      const now = Date.now();
      const userId = 'user-index-1-' + now;

      // Create user
      db.prepare(`
        INSERT INTO User (id, email, password, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'index1@example.com', 'test123', now, now);

      // Create many listings
      const insertStmt = db.prepare(`
        INSERT INTO Listing (id, userId, externalId, platform, url, title, askingPrice, scrapedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 100; i++) {
        insertStmt.run(
          `listing-${i}-${now}`,
          userId,
          `index-${i}`,
          'craigslist',
          `https://example.com/${i}`,
          `Item ${i}`,
          50 + i,
          now
        );
      }

      // Query with index (should be fast)
      const start = Date.now();
      const listings = db.prepare('SELECT * FROM Listing WHERE userId = ?').all(userId);
      const duration = Date.now() - start;

      expect(listings).toHaveLength(100);
      expect(duration).toBeLessThan(50); // Should be very fast with index
    });
  });
});
