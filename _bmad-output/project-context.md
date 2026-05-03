# Project Context

## Project Info
- Project: Flipper AI
- Trello MCP Server: trello-axovia
- Trello Board ID: SvVRLeS5
- Trello Board URL: https://trello.com/b/SvVRLeS5

## Directory Structure
- Planning artifacts: `_bmad-output/planning-artifacts/`
- Implementation artifacts: `_bmad-output/implementation-artifacts/`
- Stories by epic: `implementation-artifacts/epic-<num>/<epic>-<story>-<slug>.md`
- Test features: `test/acceptance/features/`

## Story Status System

| Status         | Meaning                              | Trello List  |
|---------------|--------------------------------------|-------------|
| backlog       | Not yet planned for sprint           | Backlog      |
| ready-for-dev | Planned, requirements complete       | To Do        |
| in-progress   | Actively being developed             | In Progress  |
| blocked       | Cannot proceed -- reason required    | Blocked      |
| review        | Code complete, in review             | Done         |
| done          | Reviewed, tested, verified           | Verified     |

## Blocked Story Rules
- Status: blocked, Blocked: true, Blocked-Reason: <explanation> -- ALL THREE REQUIRED
- When unblocked: Blocked: false, clear reason, update status

## Trello Conventions
- MCP Server and Board ID stored above -- read BOTH before any Trello operation
- Always use the specified MCP server (trello-axovia) for all Trello API calls
- Feature cards: `F-<NNN> - <Feature Name>` in Features list with story checklist
- Story cards: `[<epic>.<story>] <title>` with AC in description
- Epic labels with distinct colors
- Checklist items marked complete when story reaches Verified
- Trello is updated during: create-story, dev-story, code-review, sprint-planning, story-completion

### Feature Cards (Features list)
- One card per epic in the Features list
- Title: `F-<NNN> - <Feature Name>` (e.g., `F-001 - Authentication System`)
- Feature name is a PUBLIC-FACING name for the epic
- Each Feature card has a checklist titled "Stories" containing all stories in that epic
- Checklist item format: `[<epic>.<story>] <story_title>`
- Checklist items are marked COMPLETE when the corresponding story card moves to Verified
- When ALL checklist items are complete, add a green checkmark label to the Feature card
- Feature card description should summarize the epic scope

### Story Cards
- Title: `[<epic>.<story>] <title>` (e.g., `[1.3] Password Reset`)
- Labeled with the epic label (e.g., "Epic 1")
- Description MUST contain the full Acceptance Criteria from the story
- Card lives in the Trello list matching its current status

### When Trello Updates Happen
- **SM creates a story**: Create story card in correct list with AC in description. Add to Feature card checklist. Create Feature card if needed.
- **Dev starts work**: Move card to In Progress
- **Dev blocks story**: Move card to Blocked. Add comment: `🚫 BLOCKED: <reason>`
- **Dev unblocks story**: Move card out of Blocked. Add comment: `✅ UNBLOCKED — moved to <new_status>`
- **Dev submits for review**: Move card to Done
- **Code review passes**: Move card to Verified. Check off item on Feature card checklist.
- **Code review fails**: Move card back to In Progress
- **Sprint planning**: Move cards from Backlog to To Do
- **Batch sync**: `/user:update-trello-board`

### Epic Label Colors
- Epic 1: green
- Epic 2: yellow
- Epic 3: orange
- Epic 4: red
- Epic 5: purple
- Epic 6: blue
- Additional epics: cycle colors

## Requirement Numbering
- Functional: FR-001, FR-002, etc.
- Non-functional: NFR-001, NFR-002, etc.

## Acceptance Test Dual-Tagging
- Every scenario: `@FR-<num>` AND `@story-<epic>-<story>`
- Feature files in: `test/acceptance/features/`

## Story Definition of Done — Quality Gate

Every story MUST pass ALL items before status changes to `review`. This is a hard gate — no exceptions.

