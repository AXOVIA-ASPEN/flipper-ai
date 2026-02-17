/**
 * POST /api/user/onboarding — Save onboarding step progress or mark complete.
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserIdOrDefault } from '@/lib/auth-middleware';

const TOTAL_STEPS = 6; // welcome, marketplaces, categories, budget, location, complete

/**
 * GET /api/user/onboarding — Check onboarding status.
 */
export async function GET() {
  try {
    const userId = await getUserIdOrDefault();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true, onboardingStep: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        onboardingComplete: user.onboardingComplete,
        onboardingStep: user.onboardingStep,
        totalSteps: TOTAL_STEPS,
      },
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/onboarding — Update onboarding step or mark as complete.
 *
 * Body:
 *   { step: number, complete?: boolean, data?: Record<string, unknown> }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdOrDefault();
    const body = await req.json();

    const { step, complete = false } = body as {
      step?: number;
      complete?: boolean;
    };

    // Validate step if provided
    if (step !== undefined) {
      if (typeof step !== 'number' || step < 0 || step > TOTAL_STEPS) {
        return NextResponse.json(
          { success: false, error: `Invalid step. Must be 0–${TOTAL_STEPS}.` },
          { status: 400 }
        );
      }
    }

    const updateData: { onboardingStep?: number; onboardingComplete?: boolean } = {};

    if (step !== undefined) {
      updateData.onboardingStep = step;
    }

    if (complete) {
      updateData.onboardingComplete = true;
      updateData.onboardingStep = TOTAL_STEPS;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { onboardingComplete: true, onboardingStep: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        onboardingComplete: user.onboardingComplete,
        onboardingStep: user.onboardingStep,
        totalSteps: TOTAL_STEPS,
      },
    });
  } catch (error) {
    console.error('Error updating onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update onboarding' },
      { status: 500 }
    );
  }
}
