# Free Tools — Top-of-Funnel Specs

The single highest-leverage SEO play for Flipper.ai is **public free tools at predictable URLs**. Each tool is built once and earns SEO traffic forever.

**Target outcome per tool:** ~500-2,000 organic visits/month within 6 months. ~3-7% convert to free signups; ~10-15% of those become paying customers.

**Implementation note:** Each tool is a single page on the existing Next.js app, no auth required, with a sticky CTA to "Find more deals like this with Flipper.ai". They reuse existing core libraries (`market-price.ts`, `roi-calculator.ts`, `subscription-tiers.ts`) — no new business logic.

---

## Tool 1 — eBay Sold Price Lookup

**URL:** `/tools/ebay-sold-price-lookup`
**SEO target:** "ebay sold price lookup", "ebay sold listings", "what is X worth on ebay"
**Estimated build effort:** 1 day

### What it does

User pastes an item description (or copies a listing URL) → page shows the median, range, and recent sold prices on eBay for that item.

### UX flow

```
┌─────────────────────────────────────────────┐
│  What did you find?                          │
│  ┌────────────────────────────────────────┐  │
│  │ e.g. "Sony WH-1000XM4 noise cancelling │  │
│  │       headphones, used good condition" │  │
│  └────────────────────────────────────────┘  │
│            [ Look up sold price → ]          │
└─────────────────────────────────────────────┘

         ↓ (after lookup, ~3-5s)

┌─────────────────────────────────────────────┐
│  Sony WH-1000XM4 — Used                       │
│                                                │
│  Median sold price:  $148                      │
│  Typical range:      $120 – $185               │
│  Last 30 days:       42 sold                   │
│  Demand trend:       Rising                    │
│                                                │
│  Recent sales:                                 │
│  • $145 · Used good · 2026-04-30              │
│  • $160 · Used like new · 2026-04-28          │
│  • $128 · Used good · 2026-04-26              │
│  • [ + 39 more — sign up to see all ]          │
│                                                │
│  ─────────────────────────────────────────     │
│  💡 Want to find items priced 50%+ below this  │
│     across 5 marketplaces, automatically?      │
│  [ Try Flipper.ai free → ]                     │
└─────────────────────────────────────────────┘
```

### Implementation

- **Frontend:** Single-page React component at `app/tools/ebay-sold-price-lookup/page.tsx`
- **API:** New `app/api/tools/ebay-sold-lookup/route.ts` — accepts `{query: string}`, returns sold listings summary
- **Backend logic:** Reuse `src/lib/market-price.ts` `getMarketPrice()` — already exists
- **Rate limiting:** 5 lookups per IP per hour for unauthenticated users (use `src/lib/rate-limiter.ts`)
- **Caching:** Same `AiAnalysisCache` 24h TTL — popular queries hit cache
- **Conversion tracking:** Click on "Try Flipper.ai free" → `?utm_source=tools&utm_medium=ebay-sold-lookup`

### SEO requirements

- Each successful lookup gets a permanent URL: `/tools/ebay-sold-price-lookup/sony-wh-1000xm4` (slugified query)
- That URL caches the result for 7 days and serves a static-ish page Google can index
- After 7 days, refresh the data on next visit
- Generates structured data (`schema.org/Product` + `Offer` with priceSpecification)

### Copy elements

**Page title:** `What's it worth on eBay? — Free eBay sold-price lookup`
**Meta description:** `Find the median sold price on eBay for any used item — instantly, free, no signup. Powered by Flipper.ai.`
**H1:** `eBay sold price lookup`
**Subhead:** `Type what you found. We'll show you what eBay is actually paying for it.`

**Sticky bottom-of-screen CTA on mobile:** `Find deals like this automatically →`

---

## Tool 2 — Flip Profit Calculator

**URL:** `/tools/flip-profit-calculator`
**SEO target:** "flip profit calculator", "ebay fee calculator", "reseller profit calculator"
**Estimated build effort:** 0.5 day

### What it does

User enters buy price, sell price, and platform → gets profit after fees, ROI %, and a comparison across all 5 platforms.

