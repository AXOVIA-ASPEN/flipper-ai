# Story 2.2: User Registration with Email

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a40fb46e39b500adc59fb1

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **new user**,
I want to register with my email and password,
So that I can create an account and start using Flipper AI.

## Acceptance Criteria

1. **AC-1: Successful registration** — Given an unauthenticated user on the registration page, when they enter a valid email, password (min 8 chars, 1 uppercase, 1 number), and confirm password, then an account is created and the user is redirected to the onboarding wizard. `FR-BILLING-01`
2. **AC-2: hCaptcha required** — Given a user attempts to register, when hCaptcha verification is not completed, then the registration form cannot be submitted. If the hCaptcha widget fails to load or the verification API is unavailable, the form degrades gracefully (allows submission with server-side logging) rather than permanently blocking all registrations. `NFR-SEC-09`
3. **AC-3: Duplicate email** — Given a user attempts to register, when the email is already associated with an existing account, then a generic error message is displayed: "Unable to create account. Please try again or use a different email." (Anti-enumeration: do NOT reveal whether the email exists.) `FR-BILLING-10`
4. **AC-4: Password complexity** — Given a user attempts to register, when the password does not meet complexity requirements, then specific validation errors are displayed (e.g., "Must contain at least 1 uppercase letter"). `NFR-SEC-02`
5. **AC-5: Password match** — Given a user attempts to register, when the password and confirm password fields do not match, then an error message is displayed: "Passwords do not match". `NFR-SEC-02`
6. **AC-6: Rate limiting** — Given the registration endpoint, when more than 5 registration attempts are made from the same IP in 1 minute, then subsequent attempts are rate-limited with a 429 response. `NFR-SEC-03`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-BILLING-01 | AC #1 | @FR-BILLING-01 @story-2-2 |
| FR-BILLING-10 | AC #3 | @FR-BILLING-10 @story-2-2 |
| NFR-SEC-02 | AC #4, AC #5 | @NFR-SEC-02 @story-2-2 |
| NFR-SEC-03 | AC #6 | @NFR-SEC-03 @story-2-2 |
| NFR-SEC-09 | AC #2 | @NFR-SEC-09 @story-2-2 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Acceptance test scenarios created with dual tags (@FR-* and @story-2-2)
- [ ] Feature file: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- [ ] user_flows.feature updated (if story affects user flows)
- [ ] No regressions — existing tests still pass
- [ ] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

### Task 1: Add hCaptcha to Registration Page (AC: #2, FR: NFR-SEC-09)

- [ ] 1.1 **PREREQUISITE — Update CSP headers:** In `src/lib/api-security.ts` (line 19-20), add hCaptcha domains to Content-Security-Policy:
  - `script-src`: add `https://js.hcaptcha.com https://newassets.hcaptcha.com`
  - `frame-src`: add `https://newassets.hcaptcha.com`
  - `connect-src`: add `https://hcaptcha.com`
  - Without this, the hCaptcha widget will be silently blocked and registration will be permanently broken
- [ ] 1.2 Import `@hcaptcha/react-hcaptcha` in `app/(auth)/register/page.tsx` (already used in login page — follow same pattern)
- [ ] 1.3 Add hCaptcha widget below the confirm password field, before the submit button
- [ ] 1.4 Store captcha token in state; disable submit button until token is set
- [ ] 1.5 Reset captcha on form submission error
- [ ] 1.6 Use `NEXT_PUBLIC_HCAPTCHA_SITEKEY` env var (same as login page)
- [ ] 1.7 **Degraded mode:** Add `onError` handler to the HCaptcha widget. If hCaptcha fails to load (CDN down, CSP blocked, network error), set a `captchaUnavailable` state flag and allow form submission without captcha token. Log the degraded state for monitoring. Do NOT permanently block all registrations when a third-party service is down.

### Task 2: Verify Confirm Password Field (AC: #5, FR: NFR-SEC-02)

**ALREADY EXISTS** — The confirm password field, match validation, inline error, and submit blocking are already implemented in `app/(auth)/register/page.tsx` (lines 30, 372-396, 400). DO NOT re-add.

- [ ] 2.1 Verify confirm password field renders correctly with matching style
- [ ] 2.2 Verify inline error "Passwords do not match" displays when fields differ (line 394)
- [ ] 2.3 Verify submit button is disabled when passwords don't match (line 400: `disabled={isLoading || password !== confirmPassword}`)
- [ ] 2.4 Verify the show/hide toggle on password field also toggles confirm password visibility (currently shared via `showPassword` state — line 381)