### 1. Implementation Complete
- [ ] All tasks and subtasks marked `[x]`
- [ ] Every Acceptance Criterion satisfied without exception
- [ ] No `any` in production code (`src/lib/`, `app/api/`, `src/scrapers/`)
- [ ] Edge cases and error conditions handled per story Dev Notes
- [ ] Only dependencies listed in story Dev Notes or this file used

### 2. Code Quality Gates (automated — must run and pass)
- [ ] `make lint` — zero ESLint errors
- [ ] `make build` — production build passes (strict TypeScript, no `ignoreBuildErrors`)
- [ ] `make test` — all tests green, zero regressions
- [ ] Coverage maintained: branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%

### 3. Test Coverage
- [ ] Unit tests added/updated for all new/changed logic in `src/lib/`, `app/api/`, `src/scrapers/`
- [ ] Every AC has at least one test at the correct level:
  - **Logic/calculation AC** → service-level Jest test (call the function, assert on result)
  - **UI-visible AC** ("displayed to the user", "user adjusts") → full E2E Playwright test — NOT a mocked service call or isolated unit test
- [ ] Full acceptance test suite written covering **every AC** — no ACs skipped, no placeholder scenarios, no `@wip`/`@skip`/`@pending` tags on any submitted scenario
- [ ] Every scenario is a genuine Playwright E2E journey in `test/acceptance/features/E-<epic_padded>-*.feature` — navigates real pages, interacts with real UI elements, asserts on visible outcomes
- [ ] Every scenario correctly tagged with **ALL THREE** (missing any one tag is a DoD failure):
  - `@FR-<name>` — one tag per functional requirement covered (e.g. `@FR-MEET-01`); these are the requirement traceability tags — maps to the PRD FR-* numbering
  - `@story-<epic>-<story>` — the story under test (e.g. `@story-12-1`); enables `make test-ac STORY=<epic>.<story>`
  - `@E-<epic_padded>-S-<sequential>` — globally unique scenario number (e.g. `@E-012-S-03`)
