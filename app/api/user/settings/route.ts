import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import { getAuthUserId } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';
import { invalidateUserRouteCache } from '@/lib/maps-service';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError , AppError, ErrorCode } from '@/lib/errors';
// Story 12.1: Google Calendar integration status
import { hasValidToken as hasGoogleCalendarToken } from '@/lib/google-calendar-token-store';

// Story 11.3: Per-event push and SMS toggle field names — used for loop-driven Boolean coercion.
// Exported so tests can import this constant for parameterised coverage.
export const PUSH_SMS_TOGGLE_FIELDS = [
  'pushNotifyNewDeals', 'pushNotifySoldItems', 'pushNotifyMessageReceived',
  'pushNotifyDraftReady', 'pushNotifyMessageSent', 'pushNotifyReviewReceived',
  'pushNotifyFlipGoneCold', 'pushNotifyFlipTurnedHot', 'pushNotifyPriceDrops',
  'pushNotifyExpiring', 'pushNotifyListingUnavailable', 'pushNotifyWeeklyDigest',
  'smsNotifyNewDeals', 'smsNotifySoldItems', 'smsNotifyMessageReceived',
  'smsNotifyDraftReady', 'smsNotifyMessageSent', 'smsNotifyReviewReceived',
  'smsNotifyFlipGoneCold', 'smsNotifyFlipTurnedHot', 'smsNotifyPriceDrops',
  'smsNotifyExpiring', 'smsNotifyListingUnavailable', 'smsNotifyWeeklyDigest',
] as const;

