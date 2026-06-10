# Launch Assets & Pre-Launch Toolkit

Ready-to-edit copy, specs, and operational checklists for Flipper.ai's public launch. Everything in this directory is **draft / spec** — review, personalize, and trim before sending. Marketing copy is written in a founder-direct voice (no corporate fluff, no emoji-spam, no AI-cliché openings).

## Index

### Marketing copy

| File                                       | When to use it                                                  |
| ------------------------------------------ | --------------------------------------------------------------- |
| `product-hunt-listing.md`                  | The day you launch on Product Hunt                              |
| `hacker-news-show-hn.md`                   | Day after PH (HN is a different audience, different tone)       |
| `reddit-launch-posts.md`                   | Same week as PH; tailored per subreddit                         |
| `twitter-launch-thread.md`                 | Launch day + 30-day #buildinpublic prompts                      |
| `email-drip-campaign.md`                   | Wire into Resend/onboarding flow before public launch            |
| `beta-invitation.md`                       | Send this week to 10-20 hand-picked beta users                  |

### Operational playbooks

| File                                       | When to use it                                                  |
| ------------------------------------------ | --------------------------------------------------------------- |
| `launch-day-runbook.md`                    | Hour-by-hour playbook for Product Hunt Tuesday                  |
| `pre-launch-smoke-test.md`                 | 60-min checklist after first prod deploy, before beta invites    |
| `gcp-secret-manager-checklist.md`          | Verify every required production secret is seeded in GCP        |
| `branch-reconciliation.md`                 | Pre-launch git hygiene to merge `django-main` into trunk        |
| `twilio-10dlc-checklist.md`                | Conditional — only if shipping SMS at launch                    |

### Strategy & specs

| File                                       | What it is                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `domain-and-brand-identity.md`             | 9 candidate domains with one-click availability links + post-buy wiring |
| `pricing-page-proposal.md`                 | Recommended 4-tier pricing structure with full page copy + Stripe setup |
| `free-tools-specs.md`                      | 7 free SEO top-of-funnel tools with UX flows and shipping order |
| `seo-content-calendar.md`                  | 30-day content engine — 8 posts targeting 27,000+ monthly searches |
| `referral-program-spec.md`                 | DB schema + Stripe integration + anti-abuse + email triggers     |
| `affiliate-program.md`                     | Commission tiers + outreach DMs + creative kit                   |
| `public-faq.md`                            | Source for `/faq` page and support email canned responses        |
| `changelog-page-spec.md`                   | Renders `CHANGELOG.md` as `/changelog` with RSS + email subs     |
| `status-page-spec.md`                      | Public uptime status page (Better Stack recommended)             |

## Reading order

If you're starting fresh, read in this order:

1. **`../../RELEASE_ROADMAP.md`** at the repo root — the parent doc this folder supports
2. **`branch-reconciliation.md`** — the prerequisite for any production deploy
3. **`domain-and-brand-identity.md`** — buy your domain
4. **`gcp-secret-manager-checklist.md`** — wire production secrets
5. **`pre-launch-smoke-test.md`** — verify the live deploy
6. **`pricing-page-proposal.md`** — finalize tiers + create Stripe products
7. **`beta-invitation.md`** — invite 10-20 beta users
8. **`launch-day-runbook.md`** — execute on launch Tuesday
9. **Marketing copy files** as you publish each channel

The remaining files (free tools, SEO content calendar, referral, affiliate, FAQ, changelog, status, Twilio, etc.) are post-launch growth items you can knock out across weeks 1-12.

## A note on tone

The drafts deliberately avoid:

- Pushy sales language ("Don't miss out", "Limited time only")
- AI-tells ("Are you tired of...", "In today's fast-paced world...")
- Excessive emojis (a couple is fine; ten is spam)
- Vague claims you can't back up ("the most powerful tool")

They favor:

- Specific, falsifiable claims ("I scanned 10,000 listings; 47 had >70% margin")
- Personal, founder-voice posts (people upvote founders, not brands)
- The actual product mechanics (people on r/Flipping want to know *how* it works)
- Real numbers wherever possible

When you personalize, **keep specifics specific**. "I made $X on this lamp" beats "I made hundreds" every time.

## What's NOT in this folder

- **Epic 14 (UI design system migration) work** — being done locally on your desktop per your direction. Not touching it.
- **Legal documents** (Privacy Policy, Terms of Service) — already exist at `app/privacy/page.tsx` and `app/terms/page.tsx`. Add SMS terms before flipping the SMS switch.
- **Code implementations** of the specs — the specs intentionally describe behavior, schema, and UX without writing the code. Build only what you decide to ship.
