# Flipper AI — Monitoring & Uptime Setup Guide

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Date:** February 17, 2026  

---

## Overview

Flipper AI ships with a `/api/health` endpoint that exposes real-time system status. This guide walks through connecting external uptime monitors to it.

```
GET /api/health
→ { "status": "ok", "environment": "production", "timestamp": "...", "services": {...} }
```

---

## Option A: UptimeRobot (Free — Recommended)

UptimeRobot's free tier checks every 5 minutes and sends alerts via email/Slack.

### Setup Steps

1. **Create account:** https://uptimerobot.com/signUp
2. **Add new monitor:**
   - Monitor Type: `HTTPS`
   - Friendly Name: `Flipper AI — Production`
   - URL: `https://your-app.vercel.app/api/health`
   - Monitoring Interval: `5 minutes`
3. **Alert contacts:** Add your email (`stephen.boyett@silverlinesoftware.co`)
4. **Keyword check (optional):** Set keyword `"status":"ok"` to validate response body, not just HTTP 200
5. Copy the **Public Status Page URL** and add to README (see below)

### Expected Badge

Once configured, add to `README.md`:
```markdown
[![Uptime](https://img.shields.io/uptimerobot/status/m12345678-abc123def456?label=uptime)](https://stats.uptimerobot.com/YOUR_PAGE)
[![Uptime Ratio](https://img.shields.io/uptimerobot/ratio/m12345678-abc123def456)](https://stats.uptimerobot.com/YOUR_PAGE)
```

---

## Option B: BetterStack (Formerly Better Uptime — Higher Quality)

BetterStack checks every 30 seconds and provides incident timelines and on-call routing.

### Setup Steps

1. **Create account:** https://betterstack.com/
2. **Add monitor:**
   - URL: `https://your-app.vercel.app/api/health`
   - Check frequency: `30 seconds` (free tier)
   - Check type: `HTTP/HTTPS`
3. **Advanced config:**
   - Expected status: `200`
   - Response keyword: `"status":"ok"`
4. **Set alert policy:** Email + Slack (optionally phone call for P0)
5. **Status page:** Create a public status page at `status.yourapp.com`

### Expected Badge

```markdown
[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v2/monitor/YOUR_MONITOR_ID.svg)](https://YOUR_STATUS_PAGE.betterstack.com)
```

---

## Option C: GitHub Actions Scheduled Health Check (Zero External Services)

Run a health probe on a schedule directly from CI without any external account.

Add to `.github/workflows/health-check.yml`:

```yaml
name: Health Check
on:
  schedule:
    - cron: '*/15 * * * *'   # Every 15 minutes
  workflow_dispatch:

jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - name: Check /api/health
        run: |
          STATUS=$(curl -sf https://your-app.vercel.app/api/health | jq -r '.status')
          if [ "$STATUS" != "ok" ]; then
            echo "Health check FAILED: $STATUS"
            exit 1
          fi
          echo "Health check OK"
```

---

## Internal Health Endpoint Details

```
GET /api/health
```

| Field | Description |
|-------|-------------|
| `status` | `"ok"` or `"degraded"` |
| `environment` | `"production"` \| `"staging"` \| `"development"` |
| `timestamp` | ISO 8601 UTC |
| `version` | App version from `package.json` |

Example response:
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2026-02-17T15:45:00.000Z",
  "version": "1.0.1"
}
```

---

## Alerting Runbook

| Alert | Severity | Action |
|-------|----------|--------|
| HTTP 5xx from `/api/health` | P0 | Check Sentry for exceptions, restart PM2/container |
| Response time > 2s | P1 | Check DB connections, scale horizontally |
| `"status": "degraded"` | P1 | Investigate specific failing service in response |
| SSL certificate expiring | P2 | Renew via Vercel (auto-managed) or Let's Encrypt |

---

## Self-Hosted Cron Health Script

For staging (PM2 server), use this lightweight script:

```bash
#!/bin/bash
# scripts/health-monitor.sh
# Cron: */5 * * * * /path/to/scripts/health-monitor.sh >> /var/log/flipper-health.log 2>&1

HEALTH_URL="http://localhost:3001/api/health"
NOTIFY_EMAIL="s.boyett31@gmail.com"
LOG_FILE="/var/log/flipper-health.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

RESPONSE=$(curl -sf --max-time 10 "$HEALTH_URL" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "[$TIMESTAMP] HEALTH CHECK FAILED (exit $EXIT_CODE): $RESPONSE"
  # Optionally: send email or Slack notification here
else
  STATUS=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','unknown'))")
  echo "[$TIMESTAMP] Health: $STATUS"
fi
```

---

## Status Page Setup

After choosing your monitoring provider, link the public status page:

1. **UptimeRobot:** `https://stats.uptimerobot.com/YOUR_PAGE_KEY`
2. **BetterStack:** `https://YOUR_APP.betterstack.com`
3. **Custom:** Host `public/status.html` and update via webhook from your monitor

Add the status page URL to:
- `README.md` — under "Links" section
- `public/status.html` — link it from the health dashboard page
- `CHANGELOG.md` — note the monitoring setup date

---

## Next Steps for Stephen

1. [ ] Choose monitoring provider (recommend UptimeRobot for free, BetterStack for quality)
2. [ ] Sign up and add monitor pointing to `https://YOUR_PROD_URL/api/health`
3. [ ] Copy monitor ID and update `README.md` badges
4. [ ] Add status page URL to `docs/PRODUCTION_READINESS.md`
5. [ ] (Optional) Add webhook alert to Slack `#flipper-alerts` channel

---

*Generated by ASPEN — Feb 17, 2026*
