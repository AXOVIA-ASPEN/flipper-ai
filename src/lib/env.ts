/**
 * Environment Configuration
 *
 * Centralized, validated environment variables using Zod.
 * Import `env` from this module instead of accessing process.env directly.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const dbUrl = env.DATABASE_URL;
 */

import { z } from 'zod';

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url().optional(),

  // OAuth Providers (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_REDIRECT_URI: z.string().url().optional(),

  // Encryption
  ENCRYPTION_SECRET: z.string().min(16, 'ENCRYPTION_SECRET must be at least 16 characters'),

  // API Keys
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  FLIPPER_API_KEYS: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  APP_URL: z.string().url().optional(),

  // Feature Flags
  ENABLE_OAUTH_GOOGLE: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  ENABLE_OAUTH_GITHUB: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  ENABLE_OAUTH_FACEBOOK: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * In test environment, provides sensible defaults to avoid requiring all vars.
 */
function parseEnv(): Env {
  const isTest = process.env.NODE_ENV === 'test';

  const input = {
    ...process.env,
    // Provide test defaults so unit tests don't need full .env
    ...(isTest
      ? {
          DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db',
          AUTH_SECRET: process.env.AUTH_SECRET || 'test-auth-secret-minimum-16-chars',
          ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || 'test-encryption-secret-min16',
        }
      : {}),
  };

  const result = envSchema.safeParse(input);

  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const message = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(', ')}`)
      .join('\n');

    console.error('❌ Invalid environment variables:\n' + message);

    if (!isTest) {
      throw new Error('Invalid environment configuration. Check .env file.');
    }

    // In test, return partial parse with defaults
    return envSchema.parse({
      ...input,
      DATABASE_URL: 'file:./test.db',
      AUTH_SECRET: 'test-secret-minimum-16-chars',
      ENCRYPTION_SECRET: 'test-encryption-secret-min16',
    });
  }

  return result.data;
}

/** Validated environment variables */
export const env = parseEnv();

/** Check if a specific OAuth provider is configured */
export function isOAuthConfigured(provider: 'google' | 'github' | 'facebook'): boolean {
  switch (provider) {
    case 'google':
      return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
    case 'github':
      return !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
    case 'facebook':
      return !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
  }
}

/** Check if running in production */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/** Check if running in development */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/** Check if running in test */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}
