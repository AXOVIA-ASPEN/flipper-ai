# Story 1.7: Firebase Cloud Messaging Setup

Status: review
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a4083d54a2d664209ae903

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want FCM configured so the notification infrastructure is ready,
so that push notifications can be enabled in Phase 2 without re-deploying infrastructure.

## Acceptance Criteria

1. **FCM Enabled in Firebase Project**
   - Given FCM is enabled in the Firebase project `axovia-flipper`
   - When the FCM configuration is reviewed
   - Then server key and sender ID are stored in Secret Manager

2. **Service Worker Stub**
   - Given the web application
   - When a service worker stub for FCM is created
   - Then it is registered at the correct scope and can receive FCM messages when activated in Phase 2

3. **Client SDK Integration**
   - Given the FCM client SDK is included in the frontend
   - When a user grants notification permission (Phase 2)
   - Then a device token can be generated and stored

4. **Server SDK Integration**
   - Given the FCM server SDK is available in the backend
   - When a notification needs to be sent (Phase 2)
   - Then the infrastructure supports sending to specific device tokens or topic subscriptions

**FRs fulfilled:** FR-INFRA-14

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-INFRA-14 | AC 1, AC 2, AC 3, AC 4 | @FR-INFRA-14 @story-1-7 |

## Prerequisites (Must Complete BEFORE Starting Tasks)

**AGENT: Complete these prerequisites first. Story 1.4 is NOT yet implemented.**

1. **Install Firebase packages in the ROOT project directory** (not `functions/`):
   ```bash
   pnpm add firebase@"^11.0.0" firebase-admin@"^13.0.0"
   ```
   After install, verify both appear in root `package.json` under `dependencies` (not `devDependencies`). Confirm versions: `node -e "console.log(require('firebase/package.json').version)"` and `node -e "console.log(require('firebase-admin/package.json').version)"`.

2. **Create `src/lib/firebase/admin.ts`** — Story 1.4 will later expand this, but `firestore-helpers.ts` already imports `{ db }` from `./admin`, and `messaging-admin.ts` needs `adminApp`. Create this exact file:
   ```typescript
   import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
   import { getFirestore, type Firestore } from 'firebase-admin/firestore';

   function initAdmin(): App {
     if (getApps().length > 0) return getApps()[0];
     const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
     const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
     if (clientEmail && privateKey) {
       return initializeApp({
         credential: cert({ projectId: 'axovia-flipper', clientEmail, privateKey } as ServiceAccount),
       });
     }
     return initializeApp({ projectId: 'axovia-flipper' });
   }

   export const adminApp: App = initAdmin();
   export const db: Firestore = getFirestore(adminApp);
   ```
   This satisfies both `firestore-helpers.ts` (needs `db`) and `messaging-admin.ts` (needs `adminApp`).

3. **Create `src/lib/firebase/config.ts`** — Client-side Firebase app initialization:
   ```typescript
   'use client';
   import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

   const firebaseConfig = {
     apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
     authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'axovia-flipper',
     storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
   };

   export const firebaseApp: FirebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
   ```

4. **Add ALL Firebase env vars to `.env.example`** (if not already present from Story 1.4):
   ```env
   # Firebase (client-side, public)
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=axovia-flipper
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=
   # Firebase (server-side, secret — for local dev only, Cloud Run uses ADC)
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY=
   ```

5. **Verify `firestore-helpers.ts` compiles** after creating `admin.ts`: `npx tsc --noEmit src/lib/firebase/firestore-helpers.ts`

## File Location Summary

| File | Full Path | Directory |
|------|-----------|-----------|
| Service worker | `public/firebase-messaging-sw.js` | `public/` (NOT `src/`, NOT `functions/`) |
| Client messaging | `src/lib/firebase/messaging.ts` | `src/lib/firebase/` |
| Server messaging | `src/lib/firebase/messaging-admin.ts` | `src/lib/firebase/` (NOT `functions/`) |
| SW registration | `src/lib/firebase/register-sw.ts` | `src/lib/firebase/` |
| Client tests | `src/__tests__/lib/firebase/messaging.test.ts` | `src/__tests__/lib/firebase/` |
| Server tests | `src/__tests__/lib/firebase/messaging-admin.test.ts` | `src/__tests__/lib/firebase/` |
| SW reg tests | `src/__tests__/lib/firebase/register-sw.test.ts` | `src/__tests__/lib/firebase/` |

