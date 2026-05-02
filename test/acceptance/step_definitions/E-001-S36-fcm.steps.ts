/**
 * @file test/acceptance/step_definitions/E-001-S36-fcm.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-05-02
 * @version 1.0
 * @brief Step definitions for E-001 Story 1.7 — Firebase Cloud Messaging Setup.
 *
 * @description
 * Source-inspection steps for the FCM infrastructure scenarios (S-36 through
 * S-40 in E-001-production-infrastructure.feature). Each scenario verifies
 * that a specific FCM module exists with the contract documented in
 * Story 1.7's acceptance criteria. Tests run as static-analysis assertions —
 * no Firebase project, no live FCM API calls, no service-worker registration.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8');
}

// ─── S-36: FCM env vars ─────────────────────────────────────────────────────

Given('the environment configuration at {string}', function (filePath: string) {
  this.envSource = readSource(filePath);
});

Given('the environment example at {string}', function (filePath: string) {
  this.envExampleSource = readSource(filePath);
});

When('I inspect the FCM configuration', function () {
  // Sources already loaded in Givens; assertions in Thens.
});

Then(
  '{string} should be validated with min length {int}',
  function (varName: string, minLen: number) {
    const src = this.envSource as string;
    const pattern = new RegExp(
      `${varName}\\s*:\\s*z\\.string\\(\\)(?:[\\s\\S]*?\\.min\\(\\s*${minLen}\\s*\\))`
    );
    expect(pattern.test(src)).toBe(true);
  }
);

Then('{string} should be an optional string', function (varName: string) {
  const src = this.envSource as string;
  const pattern = new RegExp(
    `${varName}\\s*:\\s*z\\.string\\(\\)[^,\\n]*\\.optional\\(\\)`
  );
  expect(pattern.test(src)).toBe(true);
});

Then(
  '{string} should include documentation for all FCM variables',
  function (envExamplePath: string) {
    const src = this.envExampleSource as string;
    const required = [
      'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];
    for (const v of required) {
      expect(src.includes(v)).toBe(true);
    }
    expect(envExamplePath).toBe('.env.example');
  }
);

// ─── S-37: FCM service worker stub ──────────────────────────────────────────

Given('the service worker file at {string}', function (filePath: string) {
  this.swSource = readSource(filePath);
  this.swPath = filePath;
});

When('I inspect the service worker configuration', function () {
  // Source already loaded in Given.
});

Then(
  'it should import Firebase compat SDK via {string}',
  function (importMethod: string) {
    expect(this.swSource).toContain(importMethod);
    expect(this.swSource).toContain('firebase-app-compat');
    expect(this.swSource).toContain('firebase-messaging-compat');
  }
);

Then(
  'the Firebase version should match the installed {string} package version',
  function (pkgName: string) {
    const pkg = JSON.parse(readSource('package.json'));
    const version = (pkg.dependencies?.[pkgName] || pkg.devDependencies?.[pkgName] || '').replace(/^[\^~]/, '');
    expect(version.length).toBeGreaterThan(0);
    // Service worker pins to a specific firebasejs CDN version. Verify the
    // installed firebase package version appears in the SW's importScripts URLs.
    expect(this.swSource).toContain(`/firebasejs/${version}/`);
  }
);

Then('it should call {string} with project configuration', function (call: string) {
  expect(this.swSource).toContain(call);
  // Verify project config keys appear (we don't bind to specific values to
  // avoid coupling tests to a specific Firebase project).
  for (const key of ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId']) {
    expect(this.swSource).toContain(key);
  }
});

Then(
  'the service worker should be served at the root URL path {string}',
  function (urlPath: string) {
    expect(urlPath).toBe('/');
    // The file MUST live under public/ so Next.js serves it at the root.
    expect((this.swPath as string).startsWith('public/')).toBe(true);
  }
);

// ─── S-38: Client-side FCM module ───────────────────────────────────────────

Given('the client messaging module at {string}', function (filePath: string) {
  this.clientMessagingSource = readSource(filePath);
});

When('I inspect the client SDK integration', function () {
  // Source already loaded in Given.
});

Then('the module should have a {string} directive', function (directive: string) {
  const src = this.clientMessagingSource as string;
  // Match either single- or double-quoted directive on its own line at top-of-file.
  const pattern = new RegExp(`^['"]${directive}['"];?`, 'm');
  expect(pattern.test(src)).toBe(true);
});

Then(
  'it should export {string} using dynamic imports to prevent SSR crashes',
  function (exportName: string) {
    const src = this.clientMessagingSource as string;
    expect(src).toContain(`export async function ${exportName}`);
    expect(src).toContain('await import(');
  }
);

Then(
  'it should export {string} that returns a boolean',
  function (exportName: string) {
    const src = this.clientMessagingSource as string;
    expect(src).toContain(`export async function ${exportName}`);
    expect(src).toMatch(new RegExp(`${exportName}[\\s\\S]*?Promise<\\s*boolean\\s*>`));
  }
);

Then(
  'it should export {string} that passes VAPID key to getToken',
  function (exportName: string) {
    const src = this.clientMessagingSource as string;
    expect(src).toContain(`export async function ${exportName}`);
    expect(src).toMatch(/getToken\s*\([^)]*VAPID/i);
  }
);

Then(
  'it should export {string} that wraps onMessage',
  function (exportName: string) {
    const src = this.clientMessagingSource as string;
    expect(
      src.includes(`export function ${exportName}`) ||
        src.includes(`export async function ${exportName}`)
    ).toBe(true);
    expect(src).toContain('onMessage(');
  }
);

Then(
  'all exports should return null or no-op when browser APIs are unavailable',
  function () {
    const src = this.clientMessagingSource as string;
    // Defensive guards must check window/navigator availability.
    const hasWindowGuard = /typeof window === ['"]undefined['"]/i.test(src);
    const hasNavigatorGuard = /navigator|isSupported\s*\(/i.test(src);
    expect(hasWindowGuard || hasNavigatorGuard).toBe(true);
    // Must return null on the SSR/unsupported path.
    expect(src).toContain('return null');
  }
);

// ─── S-39: Server-side FCM module ───────────────────────────────────────────

Given('the server messaging module at {string}', function (filePath: string) {
  this.serverMessagingSource = readSource(filePath);
});

When('I inspect the server SDK integration', function () {
  // Source already loaded.
});

Then(
  'it should export {string} that initializes from Admin SDK',
  function (exportName: string) {
    const src = this.serverMessagingSource as string;
    expect(src).toContain(`export function ${exportName}`);
    expect(src).toContain("from 'firebase-admin/messaging'");
  }
);

Then(
  'it should export {string} using the modern {string} API with token at top level',
  function (exportName: string, _api: string) {
    const src = this.serverMessagingSource as string;
    expect(src).toContain(`export async function ${exportName}`);
    expect(src).toMatch(/messaging\.send\(\{[\s\S]*?token,/);
  }
);

Then(
  'it should export {string} using the modern {string} API with topic field',
  function (exportName: string, _api: string) {
    const src = this.serverMessagingSource as string;
    expect(src).toContain(`export async function ${exportName}`);
    expect(src).toMatch(/messaging\.send\(\{[\s\S]*?topic,/);
  }
);

Then(
  'it should export the {string} interface',
  function (interfaceName: string) {
    const src = this.serverMessagingSource as string;
    expect(src).toContain(`export interface ${interfaceName}`);
  }
);

Then(
  'it should handle {string} errors for stale token detection',
  function (errorCode: string) {
    const src = this.serverMessagingSource as string;
    expect(src).toContain(errorCode);
  }
);

Then(
  'it should not reference browser globals (window, navigator, self)',
  function () {
    const src = this.serverMessagingSource as string;
    // Strip comments + string literals to avoid false positives from the
    // module's own JSDoc / log messages that mention these names.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
    for (const global of ['window', 'navigator', 'self']) {
      const pattern = new RegExp(`\\b${global}\\b`);
      expect(pattern.test(stripped)).toBe(false);
    }
  }
);

// ─── S-40: Service worker registration module ───────────────────────────────

Given('the service worker registration module at {string}', function (filePath: string) {
  this.swRegSource = readSource(filePath);
});

When('I inspect the registration module', function () {
  // Source already loaded.
});

Then('it should export {string} function', function (exportName: string) {
  const src = this.swRegSource as string;
  expect(src).toContain(`export async function ${exportName}`);
});

Then(
  'the function should register {string} with scope {string}',
  function (swPath: string, scope: string) {
    const src = this.swRegSource as string;
    expect(src).toContain(swPath);
    expect(src).toMatch(new RegExp(`scope:\\s*['"]${scope}['"]`));
  }
);

Then(
  'the function should guard with {string} and {string} checks',
  function (guard1: string, guard2: string) {
    const src = this.swRegSource as string;
    expect(src).toContain(guard1);
    expect(src).toContain(guard2);
  }
);

Then(
  'the service worker should NOT be auto-registered on application load',
  function () {
    const src = this.swRegSource as string;
    // The module exports a function but must NOT call it at top level.
    // Equivalently: there should be no top-level `registerFCMServiceWorker()`
    // call (only the function declaration itself).
    const callPattern = /^(?!export )\s*registerFCMServiceWorker\s*\(/m;
    expect(callPattern.test(src)).toBe(false);
  }
);
