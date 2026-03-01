# Scripts

Organized by purpose. Run from repository root.

| Folder | Purpose |
|--------|---------|
| [deploy/](./deploy/) | Deployment: `deploy-production.sh`, `verify-deployment.sh`, `validate-deployment.sh` |
| [db/](./db/) | Database: `db-backup.sh`, `db-restore.sh` |
| [setup/](./setup/) | Environment: `setup-oauth.sh`, `setup-acceptance-tests.sh`, `migrate-env-to-firebase.sh` |
| [test/](./test/) | Testing: `test-production.sh`, `test-oauth.sh`, `test-all-flows.sh` |
| [health/](./health/) | Monitoring: `health-monitor.sh` |

Root: `refactor-error-handling.ts` (dev refactor helper).

**Examples (from repo root):**
```bash
./scripts/setup/setup-oauth.sh
./scripts/deploy/verify-deployment.sh https://your-app.vercel.app
./scripts/health/health-monitor.sh
```
