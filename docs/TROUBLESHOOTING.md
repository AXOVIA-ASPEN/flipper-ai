# 🔧 Flipper AI — Troubleshooting Guide

**Author:** Stephen Boyett
**Company:** Axovia AI

---

## Common Issues

### Build Failures

**Problem:** `pnpm build` fails with TypeScript errors
```bash
# Check for type errors
pnpm tsc --noEmit

# Clear Next.js cache and rebuild
rm -rf .next node_modules/.cache
pnpm build
```

**Problem:** Turbopack build hangs
```bash
# Use webpack fallback
TURBOPACK=0 pnpm build
```

### Database Issues

**Problem:** Prisma migration fails
```bash
# Reset database (development only!)
pnpm prisma migrate reset

# Generate fresh client
pnpm prisma generate
```

**Problem:** "Can't reach database server"
- Check DATABASE_URL in `.env`
- Verify PostgreSQL is running: `pg_isready`
- For SQLite dev: ensure `prisma/dev.db` exists

### Test Failures

**Problem:** Jest tests hang with open handles
```bash
# Run with detection
pnpm test -- --detectOpenHandles --forceExit

# Check for unclosed connections
pnpm test -- --verbose 2>&1 | grep "open handle"
```

**Problem:** Playwright tests fail
```bash
# Install browsers
pnpm exec playwright install chromium

# Run in headed mode for debugging
pnpm exec playwright test --headed

# Check dev server is running
curl http://localhost:3000/api/health
```

### Authentication Issues

**Problem:** NextAuth session not persisting
- Check `NEXTAUTH_SECRET` is set in `.env`
- Check `NEXTAUTH_URL` matches your dev URL
- Clear browser cookies and retry

### API Issues

**Problem:** 401 on all API routes
- Ensure you're authenticated (session cookie present)
- Check NextAuth configuration in `app/api/auth/[...nextauth]/route.ts`

**Problem:** Claude API errors
- Verify `ANTHROPIC_API_KEY` in `.env`
- Check API rate limits
- Review error in server logs

### Docker Issues

**Problem:** Container won't start
```bash
# Check logs
docker compose logs -f app

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up
```

## Getting Help

1. Check this guide first
2. Review [API docs](./API_REFERENCE.md)
3. Check [GitHub Issues](https://github.com/AXOVIA-ASPEN/flipper-ai/issues)
4. Ask in the team Slack channel