### Task 3: Fix Post-Registration Redirect (AC: #1, FR: FR-BILLING-01)

**THREE locations must be updated** — missing any one leaves a broken redirect path:

- [ ] 3.1 In `app/(auth)/register/page.tsx` line 69: change `router.push('/settings')` → `router.push('/onboarding')` (email registration)
- [ ] 3.2 In `app/(auth)/register/page.tsx` line 94: change `router.push('/settings')` → `router.push('/onboarding')` (OAuth registration — `handleOAuthSignIn`)
- [ ] 3.3 In `src/__tests__/components/RegisterPage.test.tsx` line 125: change `expect(mockPush).toHaveBeenCalledWith('/settings')` → `expect(mockPush).toHaveBeenCalledWith('/onboarding')`
- [ ] 3.4 Verify the onboarding route exists at `app/onboarding/page.tsx`. If it doesn't exist yet (Story 2.5), create a stub page that displays "Onboarding coming soon" so the redirect doesn't 404.
- [ ] 3.5 Ensure the redirect only fires after successful session cookie creation

### Task 4: Add IP-Based Rate Limiting to Registration API (AC: #6, FR: NFR-SEC-03)

**IMPORTANT — Primary registration flow goes through `/api/auth/session`, NOT `/api/auth/register`.** Rate limiting must be added to BOTH endpoints to be effective. However, `/api/auth/session` is marked DO NOT TOUCH. Therefore, add rate limiting to `/api/auth/register/route.ts` and add a NEW rate-limiting middleware check in the client-side `handleSubmit` function that tracks attempts before calling Firebase SDK.

- [ ] 4.1 In `app/api/auth/register/route.ts`, add rate limiting at the top of the POST handler
- [ ] 4.2 Use the existing `getClientIp()` from `src/lib/api-security.ts` to extract the client IP
- [ ] 4.3 Implement an in-memory rate limiter (Map<string, { count, firstAttempt }>) — same pattern as `src/lib/captcha-tracker.ts`
- [ ] 4.4 Config: max 5 attempts per IP per 60-second window
- [ ] 4.5 Return 429 response using `RateLimitError` from `src/lib/errors.ts` when exceeded
- [ ] 4.6 Include `Retry-After` header in 429 response
- [ ] 4.7 **Serverless limitation:** In-memory Maps reset on every cold start (Vercel/Cloud Run). This provides basic protection during warm instances only. Document this limitation in a code comment. For production hardening, consider Upstash Redis or similar external store in a follow-up story.

### Task 5: Update Error Message Display (AC: #3, #4)

- [ ] 5.1 **Anti-enumeration fix:** In `app/(auth)/register/page.tsx` line 73-74, change the `auth/email-already-in-use` error handler from `"An account with this email already exists"` to `"Unable to create account. Please try again or use a different email."` — this prevents attackers from discovering which emails are registered
- [ ] 5.2 Verify password complexity validation shows specific messages per requirement (length, uppercase, number)
- [ ] 5.3 Ensure all error messages are displayed in the existing red alert box pattern (lines 192-197)
- [ ] 5.4 Verify the generic catch-all error at line 78 (`"Something went wrong. Please try again."`) is appropriate

### Task 6: Client-Side + Server-Side hCaptcha Verification (AC: #2, FR: NFR-SEC-09)

**ARCHITECTURE NOTE:** The primary registration flow is: Client → Firebase SDK `createUserWithEmailAndPassword()` → `/api/auth/session`. The client calls Firebase directly, so server-side captcha verification in `/api/auth/register` would NOT protect the primary flow. Instead:

- [ ] 6.1 **Client-side gate (PRIMARY):** In `handleSubmit()`, verify captcha token is present BEFORE calling `signUp()`. If no token and captcha isn't in degraded mode, block submission and show error.
- [ ] 6.2 **Server-side verification (SECONDARY):** In `app/api/auth/register/route.ts`, accept an optional `captchaToken` field in the request body. If present, verify using `verifyHCaptcha()` from `src/lib/captcha-tracker.ts`. If invalid, return 400.
- [ ] 6.3 **Degraded mode handling:** If captcha is unavailable (per Task 1.7), allow submission without token but log the event for monitoring.

