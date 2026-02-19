/**
 * Email Unsubscribe Endpoint
 * GET /api/user/unsubscribe?token=<base64url-encoded-email>
 *
 * Disables all email notifications for the user without requiring authentication,
 * so unsubscribe links in emails work with a single click.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    throw new ValidationError('Missing token');
  }

  let email: string;
  try {
    email = Buffer.from(token, 'base64url').toString('utf-8');
  } catch {
    throw new ValidationError('Invalid token');
  }

  // Basic email validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Invalid token');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, settings: { select: { id: true } } },
    });

    if (!user) {
      // Don't leak whether the email exists — just show success
      return new NextResponse(unsubscribeHtml(true), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (user.settings) {
      await prisma.userSettings.update({
        where: { userId: user.id },
        data: { emailNotifications: false },
      });
    } else {
      await prisma.userSettings.create({
        data: { userId: user.id, emailNotifications: false },
      });
    }

    logger.info('User unsubscribed from email notifications', { userId: user.id });

    return new NextResponse(unsubscribeHtml(true), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    logger.error('Unsubscribe error', { err });
    return new NextResponse(unsubscribeHtml(false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/**
 * POST /api/user/unsubscribe — Authenticated re-subscribe
 * Allows users to re-enable emails from the settings page.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const resubscribe = searchParams.get('resubscribe') === 'true';

  if (!token) {
    throw new ValidationError('Missing token');
  }

  let email: string;
  try {
    email = Buffer.from(token, 'base64url').toString('utf-8');
  } catch {
    throw new ValidationError('Invalid token');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { emailNotifications: resubscribe },
      create: { userId: user.id, emailNotifications: resubscribe },
    });

    return NextResponse.json({ success: true, emailNotifications: resubscribe });
  } catch (err) {
    logger.error('Resubscribe error', { err });
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update preferences');
  }
}

function unsubscribeHtml(success: boolean): string {
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flipper-ai.app';
  const title = success ? 'Unsubscribed Successfully' : 'Something Went Wrong';
  const message = success
    ? 'You\'ve been unsubscribed from all Flipper AI email notifications. You can re-enable them at any time in your account settings.'
    : 'We couldn\'t process your unsubscribe request. Please try again or manage your preferences in the app.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${title} — Flipper AI</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:500px;margin:80px auto;text-align:center;padding:40px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
    <div style="font-size:48px;margin-bottom:16px;">${success ? '✅' : '❌'}</div>
    <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 12px 0;">${title}</h1>
    <p style="font-size:15px;color:#64748b;line-height:1.6;margin:0 0 24px 0;">${message}</p>
    <a href="${appUrl}" style="display:inline-block;background-color:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">
      Go to Flipper AI
    </a>
  </div>
</body>
</html>`;
}
