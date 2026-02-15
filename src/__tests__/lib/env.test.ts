/**
 * Tests for environment configuration module
 */

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should parse valid environment variables', () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    process.env.AUTH_SECRET = 'test-auth-secret-minimum-16-chars';
    process.env.ENCRYPTION_SECRET = 'test-encryption-secret-min16';
    
    const { env } = require('@/lib/env');
    
    expect(env.DATABASE_URL).toBe('file:./dev.db');
    expect(env.NODE_ENV).toBe('test');
  });

  it('should provide test defaults when NODE_ENV=test', () => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.ENCRYPTION_SECRET;
    
    const { env } = require('@/lib/env');
    
    expect(env.DATABASE_URL).toBeTruthy();
    expect(env.AUTH_SECRET).toBeTruthy();
    expect(env.ENCRYPTION_SECRET).toBeTruthy();
  });

  it('should parse feature flags as booleans', () => {
    process.env.ENABLE_OAUTH_GOOGLE = 'true';
    process.env.ENABLE_OAUTH_GITHUB = 'false';
    
    const { env } = require('@/lib/env');
    
    expect(env.ENABLE_OAUTH_GOOGLE).toBe(true);
    expect(env.ENABLE_OAUTH_GITHUB).toBe(false);
  });

  it('should default rate limit values', () => {
    const { env } = require('@/lib/env');
    
    expect(env.RATE_LIMIT_MAX).toBe(100);
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60000);
  });

  it('should parse custom rate limit values', () => {
    process.env.RATE_LIMIT_MAX = '50';
    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    
    const { env } = require('@/lib/env');
    
    expect(env.RATE_LIMIT_MAX).toBe(50);
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(30000);
  });

  it('should default LOG_LEVEL to info', () => {
    const { env } = require('@/lib/env');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('should accept valid LOG_LEVEL values', () => {
    process.env.LOG_LEVEL = 'debug';
    const { env } = require('@/lib/env');
    expect(env.LOG_LEVEL).toBe('debug');
  });

  describe('isOAuthConfigured', () => {
    it('should return false when Google OAuth not configured', () => {
      const { isOAuthConfigured } = require('@/lib/env');
      expect(isOAuthConfigured('google')).toBe(false);
    });

    it('should return true when Google OAuth is configured', () => {
      process.env.GOOGLE_CLIENT_ID = 'google-id';
      process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
      
      const { isOAuthConfigured } = require('@/lib/env');
      expect(isOAuthConfigured('google')).toBe(true);
    });

    it('should return false when GitHub OAuth not configured', () => {
      const { isOAuthConfigured } = require('@/lib/env');
      expect(isOAuthConfigured('github')).toBe(false);
    });

    it('should return true when GitHub OAuth is configured', () => {
      process.env.GITHUB_CLIENT_ID = 'gh-id';
      process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
      
      const { isOAuthConfigured } = require('@/lib/env');
      expect(isOAuthConfigured('github')).toBe(true);
    });

    it('should return false when Facebook OAuth not configured', () => {
      const { isOAuthConfigured } = require('@/lib/env');
      expect(isOAuthConfigured('facebook')).toBe(false);
    });

    it('should return true when Facebook OAuth is configured', () => {
      process.env.FACEBOOK_APP_ID = 'fb-id';
      process.env.FACEBOOK_APP_SECRET = 'fb-secret';
      
      const { isOAuthConfigured } = require('@/lib/env');
      expect(isOAuthConfigured('facebook')).toBe(true);
    });
  });

  describe('environment helpers', () => {
    it('isProduction returns false in test', () => {
      const { isProduction } = require('@/lib/env');
      expect(isProduction()).toBe(false);
    });

    it('isTest returns true in test', () => {
      const { isTest } = require('@/lib/env');
      expect(isTest()).toBe(true);
    });

    it('isDevelopment returns false in test', () => {
      const { isDevelopment } = require('@/lib/env');
      expect(isDevelopment()).toBe(false);
    });
  });
});
