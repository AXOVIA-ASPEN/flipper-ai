import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { calculateROI, calculatePortfolioROI, ROIInput } from '@/lib/roi-calculator';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
/**
 * GET /api/inventory/roi - Get ROI data for user's purchased items
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();

    // Get all purchased/listed/sold opportunities
    const where: Record<string, unknown> = {
      status: { in: ['PURCHASED', 'LISTED', 'SOLD'] },
      purchasePrice: { not: null },
      purchaseDate: { not: null },
    };

    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: { listing: true },
      orderBy: { purchaseDate: 'desc' },
    });

    // Calculate ROI for each item
    const items = opportunities
      .filter((opp) => opp.purchasePrice !== null && opp.purchaseDate !== null)
      .map((opp) => {
        const input: ROIInput = {
          purchasePrice: opp.purchasePrice!,
          resalePrice: opp.resalePrice,
          fees: opp.fees,
          purchaseDate: opp.purchaseDate!,
          resaleDate: opp.resaleDate,
        };

        const roi = calculateROI(input);

        return {
          id: opp.id,
          title: opp.listing.title,
          platform: opp.listing.platform,
          status: opp.status,
          purchasePrice: opp.purchasePrice,
          resalePrice: opp.resalePrice,
          fees: opp.fees,
          ...roi,
        };
      });

    // Calculate portfolio summary
    const portfolioInputs: ROIInput[] = opportunities
      .filter((opp) => opp.purchasePrice !== null && opp.purchaseDate !== null)
      .map((opp) => ({
        purchasePrice: opp.purchasePrice!,
        resalePrice: opp.resalePrice,
        fees: opp.fees,
        purchaseDate: opp.purchaseDate!,
        resaleDate: opp.resaleDate,
      }));

    const portfolio = calculatePortfolioROI(portfolioInputs);

    return NextResponse.json({
      items,
      portfolio,
    });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to calculate ROI');
  }
}
