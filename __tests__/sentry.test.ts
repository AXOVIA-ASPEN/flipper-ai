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

  it('should configure Sentry in next.config.ts', () => {
    const configContent = fs.readFileSync(
      path.join(process.cwd(), 'next.config.ts'),
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
    expect(clientConfig).toContain('REDACTED');
  });

  it('should filter sensitive data in server config', () => {
    const serverConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.server.config.ts'),
      'utf-8',
    );
    expect(serverConfig).toContain('beforeSend');
    expect(serverConfig).toContain('DATABASE_URL');
    expect(serverConfig).toContain('AUTH_SECRET');
  });

  it('should disable Sentry in development by default', () => {
    const clientConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.client.config.ts'),
      'utf-8',
    );
    const serverConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.server.config.ts'),
      'utf-8',
    );
    const edgeConfig = fs.readFileSync(
      path.join(process.cwd(), 'sentry.edge.config.ts'),
      'utf-8',
    );

    expect(clientConfig).toContain('enabled:');
    expect(serverConfig).toContain('enabled:');
    expect(edgeConfig).toContain('enabled:');

    expect(clientConfig).toContain("NODE_ENV === 'production'");
    expect(serverConfig).toContain("NODE_ENV === 'production'");
    expect(edgeConfig).toContain("NODE_ENV === 'production'");
  });

  it('should have documentation in DEPLOYMENT.md', () => {
    const deploymentDoc = fs.readFileSync(
      path.join(process.cwd(), 'docs/DEPLOYMENT.md'),
      'utf-8',
    );
    expect(deploymentDoc).toContain('Sentry');
    expect(deploymentDoc).toContain('Error Tracking');
    expect(deploymentDoc).toContain('SENTRY_DSN');
  });

  it('should have test endpoint for verification', () => {
    const testEndpoint = path.join(process.cwd(), 'app/api/sentry-test/route.ts');
    expect(fs.existsSync(testEndpoint)).toBe(true);

    const content = fs.readFileSync(testEndpoint, 'utf-8');
    expect(content).toContain('Sentry.captureException');
    expect(content).toContain('Sentry.captureMessage');
  });

  it('should configure source map upload', () => {
    const nextConfig = fs.readFileSync(
      path.join(process.cwd(), 'next.config.ts'),
      'utf-8',
    );
    expect(nextConfig).toContain('SENTRY_ORG');
    expect(nextConfig).toContain('SENTRY_PROJECT');
    expect(nextConfig).toContain('SENTRY_AUTH_TOKEN');
    expect(nextConfig).toContain('hideSourceMaps');
  });

  it('should only upload source maps in production', () => {
    const nextConfig = fs.readFileSync(
      path.join(process.cwd(), 'next.config.ts'),
      'utf-8',
    );
    expect(nextConfig).toContain('disableSourcemapUpload');
    expect(nextConfig).toContain("NODE_ENV !== 'production'");
  });
});
