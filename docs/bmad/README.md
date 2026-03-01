# BMAD — Flipper.ai

[BMAD](https://github.com/bmad-solutions) (Breakthrough Method for Agile AI-Driven Development) is initialized for this repo. Use it for product context, conventions, and structured docs so AI agents and humans stay aligned.

## What’s in place

| Location | Purpose |
|----------|--------|
| **.bmad/project.yaml** | Project name, type, tech stack, key dirs, commands, doc pointers |
| **.bmad/conventions.md** | Coding style, testing, git/PRs, security, BMAD workflow |
| **.bmad/templates/** | PRD, technical spec, and user story templates |
| **docs/prd/** | Product requirements (main PRD is docs/PRD.md) |
| **docs/architecture/** | Technical specs (main doc is docs/ARCHITECTURE.md) |
| **docs/stories/** | User stories and acceptance criteria |

## Quick reference

- **Product context:** Read `.bmad/project.yaml` and `docs/PRD.md`.
- **How to work here:** `.bmad/conventions.md` and repo `AGENTS.md` / `CLAUDE.md`.
- **New feature:** Start from `.bmad/templates/prd.md` or a user story in `docs/stories/`, then add a technical spec in `docs/architecture/` if needed.

## Suggested next steps

1. **Sprint 0 (optional)**  
   - Add 2–3 user stories in `docs/stories/` for the next epic (e.g. Facebook scraper, opportunities dashboard).  
   - Reference them from your project board or backlog.

2. **First sprint**  
   - Pick a story from `docs/stories/`.  
   - If it’s non-trivial, add a short technical spec under `docs/architecture/` using `.bmad/templates/technical-spec.md`.  
   - Implement, test, and link PRs to the story.

3. **Keep BMAD in sync**  
   - When stack or structure changes, update `.bmad/project.yaml`.  
   - When team norms change, update `.bmad/conventions.md` and `AGENTS.md` as needed.

No extra tooling is required; BMAD runs on markdown and YAML in the repo.
