# Reddit Launch Posts

Reddit is the highest-fit traffic source for Flipper.ai but the **least forgiving** of marketing posts. Each subreddit has its own culture; the posts below are tailored.

**Universal rules:**

1. **Build karma first.** Don't post the product if your account has <100 comment karma in the target sub. Spend a week answering questions there before posting your own thing.
2. **Lead with utility, not the product.** The product is the punchline, not the headline.
3. **Disclose that you built it.** Reddit will find out anyway; getting flagged for hiding it is fatal.
4. **Be ready to give away free access.** "First 50 commenters get a free PRO month" is fair, generous, and within sub rules in most cases (always check sidebar first).
5. **Reply within 60 minutes for the first 4 hours.** Engagement = upvotes.
6. **Cross-post sparingly.** Different posts for different subs is fine; identical text in 5 subs is spammy.

---

## r/Flipping (1.3M members)

**Best day/time:** Tuesday-Thursday, 7-10 AM ET
**Sidebar rules to check:** Self-promotion, "no tools/services" days

### Title

> I built an AI that scans 5 marketplaces for underpriced items. Here's what it found in my city in 24 hours.

### Body

> Long-time lurker, first-time poster.
>
> I've been flipping part-time for [N] years and the most painful part was always the *finding*. I'd spend 2-3 hours on weekend mornings scrolling Craigslist and FB Marketplace, and 90% of that was filtering junk listings.
>
> So I automated the filter. The TL;DR: an AI that watches 5 marketplaces (CL, eBay, FB, OfferUp, Mercari), identifies what each item actually is (brand/model/condition), pulls the *real* eBay sold price, and only shows me deals where the asking price is >50% below verified market value.
>
> **Last 24 hours in my zip code (greater [city] area):**
>
> - **Mid-century floor lamp**, asking $40 on Craigslist. eBay sold comps: $300-450. Margin after fees: ~$280.
> - **Sealed Pokémon Hidden Fates ETB**, asking $80 on FB. Sold range: $180-220. Margin: ~$110.
> - **Vintage Bose 901 speakers**, asking $150 on OfferUp. Sold range: $400-600. Margin: ~$300.
> - **Set of 4 OEM BMW wheels**, asking $200 on CL. Sold range: $550-800. Margin: ~$320 (heavy/local-only — discounted in the score).
>
> The score weights margin, demand (sold-volume in the last 30/60/90 days), days-to-sell, and a logistics penalty for heavy/fragile/local-only items. There's a write-up of the scoring math here if you want it: `<your-domain>/docs/scoring-logic`.
>
> I built this for myself but figured a lot of you have the same problem. It's at `<your-domain>` — free tier (1 saved search, 10 scans/day, 1 marketplace) is enough to see if it works for your area.
>
> First 50 people who comment "send" — I'll DM you a free PRO month (all 5 marketplaces, unlimited scans). No credit card needed.
>
> Honest critique very welcome — the score's accuracy is what I want to keep tuning. If you scan your area and the top result is garbage, tell me and I'll dig in.

### Likely top-comment patterns + your replies

| Comment                                                | Reply                                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| "Cool — but isn't this against [marketplace] ToS?"     | "Each scan is user-initiated; we don't republish listings or build a side database. Each user only sees their own results. Happy to dig deeper on a specific marketplace if you have concerns." |
| "How accurate is the scoring?"                         | "Margin and verified eBay sold price are very accurate (it's just data lookup). Sellability/days-to-sell is squishier — it's an LLM judgment call on the listing description. I'm tracking error per category and tuning weekly." |
| "Free tier is too limited"                             | "Yeah, fair. Free is meant for 'see if it works for your area'; if it does, $19 unlocks all 5 marketplaces. Open to feedback on what should be in free vs paid."                                |
| "Will it find [niche category]?"                       | "If you can search for it on the source marketplace, the scanner picks it up. The AI scoring is tuned for general resale categories (electronics, furniture, tools, collectibles) — niche stuff like Reverb gear isn't covered yet but is on the list." |
| "I tried it and the results are bad"                   | "Sorry — DM me your saved search and I'll look at the actual listings it returned. Usually it's either a too-broad search or a category the scoring isn't tuned for yet."                       |

---

## r/sidehustle (500k members)

**Best day/time:** Sunday or Monday morning (people plan their week)
**Sidebar rules:** Self-promo allowed but prefer "I built X, here's the playbook" framing

### Title

> Spent 3 hours/weekend scrolling Craigslist for flips → automated it → made [$X] last month with [N] hours of work

### Body

