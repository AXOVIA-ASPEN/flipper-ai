# Public Status Page — Spec

**Goal:** A public-facing status page at `https://status.<domain>` (or `/status`) showing real-time uptime, current incidents, and recent incident history.

**Why:** When something breaks, the first thing users do is check the status page. If you don't have one, they file support tickets, churn, or post complaints. A status page deflects 60-80% of inbound "is it down?" support volume.

---

## The decision: hosted or self-built

| Approach                | Setup time | Cost              | Pros                                   | Cons                                    |
| ----------------------- | ---------- | ----------------- | -------------------------------------- | --------------------------------------- |
| **Better Stack Status**  | 30 min      | Free → $19/mo      | Best free tier, beautiful design, integrates with Better Stack uptime monitor | Branded as Better Stack on free tier    |
| **Statuspage.io**        | 1 hour      | $29/mo and up      | The category leader, very polished     | No free tier, expensive for early stage |
| **Instatus**             | 30 min      | Free → $20/mo      | Good free tier, decent design          | Less polished than Better Stack          |
| **Self-built (`/health` page)** | 1-2 days | Free + dev time | Full control, single brand, embeds in app | Maintenance overhead, no historical incident data UI by default |

**Recommendation:** Better Stack Status (https://betterstack.com/status-page) on free tier at launch. Migrate to self-built only if you need pixel-perfect brand control or are post-launch with engineering capacity.

---

## What to monitor

### Components (visible to users)

| Component                         | What it represents                                       | Health check source                                |
| --------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| **Web app**                       | The main `https://<domain>` site                          | HTTP 200 on `/` every 60s                           |
| **API**                           | API routes responding correctly                           | HTTP 200 on `/api/health` every 60s                |
| **Authentication**                | Login / signup flows                                      | HTTP 200 on `/api/health/ready` (verifies Firebase Admin SDK reachability) |
| **Database**                      | Cloud SQL Postgres                                        | Pingable from `/api/health/ready`                   |
| **AI analysis pipeline**          | Multi-provider AI service                                 | Synthetic test analysis every 5 min                |
| **eBay scanner**                  | eBay Browse API integration                               | Synthetic search every 15 min                       |
| **Craigslist scanner**            | Craigslist scraper                                        | Synthetic search every 15 min                       |
| **Facebook Marketplace scanner**  | FB Marketplace scraper (Stagehand)                        | Synthetic search every 30 min (more expensive)      |
| **OfferUp scanner**               | OfferUp scraper                                           | Synthetic search every 15 min                       |
| **Mercari scanner**               | Mercari scraper                                           | Synthetic search every 15 min                       |
| **Email delivery**                | Resend                                                    | Send-and-check synthetic email every 30 min        |
| **Push notifications**            | FCM                                                       | Optional — only if you ship FCM at launch          |
| **Payments**                      | Stripe webhook reception                                  | Synthetic test webhook every 60 min                |

### Internal-only metrics (not on public page)

- AI cost per analysis (alert if 2x baseline)
- Sentry error rate (alert if 0.5% of requests are 5xx)
- Cloud Run instance count (alert if scaling unexpectedly high)
- Database connection pool saturation (alert at 80%)

---

## Incident severity levels

| Severity     | Definition                                                          | User communication                                  |
| ------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| **Operational** | All systems normal                                               | Green dots                                           |
| **Degraded**    | Service available but slower or partially impaired               | Yellow + brief description on status page only      |
| **Partial outage** | Some users / features affected; majority working              | Yellow + status page banner + email subscribers     |
| **Major outage**   | Service unavailable for most users                            | Red + status page banner + email subscribers + Twitter post + in-app banner |

---

## Visual layout (matches glassmorphism dark theme)

```
╔═══════════════════════════════════════════════════════════╗
║                                                              ║
║     Flipper.ai — All systems operational                    ║
║     ●  Last checked 12 seconds ago                           ║
║                                                              ║
║                                                              ║
║     ●  Web app                                operational    ║
║     ●  API                                    operational    ║
║     ●  Authentication                         operational    ║
║     ●  Database                               operational    ║
║     ●  AI analysis pipeline                   operational    ║
║     ●  eBay scanner                           operational    ║
║     ●  Craigslist scanner                     operational    ║
║     ●  Facebook Marketplace scanner           operational    ║
║     ●  OfferUp scanner                        operational    ║
║     ●  Mercari scanner                        operational    ║
║     ●  Email delivery                         operational    ║
║     ●  Payments                               operational    ║
║                                                              ║
║     ──────────────────────────────────────                   ║
║                                                              ║
║     90-day uptime: 99.94%                                    ║
║                                                              ║
║     ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ (90 daily bars)         ║
║                                                              ║
║     ──────────────────────────────────────                   ║
║                                                              ║
║     Recent incidents                                          ║
║                                                              ║
║     2026-04-22 — Mercari scanner degraded (45 min)           ║
║       Investigating → Identified → Resolved                  ║
║       Mercari rate-limited our requests; backoff added.       ║
║                                                              ║
║     2026-04-15 — Email delivery delayed (12 min)             ║
║       Resend regional issue. No data lost.                   ║
║                                                              ║
║     [ Subscribe to status updates → ]                        ║
║                                                              ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Subscribe options

Users can subscribe to incident notifications via:

- **Email** (most common; primary CTA)
- **Webhook** (for power users with custom monitoring)
- **RSS** (auto-generated)
- **Slack** (Better Stack offers this on paid plans)
- **SMS** (paid only; skip at launch)

---

## Incident communication template

Pre-write these so you can post during an incident in 30 seconds, not 5 minutes.

### Template 1 — Investigating

> **{{Component}} — Investigating**
>
> We've detected an issue with {{component}} affecting {{describe scope: "all users" / "users in [region]" / "cross-platform listing creation" / etc.}}. We're investigating now and will post an update within 15 minutes.
>
> Posted {{timestamp}}.

### Template 2 — Identified

> **{{Component}} — Identified**
>
> We've identified the root cause: {{plain-language summary}}. {{What's affected}} — {{what's not affected}}. We're working on a fix and expect to resolve within {{ETA}}.
>
> Posted {{timestamp}}. Update {{N}} of estimated {{N}}.

### Template 3 — Monitoring

> **{{Component}} — Monitoring**
>
> A fix has been deployed. We're monitoring for stability before declaring resolved. Service should be back to normal for affected users; please reach out at `support@<domain>` if you're still seeing issues.
>
> Posted {{timestamp}}.

### Template 4 — Resolved

> **{{Component}} — Resolved**
>
> The issue is fully resolved as of {{timestamp}}. Total impact: {{duration}}. No data was lost.
>
> {{Optional: brief postmortem link if it's a major outage.}}

---

## Postmortem template (for major outages only)

For incidents affecting >30 minutes or causing data loss:

```markdown
# Postmortem — {{Incident title}}

**Date:** {{YYYY-MM-DD}}
**Duration:** {{HH:MM:SS}}
**Severity:** {{Major outage / Partial outage / Degraded}}
**Affected components:** {{...}}

## Summary

{{Two-paragraph human-readable description of what happened, who was affected, and how it was resolved.}}

## Timeline

- **{{HH:MM UTC}}** — Issue detected via {{monitoring source}}.
- **{{HH:MM UTC}}** — Acknowledged by on-call.
- **{{HH:MM UTC}}** — Root cause identified: {{...}}.
- **{{HH:MM UTC}}** — Mitigation deployed.
- **{{HH:MM UTC}}** — Fully resolved.

## Root cause

{{Technical explanation of what went wrong.}}

## What went well

- {{Detection time}}
- {{Communication}}
- {{Mitigation availability}}

## What didn't

- {{What we'd do differently}}

## Action items

- [ ] {{Concrete change to prevent recurrence}}
- [ ] {{Monitoring improvement}}
- [ ] {{Process improvement}}
```

Publish at `/changelog/postmortems/<incident-slug>.md` and link from the status page incident entry.

---

## Don't do

- ❌ Hide outages. Users will find out anyway and the trust loss compounds.
- ❌ Use vague language ("Some users may be experiencing intermittent issues..."). Be specific: "FB Marketplace scans are returning 0 results due to a selector change on FB's site."
- ❌ Post status updates after the fact. Real-time = trust; delayed = damage control.
- ❌ Treat status page as a "set it once and forget" surface. Stale incident lists make the page look abandoned.
- ❌ Run synthetic monitors that hammer your own production. Throttle synthetics to <1% of total request volume.
- ❌ Fail to monitor your monitor. If Better Stack goes down, your status page lies. Have a fallback (a separate UptimeRobot ping pointing at Better Stack itself).

---

## Setup steps (Better Stack — recommended)

1. [ ] Sign up at https://betterstack.com/ (free tier)
2. [ ] Add monitors for each component:
   - HTTP 200 check on `/api/health` every 60s
   - HTTP 200 on `/` every 60s
   - HTTP 200 on `/api/health/ready` every 60s (more expensive — DB + Firebase ping)
   - Custom probes for each scanner (synthetic search) at appropriate intervals
3. [ ] Create a status page at https://betterstack.com/status-pages
4. [ ] Configure subdomain: `status.<your-domain>`
   - Add CNAME in Cloudflare DNS pointing to Better Stack's status-page host
5. [ ] Add components and link each to its monitor
6. [ ] Customize design (logo, colors to match glassmorphism dark theme)
7. [ ] Set up incident notification rules (email subscribers, Slack webhook, etc.)
8. [ ] Add a footer link from main app to `status.<domain>`
9. [ ] Test by manually triggering an incident in Better Stack (creates a test entry that you delete after)

---

## Public-facing copy

**Status page header:** *"Flipper.ai status — current and historical service health"*

**"All systems operational" message:** *"All systems operational. Last incident: {{N}} days ago."*

**During an incident:** Already covered in templates above.

**Footer of status page:** *"Subscribe to status updates → [email form]"*  *"Status page maintained by Stephen Boyett, founder of Flipper.ai. Have a question? Email support@<domain>."*