### Task 7: Write Unit Tests

- [ ] 7.1 Add/update tests in `src/__tests__/api/register.test.ts`:
  - Test successful registration flow
  - Test rate limiting (6th attempt returns 429)
  - Test missing hCaptcha token returns 400
  - Test invalid hCaptcha token returns 400
  - Test duplicate email handling
- [ ] 7.2 Add/update component tests in `src/__tests__/components/RegisterPage.test.tsx`:
  - Test hCaptcha widget renders
  - Test confirm password mismatch shows error
  - Test password complexity errors display
  - Test form disabled until captcha completed
- [ ] 7.3 Maintain coverage thresholds: branches 96%, functions 98%, lines 99%

### Task 8: Write Acceptance Tests (AC: All)

- [ ] 8.1 Create/update feature file: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- [ ] 8.2 Write Gherkin scenarios for each AC with triple tags:
  - `@E-002-S-7 @story-2-2 @FR-BILLING-01` — Successful registration
  - `@E-002-S-8 @story-2-2 @NFR-SEC-09` — hCaptcha required
  - `@E-002-S-9 @story-2-2 @FR-BILLING-10` — Duplicate email error
  - `@E-002-S-10 @story-2-2 @NFR-SEC-02` — Password complexity errors
  - `@E-002-S-11 @story-2-2 @NFR-SEC-02` — Password mismatch error
  - `@E-002-S-12 @story-2-2 @NFR-SEC-03` — Rate limiting
- [ ] 8.3 Scenario numbering: continue from Story 2.1 (assume 2.1 uses @E-002-S-1 through @E-002-S-6)

### Task 9: Add Compensating Transaction for Orphaned Firebase Users (AC: #1)

If Firebase `createUserWithEmailAndPassword` succeeds but the subsequent Prisma upsert (via `/api/auth/session`) fails, the user has a Firebase account but no Prisma record. On retry, Firebase throws `auth/email-already-in-use` and the user is permanently locked out.

- [ ] 9.1 In `app/(auth)/register/page.tsx` `handleSubmit()`, wrap the post-Firebase-signup steps in a try/catch
- [ ] 9.2 If `exchangeTokenForSession` or the register API call fails, call `firebase.auth().currentUser?.delete()` to roll back the Firebase account
- [ ] 9.3 Display error: "Registration failed. Please try again." so the user can retry cleanly
- [ ] 9.4 Add unit test for the rollback scenario

### Task 10: Fix UserSettings Race Condition in ensure-user.ts

In `src/lib/firebase/ensure-user.ts` (lines 39-51), the pattern `findUnique + create` for UserSettings has a race condition: two concurrent requests can both see `null` and both try to create, causing a unique constraint violation.

- [ ] 10.1 Replace `findUnique` + conditional `create` with a single `prisma.userSettings.upsert()` call
- [ ] 10.2 Use `where: { userId: user.id }`, `create: { ... }`, `update: {}` (no-op update since we only want to ensure it exists)
- [ ] 10.3 Update any tests that mock the findUnique + create pattern

### Task 11: Add `import 'server-only'` to Firebase Admin Module

`src/lib/firebase/admin.ts` has a comment saying "ONLY be imported in server-side code" but no enforcement. If accidentally imported in a client component, it would leak the Firebase private key.

- [ ] 11.1 Add `import 'server-only';` as the first import in `src/lib/firebase/admin.ts`
- [ ] 11.2 Ensure the `server-only` package is in dependencies (check `package.json`)

## Dev Notes

### Existing Code — DO NOT Recreate

**Registration already works end-to-end with Firebase Auth.** This story ENHANCES the existing flow. Do not rewrite.

