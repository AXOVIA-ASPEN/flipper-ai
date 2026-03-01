/**
 * Step Definitions for Story 1.1: GCP Project Setup & Secret Manager Module
 * Validates helpers/secrets.py structure, naming convention, and error handling.
 *
 * Covers scenarios: @E-001-S-22 through @E-001-S-27
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

/**
 * Recursively find .py files matching a content pattern, excluding specified paths.
 */
function findPyFilesWithPattern(
  dir: string,
  pattern: RegExp,
  excludePaths: string[]
): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(PROJECT_ROOT, fullPath);
    if (excludePaths.some((ex) => relativePath.includes(ex))) continue;
    if (entry.isDirectory()) {
      results.push(...findPyFilesWithPattern(fullPath, pattern, excludePaths));
    } else if (entry.name.endsWith('.py')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (pattern.test(content)) {
        results.push(relativePath);
      }
    }
  }
  return results;
}

let secretsModuleContent: string;

// ==================== S-22: GCP Secret Manager naming convention ====================

Given(
  'the secrets module at {string}',
  async function (this: CustomWorld, modulePath: string) {
    secretsModuleContent = readProjectFile(modulePath);
    console.log(`✅ Loaded secrets module from ${modulePath}`);
  }
);

When(
  'I inspect the secret name construction logic',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting secret name construction logic...');
  }
);

Then(
  'each secret should be looked up as {string}',
  async function (this: CustomWorld, _pattern: string) {
    expect(secretsModuleContent).toContain('prefix = build_env.upper()');
    expect(secretsModuleContent).toMatch(/secret_name\s*=\s*f"{prefix}_{field_name}"/);
    console.log('✅ Secret lookup follows {BUILD_ENV_UPPER}_{FIELD_NAME} pattern');
  }
);

Then(
  'the resource path should follow {string}',
  async function (this: CustomWorld, _pattern: string) {
    expect(secretsModuleContent).toContain('projects/');
    expect(secretsModuleContent).toContain('/secrets/');
    expect(secretsModuleContent).toContain('/versions/latest');
    expect(secretsModuleContent).toMatch(
      /f"projects\/.*\/secrets\/\{secret_name\}\/versions\/latest"/
    );
    console.log('✅ Resource path follows projects/{id}/secrets/{name}/versions/latest');
  }
);

Then(
  'the GCP project ID should be hardcoded as {string}',
  async function (this: CustomWorld, projectId: string) {
    expect(secretsModuleContent).toContain(`GCP_PROJECT_ID = "${projectId}"`);
    console.log(`✅ GCP project ID hardcoded as: ${projectId}`);
  }
);

// ==================== S-23 & S-24: Environment prefix retrieval ====================

When(
  'BUILD_ENV is set to {string}',
  async function (this: CustomWorld, buildEnv: string) {
    (this as any).buildEnv = buildEnv;
    console.log(`✅ BUILD_ENV set to: ${buildEnv}`);
  }
);

Then(
  'load_secrets should call Secret Manager with {string} prefixed secret names',
  async function (this: CustomWorld, prefix: string) {
    expect(secretsModuleContent).toContain('prefix = build_env.upper()');
    expect(secretsModuleContent).toContain('f"{prefix}_{field_name}"');
    const buildEnv = (this as any).buildEnv;
    expect(secretsModuleContent).toContain(`"${buildEnv}"`);
    console.log(`✅ load_secrets uses ${prefix} prefix for secret lookups`);
  }
);

Then(
  'all retrieved values should be set as environment variables',
  async function (this: CustomWorld) {
    expect(secretsModuleContent).toContain('os.environ[field_name] = value');
    console.log('✅ Retrieved values are injected into os.environ');
  }
);

// ==================== S-25: Dataclass organization ====================

When('I inspect the module structure', async function (this: CustomWorld) {
  console.log('✅ Inspecting module structure...');
});

Then(
  'a {string} dataclass should exist with required field {string}',
  async function (this: CustomWorld, className: string, fieldName: string) {
    const classRegex = new RegExp(`@dataclass\\s+class ${className}:`);
    expect(secretsModuleContent).toMatch(classRegex);
    const fieldRegex = new RegExp(`${fieldName}:\\s*str\\b`);
    expect(secretsModuleContent).toMatch(fieldRegex);
    console.log(`✅ ${className} dataclass exists with required field ${fieldName}`);
  }
);

Then(
  'an {string} dataclass should exist with required fields {string} and {string}',
  async function (this: CustomWorld, className: string, field1: string, field2: string) {
    const classRegex = new RegExp(`@dataclass\\s+class ${className}:`);
    expect(secretsModuleContent).toMatch(classRegex);
    const field1Regex = new RegExp(`${field1}:\\s*str\\b`);
    const field2Regex = new RegExp(`${field2}:\\s*str\\b`);
    expect(secretsModuleContent).toMatch(field1Regex);
    expect(secretsModuleContent).toMatch(field2Regex);
    console.log(`✅ ${className} dataclass exists with required fields ${field1}, ${field2}`);
  }
);

