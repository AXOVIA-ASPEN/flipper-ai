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
- **Auth:** NextAuth 5 (beta) for session-based auth; Firebase Auth for some API consumers
- **Scraping:** Playwright
- **Validation:** Zod
- **Testing:** Jest 30 (unit/integration), Playwright (E2E), Cucumber (BDD)
- **Lint/Format:** ESLint 4 (eslint-config-next), Prettier, lint-staged, Husky

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

**API routes**

- Next.js App Router: `app/api/.../route.ts` exporting HTTP method handlers.
- Success: `NextResponse.json({ success: true, ... })`
- Errors: use `handleError(error, request.url)` from `@/lib/errors`. Throw `UnauthorizedError`, `NotFoundError`, `ValidationError`, etc.

**Frontend**

- Prefer React Server Components by default; Client Components only when needed.
- Tailwind: group classes as layout -> spacing -> color.

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
