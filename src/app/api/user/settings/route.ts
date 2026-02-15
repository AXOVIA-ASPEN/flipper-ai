import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';
import { getUserIdOrDefault } from '@/lib/auth-middleware';

/**
 * Get or create the current user with settings
 * Uses authenticated user or falls back to default in development
 */
async function getCurrentUserWithSettings() {
  const userId = await getUserIdOrDefault();

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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUserWithSettings();
    const body = await request.json();

    const { openaiApiKey, llmModel, discountThreshold, autoAnalyze } = body;

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
        return NextResponse.json(
          { success: false, error: 'Discount threshold must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: {
      openaiApiKey?: string | null;
      llmModel?: string;
      discountThreshold?: number;
      autoAnalyze?: boolean;
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
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
}
