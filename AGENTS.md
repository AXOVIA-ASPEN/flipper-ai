# Repository Guidelines

> AI agents working in this repository must operate as professional, world-class software engineers with extensive front-end design instincts, strong object-oriented architecture knowledge, 10+ years of successful frontend/backend SaaS experience, and the business context needed to implement Flipper.ai thoughtfully.

## Project Structure & Module Organization

Core app code lives under `src/`: `app/` holds Next.js routes (API handlers in `app/api/*`), `lib/` contains shared utilities like the Prisma client, and generated artifacts stay in `src/generated/`. Database schema and migrations live in `prisma/`, Playwright journeys in `e2e/`, UI assets in `public/`, and deep-dive docs in `docs/`. Keep feature logic co-located with its UI route so dashboard tiles, API handlers, and helpers remain discoverable.

## Build, Test, and Development Commands

`make preview` runs install, migrations, and dev server in one shot. Use `pnpm dev` for iterative work, `pnpm build && pnpm start` to verify production bundles, and `make db-migrate` (wraps `npx prisma migrate dev`) for schema updates. Validate code with `pnpm lint`, run Jest via `pnpm test`, and exercise the UI with `pnpm test:e2e` or `pnpm test:e2e:headed` when debugging.

## Coding Style & Naming Conventions

TypeScript with React Server/Client Components is the default. Follow the two-space indentation already used in `src/app/page.tsx`, camelCase for variables, PascalCase for components, and descriptive file names (`listing-card.tsx`, `scraper-job.ts`). Shared logic should land in `src/lib/` or a feature-level `lib/` folder. ESLint (see `eslint.config.mjs`) is authoritative—run `pnpm lint --fix` instead of manual formatting. Tailwind classes read best when grouped layout → spacing → color.

## Testing Guidelines

Unit and integration suites reside in `src/__tests__` with Jest/ts-jest; follow the `{subject}.test.ts` naming convention and keep fixtures or mocks next to the spec. End-to-end regression runs from `e2e/*.spec.ts` with the repo’s Playwright config. Cover each new API route, Prisma change, or UI interaction with a Jest test or Playwright journey and add the test before the fix. Document flaky cases inside the PR if something must be skipped.

## Commit & Pull Request Guidelines

Recent history uses short, present-tense subjects (e.g., `tighten value estimator`). Mirror that pattern and add optional bodies for rationale. Pull requests should include a summary, screenshots or GIFs for UI changes, schema highlights when `prisma/schema.prisma` changes, and linked issues. Confirm `pnpm lint`, `pnpm test`, and relevant Playwright runs before requesting review, attaching logs for non-obvious failures.

## Security & Configuration Tips

Secrets belong in `.env`; never commit API keys or derivative SQLite files beyond `dev.db`. After editing the Prisma schema, run `pnpm prisma generate` (triggered by migrations) and mention new env vars in the PR. Scraper integrations should document rate limits or credential needs inside `docs/` so deployments stay reproducible.
