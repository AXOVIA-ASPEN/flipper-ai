/**
 * Facebook Graph API Authentication
 * Handles OAuth flow and token management for accessing Facebook Marketplace
 */

import { z } from 'zod';

export interface FacebookAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Facebook OAuth token schema
 */
const FacebookTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
});

const FacebookLongLivedTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

/**
 * Generates the Facebook OAuth authorization URL
 * @param config Facebook app configuration
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function getAuthorizationUrl(config: FacebookAuthConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: 'public_profile,email', // Note: Marketplace API requires special approval
    response_type: 'code',
    ...(state && { state }),
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 * @param config Facebook app configuration
 * @param code Authorization code from OAuth callback
 * @returns Short-lived access token
 */
export async function exchangeCodeForToken(
  config: FacebookAuthConfig,
  code: string
): Promise<FacebookTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const url = `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Facebook token exchange failed: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return FacebookTokenSchema.parse(data);
}

/**
 * Exchanges short-lived token for long-lived token (60 days)
 * @param config Facebook app configuration
 * @param shortLivedToken Short-lived access token
 * @returns Long-lived access token
 */
export async function exchangeForLongLivedToken(
  config: FacebookAuthConfig,
  shortLivedToken: string
): Promise<FacebookLongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const url = `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Long-lived token exchange failed: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return FacebookLongLivedTokenSchema.parse(data);
}

/**
 * Verifies an access token and returns user info
 * @param accessToken Access token to verify
 * @returns User ID and app ID if valid
 */
export async function verifyAccessToken(accessToken: string): Promise<{
  appId: string;
  userId: string;
  isValid: boolean;
  expiresAt: number;
}> {
  const url = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Token verification failed: ${response.statusText}`);
  }

  const data = await response.json();
  const tokenData = data.data;

  return {
    appId: tokenData.app_id,
    userId: tokenData.user_id,
    isValid: tokenData.is_valid,
    expiresAt: tokenData.expires_at,
  };
}

/**
 * Refreshes an access token (if still valid)
 * NOTE: Facebook doesn't have a refresh token flow like other OAuth providers.
 * You need to re-authenticate when the long-lived token expires.
 * @param config Facebook app configuration
 * @param currentToken Current access token
 * @returns New long-lived token
 */
export async function refreshAccessToken(
  config: FacebookAuthConfig,
  currentToken: string
): Promise<FacebookLongLivedTokenResponse> {
  // First verify the token is still valid
  const verification = await verifyAccessToken(currentToken);

  if (!verification.isValid) {
    throw new Error('Token is invalid. User needs to re-authenticate.');
  }

  // Exchange for a new long-lived token
  return exchangeForLongLivedToken(config, currentToken);
}

/**
 * Revokes an access token (logout)
 * @param accessToken Access token to revoke
 */
export async function revokeAccessToken(accessToken: string): Promise<void> {
  const url = `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Token revocation failed: ${response.statusText}`);
  }
}

/**
 * Utility: Calculate token expiration timestamp
 * @param expiresIn Seconds until expiration
 * @returns Unix timestamp when token expires
 */
export function calculateExpirationTimestamp(expiresIn: number): number {
  return Math.floor(Date.now() / 1000) + expiresIn;
}

/**
 * Utility: Check if token is expired or expiring soon
 * @param expiresAt Unix timestamp when token expires
 * @param bufferSeconds Buffer time before expiration (default: 1 day)
 * @returns True if token is expired or expiring soon
 */
export function isTokenExpiring(
  expiresAt: number,
  bufferSeconds: number = 86400 // 24 hours
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= bufferSeconds;
}
