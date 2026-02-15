#!/usr/bin/env bash
# Flipper AI - PostgreSQL Database Backup Script
# Usage: ./scripts/db-backup.sh [output_dir]

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/flipper_ai_${TIMESTAMP}.sql.gz"

# Load DATABASE_URL from .env if available
if [ -f .env ]; then
  export $(grep -E '^DATABASE_URL=' .env | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL not set. Set it in .env or environment."
  exit 1
fi

# Parse connection string
# Format: postgresql://user:pass@host:port/dbname?schema=public
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up ${DB_NAME}@${DB_HOST}..."

PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup saved: $BACKUP_FILE ($SIZE)"

# Cleanup: keep last 30 backups
ls -t "${BACKUP_DIR}"/flipper_ai_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
echo "🧹 Old backups cleaned (keeping last 30)"
