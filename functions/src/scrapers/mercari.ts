import { Request, Response } from 'firebase-functions';
import { PrismaClient } from '@prisma/client';
import { handleCORS, validateMethod, validateBody } from '../lib/cors';

const prisma = new PrismaClient();

interface ScrapeRequest {
  userId: string;
  keywords?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

/**
 * Mercari scraper
 * Note: This uses Mercari's undocumented API endpoints
 */
export async function handler(req: Request, res: Response) {
  try {
    if (handleCORS(req, res)) return;
    if (!validateMethod(req, res, ['POST'])) return;

    const body = validateBody<ScrapeRequest>(req, res, ['userId']);
    if (!body) return;

    const { userId, keywords, categoryId } = body;

    // Create scraper job
    const job = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'MERCARI',
        category: categoryId || 'all',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    console.log(`Mercari job ${job.id} started for user ${userId}`);

    try {
      // TODO: Implement Mercari API scraping
      // Mercari has undocumented API endpoints that can be used
      const listings: any[] = [];

      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          listingsFound: listings.length,
          completedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Mercari scraper is not yet fully implemented',
        jobId: job.id,
        listings,
      });
    } catch (scrapeError) {
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      throw scrapeError;
    }
  } catch (error) {
    console.error('Mercari scraper error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }
}
