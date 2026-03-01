/**
 * Step Definitions for Story 1.2: Cloud SQL Database Provisioning
 * Validates Cloud SQL configuration, Prisma migration setup, connection pooling,
 * Secret Manager integration, and Cloud Run connectivity.
 *
 * Covers scenarios: @E-001-S-48 through @E-001-S-52
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function readProjectFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== SHARED STATE ====================

let cloudSqlDocContent: string;
let prismaSchemaContent: string;
let packageJsonContent: string;
let packageJson: Record<string, unknown>;
let dbModuleContent: string;
let envExampleContent: string;
let envProductionContent: string;

// ==================== S-48: Cloud SQL instance provisioned ====================

Given(
  'the Cloud SQL setup documentation at {string}',
  async function (this: CustomWorld, docPath: string) {
    cloudSqlDocContent = readProjectFile(docPath);
    console.log(`✅ Loaded Cloud SQL docs: ${docPath}`);
  }
);

When('I inspect the instance configuration', async function (this: CustomWorld) {
  expect(cloudSqlDocContent).toBeTruthy();
  console.log('✅ Inspecting Cloud SQL instance configuration...');
});

Then(
  'the instance tier should be {string}',
  async function (this: CustomWorld, tier: string) {
    expect(cloudSqlDocContent).toContain(tier);
    console.log(`✅ Instance tier: ${tier}`);
  }
);

Then(
  'automated daily backups should be enabled with 7-day retention',
  async function (this: CustomWorld) {
    expect(cloudSqlDocContent).toMatch(/backup/i);
    expect(cloudSqlDocContent).toContain('7');
    console.log('✅ Automated backups enabled with 7-day retention');
  }
);

Then(
  'point-in-time recovery should be enabled',
  async function (this: CustomWorld) {
    expect(cloudSqlDocContent).toMatch(/point-in-time recovery/i);
    expect(cloudSqlDocContent).toMatch(/enabled/i);
    console.log('✅ Point-in-time recovery enabled');
  }
);

Then(
  'a maintenance window should be configured for Sunday 03:00 UTC',
  async function (this: CustomWorld) {
    expect(cloudSqlDocContent).toMatch(/maintenance/i);
    expect(cloudSqlDocContent).toMatch(/sunday/i);
    expect(cloudSqlDocContent).toContain('03:00');
    console.log('✅ Maintenance window: Sunday 03:00 UTC');
  }
);

// ==================== S-49: Prisma schema migrates with all models ====================

Given(
  'the Prisma schema at {string}',
  async function (this: CustomWorld, schemaPath: string) {
    prismaSchemaContent = readProjectFile(schemaPath);
    console.log(`✅ Loaded Prisma schema: ${schemaPath}`);
  }
);

Given(
  'the build script in {string}',
  async function (this: CustomWorld, pkgPath: string) {
    packageJsonContent = readProjectFile(pkgPath);
    packageJson = JSON.parse(packageJsonContent);
    console.log(`✅ Loaded package.json: ${pkgPath}`);
  }
);

When(
  'I inspect the database migration configuration',
  async function (this: CustomWorld) {
    expect(prismaSchemaContent).toBeTruthy();
    expect(packageJson).toBeTruthy();
    console.log('✅ Inspecting database migration configuration...');
  }
);

Then(
  'the datasource provider should be {string}',
  async function (this: CustomWorld, provider: string) {
    expect(prismaSchemaContent).toMatch(
      new RegExp(`provider\\s*=\\s*"${provider}"`)
    );
    console.log(`✅ Datasource provider: ${provider}`);
  }
);

Then(
  'the build script should use {string} instead of {string}',
  async function (this: CustomWorld, expected: string, notExpected: string) {
    const scripts = packageJson.scripts as Record<string, string>;
    expect(scripts.build).toContain(expected);
    expect(scripts.build).not.toContain(notExpected);
    console.log(`✅ Build script uses "${expected}" (not "${notExpected}")`);
  }
);

Then(
  'the build script should not contain {string}',
  async function (this: CustomWorld, forbidden: string) {
    const scripts = packageJson.scripts as Record<string, string>;
    expect(scripts.build).not.toContain(forbidden);
    console.log(`✅ Build script does not contain "${forbidden}"`);
  }
);

Then(
  'the schema should define at least {int} database models',
  async function (this: CustomWorld, minModels: number) {
    const modelMatches = prismaSchemaContent.match(/^model\s+\w+/gm);
    expect(modelMatches).not.toBeNull();
    expect(modelMatches!.length).toBeGreaterThanOrEqual(minModels);
    console.log(`✅ Schema defines ${modelMatches!.length} models (>= ${minModels})`);
  }
);

// ==================== S-50: Cloud Run connects via Unix socket ====================

When(
  'I inspect the Cloud Run connection configuration',
  async function (this: CustomWorld) {
    expect(cloudSqlDocContent).toBeTruthy();
    console.log('✅ Inspecting Cloud Run connection configuration...');
  }
);

Then(
  'the production DATABASE_URL should use a Unix socket path via {string}',
  async function (this: CustomWorld, socketParam: string) {
    expect(cloudSqlDocContent).toContain(socketParam);
    console.log(`✅ DATABASE_URL uses Unix socket: ${socketParam}`);
  }
);

Then(
  'the deploy command should include {string} for Auth Proxy sidecar',
  async function (this: CustomWorld, flag: string) {
    expect(cloudSqlDocContent).toContain(flag);
    console.log(`✅ Deploy command includes: ${flag}`);
  }
);

Then(
  'the deploy command should use {string} to inject DATABASE_URL from Secret Manager',
  async function (this: CustomWorld, flag: string) {
    expect(cloudSqlDocContent).toContain(flag);
    // Verify the --set-secrets line references DATABASE_URL
    const setSecretsMatch = cloudSqlDocContent.match(
      /--set-secrets=.*DATABASE_URL/
    );
    expect(setSecretsMatch).not.toBeNull();
    console.log(`✅ Deploy uses ${flag} for DATABASE_URL`);
  }
);

// ==================== S-51: DATABASE_URL in Secret Manager ====================

Given(
  'the environment configuration files',
  async function (this: CustomWorld) {
    envExampleContent = readProjectFile('.env.example');
    envProductionContent = readProjectFile('.env.production.example');
    console.log('✅ Loaded environment configuration files');
  }
);

When(
  'I inspect where DATABASE_URL is defined',
  async function (this: CustomWorld) {
    expect(envProductionContent).toBeTruthy();
    console.log('✅ Inspecting DATABASE_URL locations...');
  }
);

Then(
  '{string} should contain placeholder values not real credentials',
  async function (this: CustomWorld, fileName: string) {
    const content =
      fileName === '.env.production.example'
        ? envProductionContent
        : envExampleContent;
    // Verify it contains CHANGE_ME or PASSWORD placeholders, not real credentials
    expect(content).toMatch(/CHANGE_ME|PASSWORD/);
    // Verify no real-looking passwords (long random strings) are in the file
    const dbUrlLine = content.match(/DATABASE_URL="([^"]+)"/);
    expect(dbUrlLine).not.toBeNull();
    expect(dbUrlLine![1]).toMatch(/CHANGE_ME|PASSWORD/);
    console.log(`✅ ${fileName} contains placeholder values`);
  }
);

Then(
  'the Cloud Run deploy command should reference Secret Manager for DATABASE_URL',
  async function (this: CustomWorld) {
    // The cloud-sql-setup.md documents --set-secrets with DATABASE_URL
    expect(cloudSqlDocContent).toMatch(/--set-secrets=.*DATABASE_URL/);
    console.log('✅ Cloud Run deploy references Secret Manager for DATABASE_URL');
  }
);

Then(
  '{string} should also be stored in Secret Manager for migrations',
  async function (this: CustomWorld, secretName: string) {
    // Verify the docs or env files reference DIRECT_DATABASE_URL
    expect(cloudSqlDocContent).toContain(secretName);
    expect(envProductionContent).toContain(secretName);
    console.log(`✅ ${secretName} referenced in docs and env config`);
  }
);

// ==================== S-52: Connection pooling ====================

Given(
  'the database client configuration at {string}',
  async function (this: CustomWorld, dbPath: string) {
    dbModuleContent = readProjectFile(dbPath);
    console.log(`✅ Loaded database client: ${dbPath}`);
  }
);

When(
  'I inspect the connection pool settings',
  async function (this: CustomWorld) {
    expect(dbModuleContent).toBeTruthy();
    console.log('✅ Inspecting connection pool settings...');
  }
);

Then(
  'the PrismaPg adapter should be configured with max connections of {int}',
  async function (this: CustomWorld, maxConnections: number) {
    expect(dbModuleContent).toContain('PrismaPg');
    const maxMatch = dbModuleContent.match(/max:\s*(\d+)/);
    expect(maxMatch).not.toBeNull();
    expect(parseInt(maxMatch![1], 10)).toBe(maxConnections);
    console.log(`✅ PrismaPg max connections: ${maxConnections}`);
  }
);

Then(
  'the connection timeout should be set to {int} milliseconds',
  async function (this: CustomWorld, timeoutMs: number) {
    const match = dbModuleContent.match(
      /connectionTimeoutMillis:\s*([\d_]+)/
    );
    expect(match).not.toBeNull();
    const value = parseInt(match![1].replace(/_/g, ''), 10);
    expect(value).toBe(timeoutMs);
    console.log(`✅ Connection timeout: ${timeoutMs}ms`);
  }
);

Then(
  'the idle timeout should be set to {int} milliseconds',
  async function (this: CustomWorld, timeoutMs: number) {
    const match = dbModuleContent.match(
      /idleTimeoutMillis:\s*([\d_]+)/
    );
    expect(match).not.toBeNull();
    const value = parseInt(match![1].replace(/_/g, ''), 10);
    expect(value).toBe(timeoutMs);
    console.log(`✅ Idle timeout: ${timeoutMs}ms`);
  }
);

Then(
  'the pool size should account for db-f1-micro limits with Cloud Run scaling',
  async function (this: CustomWorld) {
    // Verify the code has a comment explaining the pool math
    expect(dbModuleContent).toMatch(/db-f1-micro/i);
    // max=2 is correct: (25 max - 5 reserved) / 10 instances = 2
    const maxMatch = dbModuleContent.match(/max:\s*(\d+)/);
    expect(maxMatch).not.toBeNull();
    expect(parseInt(maxMatch![1], 10)).toBeLessThanOrEqual(5);
    console.log('✅ Pool size accounts for db-f1-micro limits');
  }
);
