# Product Hunt Listing — Flipper.ai

**Submission URL:** https://www.producthunt.com/posts/new
**Best launch time:** Tuesday, 12:01 AM PT (gives the post the full 24-hour window in the same time zone as PH's algorithm)
**Goal:** Top 5 of the day. Top 10 is great. Anything in the daily roundup gets ~2,000-5,000 hits.

---

## Tagline (60 char max)

**Primary:**
> AI scout that finds underpriced flips on 5 marketplaces

**Alternates:**
> The AI sidekick for everyone who flips on the side
> Find. Flip. Profit. Now with an AI that does the finding.
> Scans 5 marketplaces. Tells you what's worth buying.

## Title

**Flipper.ai — AI scout for marketplace arbitrage**

## Description (260 char max — show on cards)

I built an AI that scans Craigslist, eBay, Facebook Marketplace, OfferUp, and Mercari for underpriced items, scores them 0-100 for flip potential, and tracks the whole resale lifecycle. Multi-LLM analysis (Gemini + Groq + Claude). Free tier included.

## Long description (markdown supported)

**The 30-second pitch:**

If you've ever found a $40 lamp on Craigslist that sells for $400 on eBay, Flipper.ai is the AI that finds those for you. It scans 5 marketplaces continuously, identifies items by brand/model/condition with an LLM, verifies prices against eBay sold listings, and surfaces only the deals that are actually >50% undervalued.

**Why I built it**

I was spending 2-3 hours a day scrolling Craigslist and FB Marketplace looking for things to flip. Most of that time was filtering out junk. The actual *deal-finding* was maybe 10 minutes. So I automated the filter.

**How it works (3 layers, multi-provider AI):**

1. **Scraping** — 5 marketplaces, all with anti-detection, dedup, real-time SSE progress
2. **Identification** — A small LLM (GPT-4o-mini or Gemini Flash) extracts brand, model, condition, year
3. **Verification** — eBay sold-listings API gives the *actual* market value, not a guess from the asking price
4. **Sellability** — A second LLM call rates demand, days-to-sell, and authenticity risk
5. **Triage** — Only the top X% (default >50% margin) hit your dashboard

**What's in the box:**

- Multi-marketplace scanner (Craigslist, eBay, FB, OfferUp, Mercari)
- AI flippability score (0-100) with verified market data
- Kanban board for the flip lifecycle (Identified → Contacted → Purchased → Listed → Sold)
- AI-generated negotiation messages (with approval workflow before sending)
- Cross-platform resale listing generator (titles, descriptions, prices)
- Real-time SSE notifications + push + email + SMS
- Stripe-powered FREE / FLIPPER ($19) / PRO ($49) tiers
- Built on Next.js 16 / React 19 / Cloud Run / Firebase. Strict TypeScript, 99%+ test coverage.

**Pricing:**

- **FREE** — 1 saved search, 1 marketplace, 10 scans/day. Get the muscle memory.
- **FLIPPER** ($19/mo) — All 5 marketplaces, unlimited scans, real-time alerts.
- **PRO** ($49/mo) — Above + AI negotiation + cross-platform listing + analytics export.
- **Lifetime Founder** ($299, first 100 customers) — All PRO features forever, plus your name in the changelog.

**What's next:**

- Sponsored deal alerts from partner platforms (revenue, not noise)
- Public "Hot Deals" feed for PRO users (network effect)
- API access for tool builders ($0.01/call)

Try it free — no card required. Feedback welcome in the comments. I'll respond to every one today.

— Stephen

---

## Maker comment (post immediately after launch)

> Hey PH 👋
>
> I'm Stephen, the only person on this thing. Built Flipper.ai over the last [N] months because I was burning hours every weekend scrolling Craigslist for things to flip and 90% of that time was wading through junk listings.
>
> A few things I'd love feedback on:
>
> 1. **Score accuracy** — does the 0-100 flippability score line up with your gut? If you're a flipper, run a few searches and tell me where it disagrees with you.
> 2. **Marketplace coverage** — I picked 5 (CL, eBay, FB, OfferUp, Mercari). Anyone wishing for Poshmark, StockX, GOAT, Reverb, etc.?
> 3. **Pricing** — $19 / $49 feels right for the value, but I'm one founder. Tell me what you'd actually pay.
>
> If you find a $100+ flip using Flipper.ai today, screenshot it and DM me — I'll send you a free year.
>
> Thanks for the upvote. I'll be in this thread all day.

---

## Gallery image captions (PH allows 6 images + 1 video)

1. **Hero shot** — Dashboard with three high-margin opportunities visible, kanban in background
   *Caption:* "Your dashboard, after 24 hours. Three flips with verified margin > 60%."

2. **Scanner config** — A saved-search setup screen with categories, location, price range
   *Caption:* "One saved search. Five marketplaces. Real-time alerts."

3. **AI analysis card** — A single opportunity expanded showing brand/model/verified market price/sellability
   *Caption:* "The AI doesn't guess — it identifies the item, then pulls real eBay sold prices."

4. **Kanban** — All 6 lifecycle columns with cards, one being dragged
   *Caption:* "From discovery to sale. Drag to update status; profit gets calculated automatically."

5. **Negotiation message** — A draft AI-generated buyer message with the "Approve & send" button
   *Caption:* "AI drafts the message. You approve before it sends. No autonomous spam."

6. **Profit dashboard** — Analytics page with monthly P&L chart and ROI metrics
   *Caption:* "Track every flip. Monthly P&L, ROI by category, days-to-sell distribution."

## Video brief (60-90 seconds)

**Format:** ScreenStudio or Loom, no face cam needed (but better if you're in it).

**Script:**

> *[0-5s, cold open]* "Last week I bought this $40 mid-century lamp on Craigslist. It sold on eBay for $385. The reason I found it isn't because I'm good at flipping — it's because I built an AI that does the finding."
>
> *[5-15s]* "This is Flipper.ai. I tell it what I'm looking for [show search config]. It scans 5 marketplaces in real time."
>
> *[15-30s]* "It identifies each item with an LLM — brand, model, condition. Then it pulls actual eBay sold prices to verify market value. None of this 'estimated value = asking price × 1.3' nonsense."
>
> *[30-45s]* "Anything with >50% margin shows up in my dashboard. I move them through this kanban as I buy, list, and sell."
>
> *[45-60s]* "When I'm ready to message a seller, the AI drafts it. I approve. It sends. When I'm ready to relist, the AI writes the new title, description, and price."
>
> *[60-75s]* "Free tier gets you 1 saved search and 10 scans a day. $19/mo unlocks all 5 marketplaces."
>
> *[75-90s]* "It's flipperai.app. Comments are open."

---

## PH Pro tips

- **First 4 hours decide your day.** If you're not in the top 10 by 4 AM PT, you probably won't be in the top 10 at midnight either. Front-load votes from your network in the first hour.
- **Maker comment within 5 minutes.** The PH algorithm weights maker activity heavily.
- **Reply to every comment within 60 minutes.** This is the #1 differentiator between #5 and #1.
- **Don't beg for upvotes.** You'll get downvoted. Frame everything as "feedback" or "input".
- **Pin a thank-you comment around 8 PM PT** — captures voters who arrive late.
- **Cross-link from Twitter, but don't say "upvote me on PH".** Say "we're live on PH today, would love your feedback" with the link.
