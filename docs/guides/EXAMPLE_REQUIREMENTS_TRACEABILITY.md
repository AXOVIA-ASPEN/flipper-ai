---
file: docs/features/requirements-traceability.md
title: "Requirements Traceability Matrix"
author: Stephen Boyett
company: Real Random
date: 2026-02-26
brief: "This document maps all 151 requirements from the PRD to their implementing features and BDD scenarios, ensuring complete coverage."
version: 2.2
---

# Requirements Traceability Matrix

This document maps all 151 requirements from the PRD (132 Phase 1 + 19 Phase 2) to their implementing features and BDD scenarios, ensuring complete coverage.

## BDD Coverage Summary (Phase 1 Only)

| Category | Phase 1 Reqs | With BDD Scenarios | No BDD Scenarios | Coverage |
|----------|-------------|-------------------|-----------------|----------|
| AUTH | 29 | 29 | 0 | 100% |
| GEO | 2 | 2 | 0 | 100% |
| CRED | 9 | 9 | 0 | 100% |
| DASH | 20 | 20 | 0 | 100% |
| ADMIN | 12 | 12 | 0 | 100% |
| EMAIL | 9 | 9 | 0 | 100% |
| SEC | 14 | 14 | 0 | 100% |
| PERF | 2 | 2 | 0 | 100% |
| COMP | 4 | 4 | 0 | 100% |
| UI | 8 | 8 | 0 | 100% |
| ARCH | 6 | 6 | 0 | 100% |
| OBS | 5 | 5 | 0 | 100% |
| INFRA | 7 | 7 | 0 | 100% |
| EMAILINFRA | 5 | 5 | 0 | 100% |
| **Total** | **132** | **132** | **0** | **100%** |

