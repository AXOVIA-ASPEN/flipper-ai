# Story 2.3: OAuth Login (Google, GitHub, Facebook)

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a41978e88fd8b6308fcc8f

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to log in with my Google, GitHub, or Facebook account,
So that I can access the app without creating a separate password.

## Acceptance Criteria

1. **AC-1: Google OAuth login** — Given the login page, when the user clicks "Sign in with Google", then they are redirected to Google OAuth, and upon consent, an account is created/linked and they are logged in. `FR-BILLING-02`
2. **AC-2: GitHub OAuth login** — Given the login page, when the user clicks "Sign in with GitHub", then they are redirected to GitHub OAuth, and upon consent, an account is created/linked and they are logged in. `FR-BILLING-02`
3. **AC-3: Facebook OAuth login** — Given the login page, when the user clicks "Sign in with Facebook", then they are redirected to Facebook OAuth, and upon consent, an account is created/linked, they are logged in, AND a marketplace access token is captured and stored for Graph API access. `FR-BILLING-02`
4. **AC-4: Account linking** — Given a user logs in via OAuth, when an account already exists with the same email, then the OAuth provider is linked to the existing account (not duplicated). `FR-BILLING-02`
5. **AC-5: Secure session** — Given a valid OAuth session, when the JWT is issued, then it is stored as an HttpOnly cookie and includes proper user claims. `NFR-SEC-04`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-BILLING-02 | AC #1, AC #2, AC #3, AC #4 | @FR-BILLING-02 @story-2-3 |
| NFR-SEC-04 | AC #5 | @NFR-SEC-04 @story-2-3 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Acceptance test scenarios created with triple tags (@E-002-S-N @story-2-3 @FR-*)
- [ ] Feature file: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- [ ] user_flows.feature updated (if story affects user flows)
- [ ] No regressions — existing tests still pass
- [ ] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

### Task 1: Add Facebook OAuth Button to Login Page (AC: #3, FR: FR-BILLING-02)

