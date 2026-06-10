# Hacker News — Show HN Post

**Submission URL:** https://news.ycombinator.com/submit
**Best time:** Wednesday or Thursday, 6-9 AM PT (after PH but before EU users sleep)
**Audience:** Engineers and founders. They care about *how it's built*, not how much money you'll make.
**Goal:** Front page = ~10k visitors and ~$30-50k in attention. Top-30 of the day = a few thousand visitors.

---

## Title (80 char max)

**Show HN: Flipper.ai – AI scout that finds underpriced flips on 5 marketplaces**

(Alternates if the first feels too marketing-y for HN:)

> Show HN: I built a multi-LLM marketplace scanner that scores flip potential
> Show HN: Flipper.ai – multi-provider AI for marketplace arbitrage

## URL

`https://<your-domain>/`  *(use the bare domain, not a tracking link — HN strips UTM)*

## Text (optional but recommended for Show HN)

> Hi HN — I'm Stephen, solo founder.
>
> Flipper.ai scans 5 used-goods marketplaces (Craigslist, eBay, Facebook, OfferUp, Mercari) for items priced significantly below verified market value, then walks the user through buying, communicating with the seller, listing for resale, and tracking profit.
>
> The technical part you might find interesting:
>
> **Multi-provider AI with automatic fallback.** I started with Claude, hit rate limits, switched to GPT-4o-mini, hit cost overruns, and ended up writing a small abstraction (`src/lib/ai/`) that picks the best available provider per task. Gemini Flash is free and goes first. If it 429s or times out, the call falls through to Groq, then OpenAI, then Claude. 12 prompts are centralized as config objects so swapping models for a task is a one-line change. Cost dropped ~80% vs. the original Claude-only path.
>
> **Three-tier scoring.** A naive "estimated value = asking price × category multiplier" approach is circular and useless. Instead: (1) an LLM identifies the item (brand/model/year/condition), (2) eBay's Browse API gives real sold-listing prices, (3) a second LLM call rates demand, days-to-sell, and authenticity risk. Only items >50% below verified market value hit the user's dashboard. Cached 24h.
>
> **Scrapers as first-class modules.** Each marketplace lives in `src/scrapers/<platform>/` with a normalized listing shape, anti-detection (custom UA, rate limiting, selector fallbacks), and a Playwright fallback for JS-heavy sites. Mercari uses a reverse-engineered internal API as the primary path with browser-automation fallback on 429.
>
> **Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict. Cloud Run + Cloud SQL Postgres + Firebase Hosting/Auth/Storage. Prisma ORM. Stripe billing. Sentry for errors. ~2,400 unit tests with 99%+ branch coverage; 86 Playwright specs.
>
> **What's not done:** UI design system migration (epic 14, ~60% complete — that's why some pages still look like the old theme). Push/SMS notifications work but Twilio 10DLC registration isn't filed yet, so SMS is rate-limited.
>
> Free tier (1 saved search, 10 scans/day) is open — no card required. I'm in the comments today and tomorrow; happy to talk about any of the above. Particularly interested in:
>
> - Anyone solved the "what to do when a marketplace updates its DOM" problem in a way better than selector fallback + alert?
> - Anyone with a multi-provider LLM abstraction they like better than what I rolled?
> - Critique on the scoring math is welcome — there's a write-up in `docs/LISTING-DECISION-LOGIC.md` if you want the full algorithm.
>
> Thanks for reading.

---

## Comment thread response templates

HN comments tend to fall into a few buckets. Pre-write your responses so you can reply within 5 minutes — speed matters.

### "Isn't this just X tool?"

> Good catch — `<X>` is the closest thing I've found. The differences in my case are: (1) multi-marketplace (most do 1-2), (2) verified market data via eBay sold listings rather than asking-price-times-multiplier, (3) the multi-provider AI architecture which keeps cost low. Happy to compare side by side if you have a specific listing.

### "Won't [Marketplace] just block you?"

> Real risk. I respect rate limits, use realistic user agents, fall back to user-context-aware fetches where possible, and the architecture lets me drop a marketplace fast if a cease-and-desist arrives. eBay is via official API. Craigslist's robots.txt allows scraping for personal use. Facebook is the highest-risk one — that's why it's wrapped in Stagehand (Gemini-driven browser automation) rather than naive curl.

### "How much does this cost to run?"

> Per-user analysis cost is dominated by the AI calls. Gemini Flash (free tier) handles ~80% of routing. The Claude Tier-2 structural analysis is the expensive bit — ~$0.02-0.05 per analysis with the cache hit ratio I see in production (~70%). Total: most free users cost <$0.10/mo to serve. PRO users with heavy use are roughly $1-2/mo in AI costs against $49/mo revenue.

### "Why not just use [LLM] for everything?"

> Tried that. Two problems: (1) cost scales linearly with use, (2) when one provider has an outage, *all* of your users see errors at once. With the abstraction, an OpenAI outage just means everything routes through Gemini for a few hours.

### "Open source it?"

> Considering it. Probably not the whole thing (the scoring math + scraper anti-detection are the moat) but I'd open-source the multi-provider AI abstraction (`src/lib/ai/`) — it's been the single most useful piece of infrastructure I've built and I haven't found anything off-the-shelf I prefer. Drop a comment if you'd find that useful.

### "Why Next.js / React / Postgres?"

> Familiarity + speed of iteration. Solo founder; I picked the stack I could ship fastest in. Cloud Run + Postgres for the database, Firebase Auth for the social-login complexity I didn't want to write again. Standard SaaS shape.

### "How do you handle [legal concern]?"

> ToS prohibits unauthorized commercial use; we're not republishing listings or building a shadow database — we surface what the user is already legally entitled to see, in a more useful UI. Each scrape is initiated by the user. Happy to dig deeper if you have a specific concern.

---

## HN Pro tips

- **No begging for upvotes**, ever. HN downvotes hard. Don't say "upvote if you like it."
- **No marketing language** in the post text. "Game-changing", "powerful", "revolutionary" are all instant downvotes.
- **Engineering specifics earn upvotes.** Code samples, architectural choices, gotchas — all gold on HN.
- **Reply with substance.** "Great point!" without follow-up is worse than not replying.
- **Don't be defensive.** If someone says your scoring is circular, *agree if they're right*, then explain what you do instead. HN respects intellectual honesty more than persuasion.
- **Don't sock-puppet votes.** HN actively detects and shadow-bans this.
