# Cloud SQL Setup Guide

## Instance Details

| Property | Value |
|----------|-------|
| Instance name | `flipper-ai-postgres` |
| Project | `axovia-flipper` |
| Region | `us-east1` |
| Database version | PostgreSQL 16 |
| Tier | `db-f1-micro` (shared vCPU, 0.6 GB RAM) |
| Database | `flipper_ai` |
| User | `flipper` |
| Connection name | `axovia-flipper:us-east1:flipper-ai-postgres` |

## Connection Strings

### Cloud Run (Unix socket — production)

```
postgresql://flipper:PASSWORD@localhost/flipper_ai?host=/cloudsql/axovia-flipper:us-east1:flipper-ai-postgres
```

> **Note:** Connection pooling is configured in `src/lib/db.ts` via the PrismaPg adapter constructor (max, connectionTimeoutMillis, idleTimeoutMillis) — NOT via URL params. Do not add `connection_limit`, `connect_timeout`, or `pool_timeout` to the URL; they are silently ignored when using PrismaPg.

### Cloud SQL Auth Proxy (TCP — local development)

```
postgresql://flipper:PASSWORD@127.0.0.1:5432/flipper_ai
```

Run the proxy locally:

```bash
cloud-sql-proxy axovia-flipper:us-east1:flipper-ai-postgres --port 5432
```

## Secrets

Stored in GCP Secret Manager:

- `PRODUCTION_DATABASE_URL` — Connection string with pool params (for Cloud Run)
- `DIRECT_DATABASE_URL` — Direct connection string without pool params (for migrations)

Pull secrets locally:

```bash
make secrets-pull
```

## Backups

- Automated daily backups: enabled
- Retention: 7 backups
- Point-in-time recovery: enabled
- Transaction log retention: 7 days
- Maintenance window: Sunday 03:00 UTC

## Connection Limits

`db-f1-micro` supports ~25 max connections:

- 5 reserved for admin/migrations
- 20 available for application
- With Cloud Run max-instances=10: `connection_limit=2` per instance

## Common Issues & Troubleshooting

### Cannot connect via Cloud SQL Auth Proxy

1. Verify proxy is running: `cloud-sql-proxy axovia-flipper:us-east1:flipper-ai-postgres --port 5432`
2. Check `gcloud auth login` is current
3. Verify IAM role: account needs `roles/cloudsql.client`
4. Check firewall: proxy connects on port 3307 to Cloud SQL API

### Wrong socket path

Cloud Run uses Unix sockets at `/cloudsql/CONNECTION_NAME`. Ensure the `host` parameter in DATABASE_URL matches the connection name exactly.

### Missing IAM roles

Required for Cloud Run service account:

```bash
gcloud projects add-iam-policy-binding axovia-flipper \
  --member="serviceAccount:SERVICE_ACCOUNT@axovia-flipper.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### Password rotation

Cloud Run instances cache environment variables at startup. After rotating the database password:

1. Update the secret in Secret Manager
2. Redeploy Cloud Run service to pick up new value

### Migration rollback

If a bad migration is applied:

1. Restore from automated backup
2. Mark the migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```

## Cloud Run Integration (Story 1.3)

When deploying to Cloud Run, add the Cloud SQL connection annotation:

```bash
gcloud run deploy flipper-ai \
  --add-cloudsql-instances=axovia-flipper:us-east1:flipper-ai-postgres \
  --set-secrets=DATABASE_URL=PRODUCTION_DATABASE_URL:latest,DIRECT_DATABASE_URL=DIRECT_DATABASE_URL:latest \
  --service-account=PROJECT_NUMBER-compute@developer.gserviceaccount.com
```

The `--add-cloudsql-instances` flag automatically starts a Cloud SQL Auth Proxy sidecar that creates a Unix socket at `/cloudsql/axovia-flipper:us-east1:flipper-ai-postgres`.

IAM role `roles/cloudsql.client` has been granted to the default compute service account.

**Important:** Cloud Run instances cache secrets at startup. After password rotation, redeploy the service.

## Scaling Path

When traffic outgrows `db-f1-micro`:

1. Upgrade instance tier (e.g., `db-g1-small` or `db-custom-1-3840`)
2. Increase `connection_limit` in DATABASE_URL proportionally
3. Evaluate PgBouncer sidecar for shared connection pooling across instances