> Cross-posting this from a longer thread on r/Flipping but figured the sidehustle crowd would care.
>
> The shape of my flipping side hustle for the last [N] months:
>
> - **Old:** 6-10 hours a week on Craigslist + FB Marketplace + OfferUp, manually filtering listings to find anything worth picking up. ROI per hour was maybe $15-25.
> - **New:** Saved searches in an AI tool I built that does the filtering for me. ~30 minutes of weekend review. ROI per hour is now closer to $80-120.
>
> The unlock was *not* better deals (the deals were always there). It was getting back the time I was burning on grunt search work.
>
> I open-sourced the algorithm logic at `<your-domain>/docs/scoring-logic` (the actual app costs money to run AI calls so it's a paid tool, but free tier exists).
>
> If you're flipping as a side hustle and don't want to write your own scraper:
>
> - 1 saved search + 10 scans/day = free.
> - All 5 marketplaces + unlimited = $19/mo.
>
> Happy to answer questions about the *side hustle* part more than the tool part — what's working/not working for the rest of you?

---

## r/Entrepreneur (3M members)

**Best day/time:** Monday morning
**Sidebar rules:** Self-promo only on certain days; check before posting. Prefer "build in public" framing.

### Title

> Solo founder, [N] months in, just hit [X] paying users — here's what's working and what isn't

### Body

> Building Flipper.ai for the last [N] months — solo. Just crossed [X] paying users last week. Want to share what's worked because the "first 100 users" advice online is mostly nonsense.
>
> **What it is:** An AI tool that scans used-goods marketplaces (Craigslist, eBay, FB, OfferUp, Mercari) for underpriced items, scores them for flip potential, and tracks the resale lifecycle.
>
> **What worked:**
>
> 1. **Building it for myself first.** I'm a flipper. I had the problem before I had a product. The first 20 users were people in my Reddit dms who saw me complain about the same problem.
> 2. **One channel at a time.** I tried Twitter, Reddit, PH, FB groups, and TikTok in week 1. Nothing worked. In week 3 I committed only to r/Flipping for 30 days. That was the unlock.
> 3. **Free tier with real value.** Free tier gets you the actual scoring on 1 saved search. People upgrade because the tool *is* useful at $0; they pay $19 to expand it, not unlock it.
> 4. **Multi-provider AI architecture.** I'm running ~80% of my LLM traffic on Gemini Flash's free tier. My COGS-per-user is <$0.10/mo at the free tier and <$2/mo at PRO. Made it possible to keep prices low and still have margin.
>
> **What didn't:**
>
> 1. **Paid ads in week 1.** $200 on FB ads → 3 signups → 0 paid. Killed it on day 4.
> 2. **Building features before users.** Spent 2 weeks on a "PRO Team" multi-seat tier nobody asked for. Have not had one team request to date. Should have asked first.
> 3. **Cross-posting identical content to 5 subreddits.** Got removed from 4. Now I write per-sub.
>
> **What's next:** Affiliate program (30% recurring), free top-of-funnel tools (eBay sold-price lookup, profit calculator), founder-led TikTok.
>
> Happy to share more if it's useful — specifically, the multi-provider AI abstraction was the most important architectural decision and I haven't seen it written up well anywhere.

---

## r/eBay (200k members)

**Best day/time:** Weekday afternoon
**Sidebar rules:** Strict on self-promo; lead with utility.

### Title

> Built a free tool that finds underpriced items and pulls the eBay sold price — feedback wanted

### Body

> Hi r/ebay — built this for myself and figured the rest of you might use it.
>
> **The pain:** I'd find a listing somewhere (Craigslist, OfferUp, FB) and want to know "is this actually a good deal?" I'd open eBay in another tab, search the item, sort by sold listings, ignore outliers, and average the realistic comps. Took 2-3 minutes per listing.
>
> **What I built:** A scanner that (1) watches 5 marketplaces for items I'm interested in, (2) for each item, automatically pulls the eBay sold-listing comps, (3) calculates the actual margin after fees, and (4) only shows me listings where margin is >50%.
>
> Free tier (1 saved search + 10 scans/day) is the eBay-comp lookup automation alone. That's the part most of you would care about.
>
> If you want to try it: `<your-domain>`. No card required.
>
> Particularly want feedback from this sub on:
>
> - Is the eBay sold-listing comp filtering reasonable? I'm using IQR outlier removal and weighting recent sales heavier — open to hearing what you'd do differently.
> - Are the platform fee defaults right (eBay 13%, Mercari 10%, FB 5%, OfferUp 12.9%, CL 0%)? They're configurable in settings if so.
> - What categories should I tune the scoring for next? Right now electronics/furniture/tools are best; collectibles is decent; clothing is weak.

---

## Smaller subs to hit (week 2+)

- **r/thrifting** (300k) — frame as "AI that helps thrifters spot resale opportunities"
- **r/garagesale** (50k) — frame as "tool for people doing garage-sale → resale arb"
- **r/RealEstateInvesting** (1.5M) — *only* if you build a real-estate angle (probably skip)
- **r/passive_income** (200k) — frame as "side income with reduced time commitment"
- **r/EtsySellers** (200k) — *only* if you add Etsy comps in the future
- **r/buildapc** (4M) — *only* if you tune for PC parts arbitrage and post a write-up about that specifically

Don't post to all of these in week 1. Pick one per week, write per-sub, build karma in the sub for 5+ days first.
