/**
 * API route to check if CAPTCHA is required for login
 */
import { NextRequest, NextResponse } from 'next/server';
import { requiresCaptcha } from '@/lib/captcha-tracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const needsCaptcha = requiresCaptcha(email.toLowerCase());

    return NextResponse.json({ requiresCaptcha: needsCaptcha });
  } catch (error) {
    console.error('Error checking CAPTCHA requirement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
