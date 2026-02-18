/**
 * Cloud Functions for Flipper AI Scrapers
 * 
 * Separates CPU-intensive scraping from Next.js API routes
 * - Craigslist & OfferUp use Playwright (Docker container with Chromium)
 * - eBay, Facebook, Mercari use API calls (standard Cloud Function)
 */

import * as functions from 'firebase-functions';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// Import scraper modules
import * as craigslistScraper from './scrapers/craigslist';
import * as offerupScraper from './scrapers/offerup';
import * as ebayScraper from './scrapers/ebay';
import * as facebookScraper from './scrapers/facebook';
import * as mercariScraper from './scrapers/mercari';

// Cleanup Prisma connections
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

// Export Cloud Functions
// High-memory functions for Playwright scrapers
export const scrapeCraigslist = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB',
  })
  .https.onRequest(craigslistScraper.handler);

export const scrapeOfferup = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB',
  })
  .https.onRequest(offerupScraper.handler);

// Standard functions for API scrapers
export const scrapeEbay = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
  })
  .https.onRequest(ebayScraper.handler);

export const scrapeFacebook = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
  })
  .https.onRequest(facebookScraper.handler);

export const scrapeMercari = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
  })
  .https.onRequest(mercariScraper.handler);

// Health check endpoint
export const health = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: [
      'scrapeCraigslist',
      'scrapeOfferup',
      'scrapeEbay',
      'scrapeFacebook',
      'scrapeMercari',
    ],
  });
});
