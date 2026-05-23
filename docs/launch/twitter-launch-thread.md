# Twitter / X — Launch Thread + 30-Day #buildinpublic Pipeline

Twitter rewards consistency more than virality. A daily post for 30 days will out-perform one viral tweet 9 out of 10 times.

---

## The Launch-Day Thread (12 tweets)

Post this on Product Hunt launch morning, ~6 AM PT (catches both East Coast and Europe).

### 1/12 — Hook

> I built an AI that scans 5 used-goods marketplaces for underpriced items and tells me what's worth flipping.
>
> Today I'm launching it on Product Hunt.
>
> Here's how it works, what's hard about it, and the numbers I'm betting it on. 🧵

*(Reply with the PH link in the first reply, not the original tweet — Twitter algo throttles tweets with external links in the lead post.)*

### 2/12 — The problem

> Flipping items for resale is a real side hustle for ~50M Americans. The bottleneck is *finding deals*, not buying or selling them.
>
> Most flippers spend 6-10 hours/week scrolling Craigslist, FB Marketplace, OfferUp. 90% of that time is filtering junk listings.
>
> I wanted that time back.

### 3/12 — The naive approach (and why it doesn't work)

> The "obvious" solution: a bot that flags items priced below their category average.
>
> The problem: category averages are useless. A "vintage lamp" at $40 might be worth $20 (Walmart knockoff) or $400 (Eames original). The category multiplier can't tell.
>
> So I had to actually identify each item.

### 4/12 — The actual approach (3 layers)

> 1) **Scrape** — 5 marketplaces continuously
> 2) **Identify** — small LLM extracts brand/model/year/condition from the listing
> 3) **Verify** — pull *real* eBay sold-listing prices for that exact item
>
> Only items priced >50% below verified market value hit my dashboard.

### 5/12 — The cost problem

> Step 2 (LLM identification) was killing me. At Claude prices, a single user running 200 scans/day was costing me $3-4 in API calls.
>
> So I wrote a multi-provider abstraction. Gemini Flash (free) goes first. Falls back to Groq (free), then OpenAI, then Claude.
>
> Cost dropped ~80%.

### 6/12 — The architecture

> Stack:
> - Next.js 16 + React 19 + TypeScript strict
> - Cloud Run + Cloud SQL Postgres + Firebase Hosting/Auth
> - Prisma ORM, Stripe billing
> - Sentry, Resend, Stagehand (Gemini browser automation)
> - 2,400+ unit tests, 99% branch coverage
>
> Solo founder. ~[N] months of work.

### 7/12 — The scoring math

> Score = weighted sum of:
> - Verified margin (after platform fees)
> - Sold volume in last 30/60/90d (demand)
> - Days-to-sell distribution
> - Logistics penalty (heavy/fragile/local-only)
> - Authenticity risk (LLM judgment)
>
> Calibrated against 6 months of my own flip P&L.

### 8/12 — A real example

> Last week:
>
> Mid-century floor lamp, $40 on Craigslist.
>
> Flipper.ai identified it as a Laurel Lamp Co. mushroom lamp, 1970s. Pulled 23 eBay sold comps. Median: $385 over the last 60 days.
>
> Bought it. Sold it Tuesday. $385 - $40 - eBay fees = $295 profit.

### 9/12 — Pricing

> FREE — 1 saved search, 1 marketplace, 10 scans/day
> FLIPPER ($19/mo) — all 5 marketplaces, unlimited scans, real-time alerts
> PRO ($49/mo) — adds AI negotiation drafts + cross-posting + analytics export
> Lifetime Founder ($299, first 100) — PRO forever
>
> Free tier is real. No card.

### 10/12 — What I'd love help with

> 1) Tell me where the scoring disagrees with you. Bad scores are how I tune the model.
> 2) Marketplaces I missed: Poshmark, StockX, GOAT, Reverb. What should I add next?
> 3) If you're a flipper, run a saved search and screenshot the top result. I'll respond to every screenshot today.

### 11/12 — Thanks

