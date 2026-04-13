/**
 * @file test/acceptance/step_definitions/E-001-S22-secrets-module.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 2.0
 * @brief Step definitions for Story 1.1 secret management acceptance tests.
 *
 * @description
 * Validates the YAML-driven secret management system:
 *   - config/secretmanager.yaml structure and environment scopes
 *   - scripts/secretmanager.py EnvSecretManager class and CLI
 *   - Single source of truth (no legacy helpers/secrets.py)
 *
 * Covers scenarios: @E-001-S-22 through @E-001-S-27
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function readProjectFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

interface SecretEntry {
  name: string;
  description?: string;
}

interface YamlConfig {
  'stored-secrets': {
    environments: Record<string, Record<string, SecretEntry> | null>;
  };
}

let yamlContent: string;
let yamlConfig: YamlConfig;
let secretManagerContent: string;

// ==================== S-22: YAML config structure ====================

Given(
  'the secrets config at {string}',
  async function (this: CustomWorld, configPath: string) {
    yamlContent = readProjectFile(configPath);
    yamlConfig = yaml.load(yamlContent) as YamlConfig;
    console.log(`Loaded secrets config from ${configPath}`);
  }
);

When(
  'I inspect the YAML structure',
  async function (this: CustomWorld) {
    console.log('Inspecting YAML structure...');
  }
);

Then(
  'the config should have environment scopes {string}, {string}, {string}, and {string}',
  async function (this: CustomWorld, scope1: string, scope2: string, scope3: string, scope4: string) {
    const environments = yamlConfig['stored-secrets'].environments;
    const envKeys = Object.keys(environments);
    for (const scope of [scope1, scope2, scope3, scope4]) {
      expect(envKeys).toContain(scope);
    }
    console.log(`Config has environment scopes: ${[scope1, scope2, scope3, scope4].join(', ')}`);
  }
);

Then(
  'the {string} scope should include critical secret {string}',
  async function (this: CustomWorld, scope: string, secretName: string) {
    const environments = yamlConfig['stored-secrets'].environments;
    const scopeEntries = environments[scope];
    expect(scopeEntries).toBeTruthy();
    const names = Object.values(scopeEntries!).map((e: SecretEntry) => e.name);
    expect(names).toContain(secretName);
    console.log(`${scope} scope includes critical secret: ${secretName}`);
  }
);

Then(
  'the GCP project ID should be hardcoded as {string} in scripts\\/secretmanager.py',
  async function (this: CustomWorld, projectId: string) {
    const content = readProjectFile('scripts/secretmanager.py');
    expect(content).toContain(`GCP_PROJECT_ID = "${projectId}"`);
    console.log(`GCP project ID hardcoded as: ${projectId}`);
  }
);

// ==================== S-23: EnvSecretManager class ====================

Given(
  'the secrets manager module at {string}',
  async function (this: CustomWorld, modulePath: string) {
    secretManagerContent = readProjectFile(modulePath);
    console.log(`Loaded secrets manager module from ${modulePath}`);
  }
);

When(
  'I inspect the EnvSecretManager class',
  async function (this: CustomWorld) {
    console.log('Inspecting EnvSecretManager class...');
  }
);

Then(
  'it should define an EnvSecretManager class',
  async function (this: CustomWorld) {
    expect(secretManagerContent).toContain('class EnvSecretManager');
    console.log('EnvSecretManager class found');
  }
);

Then(
  'it should have a load_into_environ method for container startup',
  async function (this: CustomWorld) {
    expect(secretManagerContent).toContain('def load_into_environ');
    console.log('load_into_environ method found');
  }
);

Then(
  'it should have a get_secrets_by_scope method for filtering by environment',
  async function (this: CustomWorld) {
    expect(secretManagerContent).toContain('def get_secrets_by_scope');
    console.log('get_secrets_by_scope method found');
  }
);

// ==================== S-24: SecretScope enum ====================

When(
  'I inspect the SecretScope enum',
  async function (this: CustomWorld) {
    console.log('Inspecting SecretScope enum...');
  }
);

Then(
  'it should define values ALL, DEV, PROD, and STAGING',
  async function (this: CustomWorld) {
    expect(secretManagerContent).toContain('class SecretScope');
    expect(secretManagerContent).toMatch(/ALL\s*=\s*"ALL"/);
    expect(secretManagerContent).toMatch(/DEV\s*=\s*"DEV"/);
    expect(secretManagerContent).toMatch(/PROD\s*=\s*"PROD"/);
    expect(secretManagerContent).toMatch(/STAGING\s*=\s*"STAGING"/);
    console.log('SecretScope enum defines ALL, DEV, PROD, STAGING');
  }
);

// ==================== S-25: YAML secret entries ====================

When(
  'I inspect the secret entries',
  async function (this: CustomWorld) {
    console.log('Inspecting secret entries...');
  }
);

Then(
  'each entry should have a {string} field for the environment variable name',
  async function (this: CustomWorld, fieldName: string) {
    const environments = yamlConfig['stored-secrets'].environments;
    for (const [envName, entries] of Object.entries(environments)) {
      if (entries === null) continue;
      for (const [slug, config] of Object.entries(entries)) {
        expect(config).toHaveProperty(fieldName);
      }
    }
    console.log(`All entries have "${fieldName}" field`);
  }
);

Then(
  'each entry should have a {string} field',
  async function (this: CustomWorld, fieldName: string) {
    const environments = yamlConfig['stored-secrets'].environments;
    for (const [envName, entries] of Object.entries(environments)) {
      if (entries === null) continue;
      for (const [slug, config] of Object.entries(entries)) {
        expect(config).toHaveProperty(fieldName);
      }
    }
    console.log(`All entries have "${fieldName}" field`);
  }
);

Then(
  'the {string} scope should include Firebase public config secrets',
  async function (this: CustomWorld, scope: string) {
    const environments = yamlConfig['stored-secrets'].environments;
    const scopeEntries = environments[scope];
    expect(scopeEntries).toBeTruthy();
    const names = Object.values(scopeEntries!).map((e: SecretEntry) => e.name);
    expect(names).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    console.log(`${scope} scope includes Firebase public config secrets`);
  }
);

// ==================== S-26: Single source of truth ====================

Given('the project codebase', async function (this: CustomWorld) {
  console.log('Project codebase context loaded');
});

When(
  'I search for secret configuration files',
  async function (this: CustomWorld) {
    console.log('Searching for secret configuration files...');
  }
);

Then(
  '{string} should be the canonical secret config',
  async function (this: CustomWorld, configPath: string) {
    const fullPath = path.join(PROJECT_ROOT, configPath);
    expect(fs.existsSync(fullPath)).toBe(true);
    const content = readProjectFile(configPath);
    expect(content).toContain('stored-secrets');
    expect(content).toContain('environments');
    console.log(`${configPath} is the canonical secret config`);
  }
);

Then(
  '{string} should read from {string}',
  async function (this: CustomWorld, modulePath: string, configPath: string) {
    const content = readProjectFile(modulePath);
    expect(content).toContain('secretmanager.yaml');
    console.log(`${modulePath} reads from ${configPath}`);
  }
);

Then(
  'no legacy {string} file should exist',
  async function (this: CustomWorld, legacyPath: string) {
    const fullPath = path.join(PROJECT_ROOT, legacyPath);
    expect(fs.existsSync(fullPath)).toBe(false);
    console.log(`Legacy file does not exist: ${legacyPath}`);
  }
);

// ==================== S-27: CLI subcommands ====================

When(
  'I inspect the CLI entry point',
  async function (this: CustomWorld) {
    console.log('Inspecting CLI entry point...');
  }
);

Then(
  'the module should support {string} subcommand',
  async function (this: CustomWorld, subcommand: string) {
    expect(secretManagerContent).toContain(`"${subcommand}"`);
    console.log(`Module supports "${subcommand}" subcommand`);
  }
);

// ==================== S-16 & S-45: Firebase secrets config (updated) ====================

Given(
  'the secrets configuration at {string}',
  async function (this: CustomWorld, configPath: string) {
    yamlContent = readProjectFile(configPath);
    yamlConfig = yaml.load(yamlContent) as YamlConfig;
    console.log(`Loaded secrets configuration from ${configPath}`);
  }
);

When(
  'I inspect the Firebase secret entries',
  async function (this: CustomWorld) {
    console.log('Inspecting Firebase secret entries...');
  }
);

Then(
  'it should include {string}',
  async function (this: CustomWorld, secretName: string) {
    const environments = yamlConfig['stored-secrets'].environments;
    const allNames: string[] = [];
    for (const [, entries] of Object.entries(environments)) {
      if (entries === null) continue;
      for (const config of Object.values(entries)) {
        allNames.push((config as SecretEntry).name);
      }
    }
    expect(allNames).toContain(secretName);
    console.log(`Config includes secret: ${secretName}`);
  }
);

// ==================== S-16: Firebase secrets in Secret Manager (updated ref) ====================

Given(
  'the secrets configuration',
  async function (this: CustomWorld) {
    yamlContent = readProjectFile('config/secretmanager.yaml');
    yamlConfig = yaml.load(yamlContent) as YamlConfig;
    console.log('Loaded secrets configuration from config/secretmanager.yaml');
  }
);

When(
  'I inspect the secret storage for Firebase credentials',
  async function (this: CustomWorld) {
    console.log('Inspecting secret storage for Firebase credentials...');
  }
);

Then(
  '{string} should include Firebase admin credentials in its secret entries',
  async function (this: CustomWorld, configPath: string) {
    const content = readProjectFile(configPath);
    expect(content).toContain('FIREBASE_CLIENT_EMAIL');
    expect(content).toContain('FIREBASE_PRIVATE_KEY');
    console.log(`${configPath} includes Firebase admin credentials`);
  }
);