Key existing files:
| File | What It Does | Status |
|------|-------------|--------|
| `app/(auth)/register/page.tsx` | Registration form with email/password, OAuth buttons, password strength indicator, confirm password | **Exists — MODIFY** |
| `app/api/auth/register/route.ts` | Verifies Firebase ID token, upserts Prisma User, sends welcome email | **Exists — MODIFY** |
| `src/lib/api-security.ts` | Security headers (CSP), CORS, CSRF, `getClientIp()` | **Exists — MODIFY** (CSP update) |
| `src/lib/firebase/ensure-user.ts` | `ensurePrismaUser()` — upserts User + creates UserSettings | **Exists — MODIFY** (race condition fix) |
| `src/lib/firebase/admin.ts` | Firebase Admin SDK init (server-only) | **Exists — MODIFY** (add `import 'server-only'`) |
| `src/__tests__/components/RegisterPage.test.tsx` | Register page component tests | **Exists — MODIFY** (redirect assertion) |
| `src/lib/firebase/auth.ts` | `signUpWithEmail()` — Firebase createUserWithEmailAndPassword + session exchange | **Exists — DO NOT TOUCH** |
| `src/lib/firebase/session.ts` | `createSessionCookie()`, `verifySessionCookie()` | **Exists — DO NOT TOUCH** |
| `app/api/auth/session/route.ts` | Creates `__session` cookie from Firebase ID token | **Exists — DO NOT TOUCH** |
| `src/hooks/useFirebaseAuth.ts` | React hook exposing signUp, signIn, signOut | **Exists — DO NOT TOUCH** |

### Existing Registration Flow (Current Behavior)

1. User enters email + password on `/register`
2. Client calls `signUpWithEmail(email, password)` → Firebase creates account + sends verification email
3. `exchangeTokenForSession()` POSTs ID token to `/api/auth/session` → creates `__session` cookie (5-day, HttpOnly) **AND** upserts Prisma User via `ensurePrismaUser()`
4. Client optionally calls `/api/auth/register` to update user name or profile data (this is a SECONDARY endpoint, not the primary flow)
5. Client redirects to `/settings` ← **BUG: should redirect to /onboarding** (TWO locations: line 69 + line 94)

**CRITICAL:** The primary user creation happens in step 3 (`/api/auth/session`), NOT step 4 (`/api/auth/register`). Any server-side guards (rate limiting, captcha verification) placed only on `/api/auth/register` will NOT protect the primary registration flow.

### What This Story Changes

1. **Registration page** (`app/(auth)/register/page.tsx`):
   - Add hCaptcha widget with degraded mode (copy pattern from `app/(auth)/login/page.tsx`)
   - Confirm password field ALREADY EXISTS — verify only, do NOT re-add
   - Fix redirect: `/settings` → `/onboarding` in BOTH `handleSubmit` (line 69) AND `handleOAuthSignIn` (line 94)
   - Disable submit until captcha is completed (or captcha is in degraded mode)
   - Normalize error messages for anti-enumeration
   - Add compensating transaction to delete Firebase user if Prisma upsert fails

2. **Registration API** (`app/api/auth/register/route.ts`):
   - Add IP-based rate limiting (5 req/min per IP) with serverless limitation documented
   - Add optional server-side hCaptcha verification

3. **Security headers** (`src/lib/api-security.ts`):
   - Update CSP to whitelist hCaptcha domains (PREREQUISITE for Task 1)

4. **Shared helper** (`src/lib/firebase/ensure-user.ts`):
   - Fix UserSettings race condition: replace `findUnique + create` with `upsert`

5. **Firebase Admin** (`src/lib/firebase/admin.ts`):
   - Add `import 'server-only'` to prevent client-side import of secret keys

6. **Tests** (`src/__tests__/components/RegisterPage.test.tsx`):
   - Update redirect assertion from `/settings` to `/onboarding` (line 125)

### hCaptcha Pattern — Copy From Login Page

The login page at `app/(auth)/login/page.tsx` already implements hCaptcha with:
```typescript
import HCaptcha from '@hcaptcha/react-hcaptcha';

// State
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const captchaRef = useRef<HCaptcha>(null);

// Widget
<HCaptcha
  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ''}
  onVerify={(token) => setCaptchaToken(token)}
  onExpire={() => setCaptchaToken(null)}
  ref={captchaRef}
/>

// Reset on error
captchaRef.current?.resetCaptcha();
```

**Difference from login:** On login, captcha only appears after 3 failed attempts. On registration, captcha is ALWAYS required (per AC-2).

### Rate Limiting Pattern

Use the same in-memory Map pattern from `src/lib/captcha-tracker.ts`:
```typescript
const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute
```

Use `getClientIp(request)` from `src/lib/api-security.ts` for IP extraction.

Throw `RateLimitError` from `src/lib/errors.ts` (returns 429 automatically via `handleError()`).

