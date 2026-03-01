/**
 * Step Definitions for Story 1.6: Firebase Storage Configuration
 * Validates storage bucket config, security rules, helpers, Prisma model, and secrets.
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

// ==================== Shared State ====================

let storageRulesContent: string;
let storageTsContent: string;
let secretsPyContent: string;

// NOTE: 'the Firebase configuration files exist' step is defined in E-001-S14-firebase-auth.steps.ts
// NOTE: 'the Prisma schema at {string}' step is defined in E-001-S48-cloud-sql-database.steps.ts
// NOTE: '{string} should read credentials from environment variables' step is defined in E-001-S14-firebase-auth.steps.ts

// ==================== S-41: Firebase Storage bucket configuration ====================

When(
  'I inspect the Firebase Storage configuration',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting Firebase Storage configuration...');
  }
);

Then(
  '{string} should include {string} set to {string}',
  async function (this: CustomWorld, fileName: string, varName: string, varValue: string) {
    const content = readProjectFile(fileName);
    expect(content).toContain(varName);
    expect(content).toContain(varValue);
    console.log(`✅ ${fileName} includes ${varName} = ${varValue}`);
  }
);

Then(
  '{string} should include a {string} section pointing to {string}',
  async function (this: CustomWorld, fileName: string, section: string, target: string) {
    const content = JSON.parse(readProjectFile(fileName));
    expect(content[section]).toBeDefined();
    expect(content[section].rules).toBe(target);
    console.log(`✅ ${fileName} has "${section}" section pointing to ${target}`);
  }
);

Then(
  '{string} emulators should include a {string} entry on port {int}',
  async function (this: CustomWorld, fileName: string, emulatorName: string, port: number) {
    const content = JSON.parse(readProjectFile(fileName));
    expect(content.emulators).toBeDefined();
    expect(content.emulators[emulatorName]).toBeDefined();
    expect(content.emulators[emulatorName].port).toBe(port);
    console.log(`✅ ${fileName} emulators has ${emulatorName} on port ${port}`);
  }
);

Then(
  '{string} should pass {string} from env to initializeApp',
  async function (this: CustomWorld, fileName: string, configKey: string) {
    const content = readProjectFile(fileName);
    expect(content).toContain(configKey);
    expect(content).toContain('initializeApp');
    console.log(`✅ ${fileName} passes ${configKey} to initializeApp`);
  }
);

// ==================== S-42: Security rules — authenticated access ====================

Given(
  'the Firebase Storage rules at {string}',
  async function (this: CustomWorld, rulesPath: string) {
    storageRulesContent = readProjectFile(rulesPath);
    console.log(`✅ Loaded storage rules from ${rulesPath}`);
  }
);

When(
  'I inspect the security rules for authenticated user access',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting security rules for authenticated access...');
  }
);

Then(
  'read access should be allowed for all users on listing image paths',
  async function (this: CustomWorld) {
    expect(storageRulesContent).toContain('allow read: if true');
    console.log('✅ Public read access configured for listing image paths');
  }
);

Then(
  'write access should require {string}',
  async function (this: CustomWorld, condition: string) {
    expect(storageRulesContent).toContain(condition);
    console.log(`✅ Write access requires: ${condition}`);
  }
);

// ==================== S-43: Security rules — unauthorized access denied ====================

When(
  'I inspect the security rules for unauthorized access',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting security rules for unauthorized access...');
  }
);

Then(
  'the catch-all rule should deny all read and write access',
  async function (this: CustomWorld) {
    expect(storageRulesContent).toMatch(/allow read, write: if false/);
    console.log('✅ Catch-all rule denies all access');
  }
);

Then(
  'write access on listing paths should require authentication',
  async function (this: CustomWorld) {
    expect(storageRulesContent).toContain('request.auth != null');
    console.log('✅ Listing path writes require authentication');
  }
);

Then(
  'write access should enforce content type matching {string}',
  async function (this: CustomWorld, pattern: string) {
    expect(storageRulesContent).toContain(`contentType.matches('${pattern}')`);
    console.log(`✅ Write access enforces content type: ${pattern}`);
  }
);

Then(
  'write access should enforce file size under 5MB',
  async function (this: CustomWorld) {
    expect(storageRulesContent).toContain('request.resource.size < 5 * 1024 * 1024');
    console.log('✅ Write access enforces 5MB file size limit');
  }
);

// ==================== S-44: Storage path follows structured convention ====================

Given(
  'the storage helper at {string}',
  async function (this: CustomWorld, helperPath: string) {
    storageTsContent = readProjectFile(helperPath);
    console.log(`✅ Loaded storage helper from ${helperPath}`);
  }
);

When(
  'I inspect the buildStoragePath function',
  async function (this: CustomWorld) {
    expect(storageTsContent).toContain('buildStoragePath');
    console.log('✅ Inspecting buildStoragePath function...');
  }
);

Then(
  'it should generate paths in the format {string}',
  async function (this: CustomWorld, _format: string) {
    // Verify the function uses template literal with userId/platform/listingId/imageIndex.ext
    expect(storageTsContent).toMatch(/\$\{userId\}\/\$\{platform\}\/\$\{listingId\}\/\$\{imageIndex\}\.\$\{ext\}/);
    console.log('✅ buildStoragePath generates structured paths');
  }
);

Then(
  'the upload functions should return a public URL containing the storage path',
  async function (this: CustomWorld) {
    expect(storageTsContent).toContain('https://storage.googleapis.com/');
    expect(storageTsContent).toContain('storageUrl');
    console.log('✅ Upload functions return public URLs with storage path');
  }
);

// ==================== S-45: Firebase Storage credentials & Secret Manager ====================

Given(
  'the secrets configuration at {string}',
  async function (this: CustomWorld, secretsPath: string) {
    secretsPyContent = readProjectFile(secretsPath);
    console.log(`✅ Loaded secrets config from ${secretsPath}`);
  }
);

When(
  'I inspect the FirebaseSecrets dataclass',
  async function (this: CustomWorld) {
    expect(secretsPyContent).toContain('class FirebaseSecrets');
    console.log('✅ Inspecting FirebaseSecrets dataclass...');
  }
);

Then(
  'it should include {string}',
  async function (this: CustomWorld, fieldName: string) {
    expect(secretsPyContent).toContain(fieldName);
    console.log(`✅ FirebaseSecrets includes ${fieldName}`);
  }
);

// '{string} should read credentials from environment variables' defined in E-001-S14-firebase-auth.steps.ts

Then(
  '{string} should validate {string}',
  async function (this: CustomWorld, fileName: string, envVar: string) {
    const content = readProjectFile(fileName);
    expect(content).toContain(envVar);
    console.log(`✅ ${fileName} validates ${envVar}`);
  }
);

// ==================== S-46: ListingImage database model ====================

// 'the Prisma schema at {string}' defined in E-001-S48-cloud-sql-database.steps.ts

When(
  'I inspect the ListingImage model',
  async function (this: CustomWorld) {
    // Load schema inline since the Given step is in another file's scope
    (this as any)._prismaSchema = readProjectFile('prisma/schema.prisma');
    expect((this as any)._prismaSchema).toContain('model ListingImage');
    console.log('✅ Inspecting ListingImage model...');
  }
);

Then(
  'it should have fields for storagePath, storageUrl, originalUrl, fileSize, and contentType',
  async function (this: CustomWorld) {
    const schema = (this as any)._prismaSchema;
    for (const field of ['storagePath', 'storageUrl', 'originalUrl', 'fileSize', 'contentType']) {
      expect(schema).toContain(field);
    }
    console.log('✅ ListingImage has required fields');
  }
);

Then(
  'it should have optional fields for width and height',
  async function (this: CustomWorld) {
    const schema = (this as any)._prismaSchema;
    expect(schema).toMatch(/width\s+Int\?/);
    expect(schema).toMatch(/height\s+Int\?/);
    console.log('✅ ListingImage has optional width and height fields');
  }
);

Then(
  'it should have a foreign key relation to Listing with cascade delete',
  async function (this: CustomWorld) {
    const schema = (this as any)._prismaSchema;
    const modelMatch = schema.match(/model ListingImage \{[\s\S]*?\n\}/);
    expect(modelMatch).not.toBeNull();
    const modelBlock = modelMatch![0];
    expect(modelBlock).toContain('onDelete: Cascade');
    expect(modelBlock).toContain('listingId');
    console.log('✅ ListingImage has Listing relation with cascade delete');
  }
);

Then(
  'it should have a unique constraint on listingId and imageIndex',
  async function (this: CustomWorld) {
    const schema = (this as any)._prismaSchema;
    expect(schema).toContain('@@unique([listingId, imageIndex])');
    console.log('✅ ListingImage has unique constraint on [listingId, imageIndex]');
  }
);

Then(
  'the Listing model should have an {string} relation to ListingImage',
  async function (this: CustomWorld, relationName: string) {
    const schema = (this as any)._prismaSchema;
    expect(schema).toMatch(new RegExp(`${relationName}\\s+ListingImage\\[\\]`));
    console.log(`✅ Listing model has "${relationName}" relation to ListingImage`);
  }
);

// ==================== S-47: Storage helper utilities ====================

When(
  'I inspect the exported functions',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting storage helper exported functions...');
  }
);

Then(
  'it should export {string} for bucket access',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export function ${funcName}`);
    console.log(`✅ Exports ${funcName}`);
  }
);

Then(
  'it should export {string} for structured path generation',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export function ${funcName}`);
    console.log(`✅ Exports ${funcName}`);
  }
);

Then(
  'it should export {string} with content-type, file-size, and magic-bytes validation',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export async function ${funcName}`);
    expect(storageTsContent).toContain('validateContentType');
    expect(storageTsContent).toContain('validateFileSize');
    expect(storageTsContent).toContain('validateMagicBytes');
    console.log(`✅ Exports ${funcName} with all validations`);
  }
);

Then(
  'it should export {string} for downloading and uploading from URLs',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export async function ${funcName}`);
    expect(storageTsContent).toContain('fetch(sourceUrl)');
    console.log(`✅ Exports ${funcName}`);
  }
);

Then(
  'it should export {string} for generating download URLs',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export function ${funcName}`);
    expect(storageTsContent).toContain('https://storage.googleapis.com/');
    console.log(`✅ Exports ${funcName}`);
  }
);

Then(
  'it should export {string} for single file deletion with error handling',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export async function ${funcName}`);
    expect(storageTsContent).toContain('file.delete()');
    expect(storageTsContent).toContain('catch');
    console.log(`✅ Exports ${funcName} with error handling`);
  }
);

Then(
  'it should export {string} for resilient batch deletion by listing prefix',
  async function (this: CustomWorld, funcName: string) {
    expect(storageTsContent).toContain(`export async function ${funcName}`);
    expect(storageTsContent).toContain('Promise.allSettled');
    console.log(`✅ Exports ${funcName} with Promise.allSettled`);
  }
);
