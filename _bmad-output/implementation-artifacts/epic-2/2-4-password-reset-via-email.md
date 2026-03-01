# Story 2.4: Password Reset via Email

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a41e9daef377f007f0e2c6

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to reset my password via email,
so that I can recover access to my account if I forget my password.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. Given a user on the login page, when they click "Forgot Password" and enter their registered email, then a password reset email is sent via Resend with a time-limited token (1 hour expiry). `FR-BILLING-11`
2. Given the user receives a password reset email, when they click the reset link within 1 hour, then they are directed to a form to set a new password. `FR-BILLING-11`
3. Given the user is on the password reset form, when they enter a new password meeting complexity requirements and submit, then the password is updated and they are redirected to the login page with a success message. `FR-BILLING-11`
4. Given a password reset link, when the link is clicked after the 1-hour expiry, then an error message is displayed: "This reset link has expired. Please request a new one." `FR-BILLING-11`
5. Given a user enters an unregistered email for password reset, when the form is submitted, then the same success message is displayed (no information leakage about email existence). `FR-BILLING-11`
6. Given a user who resets their password, when the reset completes, then all existing active sessions across all devices are invalidated via `revokeRefreshTokens`. `FR-BILLING-11`
7. Given concurrent submission of the same reset token, when the second request arrives, then it returns 400 (atomic token consumption prevents double-use). `FR-BILLING-11`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-BILLING-11 | AC #1 — Reset email sent via Resend | @FR-BILLING-11 @story-2-4 |
| FR-BILLING-11 | AC #2 — Reset link opens form | @FR-BILLING-11 @story-2-4 |
| FR-BILLING-11 | AC #3 — Password updated on valid submission | @FR-BILLING-11 @story-2-4 |
| FR-BILLING-11 | AC #4 — Expired token rejected | @FR-BILLING-11 @story-2-4 |
| FR-BILLING-11 | AC #5 — No email enumeration | @FR-BILLING-11 @story-2-4 |
| FR-BILLING-11 | AC #6 — All sessions invalidated after reset | @FR-BILLING-11 @story-2-4 |
| FR-BILLING-11 | AC #7 — Atomic token consumption (no double-use) | @FR-BILLING-11 @story-2-4 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Acceptance test scenarios created with dual tags (@FR-BILLING-11 and @story-2-4)
- [ ] user_flows.feature updated (password reset is a core user flow)
- [ ] No regressions — existing tests still pass
- [ ] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [ ] Task 1: Add PasswordResetToken model to Prisma schema (AC: #1, FR: FR-BILLING-11)
  - [ ] 1.1 Add model with id, userId, token (unique), expiresAt, createdAt fields
  - [ ] 1.2 Add relation to User model with onDelete: Cascade
  - [ ] 1.3 Add index on userId and token
  - [ ] 1.4 Run `npx prisma migrate dev` to generate migration
- [ ] Task 2: Create `POST /api/auth/forgot-password` API route (AC: #1, #5, FR: FR-BILLING-11)
  - [ ] 2.1 Validate email input with Zod; normalize email to lowercase with `.toLowerCase().trim()`
  - [ ] 2.2 Look up user by email in Prisma (if not found, return same success response — AC #5)
  - [ ] 2.3 Generate cryptographically secure token (crypto.randomBytes)
  - [ ] 2.4 Wrap token deletion + creation in `prisma.$transaction()` for atomicity (AC #7)
  - [ ] 2.5 Delete any existing tokens for the same user, then create new token with 1-hour expiresAt — inside the transaction
  - [ ] 2.6 Construct resetUrl exclusively from `NEXT_PUBLIC_APP_URL` env var — NEVER from request Host/X-Forwarded-Host headers (prevents host header poisoning)
  - [ ] 2.7 Send email via email-service.ts `sendPasswordReset()` — check `result.success`; if false, log error via `captureError()` but still return 200 (no enumeration leak)
  - [ ] 2.8 DB-backed rate limit: count PasswordResetToken records created for this email in last 15 minutes via Prisma; reject with 429 if count >= 3. Do NOT rely on in-memory rate-limiter (serverless-incompatible)
  - [ ] 2.9 Add IP-based rate limit: add entry in `rate-limiter.ts` ENDPOINT_CONFIGS for `/api/auth/forgot-password`: `{ limit: 5, windowSeconds: 900 }` (5 per IP per 15 min)
  - [ ] 2.10 Opportunistic expired token cleanup: `prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })` — fire-and-forget, don't block the response
  - [ ] 2.11 Always return `{ success: true, message: "If an account exists..." }` regardless
- [ ] Task 3: Create `POST /api/auth/reset-password` API route (AC: #2, #3, #4, #6, #7, FR: FR-BILLING-11)
  - [ ] 3.1 Validate token + new password with Zod (`z.string().min(8).max(128)` — max length prevents hash DoS)
  - [ ] 3.2 Hash incoming token with SHA-256, look up by hash using `crypto.timingSafeEqual()` for constant-time comparison (prevents timing side-channel)
  - [ ] 3.3 If token found but expired, delete it immediately before returning 400 error (defense in depth)
  - [ ] 3.4 Atomic token consumption (AC #7): use `prisma.passwordResetToken.deleteMany({ where: { tokenHash } })` and check `count === 1` before proceeding — if count is 0, another request consumed the token first, return 400
  - [ ] 3.5 Validate new password complexity (min 8 chars, max 128 chars, 1 uppercase, 1 number)
  - [ ] 3.6 Update password in Firebase Auth via Admin SDK `adminAuth.updateUser(uid, { password })`
  - [ ] 3.7 Invalidate all sessions: call `adminAuth.revokeRefreshTokens(uid)` immediately after password update (AC #6)
  - [ ] 3.8 Delete all remaining tokens for this user (invalidate any other pending resets)
  - [ ] 3.9 Send "Your password was changed" notification email to user's registered email via `emailService` (security notification)
  - [ ] 3.10 Return success response
- [ ] Task 4: Refactor forgot-password page to use custom API (AC: #1, #5, FR: FR-BILLING-11)
  - [ ] 4.1 Change from Firebase client `resetPassword()` to POST `/api/auth/forgot-password`
  - [ ] 4.2 Keep existing UI styling and UX patterns
  - [ ] 4.3 Show same success message regardless of email existence
- [ ] Task 5: Create reset-password page at `app/(auth)/reset-password/page.tsx` (AC: #2, #3, #4, FR: FR-BILLING-11)
  - [ ] 5.1 Read token from URL query param `?token=...`
  - [ ] 5.2 Add `<meta name="referrer" content="no-referrer">` to prevent token leakage via Referer headers
  - [ ] 5.3 Build form: new password + confirm password fields
  - [ ] 5.4 Client-side password complexity validation with inline errors (min 8, max 128, 1 uppercase, 1 number)
  - [ ] 5.5 POST to `/api/auth/reset-password` on submit
  - [ ] 5.6 Handle expired token error with link to request new reset
  - [ ] 5.7 On success, redirect to `/login?reset=success` — display "Password updated, please sign in" message. DO NOT auto-sign-in (mobile webview cookie isolation breaks auto-sign-in)
  - [ ] 5.8 Match existing auth page styling (gradient background, glass-morphism card)
- [ ] Task 6: Write unit tests (AC: all, FR: FR-BILLING-11)
  - [ ] 6.1 Test forgot-password API route (valid email, unknown email, DB-backed rate limiting, IP rate limiting)
  - [ ] 6.2 Test reset-password API route (valid token, expired token, invalid token, weak password, over-length password, concurrent token use)
  - [ ] 6.3 Test token generation, hashing, and constant-time comparison
  - [ ] 6.4 Test email service integration (mock Resend); assert sendPasswordReset failure is logged but returns 200
  - [ ] 6.5 Test session revocation: assert `revokeRefreshTokens` is called after password update
  - [ ] 6.6 Test resetUrl construction: given known `NEXT_PUBLIC_APP_URL` and token, assert URL matches `{APP_URL}/reset-password?token={hex}`
  - [ ] 6.7 Test expired token is deleted from DB on lookup failure
  - [ ] 6.8 Test password-changed notification email is sent after successful reset
  - [ ] 6.9 Test OAuth-only user (no password provider): reset completes and adds password credential
- [ ] Task 7: Write acceptance test scenarios (AC: all, FR: FR-BILLING-11)
  - [ ] 7.1 Create scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
  - [ ] 7.2 Tag all scenarios with `@FR-BILLING-11 @story-2-4`
  - [ ] 7.3 Update `test/acceptance/features/user_flows.feature` with password reset flow

## Dev Notes

### Architecture Decision: Custom Flow vs Firebase Built-in

**Decision: Custom flow with Resend email + Firebase Admin password update.**

Why NOT Firebase's built-in `sendPasswordResetEmail()`:
- Firebase sends its own branded email (not Flipper.ai branded)
- Firebase uses its own hosted reset page (breaks UX consistency)
- No control over token expiry, email template, or reset form
- Can't track reset metrics or enforce custom password rules

Custom flow approach:
1. Frontend POSTs email to `/api/auth/forgot-password`
2. Backend generates token, stores in Prisma, sends via Resend
3. User clicks link → lands on `/reset-password?token=...`
4. Frontend POSTs new password + token to `/api/auth/reset-password`
5. Backend validates token, updates password via Firebase Admin SDK `auth().updateUser(uid, { password })`

### Existing Code to Reuse (DO NOT RECREATE)

| Component | Location | Reuse Strategy |
|-----------|----------|---------------|
| Email service | `src/lib/email-service.ts` | Call `sendPasswordReset()` — already has Resend integration |
| Email template | `src/lib/email-templates.ts` | Uses `passwordResetEmailHtml()` and `passwordResetEmailText()` — already built |
| Forgot password page | `app/(auth)/forgot-password/page.tsx` | Refactor to call custom API instead of Firebase client SDK |
| Login page link | `app/(auth)/login/page.tsx` | Already has "Forgot password?" link pointing to `/forgot-password` |
| Firebase Admin SDK | `src/lib/firebase/admin.ts` | Use `adminAuth.updateUser(uid, { password })` for password update |
| Error handling | `src/lib/errors.ts` | Use `ValidationError`, `NotFoundError`, `handleError()` |
| Prisma client | `src/lib/db.ts` | Use singleton for all DB operations |
| Auth middleware | `src/lib/firebase/auth-middleware.ts` | NOT needed — reset endpoints are unauthenticated |
| Session revocation | `app/api/auth/signout/route.ts` | Reference pattern for `adminAuth.revokeRefreshTokens(uid)` — reuse same approach |
| Rate limiter config | `src/lib/rate-limiter.ts` | Add ENDPOINT_CONFIGS entry for `/api/auth/forgot-password` (IP-based limiting) |
| Register page | `app/(auth)/register/page.tsx` | Reference for UI patterns (gradient, glass-morphism, error states) |

### Critical: What NOT to Do

- **DO NOT** use Firebase client SDK `sendPasswordResetEmail()` — use custom Resend flow
- **DO NOT** store passwords in Prisma User model — Firebase Auth is the source of truth for passwords
- **DO NOT** create a new email service — use existing `src/lib/email-service.ts`
- **DO NOT** create new email templates — use existing `src/lib/email-templates.ts`
- **DO NOT** create a new Prisma client instance — use `@/lib/db`
- **DO NOT** send different responses for known vs unknown emails (information leakage)
- **DO NOT** allow reuse of expired tokens — delete on expiry check failure
- **DO NOT** add NextAuth dependencies — auth is Firebase-based now (Epic 1.4 completed)
- **DO NOT** derive reset URL from request Host/X-Forwarded-Host headers (host header poisoning)
- **DO NOT** use `===` for token hash comparison — use `crypto.timingSafeEqual()`
- **DO NOT** rely on in-memory rate limiter (`rate-limiter.ts` Map) for email-based rate limiting — it resets on serverless cold starts. Use DB-backed counting
- **DO NOT** auto-sign-in the user after password reset — redirect to login page instead
- **DO NOT** include unsubscribe links in the password-changed notification email

### Token Security Requirements

- Generate token with `crypto.randomBytes(32).toString('hex')` (64 chars)
- Hash the token before storing in DB with `crypto.createHash('sha256')` — store hash only
- Compare hashed tokens using `crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(candidateHash))` — NOT `===` (prevents timing side-channel)
- Token expires after 1 hour (`expiresAt = now + 60 minutes`)
- Wrap delete-existing + create-new in `prisma.$transaction()` for atomicity
- Delete token after successful password reset via atomic consumption (deleteMany + check count)
- Delete expired token immediately on lookup failure (defense in depth)
- Rate limit: DB-backed, 3 per email per 15 minutes (count PasswordResetToken records via Prisma, NOT in-memory Map)
- IP rate limit: 5 per IP per 15 minutes via `rate-limiter.ts` ENDPOINT_CONFIGS entry
- Opportunistic cleanup: deleteMany expired tokens as fire-and-forget during forgot-password requests

### Reset URL Security

- Construct resetUrl EXCLUSIVELY from `NEXT_PUBLIC_APP_URL` environment variable
- NEVER derive URL from request Host, X-Forwarded-Host, X-Forwarded-Proto, or Forwarded headers (prevents host header poisoning / password reset poisoning)
- Validate `NEXT_PUBLIC_APP_URL` matches a known origin allow-list at startup
- Reset-password page MUST include `<meta name="referrer" content="no-referrer">` to prevent token leakage via Referer headers to third-party resources

### Session Invalidation After Reset

- After `adminAuth.updateUser(uid, { password })`, IMMEDIATELY call `adminAuth.revokeRefreshTokens(uid)` to invalidate all existing Firebase sessions across all devices
- This forces re-authentication — essential security contract for password reset
- Handle revocation failure non-fatally: log the error but don't fail the reset (password update already succeeded)
- The mechanism already exists in `app/api/auth/signout/route.ts` — follow the same pattern

### Password Complexity Requirements

Match existing registration rules (from `app/(auth)/register/page.tsx`):
- Minimum 8 characters
- Maximum 128 characters (prevents hash DoS with extremely long passwords)
- At least 1 uppercase letter
- At least 1 number

### OAuth-Only Account Handling

- Firebase Admin `updateUser()` succeeds for OAuth-only users (Google/GitHub/Facebook) and adds a password credential
- This is intentional Firebase behavior — allows OAuth users to add password sign-in as a second method
- The forgot-password flow returns the same success message regardless (no enumeration) and sends the reset email
- No special handling required in code, but document this behavior for the team

### Post-Reset UX

- After successful password reset, redirect to `/login?reset=success` — DO NOT auto-sign-in on the reset page
- Mobile webview cookie isolation (Gmail app, Outlook app) breaks auto-sign-in because the webview doesn't share cookies with the main browser
- The login page should detect `?reset=success` and display "Password updated — please sign in with your new password"

### Password-Changed Notification Email

- After successful reset, send a "Your password was changed" notification email to the user's registered address
- Use existing `emailService` infrastructure
- Include timestamp of change in the email
- This email MUST NOT include an unsubscribe link (it's a security notification, not marketing)
- If the existing email template `baseLayout()` includes unsubscribe links, use a variant without them or create a minimal security-email layout

### Test Requirements

- Acceptance test feature files: `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
- Every scenario tagged: `@FR-BILLING-11 @story-2-4`
- Update `test/acceptance/features/user_flows.feature` with password reset flow
- Unit test files:
  - `src/__tests__/api/forgot-password.test.ts`
  - `src/__tests__/api/reset-password.test.ts`

### Project Structure Notes

**New files to create:**
```
prisma/schema.prisma              — Add PasswordResetToken model
app/api/auth/forgot-password/route.ts  — Forgot password API
app/api/auth/reset-password/route.ts   — Reset password API
app/(auth)/reset-password/page.tsx     — Reset password form page
src/__tests__/api/forgot-password.test.ts  — Unit tests
src/__tests__/api/reset-password.test.ts   — Unit tests
```

**Existing files to modify:**
```
app/(auth)/forgot-password/page.tsx    — Change from Firebase SDK to custom API call
```

**Path aliases:** `@/*` maps to `./src/*` — use for all src imports.

**API route pattern:** Export named HTTP method handlers (POST). Use `handleError(error)` for error responses. Return `{ success: true, data: ... }` for success.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 2.4, lines 958-989]
- [Source: _bmad-output/planning-artifacts/epics.md — FR-BILLING-11, line 248]
- [Architecture: _bmad-output/planning-artifacts/architecture.md — Auth section]
- [UX: _bmad-output/planning-artifacts/ux-design.md — Flow 2: Returning User Login]
- [Existing: src/lib/email-service.ts — sendPasswordReset() method]
- [Existing: src/lib/email-templates.ts — passwordResetEmailHtml/Text()]
- [Existing: app/(auth)/forgot-password/page.tsx — Current Firebase-based implementation]
- [Existing: src/lib/firebase/admin.ts — Firebase Admin SDK for password update]

## Dev Agent Record

### Agent Model Used
(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List