type PushSmsToggleField = typeof PUSH_SMS_TOGGLE_FIELDS[number];
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

    // Story 12.1: Google Calendar integration status
    const gcalToken = await prisma.googleCalendarToken.findUnique({
      where: { userId: user.id },
      select: { calendarEmail: true },
    });

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
        opportunityThreshold: settings.opportunityThreshold,
        feeRateEbay: settings.feeRateEbay,
        feeRateMercari: settings.feeRateMercari,
        feeRateFacebook: settings.feeRateFacebook,
        feeRateOfferup: settings.feeRateOfferup,
        feeRateCraigslist: settings.feeRateCraigslist,
        homeLocation: settings.homeLocation,
        maxPickupRadiusMiles: settings.maxPickupRadiusMiles,
        holdingCostDailyRate: settings.holdingCostDailyRate,
        messageApprovalRequired: settings.messageApprovalRequired,
        pushNotifications: settings.pushNotifications,
        // Story 11.2: Twilio SMS fields
        phoneNumber: settings.phoneNumber,
        phoneVerified: settings.phoneVerified,
        smsNotifications: settings.smsNotifications,
        // Story 10.4: Per-event communication notification toggles
        notifyMessageReceived: settings.notifyMessageReceived,
        notifyDraftReady: settings.notifyDraftReady,
        notifyMessageSent: settings.notifyMessageSent,
        // Story 10.5: Smart alert notification toggles
        notifyReviewReceived: settings.notifyReviewReceived,
        notifyFlipGoneCold: settings.notifyFlipGoneCold,
        notifyFlipTurnedHot: settings.notifyFlipTurnedHot,
        notifyPriceChanges: settings.notifyPriceChanges,
        flipGoneColdHours: settings.flipGoneColdHours,
        flipTurnedHotCount: settings.flipTurnedHotCount,
        // Story 10.6: Notification preferences UI
        notifyListingUnavailable: settings.notifyListingUnavailable,
        // Story 11.3: Per-event push notification toggles
        pushNotifyNewDeals: settings.pushNotifyNewDeals,
        pushNotifySoldItems: settings.pushNotifySoldItems,
        pushNotifyMessageReceived: settings.pushNotifyMessageReceived,
        pushNotifyDraftReady: settings.pushNotifyDraftReady,
        pushNotifyMessageSent: settings.pushNotifyMessageSent,
        pushNotifyReviewReceived: settings.pushNotifyReviewReceived,
        pushNotifyFlipGoneCold: settings.pushNotifyFlipGoneCold,
        pushNotifyFlipTurnedHot: settings.pushNotifyFlipTurnedHot,
        pushNotifyPriceDrops: settings.pushNotifyPriceDrops,
        pushNotifyExpiring: settings.pushNotifyExpiring,
        pushNotifyListingUnavailable: settings.pushNotifyListingUnavailable,
        pushNotifyWeeklyDigest: settings.pushNotifyWeeklyDigest,
        // Story 11.3: Per-event SMS notification toggles
        smsNotifyNewDeals: settings.smsNotifyNewDeals,
        smsNotifySoldItems: settings.smsNotifySoldItems,
        smsNotifyMessageReceived: settings.smsNotifyMessageReceived,
        smsNotifyDraftReady: settings.smsNotifyDraftReady,
        smsNotifyMessageSent: settings.smsNotifyMessageSent,
        smsNotifyReviewReceived: settings.smsNotifyReviewReceived,
        smsNotifyFlipGoneCold: settings.smsNotifyFlipGoneCold,
        smsNotifyFlipTurnedHot: settings.smsNotifyFlipTurnedHot,
        smsNotifyPriceDrops: settings.smsNotifyPriceDrops,
        smsNotifyExpiring: settings.smsNotifyExpiring,
        smsNotifyListingUnavailable: settings.smsNotifyListingUnavailable,
        smsNotifyWeeklyDigest: settings.smsNotifyWeeklyDigest,
        // Story 12.1: Google Calendar integration status
        googleCalendarConnected: !!gcalToken,
        googleCalendarEmail: gcalToken?.calendarEmail ?? null,
        // Story 12.2: Meeting route & departure reminder settings
        meetingDepartureBufferMinutes: settings.meetingDepartureBufferMinutes,
        notifyMeetingReminder: settings.notifyMeetingReminder,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          subscriptionTier: user.subscriptionTier,
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
      opportunityThreshold, feeRateEbay, feeRateMercari, feeRateFacebook, feeRateOfferup, feeRateCraigslist,
      homeLocation, maxPickupRadiusMiles, holdingCostDailyRate,
      messageApprovalRequired, pushNotifications,
      smsNotifications, removePhoneNumber,
      notifyMessageReceived, notifyDraftReady, notifyMessageSent,
      notifyReviewReceived, notifyFlipGoneCold, notifyFlipTurnedHot, notifyPriceChanges,
      flipGoneColdHours, flipTurnedHotCount,
      notifyListingUnavailable,
      meetingDepartureBufferMinutes,
      notifyMeetingReminder,
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

    // Validate opportunityThreshold if provided
    if (opportunityThreshold !== undefined) {
      const ot = Math.round(Number(opportunityThreshold));
      if (ot < 10 || ot > 100) {
        throw new ValidationError('Opportunity threshold must be between 10 and 100');
      }
    }

    // Validate fee rates if provided
    const feeFields = { feeRateEbay, feeRateMercari, feeRateFacebook, feeRateOfferup, feeRateCraigslist };
    for (const [field, value] of Object.entries(feeFields)) {
      if (value !== undefined) {
        const rate = Number(value);
        if (!isFinite(rate) || rate < 0 || rate > 50) {
          throw new ValidationError(`${field} must be a number between 0 and 50`);
        }
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
      opportunityThreshold?: number;
      feeRateEbay?: number;
      feeRateMercari?: number;
      feeRateFacebook?: number;
      feeRateOfferup?: number;
      feeRateCraigslist?: number;
      homeLocation?: string | null;
      maxPickupRadiusMiles?: number;
      holdingCostDailyRate?: number;
      messageApprovalRequired?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
      phoneNumber?: string | null;
      phoneVerified?: boolean;
      phoneVerificationCode?: string | null;
      phoneVerificationExpiry?: Date | null;
      notifyMessageReceived?: boolean;
      notifyDraftReady?: boolean;
      notifyMessageSent?: boolean;
      notifyReviewReceived?: boolean;
      notifyFlipGoneCold?: boolean;
      notifyFlipTurnedHot?: boolean;
      notifyPriceChanges?: boolean;
      flipGoneColdHours?: number;
      flipTurnedHotCount?: number;
      notifyListingUnavailable?: boolean;
      meetingDepartureBufferMinutes?: number;
      notifyMeetingReminder?: boolean;
      phoneVerificationSentAt?: Date | null;
    } & Partial<Record<PushSmsToggleField, boolean>> = {};

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

    if (opportunityThreshold !== undefined) {
      updateData.opportunityThreshold = Math.round(Number(opportunityThreshold));
    }

    if (feeRateEbay !== undefined) updateData.feeRateEbay = Number(feeRateEbay);
    if (feeRateMercari !== undefined) updateData.feeRateMercari = Number(feeRateMercari);
    if (feeRateFacebook !== undefined) updateData.feeRateFacebook = Number(feeRateFacebook);
    if (feeRateOfferup !== undefined) updateData.feeRateOfferup = Number(feeRateOfferup);
    if (feeRateCraigslist !== undefined) updateData.feeRateCraigslist = Number(feeRateCraigslist);

    // Logistics settings (Story 5.5)
    if (homeLocation !== undefined) {
      updateData.homeLocation = homeLocation === '' ? null : homeLocation;
      // Story 12.2: Invalidate route cache so next request recalculates from new address
      invalidateUserRouteCache(user.id);
    }
    if (maxPickupRadiusMiles !== undefined) {
      const radius = Math.round(Number(maxPickupRadiusMiles));
      if (!isFinite(radius) || radius < 5 || radius > 500) {
        throw new ValidationError('maxPickupRadiusMiles must be between 5 and 500');
      }
      updateData.maxPickupRadiusMiles = radius;
    }

    // Holding cost rate (Story 6.6)
    if (holdingCostDailyRate !== undefined) {
      const rate = Number(holdingCostDailyRate);
      if (!isFinite(rate) || rate < 0 || rate > 100) {
        throw new ValidationError('holdingCostDailyRate must be a number between 0 and 100');
      }
      updateData.holdingCostDailyRate = rate;
    }

    // Message approval setting (Story 8.4)
    if (messageApprovalRequired !== undefined) {
      updateData.messageApprovalRequired = Boolean(messageApprovalRequired);
    }

    // Push notification global toggle (Story 11.1)
    if (pushNotifications !== undefined) {
      updateData.pushNotifications = Boolean(pushNotifications);
    }

    // SMS master toggle (Story 11.2). Requires a verified phone number.
    if (smsNotifications !== undefined) {
      const enabling = Boolean(smsNotifications);
      if (enabling && !user.settings?.phoneVerified) {
        throw new ValidationError('Verify your phone number before enabling SMS alerts');
      }
      updateData.smsNotifications = enabling;
    }

    // Story 10.4: Per-event communication notification toggles
    if (notifyMessageReceived !== undefined) {
      updateData.notifyMessageReceived = Boolean(notifyMessageReceived);
    }
    if (notifyDraftReady !== undefined) {
      updateData.notifyDraftReady = Boolean(notifyDraftReady);
    }
    if (notifyMessageSent !== undefined) {
      updateData.notifyMessageSent = Boolean(notifyMessageSent);
    }

    // Story 10.5: Smart alert notification toggles
    if (notifyReviewReceived !== undefined) {
      const prev = user.settings?.notifyReviewReceived;
      updateData.notifyReviewReceived = Boolean(notifyReviewReceived);
      if (prev !== undefined && prev !== updateData.notifyReviewReceived) {
        logger.info('settings.notification_preference_changed', { userId: user.id, field: 'notifyReviewReceived', oldValue: prev, newValue: updateData.notifyReviewReceived });
      }
    }
    if (notifyFlipGoneCold !== undefined) {
      const prev = user.settings?.notifyFlipGoneCold;
      updateData.notifyFlipGoneCold = Boolean(notifyFlipGoneCold);
      if (prev !== undefined && prev !== updateData.notifyFlipGoneCold) {
        logger.info('settings.notification_preference_changed', { userId: user.id, field: 'notifyFlipGoneCold', oldValue: prev, newValue: updateData.notifyFlipGoneCold });
      }
    }
    if (notifyFlipTurnedHot !== undefined) {
      const prev = user.settings?.notifyFlipTurnedHot;
      updateData.notifyFlipTurnedHot = Boolean(notifyFlipTurnedHot);
      if (prev !== undefined && prev !== updateData.notifyFlipTurnedHot) {
        logger.info('settings.notification_preference_changed', { userId: user.id, field: 'notifyFlipTurnedHot', oldValue: prev, newValue: updateData.notifyFlipTurnedHot });
      }
    }
    if (notifyPriceChanges !== undefined) {
      const prev = user.settings?.notifyPriceChanges;
      updateData.notifyPriceChanges = Boolean(notifyPriceChanges);
      if (prev !== undefined && prev !== updateData.notifyPriceChanges) {
        logger.info('settings.notification_preference_changed', { userId: user.id, field: 'notifyPriceChanges', oldValue: prev, newValue: updateData.notifyPriceChanges });
      }
    }
    if (flipGoneColdHours !== undefined) {
      const hours = Math.round(Number(flipGoneColdHours));
      if (!isFinite(hours) || hours < 1 || hours > 168) {
        throw new ValidationError('flipGoneColdHours must be between 1 and 168');
      }
      const prev = user.settings?.flipGoneColdHours;
      updateData.flipGoneColdHours = hours;
      if (prev !== undefined && prev !== hours) {
        logger.info('settings.notification_preference_changed', { userId: user.id, field: 'flipGoneColdHours', oldValue: prev, newValue: hours });
      }
    }
    if (flipTurnedHotCount !== undefined) {
      const count = Math.round(Number(flipTurnedHotCount));
      if (!isFinite(count) || count < 1 || count > 20) {
        throw new ValidationError('flipTurnedHotCount must be between 1 and 20');
      }
      const prev = user.settings?.flipTurnedHotCount;
      updateData.flipTurnedHotCount = count;
      if (prev !== undefined && prev !== count) {
        logger.info('settings.notification_preference_changed', { userId: user.id, field: 'flipTurnedHotCount', oldValue: prev, newValue: count });
      }
    }

    // Story 10.6: Notification preferences UI — listing unavailable toggle
    if (notifyListingUnavailable !== undefined) {
      updateData.notifyListingUnavailable = Boolean(notifyListingUnavailable);
    }

    // Story 12.2: Meeting departure buffer and reminder toggle
    if (meetingDepartureBufferMinutes !== undefined) {
      const buffer = Math.round(Number(meetingDepartureBufferMinutes));
      if (!isFinite(buffer) || buffer < 0 || buffer > 60) {
        throw new ValidationError('meetingDepartureBufferMinutes must be between 0 and 60');
      }
      updateData.meetingDepartureBufferMinutes = buffer;
    }
    if (notifyMeetingReminder !== undefined) {
      updateData.notifyMeetingReminder = Boolean(notifyMeetingReminder);
    }

    // Story 11.3: Per-event push and SMS toggle fields — loop-driven Boolean coercion.
    // Uses a single pattern for all 24 fields to avoid repetitive code.
    for (const field of PUSH_SMS_TOGGLE_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = Boolean(body[field]);
      }
    }

    // Phone number removal (Story 11.2). Never allow PATCH to set or verify
    // a phone number directly — that must go through the dedicated /api/user/phone
    // endpoints. We only allow removing an existing number here.
    if (removePhoneNumber === true) {
      updateData.phoneNumber = null;
      updateData.phoneVerified = false;
      updateData.phoneVerificationCode = null;
      updateData.phoneVerificationExpiry = null;
      updateData.phoneVerificationSentAt = null;
      updateData.smsNotifications = false;
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
        opportunityThreshold: settings.opportunityThreshold,
        feeRateEbay: settings.feeRateEbay,
        feeRateMercari: settings.feeRateMercari,
        feeRateFacebook: settings.feeRateFacebook,
        feeRateOfferup: settings.feeRateOfferup,
        feeRateCraigslist: settings.feeRateCraigslist,
        homeLocation: settings.homeLocation,
        maxPickupRadiusMiles: settings.maxPickupRadiusMiles,
        holdingCostDailyRate: settings.holdingCostDailyRate,
        messageApprovalRequired: settings.messageApprovalRequired,
        pushNotifications: settings.pushNotifications,
        // Story 11.2: Twilio SMS fields
        phoneNumber: settings.phoneNumber,
        phoneVerified: settings.phoneVerified,
        smsNotifications: settings.smsNotifications,
        // Story 10.4: Per-event communication notification toggles
        notifyMessageReceived: settings.notifyMessageReceived,
        notifyDraftReady: settings.notifyDraftReady,
        notifyMessageSent: settings.notifyMessageSent,
        // Story 10.5: Smart alert notification toggles
        notifyReviewReceived: settings.notifyReviewReceived,
        notifyFlipGoneCold: settings.notifyFlipGoneCold,
        notifyFlipTurnedHot: settings.notifyFlipTurnedHot,
        notifyPriceChanges: settings.notifyPriceChanges,
        flipGoneColdHours: settings.flipGoneColdHours,
        flipTurnedHotCount: settings.flipTurnedHotCount,
        // Story 10.6: Notification preferences UI
        notifyListingUnavailable: settings.notifyListingUnavailable,
        // Story 11.3: Per-event push notification toggles
        pushNotifyNewDeals: settings.pushNotifyNewDeals,
        pushNotifySoldItems: settings.pushNotifySoldItems,
        pushNotifyMessageReceived: settings.pushNotifyMessageReceived,
        pushNotifyDraftReady: settings.pushNotifyDraftReady,
        pushNotifyMessageSent: settings.pushNotifyMessageSent,
        pushNotifyReviewReceived: settings.pushNotifyReviewReceived,
        pushNotifyFlipGoneCold: settings.pushNotifyFlipGoneCold,
        pushNotifyFlipTurnedHot: settings.pushNotifyFlipTurnedHot,
        pushNotifyPriceDrops: settings.pushNotifyPriceDrops,
        pushNotifyExpiring: settings.pushNotifyExpiring,
        pushNotifyListingUnavailable: settings.pushNotifyListingUnavailable,
        pushNotifyWeeklyDigest: settings.pushNotifyWeeklyDigest,
        // Story 11.3: Per-event SMS notification toggles
        smsNotifyNewDeals: settings.smsNotifyNewDeals,
        smsNotifySoldItems: settings.smsNotifySoldItems,
        smsNotifyMessageReceived: settings.smsNotifyMessageReceived,
        smsNotifyDraftReady: settings.smsNotifyDraftReady,
        smsNotifyMessageSent: settings.smsNotifyMessageSent,
        smsNotifyReviewReceived: settings.smsNotifyReviewReceived,
        smsNotifyFlipGoneCold: settings.smsNotifyFlipGoneCold,
        smsNotifyFlipTurnedHot: settings.smsNotifyFlipTurnedHot,
        smsNotifyPriceDrops: settings.smsNotifyPriceDrops,
        smsNotifyExpiring: settings.smsNotifyExpiring,
        smsNotifyListingUnavailable: settings.smsNotifyListingUnavailable,
        smsNotifyWeeklyDigest: settings.smsNotifyWeeklyDigest,
        // Story 12.2: Meeting route & departure reminder settings
        meetingDepartureBufferMinutes: settings.meetingDepartureBufferMinutes,
        notifyMeetingReminder: settings.notifyMeetingReminder,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          subscriptionTier: user.subscriptionTier,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return handleError(error);
  }
}
