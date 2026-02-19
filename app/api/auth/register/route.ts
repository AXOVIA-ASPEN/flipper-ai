/**
 * User Registration API Route
 * POST /api/auth/register - Create a new user account with email/password
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { captureError } from '@/lib/error-tracker';
import { metrics } from '@/lib/metrics';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '@/lib/errors';
interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export async function POST(request: NextRequest) {
  metrics.increment('registration_attempts');
  
  try {
    const body: RegisterBody = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });

    metrics.increment('registration_success');

    // Create default settings separately
    try {
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          llmModel: 'gpt-4o-mini',
          discountThreshold: 50,
          autoAnalyze: true,
        },
      });
    } catch (settingsError) {
      captureError(settingsError instanceof Error ? settingsError : new Error(String(settingsError)), {
        route: '/api/auth/register',
        action: 'create_user_settings',
      });
      // If UserSettings creation fails, roll back by deleting the user
      await prisma.user.delete({ where: { id: user.id } }).catch((deleteErr) => {
        captureError(deleteErr instanceof Error ? deleteErr : new Error(String(deleteErr)), {
          route: '/api/auth/register',
          action: 'rollback_user_creation',
        });
      });
      throw new Error('Failed to initialize user settings - database migration may be required');
    }

    // Send welcome email (non-blocking — don't fail registration if email fails)
    emailService.sendWelcome({ name: user.name ?? undefined, email: user.email }).catch((err) => {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        route: '/api/auth/register',
        action: 'send_welcome_email',
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    metrics.increment('registration_failures');
    captureError(error instanceof Error ? error : new Error(String(error)), {
      route: '/api/auth/register',
      action: 'register',
    });
    
    // More detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create account',
        // Include detailed error in development
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}
