/**
 * POST /api/auth/facebook/token
 *
 * Store Facebook marketplace access token after Firebase Facebook OAuth.
 * Exchanges short-lived token for long-lived token (60-day expiry).
 *
 * Called by the Firebase auth client helper after Facebook sign-in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/session';
import { handleError, UnauthorizedError, ValidationError } from '@/lib/errors';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      throw new ValidationError('Facebook access token is required');
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new ValidationError('Facebook app not configured');
    }

    // Exchange short-lived token for long-lived token (60 days)
    const exchangeUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
    exchangeUrl.searchParams.set('client_id', appId);
    exchangeUrl.searchParams.set('client_secret', appSecret);
    exchangeUrl.searchParams.set('fb_exchange_token', accessToken);

    const exchangeResponse = await fetch(exchangeUrl.toString());
    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok || !exchangeData.access_token) {
      // Fall back to storing the short-lived token
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour default
      await prisma.facebookToken.upsert({
        where: { userId: sessionUser.id },
        create: {
          userId: sessionUser.id,
          accessToken: accessToken,
          expiresAt,
        },
        update: {
          accessToken: accessToken,
          expiresAt,
        },
      });

      return NextResponse.json({ success: true, longLived: false });
    }

    // Store long-lived token
    const expiresInSeconds = exchangeData.expires_in || 60 * 60 * 24 * 60; // 60 days default
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await prisma.facebookToken.upsert({
      where: { userId: sessionUser.id },
      create: {
        userId: sessionUser.id,
        accessToken: exchangeData.access_token,
        expiresAt,
      },
      update: {
        accessToken: exchangeData.access_token,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, longLived: true });
  } catch (error) {
    return handleError(error, req.url);
  }
}
