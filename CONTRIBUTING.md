# Contributing to Flipper AI

Thanks for your interest in contributing! 🐧

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/flipper-ai.git`
3. Install dependencies: `pnpm install`
4. Copy env: `cp .env.example .env`
5. Set up database: `pnpm prisma migrate dev`
6. Run dev server: `pnpm dev`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Build: `pnpm build`
6. Commit with conventional commits: `git commit -m "feat: add new feature"`
7. Push and open a PR

## Code Standards

- **TypeScript:** Strict mode enabled
- **Testing:** Maintain 90%+ coverage; write tests for all new code
- **Linting:** ESLint 9 flat config; fix all warnings before committing
- **Formatting:** Prettier (configured in project)

## Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Maintenance

## Testing

```bash
pnpm test              # Run all Jest tests
pnpm test:e2e          # Run Playwright E2E tests
pnpm test:coverage     # Generate coverage report
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system overview.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