> **Note**: All 132 Phase 1 requirements now have BDD scenario coverage. The previously uncovered 6 requirements were resolved on 2026-02-26: EMAIL-08 already had F-003-S60..S71 (traceability corrected); EMAIL-09, SEC-12, SEC-13, SEC-15, ARCH-06 added via F-008-S37..S45 and F-009-S21..S26. 19 Phase 2 requirements are tracked in the [Phase 2 Backlog](#phase-2-backlog-excluded-from-phase-1).

## Summary

| Category | Total | Phase 1 | Phase 2 | Implementing Features |
|----------|-------|---------|---------|----------------------|
| AUTH | 32 | 29 | 3 | F-001, F-002, F-003, F-004, F-008 |
| GEO | 4 | 2 | 2 | F-001, F-007 |
| CRED | 9 | 9 | — | F-001, F-002, F-005, F-008 |
| DASH | 23 | 20 | 3 | F-001, F-003, F-004, F-005, F-008 |
| ADMIN | 17 | 12 | 5 | F-001, F-006, F-008 |
| EMAIL | 9 | 9 | — | F-003, F-006 |
| GROWTH | 3 | — | 3 | — |
| SEC | 17 | 14 | 3 | F-001, F-002, F-003, F-005, F-009 |
| PERF | 2 | 2 | — | F-004, F-006, F-008, F-009 |
| COMP | 4 | 4 | — | F-001, F-002, F-007 |
| UI | 8 | 8 | — | F-001 |
| ARCH | 6 | 6 | — | F-001 |
| OBS | 5 | 5 | — | F-002, F-003, F-005, F-006, F-009 |
| INFRA | 7 | 7 | — | F-009 |
| EMAILINFRA | 5 | 5 | — | F-003 |
| **Total** | **151** | **132** | **19** | |

---

## Authentication Requirements (AUTH)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| AUTH-01 | User can register with email, password, and company info | F-001 (UI), F-002 (backend) | 1.4, 2.2 | Must Have | F-001-S19..S23, F-001-S25, F-001-S26, F-001-S43, F-002-S1, F-008-S1, F-008-S13, F-008-S14 |
| AUTH-02 | Password entered twice, must match and meet requirements | F-001 | 1.4 | Must Have | F-001-S24, F-002-S2, F-008-S19 |
| AUTH-03 | Non-matching/invalid passwords rejected with error | F-001 | 1.4 | Must Have | F-002-S3, F-002-S4, F-008-S2, F-008-S3, F-008-S15, F-008-S16, F-008-S17 |
| AUTH-04 | User must accept license agreement to complete registration | F-001 | 1.5, 2.2 | Must Have | F-001-S43, F-001-S79..S83, F-002-S5 |
| AUTH-05 | License rejection ends registration process | F-001 | 1.5 | Must Have | F-001-S44, F-002-S6, F-008-S18 |
| AUTH-06 | No user information retained if license rejected | F-001, F-002 | 1.5 | Must Have | F-002-S7, F-008-S4, F-008-S20, F-008-S26 |
| AUTH-07 | Can re-register with same email after license rejection | F-001, F-002 | 1.5 | Must Have | F-002-S8 |
| AUTH-08 | Rate limiting applied to user registration | F-002 | 2.9 | Must Have | F-002-S12, F-002-S107 |
| AUTH-09 | Email format and password strength validation | F-001 (client), F-002 (server) | 1.4, 2.2 | Must Have | F-001-S54, F-001-S55, F-002-S14, F-002-S15, F-002-S40, F-002-S41, F-004-S25 |
| AUTH-10 | System sends verification email upon registration | F-002, F-003 | 3.2 | Must Have | F-002-S16, F-003-S1..S4, F-003-S34 |
| AUTH-11 | Verify email via token-based link | F-002, F-003 | 2.3, 3.2 | Must Have | F-002-S17..S19, F-002-S52..S61, F-003-S35..S37, UF-S7 (`@flow-7`) |
| AUTH-12 | User can log in with email/password | F-001 (UI), F-002 (backend) | 1.6, 2.5 | Must Have | F-001-S27, F-001-S28, F-001-S45, F-002-S20..S23, F-002-S67..S75 |
| AUTH-13 | User can log out | F-001 (UI), F-002 (backend) | 2.6 | Must Have | F-001-S106, F-001-S107, F-001-S116..S118, F-002-S24, F-002-S81..S86, F-002-S91, UF-S11 (`@flow-13`) |
| AUTH-14 | User can request password reset via email | F-001 (UI), F-002, F-003 | 1.6, 2.7, 3.3 | Must Have | F-002-S25, F-002-S92..S100, F-003-S32, F-003-S33, F-003-S44, F-003-S45 |
| AUTH-15 | Login page contains "forgot password" button | F-001 | 1.6 | Must Have | F-002-S26 |
| AUTH-16 | User receives email with secure reset link | F-002, F-003 | 3.3 | Must Have | F-002-S27, F-003-S5..S8, F-003-S38..S42, F-003-S46 |
| AUTH-17 | User taken to new password page after clicking reset link | F-001 | 1.6 | Must Have | F-002-S28 |
| AUTH-18 | User can reset password with valid password | F-001 (UI), F-002 (backend) | 1.6, 2.8, 3.3 | Must Have | F-002-S29, F-002-S101, F-002-S102, F-002-S105, F-002-S106, F-003-S46a, F-003-S46b, F-003-S47, F-003-S48, F-003-S55, F-003-S56 |
| AUTH-19 | Invalid passwords rejected with requirements message | F-001 | 1.6, 2.8, 3.3 | Must Have | F-002-S30, F-002-S103, F-003-S49..S53 |
| AUTH-20 | Non-matching passwords rejected with error message | F-001 | 1.6, 2.8, 3.3 | Must Have | F-002-S31, F-002-S104, F-003-S54 |
| AUTH-21 | Account create date stored in user DB | F-002 | 2.1 | Must Have | F-002-S32 + Django unit tests (model auto date_joined) |
| AUTH-22 | Trial end date stored in user DB | F-002 | 2.1 | Must Have | F-002-S33 + Django unit tests (UsagePeriodRecord.period_end auto-set 30 days from creation) |
| AUTH-23 | Account auto-marked expired when trial end date reached | F-002 | 2.11 | Must Have | F-002-S44, F-002-S119, F-002-S120, F-002-S121, F-002-S123 |
| AUTH-24 | Expired trial users see messaging about expiration + upgrade | F-001 (UI), F-004 (backend) | 1.14 | Must Have | F-001-S74, F-001-S110..S112, UF-S8 (`@flow-8`) |
| AUTH-25 | Expired trial users cannot access API (blocked) | F-002 | 1.14, 2.11 | Must Have | F-002-S45, F-002-S122 |
| AUTH-26 | User can optionally provide phone number | F-001 (UI), F-002 (backend) | 1.4, 2.1 | Should Have | F-001-S126, F-001-S128, F-001-S129, F-002-S46, F-002-S47 |
| AUTH-27 | User can optionally provide company type (includes 'Other' with free-text) | F-001 (UI), F-002 (backend) | 1.4, 1.17, 2.1 | Should Have | F-001-S127, F-001-S128, F-001-S129, F-001-S173..S177, F-001-S182, F-001-S183, F-002-S48, F-002-S49 |
| AUTH-28 | Registration form includes country dropdown | F-001 (UI), F-002 (backend) | 1.17, 2.1 | Must Have | F-001-S167..S172, F-001-S178..S181 |
| AUTH-29 | Disabled users see suspension reason when logging in | F-001 (UI) | 1.18 | Must Have | F-001-S184..S189 |
| AUTH-30 | User can log in / register via GitHub OAuth (social auth) | — | — | Phase 2 | — |
| AUTH-31 | User can log in / register via Google OAuth (social auth) | — | — | Phase 2 | — |
| AUTH-32 | Registration form includes "Generate secure password" button using Real Random entropy API | — | — | Phase 2 | — |

---

## Geo-Restriction Requirements (GEO)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| GEO-01 | System blocks registration from outside North America | F-007, F-010 | 7.1, 10.3 | Must Have | F-007-S1..S7, F-007-S17..S22, F-007-S23..S26, F-007-S29, F-010-S3, F-010-S4 |
| GEO-02 | Blocked users see appropriate error message | F-001 (UI), F-007 (WAF), F-010 | 1.3, 10.3 | Must Have | F-007-S8..S14, F-007-S25, F-010-S5 |
| GEO-03 | Registration includes phone number with country code dropdown; geo-blocked countries excluded | — | — | Phase 2 | — |
| GEO-04 | Phone number verified via Twilio SMS to strengthen geo-restriction | — | — | Phase 2 | — |

---

## Credential Management Requirements (CRED)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| CRED-01 | System generates API credentials upon email verification | F-002 (trigger), F-005 (generation) | 5.1 | Must Have | F-001-S84, F-001-S85, F-008-S24 |
| CRED-02 | Credentials displayed once in modal after verification | F-001 (UI) | 1.9 | Must Have | F-001-S46, F-001-S86, F-001-S88..S93 |
| CRED-03 | Modal includes warning about one-time display | F-001 (UI) | 1.9 | Must Have | F-001-S87 |
| CRED-04 | Client secret never displayed again after modal dismissed | F-001 (UI), F-005 (backend) | 1.9, 5.2 | Must Have | F-001-S100..S102, F-008-S5, F-008-S12, F-008-S25 |
| CRED-05 | Client ID (non-secret) remains visible on dashboard | F-001 (UI), F-004 (backend) | 1.8, 5.2 | Must Have | F-001-S94..S98, F-004-S6 |
| CRED-06 | Credentials grant 30-day free trial access | F-002 | 5.1 | Must Have | F-001-S108, F-004-S12 |
| CRED-07 | User can regenerate credentials (revokes old, issues new) | F-001 (UI), F-005 (backend) | 1.9, 5.3 | Must Have | F-001-S109, F-005-S1..S3, F-005-S11..S13 |
| CRED-08 | Regeneration flow displays new secret in one-time modal | F-001 (UI), F-005 (backend) | 1.9, 5.3 | Must Have | F-001-S99, F-005-S4, F-005-S5, F-005-S13 |
| CRED-09 | System warns user before regeneration that old key revoked | F-001 (UI) | 1.9 | Must Have | F-005-S6..S8, F-005-S13 |

---

## Dashboard Requirements (DASH)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| DASH-01 | User can view account info (Name, Email, License, Company) | F-001 (UI), F-004 (backend) | 1.8, 4.1 | Must Have | F-004-S1 (UI), F-004-S48..S53 (backend GET /api/user/profile/ — Story 4.1). DASH-01: was 0 backend scenarios, now 6. F-008-S21, F-008-S23, F-008-S27 |
| DASH-02 | User can edit account info (Name, Company; Email needs re-verify) | F-001 (UI), F-004 (backend) | 4.2 | Must Have | F-004-S2..S4, F-004-S28 (UI). F-004-S54..S61 (backend PATCH API, AC-1–AC-10). Story 4.2 — PATCH /api/user/profile/ + 14 unit tests, UF-S9 (`@flow-11`) |
| DASH-03 | User can view Client ID (non-secret identifier) | F-001 (UI), F-004 (backend) | 1.8 | Must Have | F-004-S5, F-004-S7 |
| DASH-04 | User can view API usage stats | F-001 (UI), F-004 (backend) | 1.8, 1.19, 4.3 | Must Have | F-001-S70..S73, F-001-S190..S194, F-004-S8..S10. Story 4.3 — GET /api/user/usage + total-entropy + entropy-used + 13 unit tests. F-008-S11, F-008-S22, UF-S17 (`@flow-21`) |
| DASH-05 | User can view trial status (days remaining, expiration) | F-001 (UI), F-004 (backend) | 1.8, 4.4 | Must Have | F-001-S74, F-001-S110..S112, F-004-S11, F-004-S13, F-004-S14, F-004-S20, F-004-S44, F-004-S45, F-004-S46 (Story 4.4 backend integration), F-003-S80 |
| DASH-06 | User can regenerate API credentials | F-001 (UI), F-005 (backend) | 1.9 | Must Have | F-004-S15 |
| DASH-07 | User can update account settings (password, profile) | F-001 (UI), F-004 (backend) | 4.5 | Should Have | F-004-S16, F-004-S17, UF-S10 (`@flow-12`) |
| DASH-08 | Automated emails about trial ending | F-003 | — | Pending Decision | F-003-S11, F-003-S12 |
| DASH-09 | Automated emails about Phase 2 upgrades | F-003 | — | Pending Decision | F-003-S13 |
| DASH-10 | User can opt in/out of automated email service | F-001 (UI), F-004 (backend) | — | Stretch | F-004-S18, F-004-S19 |
| DASH-11 | Skeleton loading state with shimmer animation | F-001 | 1.8 | Must Have | F-001-S56..S59 |
| DASH-12 | Empty state for new users with no usage | F-001 | 1.8 | Must Have | F-001-S70, F-001-S77, F-001-S113..S115, UF-S12 (`@flow-15`) |
| DASH-13 | Error state with retry button if API fails | F-001 | 1.8 | Must Have | F-001-S76 |
| DASH-14 | Success toast notification when profile updated | F-001 (UI), F-004 (backend) | 4.2 | Should Have | F-004-S28 |
| DASH-15 | User can access link to API documentation | F-001 | 1.11, 1.19 | Must Have | F-001-S113, F-001-S114, F-001-S155..S158, F-001-S195, F-001-S196 |
| DASH-16 | User can access support contact info | F-001 | 1.11 | Must Have | F-001-S157, F-001-S158, UF-S14 (`@flow-17`) |
| DASH-17 | User can delete their account | F-001 (UI), F-004 (backend) | 1.12, 4.6 | Should Have | F-001-S159, F-001-S163, F-001-S165, F-001-S166, F-004-S30, F-004-S31, UF-S13 (`@flow-16`) |
| DASH-18 | Account deletion requires confirmation and data loss warning | F-001 (UI) | 1.12 | Should Have | F-001-S160..S162, F-001-S164, F-004-S30 |
| DASH-19 | Deleted accounts have all credentials immediately revoked | F-005 (backend) | 1.12, 4.6 | Should Have | F-001-S163, F-004-S32 |
| DASH-20 | Dashboard shows button to request more entropy when usage exceeds 75% | F-001 | 1.21 | Stretch | F-001-S197..S202 |
| DASH-21 | Dashboard includes FAQ section under Resources & Support | — | — | Phase 2 | — |
| DASH-22 | Dashboard provides comprehensive Quick Start Guide for new developers | — | — | Phase 2 | — |
| DASH-23 | Dashboard provides sample code snippets demonstrating API usage | — | — | Phase 2 | — |

---

## Admin Dashboard Requirements (ADMIN)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| ADMIN-01 | Admin can view list of all users | F-001 (UI), F-006 (backend) | 1.10, 6.1, 6.4 | Must Have | F-001-S47, F-001-S51, F-006-S1..S5, F-006-S15, F-006-S20, F-006-S21, F-008-S6, F-008-S28, F-008-S30, F-008-S34, F-008-S35 |
| ADMIN-02 | Admin can view individual user's usage and limits | F-001 (UI), F-006 (backend) | 1.10, 6.3 | Must Have | F-001-S50, F-006-S6, F-006-S7, F-006-S13, F-006-S14 |
| ADMIN-03 | Admin can view user type and account info | F-001 (UI), F-006 (backend) | 1.10, 6.3 | Must Have | F-001-S50, F-006-S8, F-006-S9, F-006-S12 |
| ADMIN-04 | Admin can view user's trial status | F-001 (UI), F-006 (backend) | 1.10, 6.3 | Must Have | F-006-S10, F-006-S11 |
| ADMIN-05 | Admin can view user's current membership plan | F-006 | — | Phase 2 | — |
| ADMIN-06 | Admin can view user's current payment status | F-006 | — | Phase 2 | — |
| ADMIN-07 | Admin can search and filter users by name, email, company, status | F-001 (UI), F-006 (backend) | 1.10, 6.2, 6.7 | Must Have | F-001-S48, F-001-S49, F-006-S3, F-006-S5, F-008-S29 |
| ADMIN-08 | Admin can reset/regenerate a user's API credentials | F-006 | 1.13, 6.5 | Must Have | F-006-S31..S34, F-006-S41, F-008-S33, UF-S16 (`@flow-20`) |
| ADMIN-09 | Admin can disable/suspend a user account with required reason | F-006 | 1.13, 6.6 | Must Have | F-006-S26..S28, F-008-S31, F-008-S36, UF-S15 (`@flow-19`) |
| ADMIN-10 | Admin can re-enable a previously disabled account | F-006 | 1.13, 6.6 | Must Have | F-006-S29, F-006-S30, F-008-S32, UF-S15 (`@flow-19`) |
| ADMIN-11 | Disabled accounts have API access immediately revoked, user notified via email | F-006 | 1.13, 6.6 | Must Have | F-006-S27, F-006-S28, F-006-S41, F-006-S43 |
| ADMIN-12 | Admin can modify a user's status (active, suspended) | F-001 (UI), F-006 (backend) | 6.8 | Must Have | F-006-S35, F-006-S36 |
| ADMIN-13 | Admin can modify a user's total entropy limit | F-001 (UI), F-006 (backend) | 1.13, 6.9 | Must Have | F-006-S37, F-006-S38, UF-S18 (`@flow-22`) |
| ADMIN-14 | Admin can set user's trial end date via date picker in User Detail Modal | F-001 (UI), F-006 (backend) | 1.20, 6.10 | Must Have | F-006-S22..S25, F-006-S42 |
| ADMIN-15 | Admin can send announcements via email to all or select group of users | — | — | Phase 2 | — |
| ADMIN-16 | Admin can create dashboard banners for user notifications and maintenance | — | — | Phase 2 | — |
| ADMIN-17 | Admin can view and manage credential revocation appeals from users | — | — | Phase 2 | — |

> **Note**: F-006-S22..S25 (admin set trial end date) now map to ADMIN-14. F-006-S42 (no-change state) also maps to ADMIN-14.

### Phase 2 (Excluded)
- ADMIN-05: Admin can view user's current membership plan
- ADMIN-06: Admin can view user's current payment status
- ADMIN-15: Admin can send email announcements to user groups
- ADMIN-16: Admin can create dashboard banners for notifications
- ADMIN-17: Admin can manage credential revocation appeals

---

## Email Communications Requirements (EMAIL)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| EMAIL-01 | System sends email verification upon registration | F-003 | 3.2 | Must Have | F-002-S16, F-003-S1..S4, F-003-S34..S37 |
| EMAIL-02 | System sends password reset emails with secure token links | F-003 | 3.3 | Must Have | F-003-S5..S8, F-003-S38..S43 |
| EMAIL-03 | Email templates are professionally branded and consistent | F-003 | 3.7 | Must Have | F-003-S14..S16 |
| EMAIL-04 | All transactional emails include unsubscribe option | F-003 | 3.8 | Should Have | F-003-S17 |
| EMAIL-05 | Trial expiration reminder emails (7, 3, 1 day before) | F-003 | 3.5 | Should Have | F-003-S18..S20 |
| EMAIL-06 | Trial expired notification email | F-003 | 3.6 | Should Have | F-003-S21 |
| EMAIL-07 | Automated suspension email with reason and appeal instructions when admin disables account | F-003, F-006 | 3.4, 6.6 | Must Have | F-006-S27 (`@wip`) |
| EMAIL-08 | Automated email when user reaches 75% of entropy allowance | F-003 | 3.9, 3.11 | Stretch | F-003-S60..S71 |
| EMAIL-09 | Email verification codes generated using Real Random entropy API, with branded mention | F-003, F-008 | 3.10 | Stretch | F-008-S37, F-008-S38 |
| EMAIL-10 | Operational email sender routing (suspension + usage warning via dedicated support address) | F-010 | 10.2 | Should Have | F-010-S1, F-010-S2 |

---

## Growth & Monetization Requirements (GROWTH)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| GROWTH-01 | Referral program with bonus incentives for users who refer new developers | — | — | Phase 2 | — |
| GROWTH-02 | Bonus rewards for developers who complete API integrations | — | — | Phase 2 | — |
| GROWTH-03 | Pricing plans and subscription tiers matching industry standards | — | — | Phase 2 | — |

---

## Security Requirements (SEC)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| SEC-01 | Passwords stored using secure hashing (Argon2) | F-002 | 2.2 | Must Have | F-002-S34 |
| SEC-02 | All traffic over HTTPS | F-009 | 2.10, 9.1 | Must Have | F-002-S111 (unit: HSTS), F-009-S1..S4, F-009-S20 |
| SEC-03 | Rate limiting on authentication endpoints | F-002 | 2.9, 8.4 | Must Have | F-002-S13, F-002-S107 (@story-8-4, @security_integration), F-002-S108 (@story-8-4, @security_integration), F-002-S109 (@story-8-4, @security_integration), F-002-S110 (@story-8-4, @security_integration), F-002-S124 (@story-8-4, resend), F-002-S125 (@story-8-4, verify), UF-S21 (@story-8-4, @security_integration) |
| SEC-04 | Secure session management (JWT HttpOnly cookies) | F-002 | 2.6, 8.4 | Must Have | F-001-S119..S123, F-002-S35, F-002-S82..S83, F-002-S87..S90, F-002-S127 (@story-8-4, expiry verification), UF-S19 (@story-8-4, @security_integration, session timeout) |
| SEC-05 | Input validation and sanitization | F-001 (client), F-002 (server) | 8.4 | Must Have | F-002-S36 (frontend DOM), F-002-S126 (@story-8-4, backend API rejection) |
| SEC-06 | CSRF protection | F-002 | 2.10 | Must Have | F-002-S37, F-002-S115 |
| SEC-07 | API credentials never sent via email | F-003 | 3.2 | Must Have | F-001-S103, F-003-S9, F-003-S10, F-003-S34 |
| SEC-08 | Client secret displayed only once, never stored retrievably | F-001 (UI), F-005 (backend) | 1.9, 5.1 | Must Have | F-001-S104, F-001-S105 |
| SEC-09 | Old client secret immediately revoked on regeneration | F-005 | 5.3 | Must Have | F-005-S9, F-005-S10 |
| SEC-10 | Deleted user secrets must be immediately revoked | F-005 | 4.6, 5.4 | Phase 2 | — |
| SEC-11 | Secrets, tokens, API keys never logged in application logs | F-002, F-005 | 2.12, 5.4 | Must Have | F-002-S50, F-002-S51, F-002-S116, F-002-S117, F-002-S118 |
| SEC-12 | Sensitive data encrypted at rest (database encryption) | F-008, F-009 | 9.3 | Must Have | F-008-S39, F-008-S40, F-009-S21, F-009-S22 |
| SEC-13 | No secrets/credentials stored in codebase | F-008, F-009 | 9.5 | Must Have | F-008-S41, F-008-S42, F-009-S23, F-009-S24 |
| SEC-14 | Secure HTTP headers (CSP, HSTS, X-Content-Type-Options) | F-002 | 2.10 | Must Have | F-002-S111, F-002-S112, F-002-S113, F-002-S114, F-009-S3, F-009-S20 |
| SEC-15 | Least-privilege access to AWS resources | F-008, F-009 | 9.7 | Must Have | F-008-S43, F-009-S25, F-009-S26 |
| SEC-16 | Multi-factor authentication (MFA) support | — | — | Phase 2 | — |
| SEC-17 | System checks passwords against HaveIBeenPwned breach database | — | — | Phase 2 | — |

### Phase 2 / Deferred
- SEC-10: Deleted user secrets must be immediately revoked
- SEC-16: Multi-factor authentication (MFA) support (Nice to Have)
- SEC-17: HaveIBeenPwned breach database password checking

---

## Performance Requirements (PERF)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| PERF-01 | Registration flow completes in < 5 seconds | F-008 | 8.3 | Must Have | F-009-S5..S8 |
| PERF-02 | Dashboard loads in < 3 seconds | F-008 | 8.3 | Must Have | F-004-S23, F-006-S18, F-009-S9..S12 |

---

## Compliance Requirements (COMP)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| COMP-01 | License agreement acceptance logged with timestamp per user | F-002 | 1.5, 2.4 | Must Have | F-002-S9, F-002-S62..S66 |
| COMP-02 | User has clear access to review the License Agreement | F-001 | 1.5 | Must Have | F-002-S10 |
| COMP-03 | Geo-restriction enforced at registration | F-007, F-010 | 7.1, 10.3 | Must Have | F-007-S15, F-007-S16, F-007-S23, F-010-S3 |
| COMP-04 | Basic privacy policy link available | F-001 | 1.3 | Must Have | F-002-S11 |

---

## UI Design Requirements (UI)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| UI-01 | Dashboard is easy to understand and navigate | F-001 | 1.3, 1.8, 1.10 | Must Have | F-001-S1..S5, F-001-S75, F-004-S21, F-006-S16 |
| UI-02 | Modern interface matching realrandom.co color scheme | F-001 | 1.1, 1.3 | Must Have | F-001-S6..S12, F-002-S42, F-004-S26, F-006-S19 |
| UI-03 | Interactive buttons/features | F-001 | 1.2 | Must Have | F-001-S13..S18, F-001-S53, F-001-S124, F-001-S125, F-002-S43, F-004-S27 |
| UI-04 | Dashboards kept to single page for Phase 1 | F-001 | 1.8, 1.10 | Must Have | F-001-S32..S38, F-004-S22, F-006-S17 |
| UI-05 | All interactive elements have visible keyboard focus indicators | F-001 | 1.2 | Must Have | F-001-S39..S42, F-001-S52, F-001-S60..S63, F-002-S38, F-002-S39, F-004-S24 |
| UI-06 | All icon buttons/non-text controls have ARIA labels | F-001 | 1.2 | Must Have | F-001-S64..S67 |
| UI-07 | Color contrast meets WCAG AA standards (4.5:1 min) | F-001 | 1.2 | Must Have | F-001-S68, F-001-S69 |
| UI-08 | Loading states display skeleton screens with shimmer animation | F-001 | 1.2, 1.8 | Must Have | F-001-S56..S59, F-001-S78 |

---

## Architecture Requirements (ARCH)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| ARCH-01 | Mock data toggle controlled by single config variable | F-001 | 1.7 | Must Have | F-001-S29..S31, F-001-S134..S140 |
| ARCH-02 | Mock and real API clients implement identical interface | F-001 | 1.7 | Must Have | F-001-S130 |
| ARCH-03 | Mock data layer removable without refactoring app code | F-001 | 1.7 | Must Have | F-001-S131 |
| ARCH-04 | USE_MOCK_DATA=true for dev and testing environments | F-001 | 1.7 | Must Have | F-001-S132 |
| ARCH-05 | USE_MOCK_DATA=false for production | F-001, F-009 | 1.7 | Must Have | F-001-S133 |
| ARCH-06 | Environment-specific configuration via env vars | F-001, F-008, F-009 | 1.1 | Must Have | F-008-S44, F-008-S45 |
| ARCH-07 | ALL Mock data references are completely removed from code before production deployment | F-009 | 9.0 | Must Have | |

---

## Observability & Monitoring Requirements (OBS)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| OBS-01 | Error logging and monitoring (Sentry) | F-009 | 9.6 | Must Have | F-009-S27, F-009-S28 |
| OBS-02 | Audit trail for security events (login, logout, credential regen) | F-002, F-005, F-006, F-007, F-009 | 5.4, 7.2, 9.6 | Must Have | F-006-S40, F-006-S70, F-006-S71, F-007-S30, F-007-S31, F-007-S32, F-007-S33, F-007-S34, F-007-S35, F-009-S29, F-009-S30 |
| OBS-03 | Email delivery status tracking | F-003 | 3.9 | Should Have | F-009-S31 |
| OBS-04 | Metrics for signups, conversions, usage patterns | F-009 | 9.9 | Should Have | F-009-S32 |
| OBS-05 | Alerting for critical errors and security events | F-006, F-009 | 9.6 | Should Have | F-006-S39, F-009-S33 |

---

## Infrastructure & Deployment Requirements (INFRA)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| INFRA-01 | Hosted on AWS infrastructure | F-009 | 9.2 | Must Have | F-009-S34 |
| INFRA-02 | Environment separation: dev, staging, production | F-009 | 9.8 | Must Have | F-009-S35 |
| INFRA-03 | CI/CD pipeline for automated deployments from GitHub | F-009 | 9.4 | Must Have | F-009-S36 |
| INFRA-04 | Domain configuration: app.realrandom.co | F-009 | 9.1 | Must Have | F-009-S37 |
| INFRA-05 | SSL/TLS certificates managed and auto-renewed | F-009 | 9.1 | Must Have | F-009-S38 |
| INFRA-06 | Secrets management via AWS Secrets Manager | F-009 | 9.5 | Must Have | F-009-S39 |
| INFRA-07 | Database backups with retention policy | F-009 | 9.3 | Must Have | F-009-S40 |

---

## Email Infrastructure Requirements (EMAILINFRA)

| ID | Requirement | Feature | Story | Priority | BDD Scenarios |
|----|-------------|---------|-------|----------|---------------|
| EMAILINFRA-01 | Transactional email via SMTP relay (Mailgun interim, Henry's EC2 production) | F-003 | 3.1 | Must Have | F-003-S22, F-003-S27, F-003-S28, F-003-S29, F-003-S30, F-003-S31, F-003-S32, F-003-S33 |
| EMAILINFRA-02 | Domain authentication: SPF and DKIM records | F-003 | 3.1 | Must Have | F-003-S23 |
| EMAILINFRA-03 | Sender address: noreply@realrandom.co | F-003 | 3.1 | Must Have | F-003-S24, F-003-S31 |
| EMAILINFRA-04 | Email templates for all transactional emails | F-003 | 3.7 | Must Have | F-003-S25 |
| EMAILINFRA-05 | Email delivery monitoring and bounce handling | F-003 | 3.4 | Should Have | F-003-S26 |

---

## Feature Coverage Matrix

| Feature | Requirements Covered |
|---------|---------------------|
| F-001 | AUTH-01 to AUTH-09, AUTH-12 to AUTH-20, AUTH-24, AUTH-26 to AUTH-29 (UI), GEO-02 (UI), CRED-02 to CRED-05, CRED-07 to CRED-09 (UI), DASH-01 to DASH-07, DASH-10 to DASH-20 (UI), ADMIN-01 to ADMIN-04, ADMIN-07, ADMIN-12 to ADMIN-14 (UI), COMP-02, COMP-04, UI-01 to UI-08, ARCH-01 to ARCH-06, SEC-04, SEC-05 (client), SEC-08 (UI) |
| F-002 | AUTH-01, AUTH-06 to AUTH-14, AUTH-16, AUTH-18, AUTH-21 to AUTH-27 (backend), CRED-01 (trigger), CRED-06, SEC-01, SEC-03, SEC-04, SEC-05 (server), SEC-06, SEC-11, SEC-14, COMP-01, OBS-02 |
| F-003 | AUTH-10, AUTH-14, AUTH-16, EMAIL-01 to EMAIL-09, DASH-08, DASH-09, SEC-07, EMAILINFRA-01 to EMAILINFRA-05, OBS-03 |
| F-004 | AUTH-24, DASH-01 to DASH-07, DASH-10, DASH-14, DASH-17 to DASH-19 (backend), CRED-05 (backend), PERF-02 |
| F-005 | CRED-01 (generation), CRED-04 (backend), CRED-07, CRED-08 (backend), DASH-06, DASH-19, SEC-08 (backend), SEC-09, SEC-10, SEC-11, OBS-02 |
| F-006 | ADMIN-01 to ADMIN-04, ADMIN-07 to ADMIN-14, EMAIL-07, OBS-02, OBS-05, PERF-02 |
| F-007 | GEO-01, GEO-02 (WAF), COMP-03, OBS-02 |
| F-008 | PERF-01, PERF-02, EMAIL-09, SEC-12, SEC-13, SEC-15, ARCH-06, all requirements (integration test coverage) |
| F-009 | PERF-01, PERF-02, SEC-02, SEC-12, SEC-13, SEC-14, SEC-15, ARCH-05, ARCH-06, OBS-01 to OBS-05, INFRA-01 to INFRA-07 |
| F-010 | EMAIL-10 |

---

## PRD User Flow Coverage (Story 8-2)

All 22 PRD user flows from `docs/prd/shards/04-user-flows.md` are mapped to BDD scenarios. Flows 1-6 are covered by F-008 S1-S6 (tagged `@flow-1` through `@flow-6`). Flows 7-22 are covered by `user_flows.feature` (`@UF-S7` through `@UF-S22`). 4 flows are blocked (`@wip`).

| Flow | Description | Scenario ID | Location | Status |
|------|-------------|-------------|----------|--------|
| 1 | New User Registration | F-008-S1 `@flow-1` | F-008_integration.feature | Passing (`@wip` — email capture issue) |
| 2 | User Login + Dashboard | F-008-S2 `@flow-2` | F-008_integration.feature | Passing |
| 3 | Login Error Handling | F-008-S3 `@flow-3` | F-008_integration.feature | Passing |
| 4 | Forgot Password | F-008-S4 `@flow-4` | F-008_integration.feature | Passing |
| 5 | Credential Regeneration | F-008-S5 `@flow-5` | F-008_integration.feature | Passing |
| 6 | Admin Dashboard | F-008-S6 `@flow-6` | F-008_integration.feature | Passing |
| 7 | Email Verification Timeout/Resend | UF-S7 `@flow-7` | user_flows.feature | Passing |
| 8 | Trial Expiration Experience | UF-S8 `@flow-8` | user_flows.feature | Passing |
| 9 | Session Timeout | UF-S19 `@flow-9` `@security_integration` | user_flows.feature | Story 8-4: JWT expiry enforcement |
| 10 | Geo-Block Rejection | UF-S20 `@flow-10` `@wip` | user_flows.feature | Blocked: AWS WAF, not testable locally |
| 11 | Profile Update | UF-S9 `@flow-11` | user_flows.feature | Passing |
| 12 | Password Change | UF-S10 `@flow-12` | user_flows.feature | Passing |
| 13 | Logout | UF-S11 `@flow-13` | user_flows.feature | Passing |
| 14 | Rate Limit Experience | UF-S21 `@flow-14` `@security_integration` | user_flows.feature | Story 8-4: rate limit UX testing |
| 15 | First-Time Dashboard | UF-S12 `@flow-15` | user_flows.feature | Passing |
| 16 | Account Deletion | UF-S13 `@flow-16` | user_flows.feature | Passing |
| 17 | Contact Support | UF-S14 `@flow-17` | user_flows.feature | Passing |
| 18 | Email Change | UF-S22 `@flow-18` `@wip` | user_flows.feature | Blocked: Phase 2, no endpoint |
| 19 | Admin Disable/Enable Account | UF-S15 `@flow-19` | user_flows.feature | Passing |
| 20 | Admin Reset User Credentials | UF-S16 `@flow-20` | user_flows.feature | Passing |
| 21 | Quota/Usage Exhaustion | UF-S17 `@flow-21` | user_flows.feature | Passing |
| 22 | Admin Modify Entropy Limit | UF-S18 `@flow-22` | user_flows.feature | Passing |

> **Summary**: 18/22 flows passing, 2 blocked (@wip: geo-block, email change), 2 deferred to Story 8-4 (@security_integration: session timeout, rate limiting). Coverage: 100% of testable flows. Added by Story 8-2 (2026-02-24).

---

## BDD Coverage Gaps

All 132 Phase 1 requirements now have BDD scenario coverage. No gaps remain.

### Phase 1 — All Resolved

The final 6 gaps were resolved on 2026-02-26:
- EMAIL-08 → F-003-S60..S71 (12 scenarios already existed in Story 3.11; traceability corrected)
- EMAIL-09 → F-008-S37, F-008-S38 (verification token entropy checks)
- SEC-12 → F-008-S39, F-008-S40 (password/secret hash verification), F-009-S21, F-009-S22 (infra `@wip`)
- SEC-13 → F-008-S41, F-008-S42 (codebase scan + gitignore), F-009-S23, F-009-S24 (infra `@wip`)
- SEC-15 → F-008-S43 (DB user privileges), F-009-S25, F-009-S26 (infra `@wip`)
- ARCH-06 → F-008-S44, F-008-S45 (frontend + backend env var verification)

The following were listed as gaps in earlier versions but now have BDD coverage:
- AUTH-21/22 → F-002-S32/S33 (added in Story 2.1)
- AUTH-26/27 → F-001-S126..S129 + F-002-S46..S49 (added in Stories 1.4, 1.17, 2.1)
- AUTH-28 → F-001-S167..S181 (added in Story 1.17)
- AUTH-29 → F-001-S184..S189 (added in Story 1.18)
- ADMIN-12 → F-006-S35, F-006-S36 (added with `@wip`)
- ADMIN-13 → F-006-S37, F-006-S38 (added)
- ADMIN-14 → F-006-S22..S25, F-006-S42 (added in Story 1.20)
- SEC-11 → F-002-S116, F-002-S117, F-002-S118 (added in Story 2.12 — @wip pending Story 9.6 log capture)
- DASH-14 → F-004-S28 (added)
- DASH-17/18/19 → F-001-S159..S166, F-004-S30..S32 (added in Story 1.12)
- EMAIL-03 → F-003-S14..S16, EMAIL-04 → F-003-S17, EMAIL-05 → F-003-S18..S20, EMAIL-06 → F-003-S21 (added to F-003)
- EMAIL-07 → F-006-S27 (`@wip` — admin-side action only, email delivery pending Story 3.4)
- OBS-01..05 → F-006-S39..S40, F-009-S27..S33 (added to F-006 and F-009)
- INFRA-01..07 → F-009-S34..S40 (added to F-009)
- EMAILINFRA-01..05 → F-003-S22..S26 (added to F-003)

---

## Pending Decisions

| ID | Requirement | Question |
|----|-------------|----------|
| DASH-08 | Automated trial ending emails | Should this be implemented in Phase 1? |
| DASH-09 | Phase 2 notification emails | Should this be implemented in Phase 1? |

---

## Phase 2 Backlog (Excluded from Phase 1)

| ID | Requirement | Category |
|----|-------------|----------|
| AUTH-30 | GitHub OAuth social login/registration | Auth |
| AUTH-31 | Google OAuth social login/registration | Auth |
| AUTH-32 | "Generate secure password" button using Real Random entropy API | Auth |
| GEO-03 | Phone country code dropdown excluding geo-blocked countries | Geo |
| GEO-04 | Twilio SMS phone number verification | Geo |
| DASH-21 | FAQ section under Resources & Support | Dashboard |
| DASH-22 | Quick Start Guide for new developers | Dashboard |
| DASH-23 | Sample code snippets demonstrating API usage | Dashboard |
| ADMIN-05 | Admin can view user's current membership plan | Admin |
| ADMIN-06 | Admin can view user's current payment status | Admin |
| ADMIN-15 | Admin email announcements to user groups | Admin |
| ADMIN-16 | Admin dashboard banners for notifications | Admin |
| ADMIN-17 | Credential revocation appeal management | Admin |
| GROWTH-01 | Referral program with bonus incentives | Growth |
| GROWTH-02 | Bonus rewards for API integration completion | Growth |
| GROWTH-03 | Pricing plans and subscription tiers | Growth |
| SEC-10 | Deleted user secrets immediately revoked | Security |
| SEC-16 | Multi-factor authentication (MFA) | Security |
| SEC-17 | HaveIBeenPwned password breach checking | Security |
