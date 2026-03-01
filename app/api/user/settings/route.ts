import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError , AppError, ErrorCode } from '@/lib/errors';
/**
 * Get or create the current user with settings
 * Requires authentication — returns null if no session
 */
async function getCurrentUserWithSettings() {
  const userId = await getAuthUserId();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Ensure settings exist
  if (!user.settings) {
    const settings = await prisma.userSettings.create({
      data: {
        userId: user.id,
        llmModel: 'gpt-4o-mini',
        discountThreshold: 50,
        autoAnalyze: true,
      },
    });
    user = { ...user, settings };
  }

  return user;
}

// GET /api/user/settings - Get current user's settings
export async function GET() {
  try {
    const user = await getCurrentUserWithSettings();
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }
    const settings = user.settings!;

    // Return settings with masked API key
    return NextResponse.json({
      success: true,
      data: {
        id: settings.id,
        userId: settings.userId,
        openaiApiKey: settings.openaiApiKey ? maskApiKey(decrypt(settings.openaiApiKey)) : null,
        hasOpenaiApiKey: !!settings.openaiApiKey,
        llmModel: settings.llmModel,
        discountThreshold: settings.discountThreshold,
        autoAnalyze: settings.autoAnalyze,
        emailNotifications: settings.emailNotifications,
        notifyNewDeals: settings.notifyNewDeals,
        notifyPriceDrops: settings.notifyPriceDrops,
        notifySoldItems: settings.notifySoldItems,
        notifyExpiring: settings.notifyExpiring,
        notifyWeeklyDigest: settings.notifyWeeklyDigest,
        notifyFrequency: settings.notifyFrequency,
        ebayFeeRate: settings.ebayFeeRate,
        mercariFeeRate: settings.mercariFeeRate,
        facebookFeeRate: settings.facebookFeeRate,
        offerupFeeRate: settings.offerupFeeRate,
        craigslistFeeRate: settings.craigslistFeeRate,
        opportunityThreshold: settings.opportunityThreshold,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return handleError(error);
  }
}

// PATCH /api/user/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUserWithSettings();
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }
    const body = await request.json();

    const {
      openaiApiKey, llmModel, discountThreshold, autoAnalyze,
      emailNotifications, notifyNewDeals, notifyPriceDrops,
      notifySoldItems, notifyExpiring, notifyWeeklyDigest, notifyFrequency,
      ebayFeeRate, mercariFeeRate, facebookFeeRate, offerupFeeRate, craigslistFeeRate,
      opportunityThreshold,
    } = body;

    // Validate llmModel if provided
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];
    if (llmModel !== undefined && !validModels.includes(llmModel)) {
      return NextResponse.json(
        { success: false, error: `Invalid LLM model. Must be one of: ${validModels.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate discountThreshold if provided
    if (discountThreshold !== undefined) {
      const threshold = parseInt(discountThreshold, 10);
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        throw new ValidationError('Discount threshold must be between 0 and 100');
      }
    }

    // Validate notifyFrequency if provided
    const validFrequencies = ['instant', 'daily', 'weekly'];
    if (notifyFrequency !== undefined && !validFrequencies.includes(notifyFrequency)) {
      return NextResponse.json(
        { success: false, error: `Invalid notification frequency. Must be one of: ${validFrequencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate platform fee rates (0 to 1)
    const feeRateFields = [
      { name: 'ebayFeeRate', value: ebayFeeRate },
      { name: 'mercariFeeRate', value: mercariFeeRate },
      { name: 'facebookFeeRate', value: facebookFeeRate },
      { name: 'offerupFeeRate', value: offerupFeeRate },
      { name: 'craigslistFeeRate', value: craigslistFeeRate },
    ];

    for (const { name, value } of feeRateFields) {
      if (value !== undefined) {
        const rate = parseFloat(value);
        if (isNaN(rate) || rate < 0 || rate > 1) {
          throw new ValidationError(`${name} must be between 0 and 1 (as decimal)`);
        }
      }
    }

    // Validate opportunity threshold (0-100)
    if (opportunityThreshold !== undefined) {
      const threshold = parseInt(opportunityThreshold, 10);
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        throw new ValidationError('Opportunity threshold must be between 0 and 100');
      }
    }

    // Build update data
    const updateData: {
      openaiApiKey?: string | null;
      llmModel?: string;
      discountThreshold?: number;
      autoAnalyze?: boolean;
      emailNotifications?: boolean;
      notifyNewDeals?: boolean;
      notifyPriceDrops?: boolean;
      notifySoldItems?: boolean;
      notifyExpiring?: boolean;
      notifyWeeklyDigest?: boolean;
      notifyFrequency?: string;
      ebayFeeRate?: number;
      mercariFeeRate?: number;
      facebookFeeRate?: number;
      offerupFeeRate?: number;
      craigslistFeeRate?: number;
      opportunityThreshold?: number;
    } = {};

    // Handle API key update
    if (openaiApiKey !== undefined) {
      if (openaiApiKey === null || openaiApiKey === '') {
        // Clear the API key
        updateData.openaiApiKey = null;
      } else {
        // Encrypt and store the new API key
        updateData.openaiApiKey = encrypt(openaiApiKey);
      }
    }

    if (llmModel !== undefined) {
      updateData.llmModel = llmModel;
    }

    if (discountThreshold !== undefined) {
      updateData.discountThreshold = parseInt(discountThreshold, 10);
    }

    if (autoAnalyze !== undefined) {
      updateData.autoAnalyze = Boolean(autoAnalyze);
    }

    // Email notification preferences
    if (emailNotifications !== undefined) {
      updateData.emailNotifications = Boolean(emailNotifications);
    }
    if (notifyNewDeals !== undefined) {
      updateData.notifyNewDeals = Boolean(notifyNewDeals);
    }
    if (notifyPriceDrops !== undefined) {
      updateData.notifyPriceDrops = Boolean(notifyPriceDrops);
    }
    if (notifySoldItems !== undefined) {
      updateData.notifySoldItems = Boolean(notifySoldItems);
    }
    if (notifyExpiring !== undefined) {
      updateData.notifyExpiring = Boolean(notifyExpiring);
    }
    if (notifyWeeklyDigest !== undefined) {
      updateData.notifyWeeklyDigest = Boolean(notifyWeeklyDigest);
    }
    if (notifyFrequency !== undefined) {
      updateData.notifyFrequency = notifyFrequency;
    }

    // Platform fee rates
    if (ebayFeeRate !== undefined) {
      updateData.ebayFeeRate = parseFloat(ebayFeeRate);
    }
    if (mercariFeeRate !== undefined) {
      updateData.mercariFeeRate = parseFloat(mercariFeeRate);
    }
    if (facebookFeeRate !== undefined) {
      updateData.facebookFeeRate = parseFloat(facebookFeeRate);
    }
    if (offerupFeeRate !== undefined) {
      updateData.offerupFeeRate = parseFloat(offerupFeeRate);
    }
    if (craigslistFeeRate !== undefined) {
      updateData.craigslistFeeRate = parseFloat(craigslistFeeRate);
    }

    // Opportunity threshold
    if (opportunityThreshold !== undefined) {
      updateData.opportunityThreshold = parseInt(opportunityThreshold, 10);
    }

    // Update settings
    const settings = await prisma.userSettings.update({
      where: { userId: user.id },
      data: updateData,
    });

    // Return updated settings with masked API key
    return NextResponse.json({
      success: true,
      data: {
        id: settings.id,
        userId: settings.userId,
        openaiApiKey: settings.openaiApiKey ? maskApiKey(decrypt(settings.openaiApiKey)) : null,
        hasOpenaiApiKey: !!settings.openaiApiKey,
        llmModel: settings.llmModel,
        discountThreshold: settings.discountThreshold,
        autoAnalyze: settings.autoAnalyze,
        emailNotifications: settings.emailNotifications,
        notifyNewDeals: settings.notifyNewDeals,
        notifyPriceDrops: settings.notifyPriceDrops,
        notifySoldItems: settings.notifySoldItems,
        notifyExpiring: settings.notifyExpiring,
        notifyWeeklyDigest: settings.notifyWeeklyDigest,
        notifyFrequency: settings.notifyFrequency,
        ebayFeeRate: settings.ebayFeeRate,
        mercariFeeRate: settings.mercariFeeRate,
        facebookFeeRate: settings.facebookFeeRate,
        offerupFeeRate: settings.offerupFeeRate,
        craigslistFeeRate: settings.craigslistFeeRate,
        opportunityThreshold: settings.opportunityThreshold,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return handleError(error);
  }
}
