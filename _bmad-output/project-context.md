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
