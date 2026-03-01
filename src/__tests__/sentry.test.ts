/**
 * Sentry Configuration Tests
 *
 * Tests to verify Sentry is properly configured and doesn't leak sensitive data.
 *
 * @author Stephen Boyett
 * @company Axovia AI
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Sentry Configuration', () => {
  it('should have Sentry package installed', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
    );
    expect(packageJson.dependencies['@sentry/nextjs']).toBeDefined();
  });

  it('should have client config file', () => {
    const configPath = path.join(process.cwd(), 'sentry.client.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should have server config file', () => {
    const configPath = path.join(process.cwd(), 'sentry.server.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should have edge config file', () => {
    const configPath = path.join(process.cwd(), 'sentry.edge.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should have instrumentation file', () => {
    const instrPath = path.join(process.cwd(), 'instrumentation.ts');
    expect(fs.existsSync(instrPath)).toBe(true);
  });

  it('should configure Sentry in next.config.js', () => {
    const configContent = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8',
    );
    expect(configContent).toContain('withSentryConfig');
    expect(configContent).toContain('@sentry/nextjs');
  });

  it('should have SENTRY_DSN in .env.example', () => {
    const envExample = fs.readFileSync(
      path.join(process.cwd(), '.env.example'),
      'utf-8',
    );
    expect(envExample).toContain('SENTRY_DSN');
    expect(envExample).toContain('NEXT_PUBLIC_SENTRY_DSN');
    expect(envExample).toContain('SENTRY_ORG');
    expect(envExample).toContain('SENTRY_PROJECT');
    expect(envExample).toContain('SENTRY_AUTH_TOKEN');
  });

  it('should filter sensitive data in client config', () => {
    const clientConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.client.config.ts'),
      'utf-8',
    );
    expect(clientConfig).toContain('beforeSend');
  });

  it('should filter sensitive data in server config', () => {
    const serverConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.server.config.ts'),
      'utf-8',
    );
    expect(serverConfig).toContain('beforeSend');
  });

  it('should filter sensitive data in edge config with REDACTED', () => {
    const edgeConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.edge.config.ts'),
      'utf-8',
    );
    expect(edgeConfig).toContain('beforeSend');
    expect(edgeConfig).toContain('REDACTED');
  });

  it('should disable Sentry in development by default (edge config)', () => {
    const edgeConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.edge.config.ts'),
      'utf-8',
    );

    expect(edgeConfig).toContain('enabled:');
    expect(edgeConfig).toContain("NODE_ENV === 'production'");
  });

  it('should configure source map upload in next.config.js', () => {
    const nextConfig = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8',
    );
    expect(nextConfig).toContain('SENTRY_ORG');
    expect(nextConfig).toContain('SENTRY_PROJECT');
    expect(nextConfig).toContain('SENTRY_AUTH_TOKEN');
    expect(nextConfig).toContain('hideSourceMaps');
  });

  it('should have dryRun control for source map upload', () => {
    const nextConfig = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8',
    );
    expect(nextConfig).toContain('dryRun');
  });
});