### UX flow

```
┌─────────────────────────────────────────────┐
│  Will this flip make money?                  │
│                                                │
│  Buy price        $ [   40   ]                │
│  Sell price       $ [  200   ]                │
│  Selling on       [ eBay        ▼ ]            │
│  Shipping cost    $ [   12   ]  (optional)    │
│                                                │
│            [ Calculate profit → ]              │
└─────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────┐
│  Profit:        $122  (305% ROI)              │
│                                                │
│  Breakdown:                                    │
│   Sell price:           $200                   │
│   eBay final-value fee: $26 (13%)             │
│   Payment processing:   $6 (2.9% + $0.30)     │
│   Shipping:             $12                    │
│   Buy price:            $40                    │
│   ─────────────────────────────                │
│   Net profit:           $116                   │
│                                                │
│  Compare across platforms:                     │
│   eBay:        $116 net  ← you picked          │
│   Mercari:     $128 net (10% fee)              │
│   Facebook:    $144 net (5% fee)               │
│   OfferUp:     $122 net (12.9% fee)            │
│   Craigslist:  $148 net (no fees)              │
│                                                │
│  💡 Flipper.ai automatically picks the         │
│     highest-profit platform when you list.     │
│  [ Try Flipper.ai free → ]                     │
└─────────────────────────────────────────────┘
```

### Implementation

- **Frontend:** `app/tools/flip-profit-calculator/page.tsx` (single page, all client-side logic — no API needed)
- **Backend logic:** Pure client-side using fee-rate constants from `src/lib/subscription-tiers.ts` (or wherever platform fees are defined)
- **Permalink:** `/tools/flip-profit-calculator?buy=40&sell=200&platform=ebay&shipping=12` so users can share
- **No rate limiting needed** — pure math, no backend

### Copy

**Page title:** `Flip Profit Calculator — Free eBay, Mercari, Facebook, OfferUp fee calculator`
**Meta description:** `Calculate your profit after platform fees on any flip. Compares eBay, Mercari, Facebook Marketplace, OfferUp, and Craigslist instantly.`

---

## Tool 3 — Marketplace Fee Comparison

**URL:** `/tools/marketplace-fee-comparison`
**SEO target:** "ebay vs mercari fees", "marketplace selling fees comparison", "where to sell with lowest fees"
**Estimated build effort:** 0.5 day

### What it does

A reference table comparing all 5 marketplaces' fee structures, with a price-point slider that recalculates which platform is cheapest at different sale prices.

### UX flow

```
┌──────────────────────────────────────────────────────────┐
│  Which marketplace has the lowest fees?                   │
│                                                            │
│  Slide to see fees at different sale prices:              │
│  $10 ──●─────────────────── $1,000                         │
│       (current: $200)                                      │
│                                                            │
│  ┌──────────────┬─────────┬──────────┬──────────┬──────┐  │
│  │ Marketplace   │ Final % │ Payment  │ Listing  │ Net  │  │
│  ├──────────────┼─────────┼──────────┼──────────┼──────┤  │
│  │ Craigslist    │ 0%      │ Cash     │ $0       │ $200 │  │
│  │ Facebook MP   │ 5%      │ 0%       │ $0       │ $190 │  │
│  │ Mercari       │ 10%     │ 2.9%+30¢ │ $0       │ $174 │  │
│  │ OfferUp       │ 12.9%   │ Included │ $0       │ $174 │  │
│  │ eBay          │ 13%     │ 2.9%+30¢ │ $0       │ $168 │  │
│  └──────────────┴─────────┴──────────┴──────────┴──────┘  │
│                                                            │
│  Best at this price: Craigslist (cash) or Facebook (paid)  │
│                                                            │
│  💡 Flipper.ai picks the highest-profit platform           │
│     when you cross-list.                                   │
└──────────────────────────────────────────────────────────┘
```

### Implementation