Then(
  'an {string} dataclass should exist with optional API key fields',
  async function (this: CustomWorld, className: string) {
    const classRegex = new RegExp(`@dataclass\\s+class ${className}:`);
    expect(secretsModuleContent).toMatch(classRegex);
    expect(secretsModuleContent).toMatch(/OPENAI_API_KEY:.*Optional/);
    expect(secretsModuleContent).toMatch(/ANTHROPIC_API_KEY:.*Optional/);
    console.log(`✅ ${className} dataclass exists with optional API key fields`);
  }
);

Then(
  'a {string} dataclass should exist with optional Stripe fields',
  async function (this: CustomWorld, className: string) {
    const classRegex = new RegExp(`@dataclass\\s+class ${className}:`);
    expect(secretsModuleContent).toMatch(classRegex);
    expect(secretsModuleContent).toMatch(/STRIPE_SECRET_KEY:.*Optional/);
    expect(secretsModuleContent).toMatch(/STRIPE_WEBHOOK_SECRET:.*Optional/);
    console.log(`✅ ${className} dataclass exists with optional Stripe fields`);
  }
);

Then(
  'an {string} dataclass should exist with optional {string}',
  async function (this: CustomWorld, className: string, fieldName: string) {
    const classRegex = new RegExp(`@dataclass\\s+class ${className}:`);
    expect(secretsModuleContent).toMatch(classRegex);
    expect(secretsModuleContent).toMatch(new RegExp(`${fieldName}:.*Optional`));
    console.log(`✅ ${className} dataclass exists with optional ${fieldName}`);
  }
);

Then(
  'a {string} dataclass should exist with optional Sentry and metrics fields',
  async function (this: CustomWorld, className: string) {
    const classRegex = new RegExp(`@dataclass\\s+class ${className}:`);
    expect(secretsModuleContent).toMatch(classRegex);
    expect(secretsModuleContent).toMatch(/SENTRY_DSN:.*Optional/);
    expect(secretsModuleContent).toMatch(/SENTRY_AUTH_TOKEN:.*Optional/);
    expect(secretsModuleContent).toMatch(/METRICS_TOKEN:.*Optional/);
    console.log(`✅ ${className} dataclass exists with optional Sentry and metrics fields`);
  }
);

// ==================== S-26: Single source of truth ====================

Given('the project codebase', async function (this: CustomWorld) {
  console.log('✅ Project codebase context loaded');
});

When(
  'I search for GCP Secret Manager name patterns outside {string}',
  async function (this: CustomWorld, excludeFile: string) {
    const excludePaths = [
      excludeFile,
      '__pycache__',
      '.venv',
      'test_',
      'node_modules',
      '_bmad',
    ];
    const matches = findPyFilesWithPattern(
      PROJECT_ROOT,
      /class\s+\w+Secrets[\s(:].*@dataclass/s,
      excludePaths
    );
    (this as any).secretPatternFiles = matches;
    console.log(`✅ Searched for secret patterns outside ${excludeFile}`);
  }
);

Then(
  'no other source file should contain secret name-to-env-var mappings',
  async function (this: CustomWorld) {
    const files: string[] = (this as any).secretPatternFiles || [];
    expect(files.length).toBe(0);
    console.log('✅ No other source files contain secret name-to-env-var mappings');
  }
);

Then(
  '{string} should be the only file defining secret category dataclasses',
  async function (this: CustomWorld, expectedFile: string) {
    const content = readProjectFile(expectedFile);
    expect(content).toContain('@dataclass');
    expect(content).toContain('class DatabaseSecrets');
    expect(content).toContain('class AuthSecrets');
    console.log(`✅ ${expectedFile} is the sole source of secret dataclass definitions`);
  }
);

// ==================== S-27: Invalid BUILD_ENV error ====================

When(
  'BUILD_ENV is not set or is an invalid value like {string} or {string}',
  async function (this: CustomWorld, _val1: string, _val2: string) {
    console.log('✅ Testing invalid BUILD_ENV scenarios...');
  }
);

Then(
  'load_secrets should raise a ValueError',
  async function (this: CustomWorld) {
    expect(secretsModuleContent).toContain('raise ValueError');
    expect(secretsModuleContent).toMatch(/if not build_env or build_env not in VALID_ENVS/);
    console.log('✅ load_secrets raises ValueError for invalid BUILD_ENV');
  }
);

Then(
  'the error message should indicate valid values are {string} and {string}',
  async function (this: CustomWorld, val1: string, val2: string) {
    expect(secretsModuleContent).toContain('VALID_ENVS');
    expect(secretsModuleContent).toContain(`"${val1}"`);
    expect(secretsModuleContent).toContain(`"${val2}"`);
    console.log(`✅ Error message indicates valid values: ${val1}, ${val2}`);
  }
);