> Standing on the shoulders of:
>
> @arvidkahl (Zero to Sold)
> @levelsio (the indie hacker patron saint)
> @marc_louvion (the indie OS playbook)
> @dvassallo (one-person businesses)
>
> Plus the r/Flipping community who tested the alpha and absolutely roasted v0.
>
> Owe you all a drink.

### 12/12 — Call to action

> If this helped, even a quick retweet of the first tweet would mean a lot — Twitter algo loves early engagement and we're trying to break PH's top 5 today.
>
> If you want to try it: `<your-domain>` — free, no card.
>
> See you in the replies.

---

## Reply (in thread, after tweet 1)

> Product Hunt: <PH link>
>
> Comments here or there — I'll reply to all of them today.

---

## 30-Day #buildinpublic Pipeline

One tweet per day for 30 days, written in advance, scheduled in Buffer/Typefully. The cadence and format both matter — pick one and stick to it.

### Day 1 (post-launch)

> Day 1 of running Flipper.ai publicly:
> - 47 signups
> - 2 paid (1 FLIPPER, 1 PRO)
> - $68 MRR
> - PH #[X] of the day
>
> The two paid users found me through @r/Flipping, not Product Hunt. Reddit > PH for revenue, PH > Reddit for vanity.

### Day 2

> Today's lesson: I had a P0 bug in production for ~2 hours this morning. The eBay comp lookup was timing out for a specific category. Sentry alerted me at 7:14 AM. Fix shipped at 9:08 AM.
>
> If you're a solo founder: monitoring isn't optional.

### Day 3

> Cost of running Flipper.ai today (47 users, ~600 scans):
>
> - Cloud Run: $1.20
> - Cloud SQL: $0.41
> - AI calls: $0.18 (multi-provider, Gemini handled 84% free)
> - Firebase Storage: $0.02
>
> Total: $1.81 / day. Revenue: $68. Margin works.

### Day 4-5

> Two screenshots side by side:
> 1) The original v0 dashboard (ugly, January)
> 2) Today's dashboard (glassmorphism, May)
>
> Same product, [N]x the conversion rate.

### Day 6

> Just shipped: pricing-strategy wizard.
>
> Asks the user about their flip goals (volume, margin, time-to-sale) and recommends an offer/listing-price strategy.
>
> Took 2 days. Took 6 weeks of conversations with users to know it was the right thing to build.

### Day 7

> First-week numbers:
> - 184 signups
> - 11 paid ($382 MRR)
> - 3 churned (no shows after free trial)
> - 1 user found a $740 flip and sent me a thank-you DM
> - 0 production outages

> What worked: r/Flipping post + PH + a single tweet from a flipping YouTuber.

### Days 8-30 (themes — pick one per day)

> Pick from:
>
> - **A real flip a user found this week** (with permission + screenshots)
> - **A line of code or design decision you're proud of** (engineers RT this)
> - **A failure** (people share failures more than wins on Twitter)
> - **A counter-intuitive metric** (e.g., "users who do nothing on day 1 are *more* likely to convert than users who run 10 scans" — if true)
> - **An ask** (a feature you're considering, what should you build next)
> - **A thank-you** (call out a user by handle if they shared something you used)
> - **A cost / revenue / churn update** (transparency wins on indie Twitter)
>
> Avoid:
>
> - Vague growth-hack tweets ("here's how I 10x'd my MRR")
> - Generic motivation ("keep building, never give up")
> - Subtweets of competitors

---

## A few format-level rules

1. **Hooks matter.** The first 8 words of every tweet decide whether anyone reads tweet #2. Lead with a number, a contrarian claim, or a specific thing.
2. **Numbers > adjectives.** "47 signups, $68 MRR" beats "great launch day".
3. **One image per thread minimum.** A dashboard screenshot inside the thread (not just the first tweet) keeps the algo engaged.
4. **Reply to every reply for the first 24 hours.** Even one-word replies. Twitter weighs your *response rate* heavily.
5. **Don't @-spam big accounts.** One thank-you tweet at the end of the launch thread is fine; tagging @levelsio in tweet #1 is begging.