- [ ] RTM (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`) updated — every new scenario added with FR → AC → feature file → scenario tag → step definition file columns filled in
- [ ] **FINAL GATE — must be the last action before marking `Status → review`:**
  - `make test-ac STORY=<epic>.<story>` executes and passes with zero failures and zero skipped scenarios
  - `make test-ac FEATURE=F<epic_num>` executes and passes cleanly (all stories in the epic)

### 4. Documentation & Tracking
- [ ] Story `Status` field updated to `review`
- [ ] `_bmad-output/implementation-artifacts/sprint-status.yaml` updated to `review`
- [ ] `_bmad-output/test-artifacts/requirements-traceability-matrix.md` updated with new scenarios
- [ ] Story `File List` section updated with every new/modified/deleted file

### 5. Trello
- [ ] Story card moved to Done list (trello-axovia, board SvVRLeS5)
- [ ] If blocked during dev: `🚫 BLOCKED: <reason>` comment added; on unblock: `✅ UNBLOCKED — moved to <status>` comment added

## Custom Artifacts
- `_bmad-output/planning-artifacts/user-flows/user-flows.md` (PM produces)
- `test/acceptance/features/user_flows.feature` (required)

---

## Technology Stack & Versions

- **Runtime:** Node.js
- **Framework:** Next.js 16.x (App Router, Turbopack in dev)
- **UI:** React 19.x, TypeScript 5.x
- **Styling:** Tailwind CSS 4.x
- **Database:** PostgreSQL (production); Prisma 7.x ORM. Client generated to `src/generated/prisma/`
- **Auth:** Firebase Auth (client-side sign-in → server session cookie via `__session`). Legacy NextAuth models exist in Prisma schema but are deprecated and unused.
- **AI:** Multi-provider router at `src/lib/ai/index.ts` exposing `completeAI(taskName, context)`. **Groq is the primary provider for every text-only task (10 of 12 prompts in `src/lib/ai/prompts/`)** — Groq hosts Llama 3.3 70B with the most generous free tier of any provider, which keeps per-prompt latency low and free-tier headroom high. Fallback chain: Groq → Gemini → OpenAI for text tasks. Anthropic Claude is the primary for `claudeAnalysis` (Tier-2 structural reasoning). OpenAI is the primary only for `itemCompleteness` because Groq's open-source Llama models cannot consume images (Gemini Vision is the fallback). Stagehand + Gemini for Facebook browser automation. Full details: `docs/AI-Agents/README.md`.
- **Scraping:** Playwright
- **Validation:** Zod
- **Testing:** Jest 30 (unit/integration), Playwright (E2E), Cucumber (BDD)
- **Lint/Format:** ESLint 9 (eslint-config-next 16), Prettier, lint-staged, Husky

---

## Critical Implementation Rules

**TypeScript & code style**

- Strict mode enabled. No `any` in production code.
- Use `interface` for public APIs, `type` for unions/utility types.
- Two-space indent, camelCase variables, PascalCase components.
- Path alias: `@/*` -> `./src/*`

**Database**

- Use Prisma singleton from `@/lib/db`. Do not instantiate new `PrismaClient` in route handlers.
- Schema: `prisma/schema.prisma`. After editing, run `npx prisma migrate dev`.

**Secrets Management**

- Single source of truth: `config/secretmanager.yaml` — defines ALL secrets by environment scope (all, production, staging, dev).
- CLI tool: `scripts/secretmanager.py` — `EnvSecretManager` class with validate, populate, audit, load commands.
- GCP naming convention: `{SCOPE}_{SECRET_NAME}` (e.g., `PRODUCTION_DATABASE_URL`, `STAGING_STRIPE_SECRET_KEY`).
- When adding a new secret: (1) add to `config/secretmanager.yaml` under correct scope, (2) add to `.env.example` with description, (3) provision in GCP via `gcloud secrets create`.
- Container startup: `start.sh` runs `python3 scripts/secretmanager.py load --env $BUILD_ENV` to pull secrets from GCP into `os.environ` before Next.js starts.
- Never hardcode secrets. Always read from `process.env`.

**API routes**

- Next.js App Router: `app/api/.../route.ts` exporting HTTP method handlers.
- Success: `NextResponse.json({ success: true, ... })`
- Errors: use `handleError(error, request.url)` from `@/lib/errors`. Throw `UnauthorizedError`, `NotFoundError`, `ValidationError`, etc.

**Frontend**

- Prefer React Server Components by default; Client Components only when needed.
- Tailwind: group classes as layout -> spacing -> color.

---

## 🚨 VERY IMPORTANT — AI must NEVER be mocked

**Hard rule, no exceptions:** AI provider calls (Groq, Gemini, OpenAI, Anthropic) MUST NEVER be mocked, stubbed, faked, or short-circuited in ANY layer of this codebase. That includes production code, unit tests, integration tests, acceptance/BDD tests, E2E tests, and CI workflows. Every test that exercises an AI-driven feature must call the real `completeAI()` router and the real provider chain (Groq → Gemini → OpenAI for text; Anthropic for `claudeAnalysis`; OpenAI Vision for `itemCompleteness`).

The acceptance suite, the unit-test suite, and CI all run with real API keys for at minimum the primary provider (`GROQ_API_KEY` is mandatory; secondary keys are recommended for fallback resilience). AI behaviour IS the system's behaviour for AI-driven features — substituting a stub removes the very thing those tests are meant to validate.

**Forbidden patterns — do not introduce these under any condition:**

1. Stub providers, fake response builders, hard-coded JSON returns inside `src/lib/ai/`
2. `E2E_AI_STUB`-style env-var escape hatches that bypass the provider chain when set
3. `jest.mock('@/lib/ai')` or `jest.mock('@/lib/ai/providers/*')` to short-circuit real calls
4. `nock` / `msw` / network-level interception of `api.groq.com`, `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`
5. Conditional branches in `completeAI()` or any provider class that bypass real calls when a test flag is set
6. Wrapping `completeAI()` callers in test-only `if (process.env.NODE_ENV === 'test')` short-circuits

**If AI scenarios flake on rate limits or slowness — fix the root cause:**

- Confirm Groq is the primary for that prompt (it has the most generous free tier — Llama 3.3 70B at 30 RPM / 6,000 TPM)
- Tune provider-level retry/backoff in `src/lib/ai/providers/*.ts` and `callWithRetry()` in `src/lib/ai/index.ts`
- Lift per-scenario timeouts for AI-heavy `@story-8-*` / `@story-13-*` scenarios with `setDefaultTimeout(180 * 1000)` in the relevant step file
- Sequence AI-heavy tests serially so they don't compete for the same rate-limit window
- Cache repeated-prompt responses in the database (`AiAnalysisCache`) so the same fixture doesn't re-call the API
- Reduce prompt token counts so requests fit further inside provider quotas
- If a single provider is throttling, ensure `prompt.fallbacks` actually has live keys configured so the chain can rotate

The only acceptable test-time substitution is at the network layer with explicit, recorded real responses (e.g. Polly.js cassettes captured from actual provider calls). Even that requires explicit user approval before introduction. **Default position: real AI calls everywhere, including in CI.**

---

## Commands (quick reference)

| Command         | Purpose                        |
|-----------------|--------------------------------|
| `make preview`  | Install, migrate, dev server   |
| `make dev`      | Start dev server               |
| `make test`     | Jest unit tests                |
| `make test-e2e` | Playwright E2E                 |
| `make lint`     | ESLint                         |
| `make build`    | Production build               |
| `make migrate`  | DB migrations                  |
| `make studio`   | Database GUI (Prisma Studio)   |

---

*Generated by Silverline BMAD Setup. Update when stack or conventions change.*

---

## Versioning & Release Pipeline

### Version Scheme
[Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`

| Change type | Bump | Example |
|-------------|------|---------|
| Bug fixes, dependency updates, minor tweaks | `PATCH` | Fix Craigslist scraper timeout |
| New features, non-breaking additions | `MINOR` | Add OfferUp scraper, new dashboard page |
| Breaking changes, major architecture shifts | `MAJOR` | Auth system rewrite, API incompatibility |

### Key Files
- **`VERSION.md`** — single line, the current released version (e.g., `1.0.1`). Updated manually during release prep. Never updated mid-sprint.
- **`CHANGELOG.md`** — [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format. The `[Unreleased]` section at the top is updated as work is merged. At release time it is promoted to a versioned heading.

### CHANGELOG.md Conventions
- `[Unreleased]` section is always present at the top — developers add entries here as they work
- Categories (only include non-empty ones): `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
- Versioned headings format: `## [X.Y.Z] - YYYY-MM-DD`
- Write entries for humans, not machines — describe impact, not implementation detail

### Release Process (5 steps — no exceptions)

```
1. Update CHANGELOG.md
   - Move all [Unreleased] items under: ## [X.Y.Z] - YYYY-MM-DD
   - Leave a fresh empty [Unreleased] section at the top

2. Update VERSION.md
   - Set to the new version number (single line)

3. Commit the release prep
   git add CHANGELOG.md VERSION.md
   git commit -m "chore: release vX.Y.Z"
   git push origin main

4. Tag the release
   git tag vX.Y.Z
   git push origin vX.Y.Z

5. GitHub Actions creates the GitHub Release automatically
   - Parses CHANGELOG.md to extract release notes for this version
   - Creates release named "Flipper.ai vX.Y.Z"
   - No manual GitHub Release creation required
```

### GitHub Actions
- **Workflow:** `.github/workflows/release.yml`
- **Trigger:** Any tag matching `v*.*.*` pushed to the repo
- **Action:** Extracts the matching `CHANGELOG.md` section and creates a GitHub Release via `softprops/action-gh-release@v2`
- Pushing the tag is sufficient — the release is fully automated from there
