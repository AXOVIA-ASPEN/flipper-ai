/**
 * User Registration API Route (Firebase)
 * POST /api/auth/register - Create a new user account with email/password
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterBody = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email.toLowerCase(),
      password,
      displayName: name || null,
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase(),
      name: name || null,
      subscriptionTier: 'FREE',
      onboardingComplete: false,
      onboardingStep: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create default user settings
    await db.collection('userSettings').doc(userRecord.uid).set({
      llmModel: 'gpt-4o-mini',
      discountThreshold: 50,
      autoAnalyze: true,
      emailNotifications: true,
      notifyNewDeals: true,
      notifyPriceDrops: true,
      notifySoldItems: true,
      notifyExpiring: true,
      notifyWeeklyDigest: true,
      notifyFrequency: 'instant',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Generate custom token for immediate sign-in
    const customToken = await auth.createCustomToken(userRecord.uid);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
        },
        customToken,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle Firebase-specific errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    if (error.code === 'auth/invalid-password') {
      return NextResponse.json(
        { success: false, error: 'Password is too weak' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      },
      { status: 500 }
    );
  }
}