**Serverless caveat:** In-memory Maps are cleared on cold start (Vercel/Cloud Run). This provides best-effort rate limiting during warm instances only. Add a code comment documenting this. For production hardening, a persistent store (Upstash Redis, Cloud Memorystore) would be needed — defer to a future story.

### Password Validation — Already Implemented

The registration page already has client-side password validation:
```typescript
const passwordChecks = {
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
};
```

Verify the visual feedback shows specific messages per the AC requirements. The password strength indicator (4-level bar: red → yellow → green) already exists.

### Error Message Mapping

Firebase errors to user-friendly messages (update in `register/page.tsx`):
| Firebase Error Code | User Message | Notes |
|---|---|---|
| `auth/email-already-in-use` | "Unable to create account. Please try again or use a different email." | **CHANGED** — anti-enumeration; do NOT reveal email exists |
| `auth/weak-password` | "Password is too weak. Please use a stronger password." | Already correct |
| `auth/invalid-email` | "Please enter a valid email address" | Already correct |
| `auth/operation-not-allowed` | "Registration is currently disabled" | Already correct |
| (all other errors) | "Something went wrong. Please try again." | Generic fallback — already correct |

### Architecture Compliance

- **Auth:** Firebase Auth for account creation (NOT NextAuth — NextAuth is deprecated in this codebase)
- **Database:** Prisma singleton from `@/lib/db` — do NOT instantiate new PrismaClient
- **Errors:** Use `handleError()` from `@/lib/errors` for all API error responses
- **API response shape:** `{ success: true, data: ... }` or RFC 7807 error
- **Styling:** Tailwind CSS 4 with existing design tokens (Arctic Blue #0EA5E9)
- **Icons:** lucide-react (Lock, Mail, Eye, EyeOff — already in use)
- **Validation:** Client-side regex + Firebase server-side validation
- **Session:** `__session` cookie, 5-day TTL, HttpOnly

### Test Requirements

- **Unit tests:** `src/__tests__/api/register.test.ts` and `src/__tests__/components/RegisterPage.test.tsx`
- **Acceptance tests:** `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- **Every scenario tagged:** `@E-002-S-<N> @story-2-2 @FR-<ID>`
- **Coverage thresholds:** branches 96%, functions 98%, lines 99%, statements 99%
- **Test framework:** Jest with `ts-jest`, `maxWorkers: 1`

### Project Structure Notes

- Registration page: `app/(auth)/register/page.tsx` — uses `(auth)` route group (no `/auth` prefix in URL)
- API routes: `app/api/auth/register/route.ts` — exports named POST handler
- Path alias: `@/*` → `./src/*`
- Client components must have `'use client'` directive
- Prisma generated client: `src/generated/prisma/` (DO NOT EDIT)

### Cross-Story Dependencies

- **Story 2.1 (Landing Page):** CTA buttons should link to `/register` — verify
- **Story 2.3 (OAuth Login):** OAuth buttons on registration page already exist; this story only handles email/password registration
- **Story 2.5 (Onboarding Wizard):** Post-registration redirect targets `/onboarding` — this wizard must exist for E2E to work. If it doesn't exist yet, mock or stub the route.

### Environment Variables Required

| Variable | Purpose | Already Configured |
|----------|---------|-------------------|
| `NEXT_PUBLIC_HCAPTCHA_SITEKEY` | Client-side hCaptcha widget | Yes (used in login) |
| `HCAPTCHA_SECRET_KEY` | Server-side hCaptcha verification | Yes (used in login) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK auth | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK auth | Yes |
| `DATABASE_URL` | Prisma connection string | Yes |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 2.2]
- [Source: _bmad-output/planning-artifacts/PRD.md — FR-BILLING, NFR-SEC]
- [Source: _bmad-output/planning-artifacts/architecture.md — Auth section]
- [Source: _bmad-output/planning-artifacts/ux-design.md — Flow 1: New User Onboarding]
- [Pattern Reference: app/(auth)/login/page.tsx — hCaptcha implementation]
- [Pattern Reference: src/lib/captcha-tracker.ts — Rate limiting pattern]
- [Pattern Reference: src/lib/api-security.ts — getClientIp()]

## Dev Agent Record

### Agent Model Used
<!-- Filled by dev agent -->

### Debug Log References
<!-- Filled by dev agent -->

### Completion Notes List
<!-- Filled by dev agent -->

### File List
<!-- Filled by dev agent -->
