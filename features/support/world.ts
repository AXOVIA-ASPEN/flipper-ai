/**
 * Cucumber World - Shared context for all step definitions
 * Author: ASPEN
 * Company: Axovia AI
 */

import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Page, Browser, chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as path from 'path';

export interface FlipperWorld extends World {
  page: Page;
  browser: Browser;
  db: PrismaClient;
  screenshots: string[];
  testData: Record<string, any>;
}

export class CustomWorld extends World implements FlipperWorld {
  page!: Page;
  browser!: Browser;
  db: PrismaClient;
  screenshots: string[] = [];
  testData: Record<string, any> = {};

  constructor(options: IWorldOptions) {
    super(options);
    const adapter = new PrismaLibSql({
      url: process.env.DATABASE_URL || 'file:./test.db'
    });
    this.db = new PrismaClient({ adapter });
  }

  /**
   * Capture a screenshot with a descriptive name
   * Automatically organizes by scenario name
   */
  async screenshot(name: string): Promise<void> {
    if (!this.page) {
      console.warn('No page available for screenshot');
      return;
    }

    const scenarioName = (this as any).scenario?.name
      ?.replace(/[^a-z0-9]/gi, '-')
      .toLowerCase() || 'unknown';
    
    const dir = path.join('screenshots', scenarioName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${name}.png`;
    const filepath = path.join(dir, filename);

    await this.page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });

    this.screenshots.push(filepath);
    console.log(`📸 Screenshot saved: ${filepath}`);
  }

  /**
   * Load test data from fixtures
   */
  loadFixture(name: string): any {
    const fixturePath = path.join(__dirname, 'fixtures', `${name}.json`);
    if (fs.existsSync(fixturePath)) {
      return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    }
    throw new Error(`Fixture not found: ${name}`);
  }

  /**
   * Seed database with test data
   */
  async seedDatabase(data: any): Promise<void> {
    // Clear existing data
    await this.db.listing.deleteMany();
    await this.db.opportunity.deleteMany();
    await this.db.scraperJob.deleteMany();

    // Insert test data
    if (data.listings) {
      await this.db.listing.createMany({ data: data.listings });
    }
    if (data.opportunities) {
      await this.db.opportunity.createMany({ data: data.opportunities });
    }
  }

  /**
   * Wait for element with timeout
   */
  async waitForElement(selector: string, timeout = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text: string, timeout = 5000): Promise<void> {
    await this.page.waitForFunction(
      (searchText) => document.body.textContent?.includes(searchText),
      text,
      { timeout }
    );
  }
}

setWorldConstructor(CustomWorld);
