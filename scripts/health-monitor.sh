#!/bin/bash
# scripts/health-monitor.sh
# Lightweight cron-based health monitor for PM2/staging deployments
#
# Add to crontab:
#   */5 * * * * /path/to/flipper-ai/scripts/health-monitor.sh >> /var/log/flipper-health.log 2>&1
#
# Usage:
#   ./scripts/health-monitor.sh              # check staging (localhost:3001)
#   HEALTH_URL=https://prod.app/api/health ./scripts/health-monitor.sh

HEALTH_URL="${HEALTH_URL:-http://localhost:3001/api/health}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MAX_RESPONSE_TIME=5  # seconds

echo -n "[$TIMESTAMP] Checking $HEALTH_URL ... "

START=$(date +%s%N)
RESPONSE=$(curl -sf --max-time "$MAX_RESPONSE_TIME" "$HEALTH_URL" 2>&1)
EXIT_CODE=$?
END=$(date +%s%N)

ELAPSED_MS=$(( (END - START) / 1000000 ))

if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ FAILED (curl exit $EXIT_CODE, ${ELAPSED_MS}ms)"
  # Optional: send Slack alert
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-type: application/json' \
      -d "{\"text\":\"🚨 Flipper AI health check FAILED at $TIMESTAMP\\ncurl exit: $EXIT_CODE\\nURL: $HEALTH_URL\"}" \
      > /dev/null
  fi
  exit 1
fi

STATUS=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null)
ENVIRONMENT=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('environment','unknown'))" 2>/dev/null)

if [ "$STATUS" = "ok" ]; then
  echo "✅ OK (${ELAPSED_MS}ms, env=$ENVIRONMENT)"
else
  echo "⚠️  DEGRADED: status=$STATUS (${ELAPSED_MS}ms)"
  exit 2
fi