- **Frontend:** `app/tools/marketplace-fee-comparison/page.tsx`
- **Logic:** Pure client-side
- **Static fee data:** Hard-coded constants, but visible at the bottom: "Last updated: 2026-05-06. We update fees within 7 days of platform changes."
- **Add screenshot to social-share preview** — this comparison table is naturally tweetable

### Copy

**Page title:** `Marketplace Fee Comparison 2026 — eBay vs Mercari vs Facebook vs OfferUp vs Craigslist`
**Meta description:** `See which marketplace charges the lowest fees at every price point. Compare eBay, Mercari, Facebook, OfferUp, and Craigslist side-by-side.`

---

## Tool 4 — "What Sells Best on eBay" Category Browser

**URL:** `/tools/whats-hot-on-ebay`
**SEO target:** "what sells best on ebay 2026", "most profitable ebay categories", "ebay arbitrage categories"
**Estimated build effort:** 2-3 days (more data-heavy)

### What it does

A live-updated table showing the top 20 most profitable resale categories *right now* (last 30 days), based on your aggregate scoring data.

### UX flow

```
┌──────────────────────────────────────────────────────────┐
│  What's hot on eBay right now?                            │
│  Top 20 most profitable categories — last 30 days         │
│  (Last updated: 2026-05-06 11:42 UTC)                      │
│                                                            │
│  Category          Avg margin   Avg sell price   Sold/day  │
│  ─────────────────────────────────────────────────────     │
│  Vintage cameras   312%         $187             142       │
│  Cordless drills   245%         $89              231       │
│  Mid-century lamps 287%         $245             87        │
│  Sealed Pokémon    198%         $145             1,204     │
│  ...                                                        │
│                                                            │
│  💡 Flipper.ai watches all 5 marketplaces for items in    │
│     these categories and surfaces only the best deals.    │
│  [ Try Flipper.ai free → ]                                 │
└──────────────────────────────────────────────────────────┘
```

### Implementation

- **Backend:** Daily aggregate job that crunches your `Listing` + `Opportunity` tables to compute category averages. Output to a single JSON blob in Firebase Storage (`/public/whats-hot.json`).
- **Frontend:** Static-ish page that fetches the JSON and renders a sortable table
- **Privacy note:** Only aggregate data is published. No individual listings or user data exposed.

### Copy

**Page title:** `What's selling best on eBay right now — Top profitable categories (live)`
**Meta description:** `Real-time data on the most profitable categories to flip on eBay. Updated daily from millions of listings.`

> **Caveat:** This tool requires meaningful platform usage data to be useful. Don't ship until you have 10,000+ listings analyzed. If launching before that, fake-it-til-you-make-it with hand-curated category data updated weekly.

---

## Tool 5 — Listing Title Optimizer

**URL:** `/tools/ebay-title-optimizer`
**SEO target:** "ebay title optimizer", "ebay seo title", "how to write an ebay title"
**Estimated build effort:** 1 day

### What it does

User pastes a draft listing title → AI rewrites it for SEO + character efficiency.

### UX flow

```
┌─────────────────────────────────────────────┐
│  Rewrite your eBay title                     │
│                                                │
│  Your draft:                                   │
│  ┌────────────────────────────────────────┐  │
│  │ vintage lamp from the 70s, works great│  │
│  └────────────────────────────────────────┘  │
│  Category: [ Home & Garden    ▼ ]              │
│  Brand:    [ unknown          ▼ ]              │
│                                                │
│            [ Optimize → ]                      │
└─────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────┐
│  Optimized title (75/80 chars):                │
│                                                │
│  Vintage 1970s Mid-Century Modern             │
│  Mushroom Floor Lamp Working Original         │
│                                                │
│  [ Copy to clipboard ]                         │
│                                                │
│  Why this is better:                           │
│  • Added "1970s" — common search term         │
│  • Added "Mid-Century Modern" — high CTR      │
│  • Added "Mushroom" — distinctive style term  │
│  • "Working" reassures buyers vs "works"      │
│  • Removed "from the 70s" (redundant)         │
│                                                │
│  💡 Flipper.ai writes optimized titles for     │
│     every listing automatically.               │
│  [ Try Flipper.ai free → ]                     │
└─────────────────────────────────────────────┘
```

