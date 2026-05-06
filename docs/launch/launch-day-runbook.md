# Launch Day Runbook — Hour-by-Hour

The day Flipper.ai goes public on Product Hunt. Designed for a Tuesday launch (PH's algorithmically-best day).

**Time zone for this doc:** America/Los_Angeles (PT). Translate to your time zone.

---

## T-7 days

- [ ] All §3.1 P0 items from the roadmap are complete.
- [ ] Schedule the Product Hunt launch: https://www.producthunt.com/posts/scheduled (visible only to you until launch time).
- [ ] Get 10-15 friends to confirm they'll upvote/comment in the first hour. Send them the PH listing link the night before.
- [ ] Marketing copy in `docs/launch/` is reviewed and personalized.
- [ ] Sentry alert routing confirmed (you should get a Slack/email DM for any 5xx within 60s).
- [ ] Cloud Run set to `--min-instances=2` for launch week (avoid cold-start hits).
- [ ] Rate limiter sanity-checked at 10x your current peak (`src/lib/rate-limiter.ts`).

## T-24 hours (Monday afternoon)

- [ ] Final smoke test: signup, login, scan, opportunity, upgrade-to-paid using a fresh Gmail.
- [ ] Verify the Stripe webhook is firing in production (https://dashboard.stripe.com/webhooks → Recent events).
- [ ] Update `/health` page banner (if any) to "Operational".
- [ ] Pin a `<your-domain>/launch` page if you want a launch-specific landing.
- [ ] Pre-write your PH maker comment, your launch tweet thread, and the first round of replies (so you can paste them, not write them, on launch day).
- [ ] Set out-of-office on your day job email if you have one.
- [ ] Sleep early.

## T-1 hour (Monday 11 PM PT)

- [ ] Coffee, water, snacks in arms' reach.
- [ ] Two browser windows: PH listing (refresh-ready), Twitter (Tweetdeck or just the home feed).
- [ ] Tabs open: Sentry, Cloud Run logs, Stripe dashboard, your inbox, Slack.
- [ ] Phone notifications on for all of the above.

---

## Tuesday 12:01 AM PT — LAUNCH

- [ ] PH listing goes live (auto-published from your scheduled post).
- [ ] **Within 5 minutes:** post your maker comment on PH (template in `product-hunt-listing.md`).
- [ ] **Within 10 minutes:** send launch tweet thread (`twitter-launch-thread.md`).
- [ ] **Within 15 minutes:** post in r/Flipping (`reddit-launch-posts.md`). **Do not** post in 5 subs at once — Reddit will flag you. Do r/Flipping first; r/sidehustle and r/Entrepreneur space them out across the day.
- [ ] **Within 20 minutes:** ping your 10-15 pre-warned friends to upvote.
- [ ] **Within 30 minutes:** email beta users with a "we're live, here's a Lifetime Founder code" note.

## 1 AM - 3 AM PT (early-bird PH window)

- [ ] Reply to **every PH comment within 5 minutes** of it landing.
- [ ] Reply to every Twitter reply.
- [ ] Reply to every Reddit comment within 60 minutes (faster on r/Flipping).
- [ ] Watch Sentry. If error rate spikes (>0.5% of requests 5xx), open Cloud Run logs immediately.
- [ ] Watch the conversion funnel: signups → first-scan → paid. If first-scan rate <50%, there's a UX problem.

## 3 AM - 6 AM PT

- [ ] Refresh PH listing every 15 min. Note your rank.
- [ ] If you're not in top 5 by 4 AM PT, you're probably not in top 5 at midnight either. Push harder on Twitter and the secondary subs.
- [ ] Post in r/sidehustle (different post than r/Flipping).

## 6 AM - 9 AM PT (East Coast wakes up)

- [ ] Quote-tweet your launch thread with one specific user win or piece of feedback ("First user found a $X flip 3 hours after signup — here's the listing they bought").
- [ ] Post in r/Entrepreneur (warm framing, not product launch — see template).
- [ ] Submit to Hacker News: **wait until at least 6 AM PT** so there's overlap with US morning.
- [ ] Send a quick "we're live!" to any newsletters you've sponsored or contacts at flipper-adjacent communities.

## 9 AM - 12 PM PT (peak SaaS time)

- [ ] Indie Hackers product post: https://www.indiehackers.com/products
- [ ] Reply to the day's PH comments. Don't fall behind here.
- [ ] If a YouTuber or content creator has commented, DM them with a custom Lifetime Founder code as a thank-you.
- [ ] Check your Stripe dashboard. Live mode should be processing payments. If not — *fix immediately*.

## 12 PM - 3 PM PT

- [ ] Quick lunch but stay in the chair.
- [ ] Post in r/eBay or another secondary sub.
- [ ] Quote-tweet a positive PH/Twitter comment with thanks.
- [ ] If a notable account RTs you, reply with a thank-you tweet — it primes them to engage with your next launch too.

## 3 PM - 6 PM PT (East Coast prime time)

- [ ] If you have any flippers in your network with a Twitter/Reddit/TikTok presence, ask them now (not at midnight) for a public mention.
- [ ] First TikTok video uploaded if you're doing video: format = "I just launched my AI flipping tool and 800 people signed up in 12 hours" with a screen-record overlay.
- [ ] Update your launch tweet thread with a mid-day numbers update (Tweet #13: "Mid-day check-in: X signups, Y paid, $Z MRR").

## 6 PM - 9 PM PT (last push)

- [ ] Post a "thank you" tweet (not the same as the recap — that's for tomorrow). Pin it.
- [ ] Pin a thank-you comment on your PH listing (catches voters arriving late).
- [ ] If you're not in top 10 yet but are close, ask 2-3 close friends to vote *now* — late votes count too.

## 9 PM - 11:59 PM PT (close)

- [ ] One final Twitter reply sweep.
- [ ] Reply to any unanswered PH comments.
- [ ] Note your final PH placement and screenshot it.
- [ ] Save the day's funnel metrics: signups, paid, MRR, error count, top-3 referrer URLs.

---

## Wednesday morning (T+12 hours from launch end)

- [ ] **Recap thread on Twitter** with the actual numbers and the 1-2 most surprising things.
- [ ] Reply to overnight emails/comments/DMs.
- [ ] Bug-fix sprint: anything reported as a P0 in the first 24h gets fixed today.
- [ ] Submit to Hacker News if you didn't yesterday (`hacker-news-show-hn.md`).

---

## Thursday — Friday

- [ ] One follow-up Reddit post in a smaller, related sub (r/passive_income, r/garagesale).
- [ ] Reach out to 5-10 micro-YouTubers in the flipping niche with a "would you review this for free PRO access?" DM.
- [ ] Continue daily #buildinpublic tweets (the 30-day pipeline).
- [ ] First weekly retro with yourself: what worked, what didn't, what's the highest-leverage thing for week 2.

---

## Metrics to track on launch day

Set up a single live spreadsheet or Linear board and update hourly:

| Metric                     | Hourly check                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| PH rank                    | Refresh listing, log position                                      |
| PH upvotes                 | Logs trend                                                         |
| Total signups              | DB query or Vercel/Cloud Run analytics                             |
| First-scan rate            | (Users who ran ≥1 scan) / (signups). Should be ≥60%               |
| Conversion to paid         | (Paid users) / (signups). Day-1 expectation: 1-3%                  |
| MRR added                  | Stripe dashboard                                                   |
| 5xx rate                   | Sentry. Should be <0.1% of requests                                |
| AI cost                    | Per-provider dashboard or `metrics.ts` log aggregation             |
| Top referrer URLs          | Vercel/Cloud Run analytics or Plausible/Fathom                     |
| Top conversion source      | UTMs on launch links → Stripe checkout                             |

---

## What to do if things go sideways

### Scenario: PH rank stuck at #15-20

> **Don't panic.** Most launches end here. Continue posting; PH gives a meaningful traffic bump even at #15. Don't bother with paid PH boosting — it doesn't move the algorithm enough to matter.

### Scenario: One of the marketplaces breaks (selectors changed)

> **Don't pull the marketplace from the UI immediately** — instead, surface a banner: "[Marketplace X] is experiencing issues; we're working on it." Hot-fix the selector and ship. Most launches see at least one marketplace hiccup; users are forgiving if they see an honest banner.

### Scenario: 5xx rate spikes >2%

> **Roll back to the previous Cloud Run revision** (`gcloud run services update-traffic flipper-web --to-revisions=PREVIOUS_REVISION=100`). Investigate the new revision in a separate session. Don't try to hot-fix during a launch surge.

### Scenario: Stripe live mode fails on first paid signup

> **Email the user immediately**: "Saw your upgrade attempt failed — totally on us. I've manually upgraded your account; please don't try to re-pay until I confirm what went wrong." Then dig in. *Never* let the first paid customer hit a generic Stripe error and walk away.

### Scenario: Negative comment goes viral on PH or Twitter

> **Reply once, calmly, with substance**, then disengage. The worst thing you can do is fight back. Best response template: "Fair point about [X]. Here's what I'm doing about it: [Y]. If you have a specific listing or scenario where the scoring was wrong, please send it — I'll review it personally."

### Scenario: Reddit auto-mods remove your post

> Read the auto-mod's reason. Common ones: account too new, post too promotional, post needs a flair. Edit and resubmit per the rules. Do *not* argue with mods publicly — DM them politely if you think it was a mistake.

### Scenario: Cloud Run autoscaling can't keep up

> Bump `--max-instances` for the prod service. Default is usually 100; you can go to 1000+ for a launch day. Cost will be marginal if traffic dies down within a few hours.

### Scenario: GCP Secret Manager rate limit hit

> Caused by re-reading secrets on every request instead of caching them. Hot-fix: cache `EnvSecretManager` results for the lifetime of the Cloud Run instance. This *should* already be the case but verify.

---

## What success looks like

**Conservative:** 200-500 signups, 5-15 paid customers ($150-700 MRR), PH top 20.

**Realistic for a solo founder with this much polish:** 800-1,500 signups, 15-40 paid customers ($500-2,000 MRR), PH top 10.

**Stretch:** 3,000+ signups, 50+ paid ($2,500+ MRR), PH top 5, an HN front page hit, one viral tweet.

Anything in any of these brackets is a successful launch. The most important metric isn't day-1 numbers — it's the **week-2 retention rate**. If 40%+ of free users come back in week 2, you have a real product. Below that, focus week 2 on activation, not acquisition.