- [ ] 1.1 In `app/(auth)/login/page.tsx`, add a "Continue with Facebook" button below the existing GitHub button
- [ ] 1.2 Use the same button styling pattern as Google and GitHub buttons (full-width, icon + label)
- [ ] 1.3 Use the Facebook brand color (#1877F2) for the button background or icon
- [ ] 1.4 Wire the onClick handler to call `signInWithFacebook()` from `useFirebaseAuth()` hook
- [ ] 1.5 Add global loading state: when ANY OAuth button is clicked, disable ALL OAuth buttons AND the email form to prevent race conditions. Show spinner on the clicked button.
- [ ] 1.6 Add error handling that catches Firebase errors and displays toast notifications
- [ ] 1.7 Handle popup-blocked error (`auth/popup-blocked-by-browser`): show message "Please allow popups for this site to sign in with Facebook" with browser-specific instructions

### Task 1b: Add Facebook OAuth Button to Registration Page (AC: #3, FR: FR-BILLING-02)

- [ ] 1b.1 In `app/(auth)/register/page.tsx`, verify OAuth buttons exist for Google and GitHub
- [ ] 1b.2 Add matching "Continue with Facebook" button using the same pattern as login page
- [ ] 1b.3 Ensure the same loading state and error handling patterns apply

### Task 2: Verify Google OAuth Flow End-to-End (AC: #1, FR: FR-BILLING-02)

- [ ] 2.1 Verify `signInWithGoogle()` in `src/lib/firebase/auth.ts` calls `signInWithPopup()` with `GoogleAuthProvider`
- [ ] 2.2 Verify the ID token is exchanged for a session cookie via `exchangeTokenForSession()` → `/api/auth/session`
- [ ] 2.3 Verify `/api/auth/session` upserts Prisma User with `firebaseUid`, `email`, `name`, `image` from Google claims
- [ ] 2.4 Verify `UserSettings` is auto-created if not existing
- [ ] 2.5 Verify user is redirected to `/dashboard` after successful login
- [ ] 2.6 Fix any issues found during verification

### Task 3: Verify GitHub OAuth Flow End-to-End (AC: #2, FR: FR-BILLING-02)

- [ ] 3.1 Verify `signInWithGitHub()` in `src/lib/firebase/auth.ts` calls `signInWithPopup()` with `GithubAuthProvider`
- [ ] 3.2 Verify the ID token exchange + Prisma upsert works correctly
- [ ] 3.3 Handle edge case: GitHub may not provide email if user's email is private. Firebase will still return a UID but `decodedToken.email` may be null. The `/api/auth/session` upsert MUST handle this: if email is null, use the Firebase UID to look up the user first; if no user exists, use `${firebaseUid}@github.noreply` as a placeholder email OR prompt the user for their email after login. Verify the Prisma `User.email` unique constraint doesn't cause a crash.
- [ ] 3.4 Verify user is redirected to `/dashboard` after successful login
- [ ] 3.5 Fix any issues found during verification

### Task 4: Verify Facebook OAuth + Marketplace Token Capture (AC: #3, FR: FR-BILLING-02)

- [ ] 4.1 Verify `signInWithFacebook()` in `src/lib/firebase/auth.ts`:
  - Calls `signInWithPopup()` with `FacebookAuthProvider`
  - Adds scopes `public_profile` and `email`
  - Extracts `FacebookAuthProvider.credentialFromResult(credential)?.accessToken`
  - Posts token to `/api/auth/facebook/token`
- [ ] 4.2 Verify `/api/auth/facebook/token` exchanges short-lived token for long-lived token (60-day expiry)
- [ ] 4.3 Verify long-lived token is stored in `FacebookToken` table (encrypted)
- [ ] 4.4 Verify session cookie is created via `exchangeTokenForSession()`
- [ ] 4.5 Verify user is redirected to `/dashboard` after successful login
- [ ] 4.6 Verify Facebook token status is queryable via `/api/auth/facebook/status`

### Task 5: Verify Account Linking (AC: #4, FR: FR-BILLING-02)

- [ ] 5.1 Check Firebase Console setting: "One account per email address" must be enabled
- [ ] 5.2 Verify that when a user registers with email, then later tries to log in with Google using the same email, the accounts are linked (not a "email already in use" error)
- [ ] 5.3 Verify the Prisma upsert in `/api/auth/session` uses `firebaseUid` as the unique key — so changing auth providers (Google → GitHub with same email) correctly maps to the same Prisma User
- [ ] 5.4 Test cross-provider linking: register with email → login with Google (same email) → verify single User record
- [ ] 5.5 If Firebase's "One account per email" setting causes `auth/account-exists-with-different-credential` error, handle it gracefully. Firebase returns `error.customData?.email` (the conflicting email) and the methods linked to it via `fetchSignInMethodsForEmail()`. Use this to show: "An account with this email already exists. Please sign in with [Google/GitHub/email] instead." — name the specific provider, don't just say "original provider".

### Task 6: Verify Secure Session Management (AC: #5, NFR: NFR-SEC-04)

- [ ] 6.1 Verify `__session` cookie is set with: `httpOnly: true`, `secure: true` (prod), `sameSite: 'strict'`, `maxAge: 432000` (5 days)
- [ ] 6.2 Verify `createSessionCookie()` in `src/lib/firebase/session.ts` uses Firebase Admin `adminAuth.createSessionCookie()`
- [ ] 6.3 Verify session cookie includes claims: `uid`, `email`, `name`, `picture`
- [ ] 6.4 Verify `getCurrentUser()` and `requireAuth()` correctly verify the session cookie on protected API routes
- [ ] 6.5 Verify sign-out (`signOut()`) clears the session cookie and revokes Firebase refresh tokens

### Task 7: Mobile Browser Fallback (AC: #1, #2, #3)

- [ ] 7.1 `signInWithPopup()` fails on mobile Safari and some Android browsers (blocked cross-origin popups). Add fallback logic in `src/lib/firebase/auth.ts` (or in the login page handler):
  - Try `signInWithPopup()` first
  - If it throws `auth/popup-blocked-by-browser` or `auth/cancelled-popup-request`, fall back to `signInWithRedirect()`
  - After redirect return, call `getRedirectResult()` in the `FirebaseAuthProvider` on mount to complete the flow
- [ ] 7.2 Test on mobile Safari (iOS) and Chrome (Android) to verify the fallback works
- [ ] 7.3 Ensure the redirect flow still exchanges the ID token for a session cookie (same as popup flow)

### Task 8: Split-Brain Recovery (AC: #1, #2, #3, #5)

- [ ] 8.1 Handle the case where `signInWithPopup()` succeeds but `exchangeTokenForSession()` fails (network error, server 500, DB down). The user is authenticated in Firebase but has no `__session` cookie — they appear logged in via `FirebaseAuthProvider` but every API call returns 401.
- [ ] 8.2 In the OAuth handler (login page), if `exchangeTokenForSession()` fails: retry once, and if still failing, call `signOut()` on Firebase to clear the inconsistent state, then show error: "Login failed — please try again."
- [ ] 8.3 Add unit tests for the retry + rollback behavior

### Task 9: Write Unit Tests

- [ ] 9.1 Add/update tests in `src/__tests__/lib/firebase-auth.test.ts`:
  - Test `signInWithGoogle()` calls `signInWithPopup` with `GoogleAuthProvider`
  - Test `signInWithGitHub()` calls `signInWithPopup` with `GithubAuthProvider`
  - Test `signInWithFacebook()` calls `signInWithPopup` with `FacebookAuthProvider` and extracts access token
  - Test `exchangeTokenForSession()` posts to `/api/auth/session`
  - Test error handling for popup closed, popup blocked, network errors
  - Test mobile fallback: popup blocked → falls back to `signInWithRedirect`
  - Test split-brain recovery: popup succeeds → session exchange fails → Firebase signOut called
- [ ] 9.2 Add/update tests in `src/__tests__/api/auth-session.test.ts`:
  - Test upsert creates new user for new OAuth login
  - Test upsert links to existing user for same email
  - Test session cookie is set with correct attributes
  - Test null email handling (GitHub private email edge case)
- [ ] 9.3 Add/update tests in `src/__tests__/api/facebook-auth.test.ts`:
  - Test token exchange from short-lived to long-lived
  - Test token storage in `FacebookToken` table
  - Test `/api/auth/facebook/status` returns connection status
- [ ] 9.4 Add/update component test in `src/__tests__/components/LoginPage.test.tsx`:
  - Test Facebook OAuth button renders
  - Test all three OAuth buttons trigger correct handlers
  - Test loading state disables ALL buttons and email form during auth
  - Test error toast on OAuth failure
  - Test popup-blocked message displays correctly
  - Test `auth/account-exists-with-different-credential` shows provider name
- [ ] 9.5 Maintain coverage thresholds: branches 96%, functions 98%, lines 99%

### Task 10: Write Acceptance Tests (AC: All)

- [ ] 10.1 Add scenarios to `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- [ ] 10.2 Write Gherkin scenarios with triple tags:
  - `@E-002-S-13 @story-2-3 @FR-BILLING-02` — Google OAuth login
  - `@E-002-S-14 @story-2-3 @FR-BILLING-02` — GitHub OAuth login
  - `@E-002-S-15 @story-2-3 @FR-BILLING-02` — Facebook OAuth login with marketplace token
  - `@E-002-S-16 @story-2-3 @FR-BILLING-02` — Account linking (OAuth email matches existing account)
  - `@E-002-S-17 @story-2-3 @NFR-SEC-04` — Secure session (HttpOnly cookie with proper claims)
- [ ] 10.3 Update requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Existing Code — DO NOT Recreate

**OAuth login is already implemented for all three providers.** This story VERIFIES the existing flows, adds the missing Facebook button to the login page, ensures account linking works, and writes comprehensive tests.

Key existing files:
| File | What It Does | Status |
|------|-------------|--------|
| `app/(auth)/login/page.tsx` | Login form with email/password + Google & GitHub OAuth buttons | **Exists — MODIFY (add Facebook button)** |
| `app/(auth)/register/page.tsx` | Registration form with OAuth buttons (Google, GitHub) | **Exists — MODIFY (add Facebook button)** |
| `src/lib/firebase/auth.ts` | `signInWithGoogle()`, `signInWithGitHub()`, `signInWithFacebook()`, `exchangeTokenForSession()` | **Exists — MODIFY (add mobile fallback + split-brain recovery)** |
| `src/lib/firebase/session.ts` | `createSessionCookie()`, `verifySessionCookie()`, `getCurrentUser()`, `requireAuth()` | **Exists — DO NOT TOUCH** |
| `src/lib/firebase/config.ts` | Firebase client SDK initialization with env vars | **Exists — DO NOT TOUCH** |
| `src/lib/firebase/admin.ts` | Firebase Admin SDK singleton (`adminAuth`, `adminStorage`) | **Exists — DO NOT TOUCH** |
| `src/components/providers/FirebaseAuthProvider.tsx` | Auth context provider with `onAuthStateChanged` listener | **Exists — DO NOT TOUCH** |
| `src/hooks/useFirebaseAuth.ts` | React hook: `{ user, loading, signInWithGoogle, signInWithGitHub, signInWithFacebook, signOut }` | **Exists — DO NOT TOUCH** |
| `app/api/auth/session/route.ts` | POST: Verify Firebase ID token → upsert Prisma User → create `__session` cookie | **Exists — VERIFY/MODIFY (null email handling)** |
| `app/api/auth/signout/route.ts` | POST: Revoke tokens + clear session cookie | **Exists — DO NOT TOUCH** |
| `app/api/auth/facebook/token/route.ts` | POST: Exchange + store long-lived Facebook token in `FacebookToken` table | **Exists — VERIFY** |
| `app/api/auth/facebook/status/route.ts` | GET: Return connection status (without exposing token) | **Exists — VERIFY** |
| `app/api/auth/facebook/authorize/route.ts` | GET: Initiate Facebook OAuth (CSRF state token in cookie) | **Exists — DO NOT TOUCH** |
| `app/api/auth/facebook/callback/route.ts` | GET: Handle callback, exchange code, store encrypted token | **Exists — DO NOT TOUCH** |
| `app/api/auth/facebook/disconnect/route.ts` | POST: Revoke + delete Facebook token | **Exists — DO NOT TOUCH** |
| `prisma/schema.prisma` | `User` (with `firebaseUid`), `FacebookToken`, `UserSettings` models | **Exists — DO NOT TOUCH** |

### Existing OAuth Flow (Current Behavior)

**Google/GitHub flow:**
1. User clicks "Continue with Google/GitHub" on `/login`
2. Client calls `signInWithGoogle()`/`signInWithGitHub()` → `signInWithPopup(auth, provider)`
3. Firebase returns `UserCredential` with `user.getIdToken()`
4. `exchangeTokenForSession(idToken)` POSTs to `/api/auth/session`
5. Server verifies ID token, upserts Prisma User (creates if new, updates if existing), creates `__session` cookie
6. Client redirects to `/dashboard`

**Facebook flow (same as above, plus marketplace token):**
1-6. Same as Google/GitHub
7. `FacebookAuthProvider.credentialFromResult(credential)?.accessToken` extracts the Facebook access token
8. Client POSTs token to `/api/auth/facebook/token`
9. Server exchanges short-lived token for long-lived token (60-day expiry)
10. Long-lived token stored in `FacebookToken` table for marketplace scraping

### What This Story Changes

1. **Login page** (`app/(auth)/login/page.tsx`):
   - Add "Continue with Facebook" button (Facebook brand color #1877F2)
   - Follow existing button pattern (full-width, icon + label)
   - Wire to `signInWithFacebook()` from `useFirebaseAuth()` hook
   - Add global loading state: disable ALL OAuth buttons + email form during any OAuth flow
   - Add popup-blocked detection with user-friendly guidance message
   - Add specific provider name in account-linking error messages

2. **Registration page** (`app/(auth)/register/page.tsx`):
   - Add matching "Continue with Facebook" button (same as login page)

3. **OAuth flow resilience** (`src/lib/firebase/auth.ts` or login page handler):
   - Add mobile fallback: `signInWithPopup` → `signInWithRedirect` on popup failure
   - Add split-brain recovery: retry session exchange once, then Firebase signOut on failure

4. **Session endpoint** (`app/api/auth/session/route.ts`):
   - Verify/fix GitHub null email handling (private email edge case)

5. **Verification only** (no code changes expected):
   - Google OAuth end-to-end flow
   - GitHub OAuth end-to-end flow (except null email fix if needed)
   - Facebook OAuth + marketplace token capture
   - Account linking (same email across providers)
   - Session cookie security attributes
   - Firebase Console "One account per email" setting

### Account Linking — Firebase Configuration

Firebase Auth handles account linking via the "One account per email address" console setting:
- **When enabled:** If a user signs up with email, then later signs in with Google (same email), Firebase links the providers automatically
- **Potential error:** `auth/account-exists-with-different-credential` — occurs when user tries a different OAuth provider on an existing email
- **Resolution:** Show a user-friendly message like "An account with this email already exists. Please sign in with [original provider]."
- **Prisma side:** The upsert in `/api/auth/session` uses `firebaseUid` as the lookup key. Since Firebase handles provider linking, the same UID maps to the same Prisma User.

### Architecture Compliance

- **Auth:** Firebase Auth for all authentication (NOT NextAuth — NextAuth is deprecated in this codebase)
- **OAuth:** Uses `signInWithPopup()` as primary method, with `signInWithRedirect()` as fallback for mobile browsers that block popups
- **Session:** `__session` cookie, 5-day TTL, HttpOnly, secure, sameSite strict
- **Database:** Prisma singleton from `@/lib/db` — do NOT instantiate new PrismaClient
- **Errors:** Use `handleError()` from `@/lib/errors` for API error responses
- **API response shape:** `{ success: true, data: ... }` or RFC 7807 error
- **Styling:** Tailwind CSS 4 with existing design tokens (Arctic Blue #0EA5E9)
- **Icons:** lucide-react for UI icons (already in use on login page)
- **Client components:** Must have `'use client'` directive
- **Environment variables:** All `NEXT_PUBLIC_FIREBASE_*` for client, `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` for server

### Facebook-Specific Requirements

- **Scopes:** `public_profile` + `email` for login; Graph API scopes for marketplace
- **Token exchange:** Short-lived (4 hours) → long-lived (60 days)
- **Token storage:** Encrypted in `FacebookToken` table, never exposed to client
- **Status endpoint:** `/api/auth/facebook/status` returns `{ connected: boolean, expiresAt?: DateTime }` only
- **CSRF protection:** Facebook authorize flow uses state token in httpOnly cookie
- **Token renewal:** OUT OF SCOPE for this story. The 60-day long-lived token will expire. Token renewal should be implemented when marketplace scraping is built (Epic 3, Story 3.3). For now, users will need to re-authorize Facebook if the token expires. Track this as a known limitation.

### OAuth Consent Screen Verification

- **Google:** Requires configuring the OAuth consent screen in Google Cloud Console (separate from Firebase Console). Verify the consent screen shows the app name, logo, and requested scopes correctly. This is a one-time Firebase Console + Google Cloud Console setup — not code.
- **Cookie size:** Verify Firebase session cookie stays under 4KB with default claims. Firebase session cookies with standard claims (uid, email, name, picture) are typically ~1.5KB — well within limits. If custom claims are added later, re-verify.

### Environment Variables Required

| Variable | Purpose | Already Configured |
|----------|---------|-------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client-side Firebase SDK | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK server auth | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK server auth | Yes |
| `FACEBOOK_APP_ID` | Facebook OAuth app ID | Yes |
| `FACEBOOK_APP_SECRET` | Facebook OAuth app secret | Yes |
| `FACEBOOK_REDIRECT_URI` | Facebook OAuth redirect URI | Yes |
| `DATABASE_URL` | Prisma connection string | Yes |

### Test Requirements

- **Unit tests:** `src/__tests__/lib/firebase-auth.test.ts`, `src/__tests__/api/auth-session.test.ts`, `src/__tests__/api/facebook-auth.test.ts`, `src/__tests__/components/LoginPage.test.tsx`
- **Acceptance tests:** `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- **Every scenario tagged:** `@E-002-S-<N> @story-2-3 @FR-<ID>`
- **Scenario numbering:** Continue from Story 2.2 — starts at `@E-002-S-13`
- **Coverage thresholds:** branches 96%, functions 98%, lines 99%, statements 99%
- **Test framework:** Jest with `ts-jest`, `maxWorkers: 1`
- **Mock Firebase SDK:** Mock `GoogleAuthProvider`, `GithubAuthProvider`, `FacebookAuthProvider`, `signInWithPopup`, `getAuth`

### Project Structure Notes

- Login page: `app/(auth)/login/page.tsx` — uses `(auth)` route group (no `/auth` prefix in URL)
- Auth API routes: `app/api/auth/` — exports named HTTP method handlers
- Firebase client: `src/lib/firebase/auth.ts` — all client-side auth functions
- Firebase server: `src/lib/firebase/session.ts` — session management
- Path alias: `@/*` → `./src/*`
- Prisma generated client: `src/generated/prisma/` (DO NOT EDIT)

### Cross-Story Dependencies

- **Story 2.1 (Landing Page):** CTA buttons link to `/register` — no conflict
- **Story 2.2 (User Registration):** Registration page also has OAuth buttons that call the same functions; changes to login page do not affect registration
- **Story 2.4 (Password Reset):** Separate flow; no conflict
- **Story 2.5 (Onboarding Wizard):** Post-registration redirect targets `/onboarding`; OAuth login redirects to `/dashboard` — no conflict
- **Epic 1 Story 1.4 (Firebase Auth Migration):** Already completed the NextAuth → Firebase Auth migration — this story builds on that work

### Previous Story Intelligence (from Story 2.2)

- Registration page already has OAuth buttons (Google, GitHub) — login page should follow the same visual pattern
- hCaptcha pattern is established — login page already uses it
- Error handling maps Firebase error codes to user-friendly messages — follow the same pattern for OAuth errors
- Rate limiting pattern established in `src/lib/captcha-tracker.ts` — not needed for OAuth (Firebase handles rate limiting)
- Redirect after login goes to `/dashboard` (NOT `/onboarding` like registration)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 2.3]
- [Source: _bmad-output/planning-artifacts/PRD.md — FR-BILLING-02, NFR-SEC-04]
- [Source: _bmad-output/planning-artifacts/architecture.md — Auth section]
- [Source: _bmad-output/planning-artifacts/ux-design.md — Flow 2: Login]
- [Pattern Reference: app/(auth)/login/page.tsx — Existing OAuth button pattern]
- [Pattern Reference: src/lib/firebase/auth.ts — OAuth implementation]
- [Pattern Reference: Story 2.2 — Error handling, button patterns, test structure]

## Dev Agent Record

### Agent Model Used
<!-- Filled by dev agent -->

### Debug Log References
<!-- Filled by dev agent -->

### Completion Notes List
<!-- Filled by dev agent -->

### File List
<!-- Filled by dev agent -->
