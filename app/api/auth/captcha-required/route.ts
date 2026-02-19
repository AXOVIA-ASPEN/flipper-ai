/**
 * API route to check if CAPTCHA is required for login
 */
import { NextRequest, NextResponse } from 'next/server';
import { requiresCaptcha } from '@/lib/captcha-tracker';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const needsCaptcha = requiresCaptcha(email.toLowerCase());

    return NextResponse.json({ requiresCaptcha: needsCaptcha });
  } catch (error) {
    console.error('Error checking CAPTCHA requirement:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}
