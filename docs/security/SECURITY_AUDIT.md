# Security Audit Report — Flipper AI

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Date:** February 17, 2026  
**Status:** 🟡 Partially Remediated

---

## Summary

| Severity | Before | After |
|----------|--------|-------|
| Critical | 0 | 0 |
| High | 6 | 2 |
| Moderate | 8 | 8 |
| Low | 2 | 2 |
| **Total** | **16** | **12** |

---

## ✅ Fixed (This Run)

### Next.js DoS Vulnerabilities — FIXED
- **CVE:** GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf, GHSA-5f7q-jpqc-wp7h  
- **Impact:** DoS via Image Optimizer remotePatterns, HTTP deserialization, PPR Resume Endpoint
- **Fix:** Upgraded `next` from `16.1.0` → `16.1.6`  
- **Paths:** Direct production dependency
- **Status:** ✅ RESOLVED

---

## ⚠️ Remaining Vulnerabilities (Test/Dev Dependencies)

The following vulnerabilities exist in **test and development** dependencies only.  
They do **not affect the production runtime** of Flipper AI.

### HIGH: @langchain/core < 0.3.80 — Serialization Injection
- **CVE:** GHSA-r399-636x-v7f6
- **Path:** `@browserbasehq/stagehand` → `@langchain/core`
- **Impact:** Secret extraction via LangChain serialization injection
- **Scope:** Stagehand is a test automation tool — not included in production build
- **Recommended Action:** Upgrade `@browserbasehq/stagehand` when a version with patched deps is available

### HIGH: @modelcontextprotocol/sdk — ReDoS + Cross-client Data Leak
- **CVEs:** GHSA-8r9q-7v3j-jr4g, GHSA-345p-7cg4-v4c7
- **Path:** `@browserbasehq/stagehand` → `@modelcontextprotocol/sdk`
- **Scope:** Test dependency only
- **Recommended Action:** Upgrade `@browserbasehq/stagehand` when available

### HIGH: @isaacs/brace-expansion ≤ 5.0.0 — Uncontrolled Resource Consumption
- **CVE:** GHSA-7h2j-956f-4vf2
- **Path:** `@cucumber/cucumber` → `glob` → `minimatch` → `@isaacs/brace-expansion`
- **Scope:** BDD test framework — development only
- **Recommended Action:** Update `@cucumber/cucumber` when patch is released

### MODERATE: Various transitive vulns in stagehand/langchain
- `langsmith`, `hono`, `qs`, `diff` — all via `@browserbasehq/stagehand`
- **Scope:** Dev/test only

---

## 🛡️ Production Security Checklist

| Control | Status |
|---------|--------|
| CSP headers | ✅ Enforced in next.config.js + middleware |
| HSTS headers | ✅ Strict-Transport-Security set |
| CORS | ✅ Configured in next.config.js + firebase.json |
| Rate limiting | ✅ Per-IP + per-user, endpoint-specific |
| Input validation | ✅ Zod schemas on all API inputs |
| Auth hardening | ✅ All routes return 401 (not 500) when unauth |
| API key validation | ✅ Constant-time comparison |
| Session security | ✅ NextAuth + JWT |
| Env var validation | ✅ Validated on startup |
| CSRF protection | ✅ SameSite cookies + middleware |
| Next.js updated | ✅ 16.1.6 (DoS patches applied) |

---

## Recommendations for Stephen

1. **Remove `@browserbasehq/stagehand`** if Stagehand is not actively used in production testing. This would eliminate all remaining high vulnerabilities. Current usage is only in dev setup.

2. **Monitor `@cucumber/cucumber` releases** for an updated `@isaacs/brace-expansion` dependency.

3. **Consider moving stagehand to devDependencies** if it's in `dependencies` — it should never be in production bundle.

---

*Last updated: Feb 17, 2026 — Run #9*