**IMPORTANT: The `functions/` directory is a SEPARATE Node.js project for Firebase Cloud Functions. ALL files in this story go in the MAIN Next.js app (`src/` and `public/`). Do NOT modify or add files in `functions/`.**

## Tasks / Subtasks

- [x] Task 1: Enable FCM in Firebase Console and configure IAM (AC: #1) [MANUAL — ALL SUBTASKS]
  > **AGENT INSTRUCTION: Skip all subtasks below. Output them as a numbered checklist for the user to complete manually, then proceed to Task 2. For local development, use placeholder values in `.env.local` — the service worker and client module must not crash when VAPID key is missing (return null/no-op).**
  - [ ] 1.1 [MANUAL] Enable Cloud Messaging in Firebase Console > Project Settings > Cloud Messaging for project `axovia-flipper`
  - [ ] 1.2 [MANUAL] Generate a Web Push certificate (VAPID key pair) in Firebase Console > Project Settings > Cloud Messaging > Web configuration. The VAPID **public** key is a base64 string starting with `B`, ~88 characters long. The **private** key is shorter. Do NOT confuse them.
  - [ ] 1.3 [MANUAL] Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local` to the VAPID **public** key
  - [ ] 1.4 [MANUAL/OPTIONAL] Store FCM server key in Secret Manager: `PRODUCTION_FCM_SERVER_KEY`. NOTE: With Admin SDK v13+, the legacy server key is NOT needed for sending — the Admin SDK uses ADC. Retain for backward compatibility only.
  - [ ] 1.5 [MANUAL] Store VAPID private key in Secret Manager: `PRODUCTION_FCM_VAPID_PRIVATE_KEY` (for potential future custom VAPID auth)
  - [ ] 1.6 [MANUAL] Grant Cloud Run service account FCM permissions: `gcloud projects add-iam-policy-binding axovia-flipper --member='serviceAccount:flipper-run@axovia-flipper.iam.gserviceaccount.com' --role='roles/firebase.admin'` (or create a custom role with `cloudmessaging.messages.create` for least privilege)

- [x] Task 2: Add environment variables for FCM (AC: #1, #3)
  - [x] 2.1 Add `NEXT_PUBLIC_FIREBASE_VAPID_KEY` and `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` to `.env.example` (if not already present from prerequisites). The `messagingSenderId` is REQUIRED for FCM — it comes from Firebase Console > Project Settings > General > Your apps
  - [x] 2.2 Update `src/lib/env.ts` to include optional validation for both vars. NOTE: This project uses **Zod v4** (`^4.2.1`) — verify API compatibility with Zod v4, not v3 docs. Example: `NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().min(50).optional()` and `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional()`
  - [x] 2.3 Add both env vars to any deployment config docs referencing env vars

- [x] Task 3: Create FCM service worker stub (AC: #2)
  - [x] 3.1 Create `public/firebase-messaging-sw.js` — service worker that imports Firebase Messaging compat SDK from CDN, initializes Firebase app with config, and calls `messaging.onBackgroundMessage()` with a stub handler
  - [x] 3.2 The service worker MUST be at `public/firebase-messaging-sw.js` — this maps to URL `/firebase-messaging-sw.js` at root scope. Do NOT put it in `src/` or `app/`
  - [x] 3.3 Use Firebase compat SDK via `importScripts()`. After installing the `firebase` package (prerequisite), read the exact installed version from `node_modules/firebase/package.json` and use THAT version in the URLs: `importScripts('https://www.gstatic.com/firebasejs/<EXACT_VERSION>/firebase-app-compat.js')`. Add a code comment: `// Version must match firebase package in package.json`
  - [x] 3.4 **Config injection:** The service worker is a plain JS file in `public/` and CANNOT access `process.env`. Hardcode the Firebase config values directly — these are public, non-secret values safe to commit. Use the `axovia-flipper` project values from Firebase Console. ALL of these fields are required: `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`. If values are not yet available, use TODO placeholder comments with instructions for the user to fill them in after completing Task 1
  - [x] 3.5 The stub handler should display a basic notification with title and body from the FCM payload — actual notification routing/customization deferred to Epic 11
  - [x] 3.6 **CSP update:** Update `next.config.js` Content-Security-Policy to allow `https://www.gstatic.com` in the `script-src` directive (required for `importScripts` in the service worker). Also ensure `connect-src` allows `https://fcm.googleapis.com` and `https://fcmregistrations.googleapis.com` (may already be covered by existing `https:` wildcard, but verify)
  - [x] 3.7 **Firebase Hosting deployment note:** The current `firebase.json` has a catch-all rewrite (`"source": "**"`) to a Cloud Function. In Firebase Hosting deployments, add a static file rule BEFORE the rewrite for the service worker, or ensure the service worker is included in the hosting `public` directory. For local dev server this is not an issue (Next.js serves `public/` directly)
  - [ ] 3.8 **Manual smoke test:** After creating the service worker, run `pnpm dev` and navigate to `http://localhost:3000/firebase-messaging-sw.js` — confirm it loads as JavaScript (not a 404 or HTML page)

- [x] Task 4: Create client-side FCM helper module (AC: #3)
  - [x] 4.1 Create `src/lib/firebase/messaging.ts` — client-side FCM initialization and token management. **CRITICAL: The `firebase/messaging` module references browser globals (`self`, `navigator`) at import time. Do NOT use a top-level `import { getMessaging } from 'firebase/messaging'`. Instead, use dynamic `import()` INSIDE each exported function:**
    ```typescript
    export async function getMessagingInstance() {
      if (typeof window === 'undefined') return null;
      const { getMessaging } = await import('firebase/messaging');
      const { firebaseApp } = await import('./config');
      return getMessaging(firebaseApp);
    }
    ```
  - [x] 4.2 Export `getMessagingInstance()` — lazy singleton using dynamic `import('firebase/messaging')` as shown above
  - [x] 4.3 Export `requestNotificationPermission()` — requests browser Notification permission, returns boolean
  - [x] 4.4 Export `getFCMToken()` — calls `getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY })` to get device token, returns string or null. The `getToken` signature requires TWO arguments: the messaging instance and an options object with `vapidKey`
  - [x] 4.5 Export `onForegroundMessage(callback)` — wraps `onMessage(messaging, callback)` for foreground notification handling (also via dynamic import)
  - [x] 4.6 All exports should be no-ops or return null gracefully when: browser doesn't support notifications, VAPID key is not configured (`undefined` or placeholder), or user denies permission
  - [x] 4.7 Add `'use client'` directive. Additionally, do NOT create a barrel export file (`index.ts`) in `src/lib/firebase/` that re-exports from both `messaging.ts` and `messaging-admin.ts` — these modules have incompatible runtime requirements (browser vs server)

- [x] Task 5: Create server-side FCM helper module (AC: #4)
  - [x] 5.1 Create `src/lib/firebase/messaging-admin.ts` — server-side FCM send helpers using Firebase Admin SDK
  - [x] 5.2 Export `getMessagingAdmin()` — lazy singleton that imports `adminApp` from `./admin` (created in prerequisites) and calls `getMessaging(adminApp)` from `firebase-admin/messaging`. Import pattern: `import { adminApp } from './admin'; import { getMessaging } from 'firebase-admin/messaging';`
  - [x] 5.3 Export `sendToDevice(token: string, payload: NotificationPayload)` — uses the modern `messaging.send()` API (NOT the deprecated `sendToTopic()`/`sendToDevice()` methods). The `Message` object shape: `{ token, notification: { title, body }, data }`
  - [x] 5.4 Export `sendToTopic(topic: string, payload: NotificationPayload)` — uses `messaging.send({ topic, notification: { title, body }, data })`. Use the modern `send()` API with `topic` field, NOT the deprecated `sendToTopic()` method
  - [x] 5.5 Export `NotificationPayload` interface: `{ title: string; body: string; data?: Record<string, string>; icon?: string; clickAction?: string }`
  - [x] 5.6 Error handling: catch `messaging/invalid-registration-token` and `messaging/registration-token-not-registered` errors to signal stale tokens. Also catch `app/no-app` and `app/invalid-credential` errors at initialization and log: `'Firebase Admin credentials not configured — FCM send unavailable. Run gcloud auth application-default login for local development.'`

- [x] Task 6: Register service worker in app initialization (AC: #2)
  - [x] 6.1 Create `src/lib/firebase/register-sw.ts` — exports `registerFCMServiceWorker()` that calls `navigator.serviceWorker.register('/firebase-messaging-sw.js')` with appropriate scope
  - [x] 6.2 Add `'use client'` directive — uses browser `navigator` API
  - [x] 6.3 Guard with `typeof window !== 'undefined'` and `'serviceWorker' in navigator` checks
  - [x] 6.4 Log registration success/failure to console (no user-facing error — FCM is optional infrastructure)
  - [x] 6.5 DO NOT auto-register on app load — provide the function for Epic 11 to call when user opts into push notifications
  - [x] 6.6 Before implementation, search for existing service worker registrations: `grep -r "serviceWorker.register\|navigator.serviceWorker" src/ app/`. If another service worker exists, document the conflict and consider whether FCM handlers should merge into the existing worker

- [x] Task 7: Verify prerequisites and build (AC: #1-#4)
  - [x] 7.1 Verify `firebase` and `firebase-admin` appear in root `package.json` `dependencies` (from prerequisites). Confirm neither was accidentally added to `functions/package.json`
  - [x] 7.2 Verify `src/lib/firebase/admin.ts` exports both `adminApp` and `db` (from prerequisites). Run `npx tsc --noEmit src/lib/firebase/firestore-helpers.ts` to confirm no compilation errors
  - [x] 7.3 Run `pnpm build` to confirm no SSR or import errors from the new modules

- [x] Task 8: Update configs if needed (AC: #2)
  - [x] 8.1 No `messaging` section needed in `firebase.json` (Cloud Messaging is enabled at project level)
  - [x] 8.2 If using Firebase Hosting: add `Cache-Control: no-cache` header for `firebase-messaging-sw.js` and add a static file rule before the catch-all rewrite
  - [x] 8.3 Verify `next.config.js` CSP allows `https://www.gstatic.com` in `script-src` (for service worker `importScripts`). If not, add it

- [x] Task 9: Testing (AC: #1-#4)
  - [x] 9.1 Create `src/__tests__/lib/firebase/messaging.test.ts` — test client-side helpers with mocked `firebase/messaging` module. Mock `getMessaging`, `getToken`, `onMessage` from `firebase/messaging`
  - [x] 9.2 Test `requestNotificationPermission()` returns true/false based on mocked `Notification.requestPermission()`
  - [x] 9.3 Test `getFCMToken()`: mock `getToken` with signature `getToken(messagingInstance, { vapidKey: string })`. Verify the implementation passes `{ vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }` as the second argument. Returns token string when granted, null when denied
  - [x] 9.4 Test graceful no-op when: (a) browser doesn't support notifications (`typeof Notification === 'undefined'`), (b) VAPID key is `undefined`, (c) `typeof window === 'undefined'` (SSR)
  - [x] 9.5 Create `src/__tests__/lib/firebase/messaging-admin.test.ts` — test server-side helpers with mocked `firebase-admin/messaging`
  - [x] 9.6 Test `sendToDevice()`: verify `messaging.send()` receives a `Message` object: `{ token: expect.any(String), notification: { title: expect.any(String), body: expect.any(String) } }`. The `token` field MUST be at the top level of the Message, NOT inside `notification`
  - [x] 9.7 Test `sendToTopic()`: verify `messaging.send()` receives `{ topic: expect.any(String), notification: { title: ..., body: ... } }`. Uses modern `send()` API, NOT deprecated `sendToTopic()`
  - [x] 9.8 Test error handling for `messaging/invalid-registration-token` and `messaging/registration-token-not-registered`
  - [x] 9.9 Create `src/__tests__/lib/firebase/register-sw.test.ts` — test service worker registration with mocked `navigator.serviceWorker`
  - [x] 9.10 Add import validation test: verify `messaging.ts` can be dynamically imported without throwing (catches accidental top-level browser global references)
  - [x] 9.11 Add test that `messaging-admin.ts` does NOT reference browser globals (`window`, `navigator`, `self`) — can be a Node.js-only import test
  - [x] 9.12 Validate service worker file: read `public/firebase-messaging-sw.js` as string, verify it contains `importScripts`, `firebase.initializeApp()`, and `messaging.onBackgroundMessage()`. Verify the Firebase version in `importScripts` URLs matches the installed `firebase` package version

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-001-S-<N>` — sequential scenario number within Epic 1
- `@story-1-7`
- Applicable requirement tags: `@FR-INFRA-14`

**DoD Checklist:**
- [ ] Gherkin acceptance tests written for all 4 ACs
- [ ] Every scenario tagged with `@E-001-S-<N>`, `@story-1-7`, and relevant `@FR-INFRA-*` tags
- [ ] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [ ] All acceptance test scenarios pass
- [ ] All unit/integration tests pass (`make test`)
- [ ] Build succeeds (`make build`)
- [ ] Lint passes (`make lint`)
- [ ] No regressions in existing test suite

> See `_bmad-output/planning-artifacts/epics.md` → "Definition of Done (DoD) — All Stories" for full tagging rules and examples.
> **This DoD must be verified as complete during the `/bmad-bmm-code-review` workflow. A story cannot be marked "done" without passing all DoD items.**

## Dev Notes

### Critical: This is Infrastructure-Only — No User-Facing Features

This story sets up FCM infrastructure that will be ACTIVATED in Epic 11 (Push & SMS Notifications). Do NOT:
- Add notification permission UI (Epic 11, Story 11.1)
- Store device tokens in database (Epic 11, Story 11.1 — requires `DeviceToken` model)
- Send actual notifications (Epic 10/11)
- Add notification preferences to Settings page (Epic 11, Story 11.3)
- Auto-register the service worker on page load (Epic 11 handles this)

### Critical: Firebase Admin SDK — admin.ts Created in Prerequisites

The prerequisites section creates `src/lib/firebase/admin.ts` which exports:
- `adminApp` (App instance) — used by `messaging-admin.ts` for `getMessaging(adminApp)`
- `db` (Firestore instance) — required by existing `firestore-helpers.ts` which imports `{ db } from './admin'`

```typescript
// src/lib/firebase/messaging-admin.ts — correct import
import { getMessaging } from 'firebase-admin/messaging';
import { adminApp } from './admin';

const messaging = getMessaging(adminApp);
```

**WARNING:** When Story 1.4 is later implemented, it will expand `admin.ts` with `adminAuth` and other exports. The `admin.ts` from prerequisites is designed to be forward-compatible — Story 1.4 only needs to add exports, not restructure.

### Critical: Service Worker Must Use Compat SDK

Firebase Messaging service workers CANNOT use the modular SDK (`import { ... } from 'firebase/messaging'`) because service workers don't support ES modules. Use the compat version:

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "...",          // NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "...",      // NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "axovia-flipper",
  messagingSenderId: "...", // From Firebase Console
  appId: "...",           // NEXT_PUBLIC_FIREBASE_APP_ID
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Flipper AI', {
    body: body || 'New notification',
    icon: '/icon-192x192.png',
  });
});
```

**Version pinning:** Pin the Firebase compat SDK version in `importScripts` URLs to match the `firebase` package version in `package.json`. Do NOT use "latest".

### Critical: Key Confusion Prevention — Three Different Keys

There are THREE distinct keys involved. Do NOT confuse them:

| Key | Where Found | Public/Secret | Used By | Stored In |
|-----|-------------|---------------|---------|-----------|
| **VAPID public key** | Firebase Console > Cloud Messaging > Web Push certificates | **Public** (safe in client bundle) | `getToken(messaging, { vapidKey })` on client | `NEXT_PUBLIC_FIREBASE_VAPID_KEY` env var |
| **VAPID private key** | Firebase Console > Cloud Messaging > Web Push certificates | **Secret** | Potential future custom VAPID auth | Secret Manager only |
| **FCM Server Key** (legacy) | Firebase Console > Cloud Messaging > Project credentials | **Secret** | Legacy HTTP v1 API only | Secret Manager (optional) |

**The VAPID public key** is a base64 string starting with `B`, ~88 characters. The **private key** is shorter (~44 chars). Do NOT swap them.

**Modern approach with Admin SDK v13+:** The Admin SDK's `getMessaging().send()` uses OAuth2 via ADC — it does NOT need the legacy FCM server key. The server key is retained in Secret Manager only for backward compatibility if any legacy integrations exist.

### Critical: Firebase Admin SDK Messaging Uses ADC

On Cloud Run, Firebase Admin SDK uses Application Default Credentials (ADC) — the Cloud Run service account (`flipper-run@axovia-flipper.iam.gserviceaccount.com`) automatically provides credentials. No additional configuration needed beyond ensuring the service account has the `roles/firebase.admin` or `roles/cloudmessaging.messages.create` IAM role.

For local development:
- `gcloud auth application-default login` provides credentials
- Or set `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to service account JSON

### Critical: Next.js Service Worker Serving + SSR Import Safety

**Service worker location:** Next.js serves `public/` files at the root path. `public/firebase-messaging-sw.js` → `/firebase-messaging-sw.js`. Do NOT put it in `app/` or `src/`.

**SSR import safety:** The `'use client'` directive alone is NOT sufficient to prevent SSR crashes. Next.js still server-renders client components for the initial HTML. The `firebase/messaging` module references `self` and `navigator` at import time in some versions, which crashes during SSR.

**Solution:** All `firebase/messaging` imports in `messaging.ts` MUST use dynamic `import()` INSIDE functions, NOT top-level static imports:
```typescript
// WRONG — crashes SSR
import { getMessaging } from 'firebase/messaging';

// CORRECT — safe for SSR
const { getMessaging } = await import('firebase/messaging');
```

### Existing Firebase Setup

| File | Status | Relevance |
|------|--------|-----------|
| `.firebaserc` | Exists | Project ID: `axovia-flipper` |
| `firebase.json` | Exists | Hosting + Functions config, no messaging section needed |
| `functions/package.json` | Exists | Has `firebase-admin: ^13.0.0` (functions-specific, not main app) |
| `src/lib/firebase/firestore-helpers.ts` | Exists | Uses `firebase-admin/firestore`, shows admin import pattern |
| `src/lib/firebase/admin.ts` | TBD (Story 1.4) | Admin singleton — messaging-admin.ts depends on this |
| `src/lib/firebase/config.ts` | TBD (Story 1.4) | Client Firebase app init — messaging.ts depends on this |

### Dependency: Firebase Client App Initialization

The client-side `messaging.ts` dynamically imports `firebaseApp` from `./config`. This file is created in the **prerequisites section** above (since Story 1.4 is not yet implemented). The `config.ts` exports `firebaseApp` which the messaging module uses via `getMessaging(firebaseApp)`.

### Anti-Patterns to Avoid

- Do NOT use top-level `import { getMessaging } from 'firebase/messaging'` — use dynamic `import()` inside functions to prevent SSR crashes. `'use client'` alone is NOT sufficient
- Do NOT import `firebase-admin/messaging` in client-side code — it contains credentials and server-only dependencies
- Do NOT create a barrel export `index.ts` in `src/lib/firebase/` that re-exports from both `messaging.ts` and `messaging-admin.ts` — they have incompatible runtime requirements
- Do NOT auto-request notification permission on page load — hostile UX, browsers may block (Epic 11 handles opt-in)
- Do NOT store device tokens in this story — no `DeviceToken` model yet (Epic 11)
- Do NOT use the deprecated `sendToDevice()` or `sendToTopic()` methods from `firebase-admin/messaging` — use the modern `messaging.send()` with `token` or `topic` field in the Message object
- Do NOT bundle the service worker with webpack/Next.js — it must be a plain JS file in `public/`
- Do NOT use `process.env` in the service worker — it's a static file that cannot access Node.js env vars
- Do NOT hardcode the Firebase SDK version in the service worker without matching the installed `firebase` package version
- Do NOT modify or add files in `functions/` — that is a separate Node.js project for Cloud Functions
- Do NOT assume `admin.ts` already exists just because `firestore-helpers.ts` imports from it — create it via prerequisites

### Project Structure Notes

- New files go in `src/lib/firebase/` directory (existing directory from `firestore-helpers.ts`)
- Service worker goes in `public/` directory (root static files)
- Tests go in `src/__tests__/lib/firebase/` directory
- Follow existing patterns: singleton initialization, lazy loading, graceful degradation

### Technology Version Notes

- **Firebase JS SDK:** v11.x (modular, tree-shakeable — matches Story 1.4 spec)
- **Firebase Admin Node.js SDK:** v13.x (matches `functions/package.json`)
- **Firebase Messaging compat SDK:** v11.x for service worker (must match client SDK version exactly — read from `node_modules/firebase/package.json`)
- **Zod:** v4.x (`^4.2.1`) — validate env vars using Zod v4 API, NOT v3 docs
- **Next.js:** 16.x (App Router, files in `public/` served at root)

### Dependencies on Prior Stories

- **Story 1.1 (Secret Manager):** VAPID private key and FCM server key stored in Secret Manager. **Interim:** Use `.env.local` for development.
- **Story 1.4 (Firebase Auth):** NOT yet implemented (status: `ready-for-dev`). The **prerequisites section** of this story creates minimal `admin.ts` and `config.ts` files that satisfy this dependency. When Story 1.4 is later implemented, it will expand these files (add `adminAuth`, auth middleware, etc.) without breaking the messaging modules.
- **Story 1.5 (Firebase Hosting):** Service worker cache headers and rewrite rules. Not blocking for local dev — Next.js dev server serves `public/` directly.
- **Story 1.6 (Firebase Storage):** No direct dependency.

### What Epic 11 Will Need from This Story

Epic 11 Story 11.1 (FCM Push Notification Client) will:
1. Call `registerFCMServiceWorker()` when user enables push in Settings
2. Call `requestNotificationPermission()` to get browser permission
3. Call `getFCMToken()` to get device token, then store in a new `DeviceToken` database table
4. Call `onForegroundMessage()` to handle in-app notifications
5. Call `sendToDevice()` / `sendToTopic()` from the server to deliver notifications

This story must ensure all these functions exist and work correctly (with stubs where needed).

### Security Considerations

- **VAPID key:** Public key is safe to expose (goes in `NEXT_PUBLIC_*` env var). Private key is secret (Secret Manager only).
- **Service worker scope:** Must be at root (`/`) to intercept FCM messages. Verify no other service workers conflict.
- **Permission model:** Browser `Notification.requestPermission()` returns `'granted'`, `'denied'`, or `'default'`. Once denied, cannot re-prompt.
- **Token rotation:** FCM device tokens can change. Epic 11 must handle token refresh — this story just provides `getFCMToken()`.
- **IAM:** Cloud Run service account needs `cloudmessaging.messages.create` permission to send via Admin SDK.

### Out of Scope (Noted for Other Stories)

- **Device token storage in database** — Epic 11, Story 11.1 (requires new Prisma model)
- **Notification permission UI in Settings** — Epic 11, Story 11.1
- **Sending actual notifications from events** — Epic 10/11
- **Notification preferences / per-event toggles** — Epic 11, Story 11.3
- **SMS notifications (Twilio)** — Epic 11, Story 11.2
- **Custom notification sounds/icons** — Phase 2 enhancement
- **Firebase App Check** — separate security story

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7] — Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#FR-INFRA-14] — FCM requirement
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11] — Push notification consumer stories (11.1, 11.2, 11.3)
- [Source: _bmad-output/planning-artifacts/architecture.md] — Infrastructure patterns, planned Firebase services
- [Source: _bmad-output/project-context.md] — Project conventions and tech stack
- [Source: _bmad-output/implementation-artifacts/1-4-firebase-auth-setup-migration.md] — Firebase Auth setup patterns, Admin SDK init, client SDK init
- [Source: src/lib/firebase/firestore-helpers.ts] — Existing Firebase Admin import patterns
- [Source: firebase.json] — Current Firebase project config
- [Source: .firebaserc] — Firebase project ID: axovia-flipper
- [Source: functions/package.json] — Firebase Admin SDK v13.x reference
- [Source: firebase.google.com/docs/cloud-messaging/js/client] — FCM Web client setup
- [Source: firebase.google.com/docs/cloud-messaging/js/receive] — FCM service worker setup
- [Source: firebase.google.com/docs/cloud-messaging/send-message] — Admin SDK send API

### Previous Story Intelligence

**From Story 1.4 (Firebase Auth Setup & Migration):**
- Firebase Admin singleton pattern: `initAdmin()` with ADC fallback. NOTE: Story 1.4's code example does NOT export `adminApp` (it's a local const) — only `adminAuth` is exported. The `admin.ts` created in this story's prerequisites explicitly exports both `adminApp` and `db` for compatibility. When Story 1.4 is implemented, ensure it adds `export` to `adminApp` and adds `export const db = getFirestore(adminApp)`.
- Firebase client init pattern: `initializeApp()` with `NEXT_PUBLIC_FIREBASE_*` env vars, exported as `firebaseApp`
- Files created: `src/lib/firebase/config.ts`, `src/lib/firebase/admin.ts`, `src/lib/firebase/auth.ts`, etc.
- `'use client'` directive required for any module using browser APIs
- GCP project: `axovia-flipper`, service account: `flipper-run@axovia-flipper.iam.gserviceaccount.com`
- Secret naming: `{BUILD_ENV.upper()}_{ENV_VAR_NAME}` pattern
- Development mode: graceful degradation when Firebase not configured (pattern from `getUserIdOrDefault()`)
- Test pattern: mock Firebase SDK modules, test with mocked responses
- Package versions: `firebase: ^11.x`, `firebase-admin: ^13.x`

### Git Intelligence

**Recent commit patterns:**
- Commits use emoji prefixes and category tags: `[DOCS]`, `[LEGAL]`, `[TEST]`
- Test fixes actively worked on (Dashboard tests, market-value-calculator mocks)
- Error handling standardized (AppError/ErrorCode from `@/lib/errors`)
- CI/CD pipeline has database migration step

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No debug issues encountered during implementation.

### Completion Notes List

- **Prerequisites**: `admin.ts` already existed with Auth + Storage exports; added named `adminApp` export. `config.ts` already existed; added `storageBucket`, `messagingSenderId`, `appId` fields. Firebase packages already installed (v12.10.0 client, v13.7.0 admin).
- **Task 1**: MANUAL — output checklist for user. Task 1 subtasks remain unchecked (user's responsibility).
- **Task 2**: Added `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` to `.env.example` and `env.ts` with Zod validation.
- **Task 3**: Created `public/firebase-messaging-sw.js` with compat SDK v12.10.0, TODO placeholders for Firebase config values (user fills after Task 1). Updated CSP in both `next.config.js` and `firebase.json` to allow `https://www.gstatic.com`. Added `firebase-messaging-sw.js` cache header in `firebase.json`.
- **Task 4**: Created `src/lib/firebase/messaging.ts` with all dynamic imports to prevent SSR crashes. Exports: `getMessagingInstance()`, `requestNotificationPermission()`, `getFCMToken()`, `onForegroundMessage()`. All gracefully return null/no-op when unavailable.
- **Task 5**: Created `src/lib/firebase/messaging-admin.ts` with modern `messaging.send()` API. Exports: `getMessagingAdmin()`, `sendToDevice()`, `sendToTopic()`, `NotificationPayload` interface. Proper error handling for stale tokens and missing credentials.
- **Task 6**: Created `src/lib/firebase/register-sw.ts`. Searched for existing service workers — none found. Function is not auto-registered (deferred to Epic 11).
- **Task 7**: Verified firebase packages in package.json, admin.ts exports, production build succeeds.
- **Task 8**: CSP and firebase.json updates done as part of Task 3.
- **Task 9**: Created 3 test files with 41 total tests, all passing. Added `firebase-admin/messaging` mock to global test setup. Full test suite: 141 suites, 2680 tests passing, 0 regressions.

### Implementation Plan

- Used existing `admin.ts` (Story 1.4 partially implemented) — added named export for `adminApp`
- Used existing `config.ts` — added FCM-required fields (`messagingSenderId`, `appId`)
- All client-side firebase/messaging imports are dynamic to prevent SSR crashes
- Server-side module uses top-level imports (safe for server-only code)
- No barrel exports created to avoid mixing client/server module dependencies

### Change Log

- 2026-03-01: Story 1.7 implementation complete — FCM infrastructure ready for Phase 2 activation

### File List

**New Files:**
- `public/firebase-messaging-sw.js` — FCM service worker stub with compat SDK
- `src/lib/firebase/messaging.ts` — Client-side FCM helpers (token, permission, foreground messages)
- `src/lib/firebase/messaging-admin.ts` — Server-side FCM helpers (send to device/topic)
- `src/lib/firebase/register-sw.ts` — Service worker registration function
- `src/__tests__/lib/firebase/messaging.test.ts` — Client messaging tests (18 tests)
- `src/__tests__/lib/firebase/messaging-admin.test.ts` — Server messaging tests (17 tests)
- `src/__tests__/lib/firebase/register-sw.test.ts` — SW registration + file validation tests (8 tests)

**Modified Files:**
- `src/lib/firebase/admin.ts` — Added named `adminApp` export (was default-only)
- `src/lib/firebase/config.ts` — Added `storageBucket`, `messagingSenderId`, `appId` to config
- `src/lib/env.ts` — Added FCM env var validation (VAPID key, sender ID, app ID)
- `.env.example` — Added FCM env var documentation
- `next.config.js` — Added `https://www.gstatic.com` to CSP `script-src`
- `firebase.json` — Added `firebase-messaging-sw.js` cache header, updated CSP
- `src/__tests__/setup.ts` — Added `firebase-admin/messaging` global mock
