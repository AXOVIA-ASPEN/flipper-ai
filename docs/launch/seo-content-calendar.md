# SEO Content Calendar — First 30 Days

The single most underrated SaaS growth lever is **a content engine that publishes for years**. Build it now while you have time before launch traffic hits.

**Cadence:** 2 posts per week (Tuesday, Thursday). 1,500-2,500 words each. Each post takes ~3-5 hours from research → publish.

**Total output of this calendar:** 8 posts in 4 weeks. By month 6 (with continued cadence), you'll have ~50 published posts, ~80% of organic traffic will route through them, and individual posts will start ranking for thousands of monthly searches.

**Where they live:** `app/blog/[slug]/page.tsx` — Next.js MDX-rendered blog. Each post:
- Has `og:image` (use https://htmlcsstoimage.com/ or generate via Vercel OG)
- Has structured data (`Article` + `Author` + `Organization`)
- Is in the sitemap and submitted to Search Console
- Has prominent "Try Flipper.ai →" CTAs at the top, mid-point, and bottom
- Has 3-5 internal links to related posts and 2-3 to the product

---

## Keyword strategy (target → primary keyword)

I picked these based on **commercial intent + low-medium competition**. Verify in Ahrefs / Ubersuggest / Google Keyword Planner before committing.

| Post # | Target keyword                                    | Monthly volume (US, est.) | Difficulty | Intent             |
| ------ | ------------------------------------------------- | ------------------------- | ---------- | ------------------ |
| 1      | best apps for flipping items                       | 1,200                     | Low        | Commercial         |
| 2      | how to flip items on facebook marketplace          | 8,500                     | Medium     | Informational      |
| 3      | how to find deals on craigslist                    | 4,400                     | Low-Med    | Informational      |
| 4      | ebay vs mercari fees                               | 1,900                     | Low        | Commercial         |
| 5      | most profitable items to flip 2026                 | 6,500                     | Medium     | Informational      |
| 6      | how much money can you make flipping items         | 2,800                     | Low        | Informational      |
| 7      | beginners guide to reselling                       | 3,200                     | Low-Med    | Informational      |
| 8      | reselling software comparison                      | 480                       | Low        | Commercial         |

**Why these:**

- Posts 1, 4, 8 are **bottom-funnel commercial** — readers convert at higher rates (~5-10% to free signup)
- Posts 2, 3, 6 are **mid-funnel** — broader audience, lower conversion (~2-3%) but enormous traffic
- Posts 5, 7 are **top-funnel** — for cold readers; conversion is ~1-2% but they generate links and email subscribers

---

## Week 1

### Post 1 — "The 7 Best Apps for Flipping Items in 2026"

**Slug:** `/blog/best-apps-for-flipping-items-2026`
**Target keyword:** best apps for flipping items
**Type:** Listicle / comparison
**Length:** 2,000-2,500 words

**Outline:**

1. **Intro (250 words):** What flipping is, who it's for, why software matters. State the criteria you're judging on (search coverage, AI scoring, kanban tracking, fees, price).
2. **#1 Flipper.ai** (own product, lead with it) — 300 words on what it does, who it's best for, real example, screenshots. **Pricing breakdown.**
3. **#2-7 Competitors** — be fair and honest. Include direct competitors (BeezUp, Listing Mirror, GoDataFeed, ResellerAssistant, etc.) and adjacent tools (Vendoo, Crosslist).
   - For each: what it is, pros, cons, pricing, who should use it. ~200 words each.
4. **Comparison table** (sortable if you can manage it): app, price, marketplaces covered, AI scoring (Y/N), kanban, ROI tracking, mobile app
5. **How to choose:** 3 user-archetype recommendations (side hustler, full-time reseller, cross-poster)
6. **Conclusion + CTA:** "Try Flipper.ai free for 14 days"

**Why it ranks:** Listicles + comparison tables are evergreen for commercial-intent searches. Update annually.

**Internal links:** Tool 3 (fee comparison), Pricing page, Post 4 (eBay vs Mercari fees)

---

### Post 2 — "How to Flip Items on Facebook Marketplace: The 2026 Playbook"

**Slug:** `/blog/how-to-flip-on-facebook-marketplace`
**Target keyword:** how to flip items on facebook marketplace
**Type:** Step-by-step guide
**Length:** 2,500-3,000 words

**Outline:**

1. **Hook:** A real flip story (the lamp, with photos and numbers). Pull this from your own flips.
2. **Why FB Marketplace** (vs CL, OfferUp, eBay): pros and cons table
3. **Setting up your buyer profile** for trust signals — verified phone, profile photo, neighborhood verification
4. **The 5-search method:** How to set up saved searches that actually find deals (specific brand, narrow radius, sort by recent)
5. **Reading the listing for warning signs:** Stock photos, "everything must go" language, no item history
6. **Negotiation playbook:** Real message templates for offers. Include 3 examples (under-price by 15%, by 25%, and "is this still available?" probe).
7. **Pickup safety:** Public meet, daylight, payment method, video the handoff
8. **Listing the resale:** When to flip on FB itself vs cross-list elsewhere
9. **Common mistakes:** No-shows, lowball arbitrage, buying without checking comps
10. **CTA:** "Skip the manual filtering — Flipper.ai watches FB Marketplace for you"

**Why it ranks:** High volume (8,500/mo), low-medium difficulty. Existing top results are mostly thin AI content; well-researched original beats them.

**Internal links:** Tool 1 (sold price lookup), Tool 2 (profit calculator), Post 3 (Craigslist deals)

---

## Week 2

### Post 3 — "How to Find the Best Deals on Craigslist: Insider Methods That Still Work in 2026"

**Slug:** `/blog/how-to-find-deals-on-craigslist`
**Target keyword:** how to find deals on craigslist
**Type:** Tactics guide
**Length:** 1,800-2,200 words

**Outline:**

1. **Why CL still wins for flippers:** No fees, motivated sellers, less competition than FB
2. **The 6-search-string method** with literal example searches that work today (e.g., "moving must go" + "free")
3. **RSS hacks for instant alerts** (CL still has these)
4. **The keyword-blocklist trick:** Filtering out scams (-rent -wanted -looking)
5. **Time-of-day strategy:** Why Sunday morning is better than Friday afternoon
6. **Negotiation by text vs call:** When each works
7. **Cash-only meetups: payment safety**
8. **Reselling CL finds for higher margin elsewhere**
9. **CTA**

**Why it ranks:** Sub-rank competition is mostly outdated (2018-2022 articles). A 2026-current piece with specific search strings will outrank.

---

### Post 4 — "eBay vs Mercari Fees in 2026: Which Sells Cheaper Side-by-Side"

**Slug:** `/blog/ebay-vs-mercari-fees-2026`
**Target keyword:** ebay vs mercari fees
**Type:** Comparison
**Length:** 1,500-2,000 words

**Outline:**

1. **TL;DR table:** At $50, $100, $250, $500, $1,000 sale prices — net to seller on each platform
2. **eBay fee structure breakdown** (FVF + payment processing + listing + insertion + Promoted Listings)
3. **Mercari fee structure breakdown** (10% selling + 2.9%+30¢ payment + shipping label discount)
4. **Real-world example:** A $200 sale, full breakdown both ways
5. **When eBay wins:** High-value items ($500+), authenticated/branded items, completionists
6. **When Mercari wins:** Fashion, lower-price items, women-skewing audiences
7. **Hybrid: cross-list and pull when one sells**
8. **CTA:** "Flipper.ai cross-lists for you and pulls automatically"

**Why it ranks:** Direct head-to-head with high commercial intent. Embeds Tool 3 (fee comparison) for shareability.

---

## Week 3

### Post 5 — "The Most Profitable Items to Flip in 2026 (Based on 100,000+ Real Sales)"

**Slug:** `/blog/most-profitable-items-to-flip-2026`
**Target keyword:** most profitable items to flip 2026
**Type:** Data-driven listicle
**Length:** 2,500-3,500 words

**Outline:**

This is a **data journalism piece** — pull aggregate statistics from Flipper.ai's `Listing` + `Opportunity` tables. Anonymize.

1. **Methodology:** What data we used, the categories, the time window
2. **Top 25 categories by margin %** (table)
3. **Top 25 categories by velocity** (table — "how fast does it sell")
4. **Top 25 by total profit per flip** (table)
5. **Sub-niches that are working in 2026:**
   - Vintage cameras
   - Cordless tools (DeWalt, Milwaukee, Makita batteries)
   - Mid-century furniture
   - Sealed Pokémon cards
   - Vintage Nintendo systems
   - High-end audio (Bose, Sonos, KEF)
6. **Sub-niches that are dying:**
   - DVDs
   - Generic flat-screen TVs (price floor too low to flip)
   - iPhone 8 and older (no longer supported)
7. **What's emerging:** AI-related anything, smart-home Gen 1, etc.
8. **CTA**

**Why it ranks:** Original data = automatic backlinks from other flipping bloggers. Update annually for consistent traffic.

> If you don't have 100,000 listings yet at launch, **launch this post 3-6 months in** when you do. Until then, Post 7 (beginners guide) replaces it.

---

### Post 6 — "How Much Money Can You Actually Make Flipping Items?"

**Slug:** `/blog/how-much-money-can-you-make-flipping`
**Target keyword:** how much money can you make flipping items
**Type:** Realistic income explainer
**Length:** 2,000 words

**Outline:**

1. **TL;DR:** Realistic ranges for casual ($200-1,000/mo), part-time ($1,000-5,000/mo), and full-time ($5,000-20,000/mo)
2. **The income formula:** capital × velocity × margin × hours
3. **Side-hustle case study:** A profile of a $500/mo flipper (5 hours/week, $500 capital, 15% margin/week)
4. **Part-time case study:** A profile of a $3,000/mo flipper (15 hours/week, $3,000 capital)
5. **Full-time case study:** Profile, with caveats about taxes, healthcare, sustainability
6. **The honest downsides:** Time, capital lock-up, returns, no recurring income, taxes
7. **Sustainable systems:** Why software helps the math
8. **CTA**

**Why it ranks:** Bottom-of-funnel income search; conversions are people who already want to flip and need a "permission slip" to start.

---

## Week 4

### Post 7 — "The Beginner's Guide to Reselling: Everything You Need to Start in 2026"

**Slug:** `/blog/beginners-guide-to-reselling`
**Target keyword:** beginners guide to reselling
**Type:** Pillar / resource page
**Length:** 4,000-5,000 words (this is your link magnet)

**Outline:**

1. **What reselling is, isn't** (1 page)
2. **The 5-step lifecycle:** Find → analyze → buy → list → sell
3. **Where to find inventory** (links to Posts 2, 3, 4)
4. **How to evaluate an item** (links to Tool 1, Tool 2)
5. **Buying safely**
6. **Photographing your inventory**
7. **Listing on each marketplace** (links to Post 4)
8. **Pricing strategy**
9. **Communicating with buyers**
10. **Shipping and packaging**
11. **Taxes and bookkeeping**
12. **Tools and software** (links to Post 1, Post 8)
13. **Scaling beyond hobby**
14. **Resources & FAQs**
15. **CTA**

**Why it ranks:** Pillar pages are link magnets. Other writers cite them in their own posts → backlinks → SEO compounding.

---

### Post 8 — "Reselling Software Compared: Vendoo, Crosslist, BeezUp, and Flipper.ai"

**Slug:** `/blog/reselling-software-comparison-2026`
**Target keyword:** reselling software comparison
**Type:** Pure commercial comparison
**Length:** 2,500 words

**Outline:**

1. **What reselling software actually does** (categories: scanners, cross-listers, inventory managers, all-in-ones)
2. **Vendoo** — pros, cons, pricing
3. **Crosslist** — pros, cons, pricing
4. **List Perfectly** — pros, cons, pricing
5. **BeezUp** (enterprise) — pros, cons, pricing
6. **Flipper.ai** — pros, cons, pricing
7. **Comparison table** (sortable if possible)
8. **Buyer personas:**
   - Cross-poster who already finds inventory: probably Vendoo or Crosslist
   - Solo flipper who needs *finding* + *cross-listing*: Flipper.ai
   - Small reseller team: List Perfectly
   - Enterprise feed seller: BeezUp
9. **CTA**

**Why it ranks:** Direct commercial intent, you're competing for purchase decisions. Honest comparison earns trust *and* SEO juice (search engines reward comparison content over self-promotion).

---

## Beyond month 1 — sustainable cadence

After the launch month, switch to **1 deep post + 1 quick-win post per week**:

**Deep posts (Tuesdays):**
- Long-form, 2,000+ words, target a keyword with >2,000 monthly searches
- Examples: "How to flip tools on Facebook Marketplace", "iPhone flipping guide 2026", "Vintage camera flipping playbook"

**Quick-win posts (Thursdays):**
- 800-1,200 words, target a long-tail keyword with 200-500 searches
- Examples: "Are vinyl records still profitable to flip?", "How to spot fake Lego sets", "Can you flip a couch on Facebook Marketplace?"

This gives you ~100 posts in year 1, ~1M monthly organic visitors by month 12 (ambitious but achievable for a niche this specific).

---

## What NOT to do

- ❌ AI-generate posts and publish without editing. Google's spam filter has gotten good at detecting this in 2025-2026.
- ❌ Stuff keywords. Use them once in title, once in H1, 2-3x naturally throughout.
- ❌ Copy competitor outlines. Search engines spot it via embedding similarity.
- ❌ Skip internal linking. Each post should link to ≥3 other posts and ≥2 product pages.
- ❌ Forget the meta description. The first ~155 chars of your meta description are the snippet in search results — they directly affect CTR.
- ❌ Publish without an OG image. Posts without images get half the social CTR.
- ❌ Ignore Search Console. Submit each post manually for first-week indexing.
- ❌ Disable comments / discussion. Comment volume is a freshness signal for Google.

---

## Tracking

For each post, track in a single spreadsheet (or your analytics tool):

| Post URL | Published | Target KW | Position (week 1) | Position (month 1) | Position (month 6) | Visitors / mo | Signups / mo | Paid / mo |
| -------- | --------- | --------- | ----------------- | ------------------ | ------------------ | ------------- | ------------ | --------- |

Update monthly. Posts that stagnate at >position 20 after 3 months get a content refresh; posts that disappear from the top 50 get retired (with 301 redirect to the closest replacement).
