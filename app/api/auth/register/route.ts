/**
 * User Registration API Route
 * POST /api/auth/register - Create a new user account with email/password
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '@/lib/errors';
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
      console.error('Failed to create UserSettings:', settingsError);
      // If UserSettings creation fails, roll back by deleting the user
      await prisma.user.delete({ where: { id: user.id } }).catch((deleteErr) => {
        console.error('Failed to rollback user creation:', deleteErr);
      });
      throw new Error('Failed to initialize user settings - database migration may be required');
    }

    // Send welcome email (non-blocking — don't fail registration if email fails)
    emailService.sendWelcome({ name: user.name ?? undefined, email: user.email }).catch((err) => {
      console.error('Failed to send welcome email:', err);
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
    console.error('Registration error:', error);
    
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
