# Legacy BDD Tests (Archived)

These are the original BDD feature files and step definitions created during initial project planning. They cover Epics 3–9 (marketplace scanning, AI analysis, seller communication, resale listing, dashboard tracking, auth/billing, notifications, and the full flip journey).

## Why archived

- Written before the BMAD Method was adopted for implementation tracking
- Test features that haven't been built yet (Epics 3–9 are backlog)
- Replaced by epic-organized acceptance tests in `test/acceptance/`

## How to reuse

When implementing future epics, reference these files for:

1. **Gherkin scenarios** — `features/*.feature` files contain well-structured scenarios covering the full user journey for each epic. Adapt these into BMAD acceptance tests under `test/acceptance/features/`.

2. **Step definitions** — `features/step_definitions/*.ts` contain Playwright-based step implementations with page interactions, API mocking, and assertions. Reuse patterns and selectors when writing new step definitions under `test/acceptance/step_definitions/`.

### Feature-to-Epic mapping

| Feature File | Epic |
|---|---|
| `01-marketplace-scanning.feature` | Epic 3: Multi-Marketplace Scanning |
| `02-ai-analysis.feature` | Epic 4: Core Scoring & Deal Evaluation |
| `03-seller-communication.feature` | Epic 8: Seller Communication |
| `04-resale-listing.feature` | Epic 9: Cross-Platform Resale Listing |
| `05-dashboard-tracking.feature` | Epic 6: Flip Lifecycle Management |
| `06-user-auth-billing.feature` | Epic 2 + Epic 7: Auth & Billing |
| `07-notifications-monitoring.feature` | Epic 10 + 11: Notifications |
| `08-complete-flip-journey.feature` | Cross-epic integration |
| `09-real-time-notifications.feature` | Epic 11: Push Notifications |

### Step definition mapping

| Step File | Covers |
|---|---|
| `common-steps.ts` | Auth, navigation, assertions, form interactions |
| `marketplace-scanning.steps.ts` | Scanner UI, filtering, saved searches |
| `ai-analysis.steps.ts` | AI scoring, market value, analysis display |
| `seller-communication.steps.ts` | Messaging, negotiation, templates |
| `resale-listing.steps.ts` | Cross-platform listing, description gen |
| `dashboard-tracking.steps.ts` | Dashboard stats, kanban, lifecycle |
| `user-auth-billing.steps.ts` | Registration, login, billing, tiers |
| `notifications-monitoring.steps.ts` | Alert preferences, notification display |
| `flip-journey.steps.ts` | End-to-end flip lifecycle |
| `sse-notifications.steps.ts` | Real-time SSE/push notifications |