### Implementation

- **Backend:** New API route reuses `src/lib/title-generator.ts` (already exists)
- **Rate limit:** 3 per IP per day for unauth users
- **No caching:** each rewrite is unique to the user input

### Copy

**Page title:** `Free eBay Title Optimizer — AI-powered title rewriter for resellers`
**Meta description:** `Rewrite your eBay listing titles for maximum visibility and click-through. Free AI tool — no signup required.`

---

## Tool 6 — Resale Strategy Quiz

**URL:** `/tools/resale-strategy-quiz`
**SEO target:** "what should I flip", "best things to flip for profit", "is flipping right for me"
**Estimated build effort:** 1 day

### What it does

A 5-question quiz: "How much capital do you have?", "How much time per week?", "Where do you live?", "Do you have storage space?", "Are you OK with shipping?" → recommends a starter strategy + categories.

### UX flow

5-question wizard, then a results page with a personalized strategy report. Email-gate the *full* report (great for free-to-email-list conversion).

### Conversion mechanic

- Free quiz → see top recommendation
- Email-gate the full strategy doc (5 pages, PDF)
- Add to onboarding email drip
- Strong fit for paid traffic acquisition (low CPC, high signup rate)

---

## Tool 7 — "Flip Anatomy" Visual Walkthrough

**URL:** `/tools/anatomy-of-a-flip`
**SEO target:** "how to flip an item for profit", "flipping for beginners"
**Estimated build effort:** 0.5 day (mostly content)

### What it does

A visually-rich infographic-style page showing one real flip from scan to sale, with the actual numbers. Embeds Flipper.ai screenshots throughout.

This is **content marketing**, not a tool, but it's essentially a tool because it's interactive and shareable. Treat as long-tail SEO + Reddit-worthy content.

---

## Implementation order

If you can build one per week:

1. **Week 1:** Tool 2 (Profit Calculator) — easiest, fastest SEO juice, immediately tweet-able
2. **Week 2:** Tool 3 (Fee Comparison) — easy, shareable
3. **Week 3:** Tool 1 (Sold Price Lookup) — most powerful SEO engine, requires real backend
4. **Week 4:** Tool 5 (Title Optimizer) — content marketing for the eBay seller niche
5. **Week 5+:** Tools 4, 6, 7 as time allows

**Total ROI estimate:** 4-6 tools shipping over 4-6 weeks ≈ 4,000-12,000 organic monthly visitors by month 6, ≈ 200-800 free signups/month from tools alone, ≈ 30-120 paying customers.

---

## Cross-tool consistency rules

1. **Every tool has the same CTA design** — sticky bottom-of-screen on mobile, prominent below-fold on desktop.
2. **Every tool has the same UTM tag pattern** — `?utm_source=tools&utm_medium=<tool-slug>` so analytics can attribute correctly.
3. **Every tool tracks "tool used" event** in your analytics pipeline (Plausible / Fathom / Vercel Analytics — whichever you settle on).
4. **Every tool has a `<link rel="canonical">`** to prevent duplicate-content SEO issues from query string variants.
5. **Every tool generates JSON-LD structured data** (Tool/SoftwareApplication for the page; Product/Offer for content where applicable).
6. **Every tool has share buttons** for Twitter, Reddit (links to Flipping/sidehustle subs), and direct copy-link.
7. **Every tool's results include a small "Powered by Flipper.ai" badge** that's also a permalink — these become inbound links when users embed in blog posts.

---

## What NOT to do

- ❌ Hide tools behind email signup. Defeats the purpose.
- ❌ Make tools feel like "free trials with disabled features". They should feel *complete and useful at zero cost*.
- ❌ Build all 7 before shipping any. Ship tool 2 in week 1, observe traffic, iterate.
- ❌ Forget to add tool URLs to your sitemap (`app/sitemap.ts`).
- ❌ Build a tool that competes with the core product. e.g., a "free unlimited marketplace scanner" would cannibalize Pro.
