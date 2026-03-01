/**
 * Step Definitions for Story 1.4: Firebase Auth Setup & Migration
 * Validates Firebase Auth configuration, OAuth providers, token validation,
 * NextAuth migration, and secret integration by inspecting source files.
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

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

// ==================== SHARED STATE ====================

let firebaseConfigContent: string;
let firebaseAdminContent: string;
let firebaseAuthContent: string;
let envExampleContent: string;
let packageJsonContent: string;
let packageJson: Record<string, any>;
let authMiddlewareContent: string;
let sessionContent: string;
let sessionRouteContent: string;
let signoutRouteContent: string;
let authModuleContent: string;
let layoutContent: string;
let prismaSchemaContent: string;
let secretsContent: string;

// ==================== AC-1: Firebase Auth Project Configuration ====================

Given('the Firebase configuration files exist', async function (this: CustomWorld) {
  expect(fileExists('src/lib/firebase/config.ts')).toBe(true);
  expect(fileExists('src/lib/firebase/admin.ts')).toBe(true);
  expect(fileExists('src/lib/firebase/auth.ts')).toBe(true);
  expect(fileExists('.env.example')).toBe(true);

  firebaseConfigContent = readProjectFile('src/lib/firebase/config.ts');
  firebaseAdminContent = readProjectFile('src/lib/firebase/admin.ts');
  firebaseAuthContent = readProjectFile('src/lib/firebase/auth.ts');
  envExampleContent = readProjectFile('.env.example');

  console.log('✅ Firebase configuration files exist');
});

When('I inspect the Firebase Auth configuration', async function (this: CustomWorld) {
  console.log('✅ Inspecting Firebase Auth configuration...');
});

Then(
  '{string} should initialize the Firebase client app with env vars',
  async function (this: CustomWorld, _filePath: string) {
    expect(firebaseConfigContent).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(firebaseConfigContent).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    expect(firebaseConfigContent).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    expect(firebaseConfigContent).toContain('initializeApp');
    console.log('✅ Firebase client config uses NEXT_PUBLIC env vars');
  }
);

Then(
  '{string} should initialize Firebase Admin with ADC support',
  async function (this: CustomWorld, _filePath: string) {
    expect(firebaseAdminContent).toContain('initializeApp');
    expect(firebaseAdminContent).toContain('getAuth');
    expect(firebaseAdminContent).toContain('FIREBASE_CLIENT_EMAIL');
    expect(firebaseAdminContent).toContain('FIREBASE_PRIVATE_KEY');
    expect(firebaseAdminContent).toContain('cert');
    console.log('✅ Firebase Admin uses ADC with env var fallback');
  }
);

Then(
  '{string} should export sign-in, sign-up, OAuth, and sign-out helpers',
  async function (this: CustomWorld, _filePath: string) {
    expect(firebaseAuthContent).toContain('signInWithEmail');
    expect(firebaseAuthContent).toContain('signUpWithEmail');
    expect(firebaseAuthContent).toContain('signInWithGoogle');
    expect(firebaseAuthContent).toContain('signInWithGitHub');
    expect(firebaseAuthContent).toContain('signInWithFacebook');
    expect(firebaseAuthContent).toContain('signOut');
    console.log('✅ Firebase auth exports all required helpers');
  }
);

Then(
  '{string} should include Firebase public config variables',
  async function (this: CustomWorld, _filePath: string) {
    expect(envExampleContent).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(envExampleContent).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    expect(envExampleContent).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    console.log('✅ .env.example includes Firebase public config');
  }
);

// ==================== AC-2: OAuth Provider Support ====================

Given(
  'the Firebase Auth client helpers at {string}',
  async function (this: CustomWorld, _filePath: string) {
    firebaseAuthContent = readProjectFile('src/lib/firebase/auth.ts');
    console.log('✅ Loaded Firebase auth client helpers');
  }
);

When(
  'I inspect the OAuth provider configuration',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting OAuth provider configuration...');
  }
);

Then(
  'the module should export a {string} function',
  async function (this: CustomWorld, functionName: string) {
    expect(firebaseAuthContent).toContain(`export async function ${functionName}`);
    console.log(`✅ Module exports ${functionName}`);
  }
);

Then(
  'each OAuth function should call {string} with the appropriate provider',
  async function (this: CustomWorld, method: string) {
    expect(firebaseAuthContent).toContain(method);
    expect(firebaseAuthContent).toContain('GoogleAuthProvider');
    expect(firebaseAuthContent).toContain('GithubAuthProvider');
    expect(firebaseAuthContent).toContain('FacebookAuthProvider');
    console.log(`✅ OAuth functions use ${method} with appropriate providers`);
  }
);

// ==================== AC-3: Facebook Marketplace Token Preservation ====================

Given('the Facebook auth files exist', async function (this: CustomWorld) {
  firebaseAuthContent = readProjectFile('src/lib/firebase/auth.ts');
  prismaSchemaContent = readProjectFile('prisma/schema.prisma');
  console.log('✅ Loaded Facebook auth files');
});

When(
  'I inspect the Facebook token handling',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting Facebook token handling...');
  }
);

Then(
  '{string} should extract the access token from the OAuth credential',
  async function (this: CustomWorld, _functionName: string) {
    expect(firebaseAuthContent).toContain('credentialFromResult');
    expect(firebaseAuthContent).toContain('accessToken');
    console.log('✅ signInWithFacebook extracts OAuth credential access token');
  }
);

Then(
  'it should POST the Facebook access token to {string}',
  async function (this: CustomWorld, endpoint: string) {
    expect(firebaseAuthContent).toContain(endpoint);
    console.log(`✅ Facebook access token POSTed to ${endpoint}`);
  }
);

Then(
  'the {string} model should exist in the Prisma schema',
  async function (this: CustomWorld, modelName: string) {
    expect(prismaSchemaContent).toContain(`model ${modelName}`);
    console.log(`✅ ${modelName} model exists in Prisma schema`);
  }
);

// ==================== AC-4: Full Migration from NextAuth ====================

Given('the authentication source files', async function (this: CustomWorld) {
  packageJsonContent = readProjectFile('package.json');
  packageJson = JSON.parse(packageJsonContent);
  authModuleContent = readProjectFile('src/lib/auth.ts');
  layoutContent = readProjectFile('app/layout.tsx');
  console.log('✅ Loaded authentication source files');
});

When(
  'I inspect the auth migration status',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting auth migration status...');
  }
);

Then(
  '{string} should not be listed in package.json dependencies',
  async function (this: CustomWorld, packageName: string) {
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    expect(deps[packageName]).toBeUndefined();
    expect(devDeps[packageName]).toBeUndefined();
    console.log(`✅ ${packageName} not in package.json`);
  }
);

Then(
  '{string} route should not exist',
  async function (this: CustomWorld, routePath: string) {
    expect(fileExists(routePath)).toBe(false);
    console.log(`✅ ${routePath} does not exist`);
  }
);

Then(
  '{string} should re-export from Firebase session module',
  async function (this: CustomWorld, _filePath: string) {
    expect(authModuleContent).toContain('firebase/session');
    expect(authModuleContent).toContain('getCurrentUser');
    expect(authModuleContent).toContain('requireAuth');
    console.log('✅ src/lib/auth.ts re-exports from Firebase session module');
  }
);

Then(
  '{string} should use {string} instead of {string} from next-auth',
  async function (this: CustomWorld, _filePath: string, firebaseProvider: string, _nextAuthProvider: string) {
    expect(layoutContent).toContain(firebaseProvider);
    expect(layoutContent).not.toContain("from 'next-auth");
    console.log(`✅ layout.tsx uses ${firebaseProvider}`);
  }
);

// ==================== AC-5: Backend Token Validation ====================

Given('the backend auth middleware files', async function (this: CustomWorld) {
  authMiddlewareContent = readProjectFile('src/lib/auth-middleware.ts');
  sessionContent = readProjectFile('src/lib/firebase/session.ts');
  sessionRouteContent = readProjectFile('app/api/auth/session/route.ts');
  signoutRouteContent = readProjectFile('app/api/auth/signout/route.ts');

  const firebaseAuthMw = readProjectFile('src/lib/firebase/auth-middleware.ts');
  (this as any).firebaseAuthMwContent = firebaseAuthMw;

  console.log('✅ Loaded backend auth middleware files');
});

When(
  'I inspect the token validation implementation',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting token validation implementation...');
  }
);

Then(
  '{string} should verify Bearer tokens via {string}',
  async function (this: CustomWorld, _filePath: string, method: string) {
    const content = (this as any).firebaseAuthMwContent;
    expect(content).toContain(method);
    expect(content).toContain('Bearer');
    console.log(`✅ Firebase auth middleware uses ${method} for Bearer tokens`);
  }
);

Then(
  '{string} should verify session cookies via {string}',
  async function (this: CustomWorld, _filePath: string, method: string) {
    expect(sessionContent).toContain(method);
    expect(sessionContent).toContain('__session');
    console.log(`✅ Firebase session module uses ${method}`);
  }
);

Then(
  '{string} should try session cookie first, then fall back to Bearer token',
  async function (this: CustomWorld, _filePath: string) {
    expect(authMiddlewareContent).toContain('getCurrentUser');
    expect(authMiddlewareContent).toContain('verifyIdToken');
    // getCurrentUser (session) appears before verifyIdToken (Bearer) in withAuth
    const sessionIdx = authMiddlewareContent.indexOf('getCurrentUser');
    const bearerIdx = authMiddlewareContent.indexOf('verifyIdToken');
    expect(sessionIdx).toBeLessThan(bearerIdx);
    console.log('✅ auth-middleware tries session cookie before Bearer token');
  }
);

Then(
  '{string} should exchange ID tokens for HttpOnly session cookies',
  async function (this: CustomWorld, _filePath: string) {
    expect(sessionRouteContent).toContain('verifyIdToken');
    expect(sessionRouteContent).toContain('createSessionCookie');
    expect(sessionRouteContent).toContain('httpOnly');
    console.log('✅ Session route exchanges ID tokens for HttpOnly cookies');
  }
);

Then(
  '{string} should clear session cookies and revoke refresh tokens',
  async function (this: CustomWorld, _filePath: string) {
    expect(signoutRouteContent).toContain('revokeRefreshTokens');
    expect(signoutRouteContent).toContain('maxAge: 0');
    console.log('✅ Signout route clears cookies and revokes tokens');
  }
);

// ==================== AC-6: Secret Manager Integration ====================

Given('the secrets configuration', async function (this: CustomWorld) {
  secretsContent = readProjectFile('helpers/secrets.py');
  envExampleContent = readProjectFile('.env.example');
  firebaseAdminContent = readProjectFile('src/lib/firebase/admin.ts');
  console.log('✅ Loaded secrets configuration');
});

When(
  'I inspect the secret storage for Firebase credentials',
  async function (this: CustomWorld) {
    console.log('✅ Inspecting secret storage...');
  }
);

Then(
  '{string} should include Firebase admin credentials in its dataclass',
  async function (this: CustomWorld, _filePath: string) {
    expect(secretsContent).toContain('FIREBASE_CLIENT_EMAIL');
    expect(secretsContent).toContain('FIREBASE_PRIVATE_KEY');
    console.log('✅ secrets.py includes Firebase admin credentials');
  }
);

Then(
  '{string} should include {string} and {string}',
  async function (this: CustomWorld, _filePath: string, var1: string, var2: string) {
    expect(envExampleContent).toContain(var1);
    expect(envExampleContent).toContain(var2);
    console.log(`✅ .env.example includes ${var1} and ${var2}`);
  }
);

Then(
  '{string} should read credentials from environment variables',
  async function (this: CustomWorld, _filePath: string) {
    expect(firebaseAdminContent).toContain('process.env.FIREBASE_CLIENT_EMAIL');
    expect(firebaseAdminContent).toContain('process.env.FIREBASE_PRIVATE_KEY');
    console.log('✅ Firebase admin reads credentials from env vars');
  }
);
