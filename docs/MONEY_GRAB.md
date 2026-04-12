# Flipper.ai — Maximum Profit Playbook

**Codename: MONEY_GRAB**
**Created: 2026-04-12**
**Author: Stephen Boyett + BMAD Agent Council**
**Goal: First revenue by April 19, $1K MRR by April 30, $10K MRR by Q3 2026**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Product Readiness](#2-current-product-readiness)
3. [Competitive Landscape](#3-competitive-landscape)
4. [Revenue Model & Pricing Strategy](#4-revenue-model--pricing-strategy)
5. [Phase 0: Ship It (Days 1-3)](#5-phase-0-ship-it-days-1-3)
6. [Phase 1: First Revenue (Days 4-14)](#6-phase-1-first-revenue-days-4-14)
7. [Phase 2: Growth Engine (Days 15-30)](#7-phase-2-growth-engine-days-15-30)
8. [Phase 3: Scale (Months 2-3)](#8-phase-3-scale-months-2-3)
9. [Phase 4: Long-Term Dominance (Months 4-12)](#9-phase-4-long-term-dominance-months-4-12)
10. [Self-Use Flipping Strategy](#10-self-use-flipping-strategy)
11. [Marketing Channel Playbooks](#11-marketing-channel-playbooks)
12. [Advertising Budgets & ROI Projections](#12-advertising-budgets--roi-projections)
13. [Affiliate Program Design](#13-affiliate-program-design)
14. [Landing Page Conversion Optimization](#14-landing-page-conversion-optimization)
15. [Technical Implementation Checklists](#15-technical-implementation-checklists)
16. [Revenue Projections & Milestones](#16-revenue-projections--milestones)
17. [Risk Mitigation](#17-risk-mitigation)
18. [Key Metrics Dashboard](#18-key-metrics-dashboard)

**PART 2: ELICITATION FINDINGS (Overrides Part 1 where conflicts exist)**

19. [Elicitation Methods Applied](#19-elicitation-methods-applied)
20. [Critical Findings — Consensus Across 3+ Methods](#20-critical-findings-consensus-across-3-methods)
21. [New Opportunities Discovered](#21-new-opportunities-discovered-constraint-inversion--empathy)
22. [Landing Page & Onboarding Revisions](#22-landing-page--onboarding-revisions-empathy-mapping)
23. [LTD Strategy Revision](#23-ltd-strategy-revision-pre-mortem--red-team)
24. [Revised Sprint Calendar](#24-revised-sprint-calendar-applying-all-findings)
25. [Revised Technical Implementation Priorities](#25-revised-technical-implementation-priorities)
26. [Geographic Saturation Risk](#26-structural-risk-geographic-saturation-red-team--unique-finding)
27. [Assumption Validation Checklist](#27-assumption-validation-checklist-do-before-spending-money)
28. [Founding Member Pricing Revision](#28-founding-member-pricing-revision)
29. [GTM Strategy Integration](#29-gtm-strategy-integration-from-docsgo_to_market_strategymd) — referral program, eBay price checker, Discord, email drip, Reddit ads, pitfall reminders

**PART 3: AI AUTOMATION STRATEGY (Minimize founder workload)**

30. [The Automation Thesis](#30-the-automation-thesis) — 80 hrs/week to 20 hrs/week
31. [Claude Code as AI Marketing Department](#31-claude-code-as-your-ai-marketing-department) — replaces $270+/mo in external tools
32. [Built-In AI Features](#32-built-in-ai-features-build-into-flipperai) — digest, chatbot, retention, social posts
33. [The Ultra-Lean Daily Routine](#33-the-ultra-lean-daily-routine-with-claude-code) — 2.5 hrs/day schedule
34. [Total Cost: Ultra-Lean AI Stack](#34-total-cost-ultra-lean-ai-stack) — $11-60/mo total
35. [Implementation Sprint: AI Build Order](#35-implementation-sprint-ai-features-build-order) — 37 hours of dev work

**PART 4: THE DEFINITIVE EXECUTION PLAN (Read this. Do this. Ignore the rest.)**

36. [Resolved Decisions](#36-resolved-decisions-no-more-contradictions) — all contradictions settled
37. [The Essential 7 Actions](#37-the-essential-7-actions-everything-else-can-wait) — the ONLY things that matter
38. [Definitive Calendar (Days 1-45)](#38-definitive-calendar-days-1-45) — one calendar, no conflicts
39. [Pivot Decision Framework](#39-pivot-decision-framework-if-things-go-wrong) — when to change course
40. [Legal Checklist](#40-legal-checklist-do-before-day-7) — do before going public
41. [Analytics Setup](#41-analytics-setup-do-during-days-1-3) — measure what matters
42. [Month 2+ Expansion](#42-month-2-expansion-only-after-hitting-day-30-targets) — unlock tiers
43. [Second-Order Rules](#43-second-order-rules-keep-these-visible) — 8 rules to prevent cascading failures

---

## 1. Executive Summary

Flipper.ai is a **92% complete, production-ready** AI-powered marketplace arbitrage SaaS. It scrapes 5 marketplaces (Craigslist, eBay, Facebook Marketplace, Mercari, OfferUp), scores flip potential with AI, and tracks the full resale lifecycle. The nearest direct competitors (ProfitPath, Flipmine) have <$1M revenue and <5K users combined. The local marketplace flipping niche is the **fastest-growing segment** of a $200B+ global recommerce market with 10-15 million US resellers.

**The product is built. The market is hungry. The competition is weak. It's time to ship and collect.**

### Why This Will Work

| Factor | Status |
|--------|--------|
| Product complete? | 92% — only Stripe config + DNS needed |
| Market demand? | 10-15M US resellers, fastest-growing segment underserved |
| Competition? | Nearest local-flip competitors <$1M ARR, <5K users |
| Pricing validated? | $19-49/mo matches market willingness to pay |
| Payment infrastructure? | Stripe fully integrated, tiers gated, webhooks wired |
| Growth playbook? | YouTube affiliates + Reddit + paid ads — proven by every competitor |

### The Money Path (Fastest Route)

```
Day 1-3:   Configure Stripe + Domain + Deploy = LIVE
Day 4-7:   Use the tool yourself. Find flips. Document profits. Create content.
Day 7-14:  Soft launch — Reddit, Facebook groups, personal network. First paying customers.
Day 14-21: YouTube outreach + affiliate program live. Content machine running.
Day 21-30: Paid ads begin. Product Hunt launch. Target: $1K MRR.
Month 2-3: Scale ads, onboard affiliates, limited lifetime deal. Target: $3-5K MRR.
Month 4-6: Viral content + word of mouth + SEO. Target: $10K MRR.
```

---

## 2. Current Product Readiness

### What's Shippable TODAY

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page with pricing | DONE | Hero, features, 3 tiers, CTAs |
| User registration & auth | DONE | Firebase Auth, email + OAuth (Google, GitHub, Facebook) |
| Onboarding wizard | DONE | Preferences, marketplace selection |
| 5 marketplace scrapers | DONE | Craigslist, eBay, Facebook, Mercari, OfferUp |
| AI scoring & analysis | DONE | Claude + OpenAI, two-layer cache |
| Value estimation engine | DONE | Algorithmic scoring 0-100, category multipliers, brand detection |
| Market intelligence | DONE | Comparable sales, sold volume, demand analysis |
| Full dashboard | DONE | Kanban lifecycle, filtering, analytics, real-time SSE |
| Stripe checkout | DONE | Session creation, customer portal, webhooks |
| Tier enforcement | DONE | Runtime gating on scans, marketplaces, features |
| Email notifications | DONE | Welcome, payment failures, monitoring events |
| User settings | DONE | Fees, notifications, preferences |
| Messaging system | DONE | AI message gen, negotiation, approval workflow |
| Meeting logistics | DONE | Google Calendar, Google Maps routes |
| Push notifications | DONE | FCM push, Twilio SMS |
| CI/CD pipeline | DONE | GitHub Actions -> Firebase Hosting + Cloud Run |
| Error tracking | DONE | Sentry configured |

### What's Missing (Launch Blockers)

| Blocker | Effort | Priority |
|---------|--------|----------|
| Real Stripe price IDs (currently placeholders) | 30 min | CRITICAL |
| Domain DNS pointing to Firebase Hosting | 1 hour | CRITICAL |
| Email DNS for Resend (transactional emails) | 30 min | CRITICAL |
| Production deployment verification | 1 hour | CRITICAL |
| Billing flow smoke test | 1 hour | HIGH |

**Total time to launch: ~4 hours of configuration work.**

---

## 3. Competitive Landscape

### Direct Competitors (Local Marketplace Flipping)

| Competitor | Est. Revenue | Users | Pricing | Weakness |
|------------|-------------|-------|---------|----------|
| **ProfitPath** | <$1M | 1-5K | $19-99/mo | Early stage, limited AI |
| **Flipmine** | <$500K | <2K | ~$29/mo | Very early, small team |
| **FlipAlerts** | <$500K | Small | $15-30/mo | Alert-only, no lifecycle |
| **Hammoq** | ~$2M | 3-5K | ~$49/mo | Focus on listing, not sourcing |

### Adjacent Competitors (Amazon FBA Focus — Different Niche)

| Competitor | Est. ARR | Users | Pricing |
|------------|----------|-------|---------|
| **Tactical Arbitrage** | $15-25M | 20-30K | $59-95/mo |
| **Jungle Scout** | $50-70M | 500K+ | $29-84/mo |
| **Helium 10** | $50-80M | 1M+ | $29-229/mo |
| **SellerAmp** | $3-5M | 10-15K | $17-30/mo |
| **BuyBotPro** | $2-4M | 5-10K | ~$30/mo |

### Cross-Listing Tools (Adjacent, Not Direct Competitors)

| Tool | Est. ARR | Users | Pricing |
|------|----------|-------|---------|
| **List Perfectly** | $10-15M | 50K+ | $29-69/mo |
| **Vendoo** | $8-12M | 30-40K | $10-45/mo |

### Our Competitive Moat

1. **Multi-marketplace LOCAL scanning** — competitors focus on one platform or Amazon
2. **AI-powered scoring + analysis** — not just price alerts, but intelligent flip assessment
3. **Full lifecycle tracking** — discovery to sale to profit. No competitor does this end-to-end
4. **5 scrapers out of the box** — broadest local marketplace coverage
5. **eBay Browse API** — real sold data, not scraped estimates

### Market Size

- **10-15 million** US resellers (casual to full-time)
- **2-3 million** consider reselling a significant income source
- **$200B+ global** recommerce market, projected $350B+ by 2028
- **Local marketplace flipping** is the fastest-growing segment
- Part-time flippers earn $500-3,000/mo; full-timers earn $5K-10K+/mo

---

## 4. Revenue Model & Pricing Strategy

### Current Tier Structure (Already Implemented)

| Feature | FREE ($0) | FLIPPER ($19/mo) | PRO ($49/mo) |
|---------|-----------|------------------|--------------|
| Scans per day | 10 | Unlimited | Unlimited |
| Marketplaces | 1 | 3 | All 5 |
| Search configs | 3 | 20 | Unlimited |
| Active jobs | 1 | 5 | 20 |
| AI analysis | Basic | Full | Full |
| Price history | No | Yes | Yes |
| Messaging | No | Yes | Yes |
| eBay cross-listing | No | No | Yes |
| Meeting logistics | No | No | Yes |

### Pricing Strategy Decisions

**Keep current pricing.** Research validates $19-49/mo is the sweet spot:
- Part-time flippers ($1-5K/mo revenue) pay $20-50/mo for tools
- Full-time flippers ($5K+/mo) pay $50-150/mo
- Our tiers map perfectly to these segments

**Add annual billing at 20% discount:**
- FLIPPER Annual: $182/year ($15.17/mo effective) — saves $46
- PRO Annual: $470/year ($39.17/mo effective) — saves $118
- Annual billing reduces churn and provides upfront cash

**Add a "Founding Member" beta price (time-limited):**
- FLIPPER Founding: $14/mo (locked for life) — creates urgency
- PRO Founding: $39/mo (locked for life)
- Cap at first 100 customers, then price goes to standard

### Revenue Math

| Scenario | FLIPPER Users | PRO Users | MRR | ARR |
|----------|-------------|-----------|-----|-----|
| Minimum viable | 30 | 10 | $1,060 | $12,720 |
| Month 3 target | 80 | 30 | $2,990 | $35,880 |
| Month 6 target | 200 | 80 | $7,720 | $92,640 |
| Month 12 target | 500 | 200 | $19,300 | $231,600 |
| Scale target | 2,000 | 500 | $62,500 | $750,000 |

### Lifetime Deal Strategy (Cash Injection — Month 2)

- **Self-hosted LTD** (NOT AppSumo — keep 100% vs their 70% cut)
- Price: $79 one-time for FLIPPER-equivalent access
- Cap: 200 seats, then closed permanently
- Revenue: 200 x $79 = **$15,800 cash injection**
- Market in LTD Facebook groups (Lifetime Deals & Software: 50K+ members)
- Use this cash to fund advertising

---

## 5. Phase 0: Ship It (Days 1-3)

**Objective: Get the product live and accepting payments.**

### Step-by-Step: Human Tasks

#### Day 1: Stripe Configuration (30 minutes)

- [ ] **Step 1:** Log into [Stripe Dashboard](https://dashboard.stripe.com)
- [ ] **Step 2:** Go to Products > + Add product
- [ ] **Step 3:** Create "Flipper Plan":
  - Name: `Flipper`
  - Description: `Unlimited scans, 3 marketplaces, AI analysis, price history, messaging`
  - Pricing: $19.00 / month (recurring)
  - Also add annual price: $182.00 / year (recurring)
  - Copy the monthly price ID (starts with `price_`)
- [ ] **Step 4:** Create "Pro Plan":
  - Name: `Pro`
  - Description: `Everything in Flipper plus all 5 marketplaces, eBay cross-listing, meeting logistics, 20 active jobs`
  - Pricing: $49.00 / month (recurring)
  - Also add annual price: $470.00 / year (recurring)
  - Copy the monthly price ID
- [ ] **Step 5:** Go to Developers > Webhooks
  - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
  - Select events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
  - Copy the webhook signing secret
- [ ] **Step 6:** Update your production environment variables (GCP Secret Manager / `.env.production`):
  ```
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRICE_FLIPPER=price_...  (monthly)
  STRIPE_PRICE_PRO=price_...      (monthly)
  ```
- [ ] **Step 7:** Enable Stripe Customer Portal at Settings > Billing > Customer portal
  - Enable: update subscription, cancel subscription, view invoices
  - Set cancellation to "at end of billing period"

#### Day 1: Domain & DNS (1 hour)

- [ ] **Step 1:** Purchase domain if not owned (recommended: `flipper-ai.com` or `getflipper.ai`)
  - Namecheap, Google Domains, or Cloudflare Registrar
- [ ] **Step 2:** In Firebase Console > Hosting > Custom domain:
  - Add your custom domain
  - Firebase will provide DNS records (A records + TXT verification)
- [ ] **Step 3:** In your domain registrar's DNS settings:
  - Add the A records and TXT record Firebase provides
  - Add `www` redirect to apex domain
  - Wait for propagation and SSL provisioning (usually 5-30 minutes)
- [ ] **Step 4:** Verify HTTPS is active (Firebase auto-provisions SSL)
- [ ] **Step 5:** Configure Resend email DNS:
  - Go to [Resend Dashboard](https://resend.com/domains)
  - Add your domain
  - Add the 3 DNS records Resend provides (SPF, DKIM, DMARC)
  - Verify domain
  - Update `.env`: `EMAIL_FROM=noreply@yourdomain.com`

#### Day 2: Production Deployment & Verification (2 hours)

- [ ] **Step 1:** Ensure all environment variables are set (GCP Secret Manager for Cloud Run, `.env` for Firebase Functions):
  - Firebase config (client + admin)
  - Database URL (Cloud SQL connection string)
  - Stripe keys (live mode)
  - OpenAI API key
  - Anthropic API key
  - Resend API key
  - Sentry DSN
  - hCaptcha keys
- [ ] **Step 2:** Push to main branch to trigger CI/CD deployment
  ```bash
  git checkout main
  git merge django-main  # or your working branch
  git push origin main
  ```
- [ ] **Step 3:** Monitor GitHub Actions deployment logs + Firebase/Cloud Run logs for errors
- [ ] **Step 4:** Verify the landing page loads at your domain
- [ ] **Step 5:** Verify login/registration works
- [ ] **Step 6:** Verify onboarding wizard completes

#### Day 2-3: Billing Smoke Test (1 hour)

- [ ] **Step 1:** Register a new test account
- [ ] **Step 2:** Click "Upgrade to Flipper" — verify Stripe Checkout loads
- [ ] **Step 3:** Complete purchase with Stripe test card (`4242 4242 4242 4242`)
  - **IMPORTANT:** Use Stripe test mode first, then switch to live
- [ ] **Step 4:** Verify webhook fires and user tier updates to FLIPPER
- [ ] **Step 5:** Verify feature gating — can now access 3 marketplaces, messaging, etc.
- [ ] **Step 6:** Open Stripe Customer Portal — verify subscription visible
- [ ] **Step 7:** Test cancellation flow — verify downgrade to FREE at period end
- [ ] **Step 8:** Switch Stripe to LIVE mode and repeat steps 2-4 with a real $1 charge (create a $1 test price), then refund

#### Day 3: Go-Live Checklist

- [ ] Landing page loads with correct pricing
- [ ] Registration + login works
- [ ] Free tier features accessible
- [ ] Stripe checkout works (live mode)
- [ ] Webhook updates user tier correctly
- [ ] At least 1 scraper returns results
- [ ] AI analysis returns scores
- [ ] Dashboard displays listings
- [ ] Email notifications sending (welcome email)
- [ ] Sentry capturing errors (trigger a test error)
- [ ] Customer portal accessible
- [ ] All pages mobile-responsive

**MILESTONE: Product is LIVE and accepting payments.**

---

## 6. Phase 1: First Revenue (Days 4-14)

**Objective: Get first paying customers and generate content from real flipping.**

### Track A: Use Flipper Yourself (Days 4-14)

This is the single most important thing you can do. Using your own product:
1. Proves it works (or reveals bugs before customers find them)
2. Generates real profit stories for marketing content
3. Creates screenshots and video footage for ads
4. Builds credibility — "I use this tool myself and made $X"

#### Daily Flipping Routine

- [ ] **Morning (30 min):** Run scans on all 5 marketplaces for your local area
- [ ] **Review results:** Check top-scored items (70+ score), verify AI analysis
- [ ] **Contact sellers:** Use the messaging system for items you want to flip
- [ ] **Document EVERYTHING:**
  - Screenshot the listing with Flipper's score
  - Screenshot the purchase/pickup
  - Screenshot the resale listing
  - Screenshot the sale/profit
  - Record short phone videos of pickups and items
- [ ] **Track your P&L:** Use Flipper's lifecycle tracking (IDENTIFIED > PURCHASED > LISTED > SOLD)

#### Content You Need to Create from Flipping

| Content Piece | Purpose | Platform |
|--------------|---------|----------|
| "I found X for $Y and sold it for $Z" stories (5-10) | Social proof | Reddit, Twitter, TikTok |
| Before/after profit screenshots | Ads, landing page | All platforms |
| 60-second "Flipper found this deal" screen recording | Product demo | YouTube, TikTok, landing page |
| "My first week using AI to find flips" blog post | SEO, Reddit | Blog, Reddit |
| Weekly P&L summary | Building in public | Twitter, Indie Hackers |

### Track B: Soft Launch (Days 7-14)

#### Personal Network (Day 7)

- [ ] **Step 1:** Make a list of everyone you know who resells or would try it:
  - Friends, family, coworkers who've mentioned flipping/thrifting
  - Anyone who sells on eBay, Facebook Marketplace, Poshmark
  - People in your social circle who want side income
- [ ] **Step 2:** Send personal messages (NOT mass blast):
  ```
  Hey [Name], I just launched an AI tool that finds underpriced items
  on Craigslist, Facebook Marketplace, eBay, Mercari, and OfferUp for
  resale. I've been using it myself and found [specific example]. Would
  you want to try it? I'll give you founding member pricing — $14/mo
  locked in for life (normally $19). [link]
  ```
- [ ] **Step 3:** Target 20-30 personal outreach messages
- [ ] **Step 4:** Offer to do a 15-min screen share demo for anyone interested

#### Reddit Soft Launch (Days 8-10)

**IMPORTANT: Reddit hates self-promotion. Follow this sequence exactly.**

- [ ] **Step 1 (Day 8):** Post in r/Flipping — a VALUE post, not a product pitch:
  ```
  Title: "I analyzed 500 local marketplace listings with AI — here's
  what actually flips for profit in [your city]"

  Body: Share genuine data from your own Flipper usage. Top categories,
  average margins, which marketplace had the best deals, surprising
  finds. Include specific examples with prices. Make it genuinely
  useful. Do NOT mention your tool in the post.
  ```
- [ ] **Step 2 (Day 8-9):** Engage authentically with every comment. Answer questions. Be helpful.
- [ ] **Step 3 (Day 9-10):** When someone inevitably asks "how did you do this?" or "what tool?":
  ```
  "I actually built a tool to do this — it scans 5 marketplaces
  and uses AI to score flip potential. Happy to share if you want
  to check it out, just DM me."
  ```
- [ ] **Step 4:** DM interested users with your link + founding member pricing
- [ ] **Step 5:** Repeat in r/sidehustle, r/Reselling (space these out over days, don't spam)

#### Facebook Groups (Days 10-14)

- [ ] **Step 1:** Join these groups (if not already a member):
  - BOLO Flippers (100K+ members)
  - Flipping for Profit (30K+)
  - Resellers Unite (20K+)
  - eBay Sellers (50K+)
  - Goodwill / Thrift Flippers (40K+)
- [ ] **Step 2:** Spend 2-3 days answering questions, commenting, being helpful
- [ ] **Step 3:** Post a "case study" with your real flipping results:
  ```
  "This week I used AI to scan 5 marketplaces simultaneously.
  Found 12 items, bought 4, sold 3 so far for $187 total profit.
  Here's the breakdown with screenshots..."

  [Include before/after screenshots from your Flipper dashboard]
  ```
- [ ] **Step 4:** When asked about the tool, share the link
- [ ] **Step 5:** Offer a founding member discount to group members

#### Early Metrics Target (End of Day 14)

| Metric | Target |
|--------|--------|
| Registered users | 50-100 |
| Paying customers | 5-15 |
| MRR | $100-300 |
| Personal flipping profit | $200-500 |
| Content pieces created | 10+ |

---

## 7. Phase 2: Growth Engine (Days 15-30)

**Objective: Scale to $1K MRR. Launch marketing machine.**

### YouTube Influencer Outreach

YouTube is the #1 growth channel for resale tools. Every major competitor grew through YouTube affiliates.

#### Target Influencers (Outreach List)

| Channel | Subscribers | Focus | Contact Priority |
|---------|-----------|-------|-----------------|
| Hairy Tornado | ~300K+ | General flipping | HIGH |
| Ralli Roots | ~250K+ | eBay reselling | HIGH |
| Daily Refinement | ~200K+ | eBay/Amazon | MEDIUM |
| Caleb Boxx | ~200K+ | eBay reselling | MEDIUM |
| Hustle at Home Mom | ~100K+ | Part-time reselling | HIGH |
| Reseller Rabbit | ~100K+ | Multi-platform | HIGH |
| The Flipping Couple | ~50K+ | Couples reselling | MEDIUM |
| Micro-influencers (10-50K subs) | Various | Various | HIGH (cheaper, better ROI) |

#### Outreach Template

```
Subject: Flipper.ai — AI-Powered Flip Finder (Affiliate Opportunity)

Hi [Name],

I'm Stephen, founder of Flipper.ai. I built an AI tool that scans
Craigslist, Facebook Marketplace, eBay, Mercari, and OfferUp
simultaneously to find underpriced items for resale.

I've been using it myself — [specific result, e.g., "found a $40
Kitchen Aid mixer listed for $15 on Craigslist, sold it on eBay
for $85 — $45 profit in 3 days"].

I'd love to offer you:
- Free Pro account ($49/mo value) for life
- 30% recurring commission on every subscriber you refer
- Early access to new features
- I'll create a custom landing page for your audience

At $19-49/mo per subscriber, a single video could generate $500+/mo
in passive affiliate income for you.

Would you be interested in checking it out? I can do a 15-min demo
call anytime.

Best,
Stephen
Founder, Flipper.ai
```

- [ ] Send personalized outreach to 20+ YouTubers (customize with their content references)
- [ ] Follow up after 3 days if no response
- [ ] Offer free Pro accounts to first 10 who respond
- [ ] Create unique affiliate links for each influencer

### Affiliate Program Setup

#### Human Steps

- [ ] **Step 1:** Sign up for [Rewardful](https://www.getrewardful.com/) ($29/mo) or [FirstPromoter](https://firstpromoter.com/) ($49/mo)
- [ ] **Step 2:** Configure commission structure:
  - 30% recurring commission (lifetime of referred customer)
  - At $19/mo FLIPPER: affiliate earns $5.70/mo per referral
  - At $49/mo PRO: affiliate earns $14.70/mo per referral
  - 60-day cookie duration
- [ ] **Step 3:** Integrate with Stripe (both tools have native Stripe integration)
- [ ] **Step 4:** Create affiliate signup page on your site
- [ ] **Step 5:** Create affiliate resources kit:
  - Product screenshots and banners (multiple sizes)
  - Demo video (60 sec)
  - Sample social media posts
  - Key talking points / feature list
  - Commission calculator ("Refer 100 users = $570-1,470/mo passive income")

#### AI Agent Implementation Checklist

- [ ] Add `/api/affiliate/track` route for click tracking
- [ ] Add `?ref=` query parameter handling to landing page
- [ ] Store referral cookie (60-day TTL)
- [ ] Pass referral ID to Stripe checkout metadata
- [ ] Add affiliate dashboard page (optional, Rewardful provides this)

### TikTok Content Strategy

TikTok is the fastest organic growth channel for reselling content. "I bought X for $Y and sold for $Z" is peak viral content.

#### Content Calendar (Post 1-2x daily)

| Day | Content Type | Example |
|-----|-------------|---------|
| Mon | "AI found this deal" screen recording | Show Flipper finding a $200 item listed for $40 |
| Tue | Before/after flip story | "Bought for $15 at Goodwill, sold for $95 on eBay" |
| Wed | "Scan race" — how many deals in 60 seconds | Speed through AI scanning 5 marketplaces |
| Thu | Tip/education | "3 categories that always flip for profit" |
| Fri | Weekly profit summary | Show dashboard with week's P&L |
| Sat | Live sourcing with the tool | Take phone to a thrift store, scan items live |
| Sun | "Beginner's guide" format | "How to start flipping with $50 and AI" |

#### Production Requirements

- [ ] Ring light (~$30, Amazon)
- [ ] Phone tripod/mount (~$15)
- [ ] Screen recording app (built into iPhone/Android)
- [ ] CapCut for editing (free)
- [ ] Consistent posting schedule (algorithm rewards daily posting)
- [ ] Use hashtags: #reselling #flipping #sidehustle #thrifting #makemoneyonline #flipperai

### Product Hunt Launch (Day 25-28)

#### Preparation (Start Day 15)

- [ ] **Step 1:** Create Product Hunt maker profile
- [ ] **Step 2:** Prepare assets:
  - Logo (240x240)
  - Gallery images (1270x760) — 4-6 showing key features
  - 60-second demo video (required for top placement)
  - Tagline (60 chars max): "AI finds underpriced items to flip for profit"
  - Description (260 chars): "Flipper.ai scans Craigslist, eBay, Facebook, Mercari & OfferUp with AI to find items you can buy low and sell high. Full lifecycle tracking from discovery to profit."
  - First comment (maker story — why you built it, your personal results)
- [ ] **Step 3:** Build a "launch day" email list:
  - Ask all existing users to support on launch day
  - Post in Indie Hackers that you're launching
  - Tweet about upcoming launch 3-5 days before
- [ ] **Step 4:** Schedule launch for **Tuesday or Wednesday** (highest traffic)

#### Launch Day

- [ ] Post at 12:01 AM PT (PH resets at midnight)
- [ ] Share link immediately with your email list, social followers, communities
- [ ] Be active in PH comments ALL DAY (maker engagement boosts ranking)
- [ ] Respond to every comment within 30 minutes
- [ ] Share updates throughout the day on Twitter
- [ ] Target: Top 5 finish = 2,000-5,000 visitors, 200-500 signups

### Indie Hackers / Building in Public

- [ ] Create Indie Hackers product page
- [ ] Post launch story: "How I built an AI marketplace scanner in [X] months"
- [ ] Share real revenue numbers (IH community loves transparency)
- [ ] Post monthly revenue updates
- [ ] Engage in comments on other makers' posts

### Early Metrics Target (End of Day 30)

| Metric | Target |
|--------|--------|
| Registered users | 200-500 |
| Paying customers | 35-60 |
| MRR | $800-1,500 |
| YouTube affiliates onboarded | 3-5 |
| TikTok followers | 500-2,000 |
| Reddit karma from flipping posts | Positive reputation |
| Personal flipping profit | $500-1,000 |

---

## 8. Phase 3: Scale (Months 2-3)

**Objective: Scale to $3-5K MRR. Turn on paid acquisition.**

### Paid Advertising

#### Google Ads (Start Month 2)

- [ ] **Budget:** $750/month
- [ ] **Campaign setup:**
  - Campaign type: Search
  - Target location: United States
  - Bidding: Maximize conversions (with target CPA of $50)
- [ ] **Keywords to target:**

  | Keyword | Est. CPC | Intent |
  |---------|----------|--------|
  | "reselling tools" | $3-5 | High |
  | "flip finder app" | $2-4 | High |
  | "what to flip for profit" | $1.50-3 | Medium |
  | "craigslist flipping tool" | $1-2 | High |
  | "marketplace arbitrage" | $3-5 | High |
  | "best items to resell" | $2-4 | Medium |
  | "facebook marketplace scanner" | $2-3 | High |
  | "AI reselling tool" | $3-5 | High |
  | "flip calculator" | $1.50-2.50 | Medium |

- [ ] **Ad copy template:**
  ```
  Headline 1: Find Underpriced Items to Flip
  Headline 2: AI Scans 5 Marketplaces for You
  Headline 3: Free to Start — $19/mo Pro
  Description: Flipper.ai uses AI to find items on Craigslist, eBay,
  Facebook, Mercari & OfferUp that you can buy low and sell high.
  Start free.
  ```
- [ ] **Expected results:** 250 clicks -> 17 trials -> 4-5 paying customers at ~$150-190 CAC

#### Facebook/Instagram Ads (Start Month 2)

- [ ] **Budget:** $500/month
- [ ] **Targeting:**
  - Interests: reselling, flipping, thrift store, eBay, Poshmark, Mercari, OfferUp, side hustle
  - Lookalike audience (after 100+ users): 1% lookalike of converters
  - Age: 22-50
  - Placement: Facebook feed, Instagram feed, Instagram stories
- [ ] **Ad formats:**
  - **Video ad (15-30 sec):** Screen recording of finding a profitable flip with AI
  - **Carousel ad:** "Found for $X → Sold for $Y" with 4-5 real examples
  - **Image ad:** Dashboard screenshot with profit metrics highlighted
- [ ] **Expected results:** 200-330 clicks -> 15-25 trials -> 4-6 paying customers at ~$85-125 CAC

#### YouTube Pre-Roll Ads (Start Month 2)

- [ ] **Budget:** $300-500/month
- [ ] **Targeting:** Place on reselling/flipping videos (channel targeting)
- [ ] **Ad format:** 15-second skippable in-stream
- [ ] **Creative:** "I found 7 underpriced items in 10 minutes. Let AI do your sourcing."
- [ ] **Expected results:** 1,500-2,500 views -> 50-80 clicks -> 5-10 trials

### Self-Hosted Lifetime Deal (Month 2)

#### Setup Steps

- [ ] **Step 1:** Create a dedicated landing page: `/lifetime-deal`
  - Hero: "Founding Member Lifetime Access — One Payment, Forever"
  - Price: $79 one-time (FLIPPER-equivalent access)
  - Countdown: "Only 200 seats available" (with live counter)
  - Badges: feature list, testimonials, guarantee
- [ ] **Step 2:** Create Stripe product for LTD:
  - One-time payment product: $79
  - On purchase: set user tier to FLIPPER, flag as `lifetimeDeal: true`
- [ ] **Step 3:** Market the LTD:
  - Post in Facebook groups: "Lifetime Deals & Software" (50K+ members), "SaaS Lifetime Deals"
  - Post on Indie Hackers
  - Email your existing free users
  - Share on Twitter/X
- [ ] **Step 4:** Cap at 200 seats, then close permanently
- [ ] **Revenue target:** 150-200 sales = **$11,850-15,800 cash injection**
- [ ] **Step 5:** Use LTD revenue to fund 2-3 months of advertising

#### AI Agent Implementation Checklist for LTD

- [ ] Create `/app/lifetime-deal/page.tsx` landing page
- [ ] Add one-time Stripe checkout for LTD product
- [ ] Handle webhook: set tier to FLIPPER + flag `lifetimeDeal: true`
- [ ] Add remaining seats counter (query DB for LTD purchases < 200)
- [ ] Auto-close page when 200 seats sold

### SEO & Content Marketing (Ongoing)

#### Blog Posts to Write (Target 1-2/week)

| Post Title | Target Keyword | Est. Monthly Search |
|-----------|---------------|-------------------|
| "Best Items to Flip for Profit in 2026" | best items to resell | 5-10K |
| "How to Make Money Flipping on Facebook Marketplace" | facebook marketplace flipping | 2-5K |
| "Craigslist Flipping Guide: Find Underpriced Items" | craigslist flipping | 1-3K |
| "Is Flipping Worth It? I Made $X in 30 Days" | is flipping worth it | 1-2K |
| "Best Reselling Tools and Apps in 2026" | reselling tools | 500-1K |
| "OfferUp vs Facebook Marketplace for Flipping" | offerup vs facebook marketplace | 500-1K |
| "How to Use AI to Find Things to Flip" | ai reselling tool | 300-800 |
| "Top 10 Categories That Always Flip for Profit" | what to flip for profit | 2-5K |

#### Free Tool as SEO Magnet

- [ ] Build a "Flip Calculator" page at `/tools/flip-calculator`
  - Input: purchase price, estimated resale price, platform fees
  - Output: profit, ROI %, break-even price
  - CTA: "Want AI to find these deals automatically? Try Flipper.ai free"
  - This page will rank for "flip calculator," "reselling profit calculator," etc.

### Month 2-3 Metrics Target

| Metric | Month 2 | Month 3 |
|--------|---------|---------|
| Registered users | 500-1,000 | 1,000-2,000 |
| Paying customers | 80-120 | 150-250 |
| MRR | $2,000-3,500 | $3,500-6,000 |
| LTD revenue (one-time) | $10,000-15,000 | — |
| YouTube affiliates | 5-10 | 10-20 |
| Blog posts published | 4-6 | 8-12 |
| TikTok followers | 2,000-5,000 | 5,000-15,000 |
| Ad spend | $1,500-2,000 | $2,000-3,000 |

---

## 9. Phase 4: Long-Term Dominance (Months 4-12)

**Objective: Establish Flipper.ai as THE tool for local marketplace flipping. $10K+ MRR.**

### Product Expansion (Feature Roadmap for Retention & Upsell)

| Feature | Tier | Impact | Effort |
|---------|------|--------|--------|
| **Browser extension** — one-click "analyze this listing" on any marketplace | PRO | Very High | 2-3 weeks |
| **Mobile app** (React Native) — scan deals on the go, push alerts | PRO | Very High | 4-6 weeks |
| **Real-time deal alerts** — push notification when a high-score item is posted | FLIPPER+ | High | 1-2 weeks |
| **Automated cross-listing** — post to eBay directly from Flipper | PRO | High | 2-3 weeks |
| **Team/multi-user accounts** — for reselling businesses | Enterprise ($99/mo) | Medium | 2-3 weeks |
| **Inventory management** — track purchased items, storage, costs | PRO | Medium | 2-3 weeks |
| **Tax reporting** — generate resale income reports for tax filing | PRO | Medium | 1-2 weeks |
| **API access** — for power users who want to integrate with their tools | Enterprise | Low-Med | 1 week |

### Enterprise Tier Introduction (Month 6+)

- Price: $99/mo
- Features: Team seats (up to 5), API access, custom integrations, priority support, white-label reports
- Target: Reselling businesses, consignment shops, pawn shops

### Partnership Opportunities

| Partner Type | Example | Value |
|-------------|---------|-------|
| Shipping platforms | Pirate Ship, ShipStation | Bundle discounts, referral revenue |
| Listing tools | List Perfectly, Vendoo | Integration, co-marketing |
| Reseller education | Courses, YouTube academies | Affiliate partnerships |
| Local businesses | Consignment shops, pawn shops | B2B licensing deals |

### Community Building

- [ ] Create a private Discord/Slack community for paying users
- [ ] Weekly "Best Flips" showcase from community members
- [ ] Monthly webinar: "Flipping Masterclass" with tips and tool demos
- [ ] User spotlight program — feature successful flippers on blog/social
- [ ] Referral program: "Give $5, Get $5" credit for referring friends

### Long-Term Revenue Targets

| Milestone | Timeline | MRR | ARR |
|-----------|----------|-----|-----|
| Ramen profitable | Month 3-4 | $3,000 | $36,000 |
| Full-time income | Month 6-8 | $8,000 | $96,000 |
| Hire first contractor | Month 9-12 | $15,000 | $180,000 |
| Series A territory | Month 18-24 | $50,000 | $600,000 |
| Market leader | Month 24-36 | $100,000+ | $1.2M+ |

---

## 10. Self-Use Flipping Strategy

**Using Flipper.ai yourself is a dual revenue stream: direct profit from flips + marketing content.**

### Getting Started

#### Equipment Needed

- [ ] Smartphone (for photos, pickup, quick listings)
- [ ] Vehicle (for local pickups)
- [ ] Starting capital: $200-500 (for initial inventory purchases)
- [ ] Measuring tape (for furniture dimensions)
- [ ] Basic cleaning supplies (increase resale value)
- [ ] Storage space (garage, spare room)

#### Best Categories for Quick Flips (Based on Flipper's AI Data)

| Category | Avg Buy Price | Avg Sell Price | Avg Profit | Flip Speed |
|----------|-------------|---------------|------------|------------|
| Power tools | $15-40 | $50-150 | $30-80 | 3-7 days |
| Kitchen appliances | $10-30 | $40-100 | $20-60 | 3-5 days |
| Video game consoles | $30-80 | $80-200 | $30-80 | 1-3 days |
| Exercise equipment | $20-60 | $80-250 | $40-150 | 5-14 days |
| Mid-century furniture | $20-100 | $100-500 | $50-300 | 7-21 days |
| Brand-name clothing (NWT) | $5-20 | $30-80 | $20-50 | 3-10 days |
| Musical instruments | $30-100 | $100-400 | $50-200 | 7-14 days |
| Small electronics | $5-20 | $25-75 | $15-40 | 1-5 days |

#### Daily Routine

| Time | Activity | Duration |
|------|----------|----------|
| 7:00 AM | Run Flipper scans on all marketplaces | 5 min |
| 7:05 AM | Review AI-scored results (70+ priority) | 15 min |
| 7:20 AM | Contact sellers for top items | 10 min |
| 12:00 PM | Check responses, schedule pickups | 10 min |
| 5:00 PM | Pick up purchased items (if local) | 30-60 min |
| 8:00 PM | Clean, photograph, list on eBay/Mercari | 30-45 min |
| 8:45 PM | Update Flipper lifecycle tracking | 5 min |

**Total daily time: 1.5-2.5 hours. Target: $100-300/week profit.**

#### Income Targets from Personal Flipping

| Month | Investment | Revenue | Profit | Cumulative Profit |
|-------|-----------|---------|--------|-------------------|
| Month 1 | $300 | $600-900 | $300-600 | $300-600 |
| Month 2 | $500 | $1,000-1,500 | $500-1,000 | $800-1,600 |
| Month 3 | $800 | $1,500-2,500 | $700-1,500 | $1,500-3,100 |

---

## 11. Marketing Channel Playbooks

### Channel Priority Matrix

| Channel | Cost | Time Investment | Expected ROI | Speed to Results |
|---------|------|----------------|-------------|-----------------|
| Reddit organic | Free | 5 hrs/week | Very High | 2-4 weeks |
| TikTok organic | Free | 5 hrs/week | High | 4-8 weeks |
| YouTube affiliates | Free (commission only) | 3 hrs/week | Very High | 4-8 weeks |
| Facebook groups | Free | 3 hrs/week | High | 2-4 weeks |
| Product Hunt | Free | 10 hrs (one-time) | Medium-High | 1 day |
| Google Ads | $750/mo | 2 hrs/week | Medium | 1-2 weeks |
| Facebook Ads | $500/mo | 2 hrs/week | Medium-High | 1-2 weeks |
| SEO/blog | Free | 5 hrs/week | High | 3-6 months |
| Indie Hackers | Free | 1 hr/week | Medium | 2-4 weeks |
| Twitter/X | Free | 2 hrs/week | Low-Medium | 4-12 weeks |

### Weekly Marketing Schedule

| Day | Activity | Time |
|-----|----------|------|
| Monday | Write 1 blog post (SEO). Post TikTok. Check ad performance. | 2 hrs |
| Tuesday | Engage in Reddit (answer questions, comment). Post TikTok. | 1.5 hrs |
| Wednesday | Engage in Facebook groups. Follow up with YouTubers. Post TikTok. | 1.5 hrs |
| Thursday | Create new ad creatives. Post TikTok. Respond to affiliate inquiries. | 1.5 hrs |
| Friday | Building-in-public post (Twitter, IH). Post TikTok. Review metrics. | 1.5 hrs |
| Saturday | Create longer-form content (YouTube video or detailed blog post). | 2 hrs |
| Sunday | Plan next week's content. Batch-create TikTok videos. | 1.5 hrs |

**Total marketing time: ~12 hours/week**

---

## 12. Advertising Budgets & ROI Projections

### Month 2 Budget (Conservative Start)

| Channel | Monthly Budget | Expected Trials | Expected Paid | CAC |
|---------|---------------|----------------|---------------|-----|
| Google Ads | $750 | 15-20 | 4-5 | $150-190 |
| Facebook/IG Ads | $500 | 15-25 | 4-6 | $85-125 |
| YouTube Pre-Roll | $400 | 8-12 | 2-3 | $135-200 |
| Affiliate commissions | ~$200 | 10-20 | 5-10 | $20-40 |
| **Total** | **$1,850** | **48-77** | **15-24** | **$77-123** |

### Month 3 Budget (Scale What Works)

| Channel | Monthly Budget | Expected Trials | Expected Paid | CAC |
|---------|---------------|----------------|---------------|-----|
| Google Ads | $1,000 | 20-30 | 5-8 | $125-200 |
| Facebook/IG Ads | $1,000 | 30-50 | 8-12 | $85-125 |
| YouTube Pre-Roll | $500 | 10-15 | 3-4 | $125-165 |
| Affiliate commissions | ~$500 | 20-40 | 10-20 | $25-50 |
| **Total** | **$3,000** | **80-135** | **26-44** | **$68-115** |

### Break-Even Analysis

- **Blended CAC target:** Under $120
- **Blended LTV** (70% FLIPPER at $19, 30% PRO at $49, 5.5% monthly churn):
  - FLIPPER LTV: $19 / 0.055 = $345
  - PRO LTV: $49 / 0.055 = $891
  - Blended LTV: (0.7 x $345) + (0.3 x $891) = $509
- **LTV:CAC ratio at $120 CAC:** 4.2:1 (excellent — target is 3:1+)
- **Payback period:** ~4-6 months per customer

---

## 13. Affiliate Program Design

### Commission Structure

| Plan | Monthly Price | Affiliate Earns (30%) | Annual Value per Referral |
|------|-------------|---------------------|--------------------------|
| FLIPPER | $19/mo | $5.70/mo | $68.40/year |
| PRO | $49/mo | $14.70/mo | $176.40/year |

### Affiliate Tiers (Incentivize Volume)

| Tier | Referrals | Commission | Bonus |
|------|-----------|------------|-------|
| **Starter** | 1-10 | 30% | — |
| **Partner** | 11-50 | 35% | Featured on partners page |
| **Champion** | 51-200 | 40% | Co-marketing, exclusive features |
| **Ambassador** | 200+ | 40% + $500/mo bonus | Quarterly strategy calls, product input |

### Affiliate Calculator (For Outreach)

```
"Refer just 50 FLIPPER users = $285/mo passive income ($3,420/yr)
Refer 100 mixed users = $700+/mo passive income ($8,400+/yr)
Top affiliates in similar tools earn $2,000-5,000/mo"
```

### Implementation Requirements

#### AI Agent Implementation Checklist

- [ ] Integrate Rewardful or FirstPromoter with Stripe
- [ ] Add `?ref=AFFILIATE_ID` tracking to landing page
- [ ] Set 60-day referral cookie
- [ ] Pass affiliate ID in Stripe checkout session metadata
- [ ] Create `/affiliates` page explaining the program
- [ ] Create affiliate resource kit (downloadable zip: banners, copy, screenshots)
- [ ] Add affiliate link generator in affiliate dashboard
- [ ] Set up monthly payout automation

---

## 14. Landing Page Conversion Optimization

### Current State

The landing page exists and includes pricing, features, and CTAs. To maximize conversion:

### Optimization Checklist

#### Above the Fold (Hero Section)

- [ ] **Headline:** "Find Underpriced Items to Flip for Profit — AI Does the Hunting"
- [ ] **Subhead:** "Scan Craigslist, eBay, Facebook, Mercari & OfferUp in minutes. AI scores every deal so you know what's worth buying."
- [ ] **CTA button:** "Start Finding Deals — Free" (green, prominent)
- [ ] **Social proof:** "Join 500+ resellers already using Flipper.ai" (update dynamically)
- [ ] **Hero visual:** Animated dashboard showing deals being scored in real-time (or screenshot)

#### Trust & Conversion Elements

- [ ] **Profit counter:** "Our users have found $X in profit opportunities" (calculate from DB)
- [ ] **Testimonials:** Real quotes from beta users / founding members (with photos)
- [ ] **"As seen on" bar:** Product Hunt badge, any press mentions, YouTube reviewer logos
- [ ] **Risk reversal:** "14-day free trial. No credit card required. Cancel anytime."
- [ ] **Before/After comparison:** "Manual browsing: 5 hours. Flipper: 5 minutes."

#### Pricing Section

- [ ] Highlight FLIPPER as "Most Popular" (already done)
- [ ] Add annual billing toggle with "Save 20%" badge
- [ ] Add "Founding Member" banner above pricing (first 100 at discounted rate)
- [ ] Feature comparison table with checkmarks
- [ ] FAQ section below pricing (objection handling)

#### Bottom of Page

- [ ] Final CTA section with urgency: "Deals are being posted right now. Start finding them."
- [ ] Email capture for people not ready to sign up: "Get 3 free flip tips weekly"

---

## 15. Technical Implementation Checklists

These are tasks for the AI agent (Claude Code) to implement.

### Priority 1: Revenue-Critical (Before Launch)

- [ ] Verify Stripe checkout flow works end-to-end in production
- [ ] Verify webhook handling updates user tier correctly
- [ ] Verify tier enforcement blocks FREE users from paid features
- [ ] Verify customer portal for subscription management
- [ ] Add Stripe annual pricing support (if not already implemented)
  - Add annual price IDs to env vars
  - Add billing period toggle on pricing page
  - Handle annual subscription in webhook

### Priority 2: Growth-Critical (Week 2-3)

- [ ] Add `?ref=` affiliate tracking parameter to landing page
- [ ] Set referral cookie (60-day TTL) on landing
- [ ] Pass referral ID to Stripe checkout `metadata`
- [ ] Add simple blog/content page framework (or use MDX)
- [ ] Build `/tools/flip-calculator` SEO magnet page
  - Input: buy price, sell price, platform, condition
  - Output: profit, ROI, fee breakdown
  - CTA to sign up
- [ ] Add "Founding Member" pricing badge to pricing section
- [ ] Add user count to landing page (dynamic from DB)

### Priority 3: Retention-Critical (Month 2)

- [ ] Build `/lifetime-deal` page with seat counter
- [ ] LTD Stripe one-time checkout integration
- [ ] Real-time deal alert system (push notification when 80+ score item found)
- [ ] Weekly email digest: "Your top flip opportunities this week"
- [ ] Onboarding email sequence (Days 1, 3, 7, 14):
  - Day 1: Welcome + quick start guide
  - Day 3: "Did you find your first deal?" + tips
  - Day 7: "Here are your best opportunities this week" + upgrade CTA
  - Day 14: Trial ending reminder (if on trial) + success stories

### Priority 4: Scale Features (Month 3+)

- [ ] Browser extension for one-click listing analysis
- [ ] Mobile-responsive PWA improvements
- [ ] Team/multi-user account support
- [ ] API access for Enterprise tier
- [ ] Automated eBay cross-listing from dashboard

---

## 16. Revenue Projections & Milestones

### Conservative Scenario

| Month | New Paid | Total Paid | Churn (6%) | Net Paid | MRR | Cumulative Rev |
|-------|----------|-----------|------------|---------|-----|---------------|
| 1 | 15 | 15 | 0 | 15 | $420 | $420 |
| 2 | 30 | 45 | 1 | 44 | $1,230 | $1,650 |
| 3 | 40 | 84 | 3 | 81 | $2,270 | $3,920 |
| 4 | 50 | 131 | 5 | 126 | $3,530 | $7,450 |
| 5 | 55 | 181 | 8 | 173 | $4,840 | $12,290 |
| 6 | 60 | 233 | 10 | 223 | $6,240 | $18,530 |

*+ LTD revenue of ~$12,000 in Month 2*

### Optimistic Scenario (Viral content or influencer hit)

| Month | New Paid | Total Paid | Churn (5%) | Net Paid | MRR | Cumulative Rev |
|-------|----------|-----------|------------|---------|-----|---------------|
| 1 | 30 | 30 | 0 | 30 | $840 | $840 |
| 2 | 60 | 90 | 2 | 88 | $2,460 | $3,300 |
| 3 | 80 | 168 | 4 | 164 | $4,590 | $7,890 |
| 4 | 100 | 264 | 8 | 256 | $7,170 | $15,060 |
| 5 | 120 | 376 | 13 | 363 | $10,160 | $25,220 |
| 6 | 140 | 503 | 18 | 485 | $13,580 | $38,800 |

*+ LTD revenue of ~$15,000 in Month 2*

### Key Milestones

| Milestone | Conservative | Optimistic |
|-----------|-------------|-----------|
| First paying customer | Day 7-10 | Day 4-7 |
| $500 MRR | Month 2 | Month 1 |
| $1,000 MRR | Month 2-3 | Month 1-2 |
| Break even on ad spend | Month 3 | Month 2 |
| $5,000 MRR | Month 6 | Month 4 |
| $10,000 MRR | Month 10+ | Month 5-6 |
| Ramen profitable ($3K/mo) | Month 4 | Month 2-3 |

---

## 17. Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Marketplace blocks scrapers | High | High | Rotate user agents, use proxy pools, eBay API as fallback |
| AI API costs exceed revenue | Medium | Medium | Cache aggressively (24h TTL), quickDiscountCheck() for low-score items |
| Database scaling under load | Low | Medium | Cloud SQL auto-scaling, connection pooling already configured |
| Stripe webhook failures | Low | High | Retry logic, dead letter queue, manual reconciliation process |
| CAPTCHA blocks (hCaptcha) | Medium | Low | Already integrated, monitor solve rates |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low conversion rate (<2%) | Medium | High | A/B test landing page, add demo video, offer longer trials |
| High churn (>8%/mo) | Medium | High | Onboarding emails, weekly digest, show ROI in dashboard |
| Competitor copies features | Medium | Low | Move fast, build brand, community moat |
| Facebook/CL changes TOS | Medium | Medium | Diversify across 5 platforms, eBay API is stable |
| Negative reviews early | Low | High | Actively solicit feedback, fix bugs fast, personal support |

### Legal Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Marketplace TOS violations | Medium | Medium | Review each platform's TOS, scrape public data only |
| User data privacy | Low | High | GDPR/CCPA compliance, clear privacy policy, data encryption |
| Trademark issues ("Flipper") | Low | Medium | Check trademark database, have backup names ready |

### Cost Management

| Cost | Monthly | Notes |
|------|---------|-------|
| Firebase Hosting | $0 | Free tier: 10 GB/month transfer, 1 GB storage |
| Cloud SQL (PostgreSQL) | $30-50 | Smallest instance sufficient initially |
| OpenAI API | $50-200 | Depends on scan volume; caching reduces costs 70%+ |
| Anthropic (Claude) API | $30-100 | Cached analysis reduces calls |
| Firebase Auth | $0 | Free tier: 50K MAU |
| Resend email | $0-20 | Free tier: 3K emails/mo |
| Sentry | $0-26 | Free tier: 5K errors/mo |
| Stripe fees | 2.9% + $0.30 | Standard processing, deducted from revenue |
| Domain | $12/year | One-time |
| **Total infrastructure** | **$120-400/mo** | **Profitable at ~15-20 paying customers** |

---

## 18. Key Metrics Dashboard

### Metrics to Track Daily

| Metric | Tool | Target (Month 1) |
|--------|------|-------------------|
| New signups | Firebase/DB | 5-15/day |
| Trial starts | Stripe | 2-5/day |
| Paid conversions | Stripe | 1-2/day |
| MRR | Stripe Dashboard | $420-840 |
| Churn | Stripe | <6%/month |
| Active users (DAU) | Custom analytics | 30%+ of registered |
| Scans per user/day | UsageRecord table | 3-5 avg |
| AI analysis requests | OpenAI/Claude logs | Monitor cost |
| Landing page visitors | Firebase/Google Analytics | 50-200/day |
| Conversion rate (visitor to signup) | Calculated | >3% |
| Conversion rate (free to paid) | Calculated | >5% (with trial) |

### Weekly Review Checklist

- [ ] Review MRR and growth rate
- [ ] Check churn — contact any churned users to ask why
- [ ] Review ad spend vs. new customers (CAC by channel)
- [ ] Check top-performing content (which posts drove signups?)
- [ ] Review support requests / bug reports
- [ ] Plan next week's content calendar
- [ ] Check affiliate program performance
- [ ] Review infrastructure costs vs. revenue

---

## Appendix A: 30-Day Sprint Calendar

| Day | Phase | Key Actions |
|-----|-------|------------|
| 1 | Ship | Configure Stripe products/prices |
| 1 | Ship | Point domain DNS to Firebase Hosting |
| 1 | Ship | Configure Resend email DNS |
| 2 | Ship | Deploy to production |
| 2 | Ship | Smoke test registration + billing flow |
| 3 | Ship | Fix any production bugs. **PRODUCT IS LIVE.** |
| 4 | Revenue | Start using Flipper yourself. Run first scans. |
| 5 | Revenue | Contact sellers, make first purchases |
| 6 | Revenue | Document everything (screenshots, videos) |
| 7 | Revenue | Send 20-30 personal outreach messages |
| 8 | Revenue | Post value content in r/Flipping |
| 9 | Revenue | Engage Reddit comments. DM interested users. |
| 10 | Revenue | Join + engage Facebook reseller groups |
| 11 | Revenue | Post case study in Facebook groups |
| 12 | Revenue | List first flip items on eBay/Mercari. Create TikTok account. |
| 13 | Revenue | First TikTok video. Continue Reddit/FB engagement. |
| 14 | Revenue | **CHECKPOINT: Review first 2 weeks. Count paying users.** |
| 15 | Growth | Begin YouTube influencer outreach (20+ emails) |
| 16 | Growth | Set up affiliate program (Rewardful/FirstPromoter) |
| 17 | Growth | Prepare Product Hunt assets |
| 18 | Growth | Start daily TikTok posting cadence |
| 19 | Growth | Write first SEO blog post |
| 20 | Growth | Build flip calculator SEO page |
| 21 | Growth | Follow up with YouTubers. Onboard first affiliates. |
| 22 | Growth | Set up Google Ads campaign |
| 23 | Growth | Set up Facebook/IG Ads campaign |
| 24 | Growth | Record Product Hunt demo video |
| 25 | Growth | **PRODUCT HUNT LAUNCH DAY** |
| 26 | Growth | Product Hunt follow-up. Post Indie Hackers story. |
| 27 | Growth | Review ad performance. Adjust targeting/bids. |
| 28 | Growth | Write second blog post. Continue TikTok. |
| 29 | Growth | Contact churned users. Review all metrics. |
| 30 | Growth | **MONTH 1 REVIEW. Target: $800-1,500 MRR.** |

---

## Appendix B: Copy & Paste Templates

### Email: Founding Member Invite
```
Subject: You're invited — Flipper.ai Founding Member access

Hi [Name],

I just launched Flipper.ai — an AI tool that scans Craigslist,
Facebook Marketplace, eBay, Mercari, and OfferUp to find underpriced
items you can flip for profit.

As a founding member, you get locked-in pricing at $14/mo for life
(normally $19). Only 100 spots available.

I've been using it myself and found [specific example with profit].

Check it out: [link]

— Stephen
```

### Tweet: Building in Public
```
Week [X] of building Flipper.ai:

- [X] paying customers
- $[X] MRR
- Found [X] flip opportunities worth $[X]+ in profit

Lessons learned:
1. [Lesson]
2. [Lesson]
3. [Lesson]

Try it free: [link]

#buildinpublic #microSaaS #reselling
```

### Reddit Post Template (Value-First)
```
Title: I analyzed [X] marketplace listings with AI —
here's what actually flips for profit in [City]

I've been tracking listings across Craigslist, Facebook Marketplace,
OfferUp, Mercari, and eBay for [timeframe] and ran AI analysis
on each one to calculate flip potential.

Here's what I found:

**Top 5 categories by profit margin:**
1. [Category] — avg margin [X]%
2. [Category] — avg margin [X]%
...

**Surprising finds:**
- [Specific example]
- [Specific example]

**What NOT to flip (money losers):**
- [Category/example]

Happy to answer questions about methodology or specific categories.
```

---

## Appendix C: Tool & Service Links

| Service | Purpose | Cost | Link |
|---------|---------|------|------|
| Stripe | Payment processing | 2.9% + $0.30 | stripe.com |
| Rewardful | Affiliate program | $29/mo | getrewardful.com |
| Firebase Hosting | Frontend hosting | Free tier | firebase.google.com |
| Cloud Run | Backend API | Pay-per-use | cloud.google.com/run |
| Resend | Transactional email | Free-$20/mo | resend.com |
| Namecheap | Domain registration | ~$12/year | namecheap.com |
| Canva | Ad/social graphics | Free | canva.com |
| CapCut | TikTok video editing | Free | capcut.com |
| Product Hunt | Launch platform | Free | producthunt.com |
| Indie Hackers | Community/building in public | Free | indiehackers.com |
| Google Ads | Paid search | $750+/mo | ads.google.com |
| Meta Ads | Facebook/IG ads | $500+/mo | business.facebook.com |

---

*This plan was created by the full BMAD agent council: Mary (Analyst), John (PM), Winston (Architect), Amelia (Dev), Bob (SM), Barry (Quick Flow), Sally (UX), Quinn (QA), Murat (Test Architect), Paige (Technical Writer), and BMad Master. Each contributed their domain expertise to create a comprehensive, actionable path to profit.*

**The product is built. The market is waiting. Ship it.**

---
---

# PART 2: ELICITATION FINDINGS & PLAN REVISIONS

*Five advanced elicitation methods were applied to stress-test the plan above. Every finding below OVERRIDES the corresponding section in Part 1 where conflicts exist.*

---

## 19. Elicitation Methods Applied

| # | Method | Lead | Purpose |
|---|--------|------|---------|
| 1 | **Pre-Mortem Analysis** | John (PM) | "It's Day 30 and we failed — why?" |
| 2 | **Assumption Mapping** | Mary (Analyst) | Rate every assumption by confidence x impact |
| 3 | **Red Team Attack** | Murat (Test Architect) | Hostile competitor/skeptic attacks the plan |
| 4 | **Empathy Mapping** | Sally (UX) | Deep persona analysis for 3 target users |
| 5 | **Constraint Inversion** | Winston (Architect) | Flip every limitation to find hidden opportunities |

---

## 20. Critical Findings (Consensus Across 3+ Methods)

These findings appeared in multiple independent analyses. They are near-certain blind spots.

### Finding 1: Scraper Reliability Is Existential (Pre-Mortem + Red Team + Assumptions)

**The problem:** The entire product is a scanning tool. If scans don't return results on Day 1, nothing else matters. Facebook, Craigslist, and OfferUp actively fight scrapers. The plan allocates 0 hours to scraper stress testing in production.

**REVISED PLAN — Add to Phase 0 (Days 1-3):**

- [ ] **Scraper Stress Test (MANDATORY before any marketing):**
  - Run each of the 5 scrapers 50+ times in the production environment over 3 days
  - Log success rate per platform. Anything below 80% is a launch blocker.
  - Test from different IP addresses / proxy rotation
  - Document which platforms are most fragile
- [ ] **Scraper Health Dashboard:**
  - Build a simple `/api/health/scrapers` endpoint that tests each platform
  - Check daily. Make this a morning routine.
- [ ] **Proxy Infrastructure:**
  - Budget $200-500/month for residential proxy rotation (Bright Data or Oxylabs)
  - Configure proxy rotation BEFORE launch, not after first breakage
- [ ] **Fallback Strategy:**
  - If fewer than 3 of 5 scrapers work reliably, DO NOT LAUNCH publicly
  - eBay Browse API is the most stable (official API, not scraping) — position as primary
  - Add manual listing URL import as emergency fallback ("Paste a listing URL to analyze it")
- [ ] **Public Status Page:**
  - Create a simple status page showing per-platform scraper health
  - Users need to know "Facebook is down" vs "Flipper is broken"
- [ ] **24-Hour Repair SLA:**
  - When a scraper breaks, it gets fixed within 24 hours or marked "temporarily unavailable"

### Finding 2: Churn Model Is Fiction — Revise All Financial Projections (Red Team + Assumptions)

**The problem:** The plan models 5-6% monthly churn. For a new, unproven SaaS with zero brand recognition targeting a casual/part-time audience, realistic churn is **10-12% monthly** for the first 6 months. This breaks the LTV math and makes paid acquisition unprofitable.

**REVISED Revenue Projections (Realistic Scenario — 10% churn):**

| Month | New Paid | Total Paid | Churn (10%) | Net Paid | MRR | Cumulative Rev |
|-------|----------|-----------|-------------|---------|-----|---------------|
| 1 | 15 | 15 | 0 | 15 | $420 | $420 |
| 2 | 30 | 45 | 2 | 43 | $1,200 | $1,620 |
| 3 | 40 | 83 | 4 | 79 | $2,210 | $3,830 |
| 4 | 50 | 129 | 8 | 121 | $3,390 | $7,220 |
| 5 | 55 | 176 | 12 | 164 | $4,590 | $11,810 |
| 6 | 60 | 224 | 16 | 208 | $5,820 | $17,630 |

**REVISED LTV calculations at 10% churn:**
- FLIPPER LTV: $19 / 0.10 = **$190** (was $345)
- PRO LTV: $49 / 0.10 = **$490** (was $891)
- Blended LTV: (0.7 x $190) + (0.3 x $490) = **$280** (was $509)
- **Max acceptable CAC at 3:1 ratio: $93** (was $170)

**IMPLICATION:** Paid ads must be MORE efficient, or deferred until churn improves. The plan must prioritize organic and affiliate channels over paid acquisition in Month 1-2.

**Churn reduction actions to add:**
- [ ] Track cohort retention weekly from Day 1 — if Week 4 retention is below 60%, the tier design needs reworking
- [ ] Build churn-prediction triggers: user hasn't scanned in 3 days = automated "we found deals for you" email
- [ ] Add "money saved" / "profit found" dashboard widget showing cumulative ROI
- [ ] Contact every single churned user personally for the first 50 cancellations — learn why
- [ ] Push annual billing harder (reduces effective churn via lock-in)

### Finding 3: Free-to-Paid Conversion Is Assumed, Not Measured (Pre-Mortem + Empathy + Assumptions)

**The problem:** The plan assumes 5%+ free-to-paid conversion. Industry median for freemium SaaS is 2-3%. The free tier (10 scans/day, 1 marketplace) may be simultaneously too generous for Sarah (she gets enough value to never upgrade) and too restrictive for Nick (he bounces before experiencing value).

**REVISED Free Tier Strategy:**

**Option A (Recommended): Time-gated trial instead of feature-gated free**
- 7 days of full FLIPPER access (all 3 marketplaces, unlimited scans, AI analysis)
- After 7 days, drops to: 3 scans/day, 1 marketplace, no AI analysis detail (just the score number, not the explanation)
- Credit card NOT required upfront (reduces friction for Nick)
- Day 5 email: "Your trial ends in 2 days — you've found $X in opportunities so far"

**Option B: Tightened freemium**
- 5 scans/day (not 10), 1 marketplace
- AI scores visible but analysis locked: "This item scored 87 — upgrade to see why and view comparable sales"
- This creates the upgrade pull the current plan lacks

**VALIDATION REQUIRED:** Run Option A for first 100 signups. Measure conversion. If below 3% by Day 21, switch to Option B.

### Finding 4: Solo Founder Bandwidth Is Impossible (Pre-Mortem + Red Team)

**The problem:** The plan demands 12 hrs/week marketing + 2.5 hrs/day flipping + engineering + support + content + ads. That's 80+ hours/week for one person. Something will be dropped. It will be customer support or scraper maintenance — both are fatal.

**REVISED Bandwidth Allocation (First 30 days):**

**CUT from Month 1:**
- ~~TikTok daily posting~~ → Move to Month 2 (save 5 hrs/week)
- ~~Google Ads~~ → Move to Month 2 after 50 organic customers prove PMF (save 2 hrs/week)
- ~~YouTube pre-roll ads~~ → Move to Month 3 (save 1 hr/week)
- ~~Product Hunt launch~~ → Move to Month 3-4 when you have social proof (save 10 hrs)

**KEEP in Month 1 (Two channels only):**
1. **Personal flipping + content creation** (10 hrs/week) — this generates both revenue AND marketing content
2. **Facebook group engagement** (5 hrs/week) — most tolerant of tool sharing, highest conversion

**ADD in Month 1:**
3. **B2B cold outreach** (3 hrs/week) — see Finding 8 below

**Total: ~18 hrs/week marketing + 10 hrs/week engineering/support = manageable for a solo founder**

### Finding 5: YouTube Influencer Strategy Is Overweighted (Pre-Mortem + Assumptions)

**The problem:** Cold emails to 300K-subscriber creators from an unknown founder with zero users get 1-2% response rate. The $5.70/month commission on a $19 plan is not worth a big YouTuber's time when they earn $2-10K per sponsored video.

**REVISED YouTube Strategy:**

- [ ] **Month 1:** Do NOT contact any YouTuber over 10K subscribers. Zero credibility to offer.
- [ ] **Month 1:** Launch YOUR OWN YouTube channel (Constraint Inversion finding). Repurpose flipping content as YouTube Shorts. Post 1 long-form "weekly flip recap" every Sunday. This costs zero incremental effort since you're already creating the content.
- [ ] **Month 2 (after 30+ paying users):** Contact micro-influencers (1-5K subs) only. Offer $200 flat fee + 30% recurring. They respond at 10x the rate of big creators.
- [ ] **Month 3+ (after 100+ users):** NOW contact mid-tier creators (10-50K subs) with real metrics, testimonials, and a "100+ resellers use this" proof point.

### Finding 6: AI Scoring Accuracy Is Unvalidated (Assumptions + Red Team)

**The problem:** The scoring engine uses algorithmic heuristics (category multipliers, brand regex). There's no backtesting against actual sale outcomes. If users buy items the AI rated 70+ and lose money, trust collapses immediately. Full-Time Frank will test the AI against his own expertise and leave if it's wrong.

**ACTIONS TO ADD:**

- [ ] **Before launch:** Backtest 200+ scored items against actual eBay sold prices. Calculate what % of 70+ scored items would have been profitable.
- [ ] **Add "Why this score" expandable** on each listing showing: comps used, fee calculation, confidence level. Transparency converts experts.
- [ ] **Add user feedback loop:** "Was this a good deal?" button on each scored item. Use feedback data to improve scoring.
- [ ] **Publish accuracy rate** on landing page once validated: "Our AI correctly identifies profitable flips 83% of the time"
- [ ] **Add disclaimers:** "AI-estimated values are not guarantees. Always verify before purchasing."

---

## 21. New Opportunities Discovered (Constraint Inversion + Empathy)

### Opportunity 1: Partner with List Perfectly / Vendoo (GAME-CHANGING)

**Why:** List Perfectly (50K+ users) and Vendoo (30K-40K users) are cross-listing tools, not sourcing tools. Flipper fills a gap they don't cover. Their combined user base is 80K+ of our exact target customers. One co-marketing email to their users could deliver more signups than months of content marketing.

**Implementation Steps:**

- [ ] **Day 14:** Email partnership teams at List Perfectly and Vendoo:
  ```
  Subject: Partnership Opportunity — Flipper.ai x [Vendoo/List Perfectly]

  Hi [Team],

  I'm Stephen, founder of Flipper.ai. We built an AI-powered deal
  finder that scans 5 marketplaces for underpriced items to resell.

  Your tool helps resellers LIST items. Ours helps them FIND items.
  Together, we complete the reselling workflow.

  Proposal:
  - Flipper users get a [Vendoo/LP] trial discount
  - [Vendoo/LP] users get a Flipper trial
  - We build a one-click export: "Found a deal? List it with [Vendoo/LP]"
  - Co-marketing email to your user base (we'll write the copy)

  This costs you nothing and adds value to your existing users.
  Happy to demo anytime.

  — Stephen, Founder, Flipper.ai
  ```
- [ ] **Week 3-4:** Build simple listing data export in Vendoo/LP import format
- [ ] **Month 2:** Launch co-marketing campaign if partnership established

**Revenue impact:** Even a 0.5% conversion of their 80K users = 400 signups = 20-40 paid customers in one shot.

### Opportunity 2: B2B Sales to Pawn Shops & Consignment Stores (HIGH VALUE)

**Why:** Pawn shops and consignment stores have immediate, acute need for sourcing tools, higher willingness to pay ($99-199/mo), lower churn (it's a business expense), and they convert on a phone call — no content marketing required. One pawn shop chain deal could exceed the entire Month 3 MRR target.

**Implementation Steps:**

- [ ] **Day 14:** Build a 1-page B2B landing page: `/business`
  - Headline: "AI-Powered Sourcing for Resale Businesses"
  - Focus on: time savings, consistent deal flow, competitive intelligence
  - CTA: "Book a 15-Minute Demo"
  - Calendly link for scheduling
- [ ] **Day 15-21:** Cold email 50 local consignment shops and pawn shops in your metro area:
  ```
  Subject: AI tool that finds underpriced items for your store

  Hi [Store Name],

  I built an AI tool that scans Craigslist, Facebook Marketplace,
  eBay, Mercari, and OfferUp to find items listed below market value.

  For resale businesses like yours, this means:
  - Consistent sourcing pipeline (no manual browsing)
  - AI-scored deals ranked by profit potential
  - 5 marketplaces scanned in minutes

  Would you be open to a 15-minute demo? I'll show you what's
  underpriced in [City] right now.

  — Stephen, Flipper.ai
  ```
- [ ] **Price B2B at $99/mo** per location (new tier, not on public pricing page)
- [ ] **Target:** 5 B2B customers by Month 2 = $495/mo from a segment with <3% churn

### Opportunity 3: Daily Deal Digest Email (HIGH VALUE)

**Why:** Transforms the value proposition from "here's a tool" to "here's money on a plate." A curated morning email of top deals in your area is dramatically easier to understand and sell than a SaaS dashboard. Works for all personas — Sarah, Frank, AND Nick can benefit.

**Implementation Steps:**

- [ ] **Month 2:** Build automated "Daily Deal Digest" email
  - Cron job: Run scans at 6 AM local time for each user's configured marketplaces/categories
  - Email: Top 5-10 items scoring 70+ with: photo, price, AI score, estimated resale value, profit estimate, link to listing
  - CTA in email: "View all deals in your dashboard"
- [ ] **Marketing angle:** "Your morning money email — 5 profitable deals in your inbox before breakfast"
- [ ] **Tier gating:** Free users get 1 deal/day. FLIPPER gets 5. PRO gets 10+ with custom filters.
- [ ] **This becomes the #1 retention mechanism** — users open the email even if they never log into the dashboard

### Opportunity 4: Own YouTube Channel from Day 1 (HIGH VALUE)

**Why:** Eliminates dependency on external influencers. Uses content you're already creating from personal flipping. Builds an owned audience asset that compounds over time. If the channel reaches even 5K subscribers, it becomes proof that attracts affiliate interest organically.

**Implementation Steps:**

- [ ] **Day 4:** Create "Flipper.ai" YouTube channel
- [ ] **Daily:** Repurpose every flip video as a YouTube Short (same content as TikTok, zero incremental effort)
- [ ] **Weekly (Sunday):** Post 1 long-form "Weekly Flip Recap" (5-10 min):
  - What the AI found this week
  - Items bought, items sold, profit/loss
  - Tips and lessons learned
  - Soft CTA: "Try Flipper free at..."
- [ ] **Monthly:** "Monthly Flip Report" with full P&L, best finds, worst misses
- [ ] This replaces the failed "wait for YouTubers" strategy with a self-sufficient content engine

---

## 22. Landing Page & Onboarding Revisions (Empathy Mapping)

### Critical Missing Element: Live Demo Scan

**The problem:** Neither Sarah nor Nick will sign up on faith. They need to SEE the tool work before creating an account.

**IMPLEMENTATION (Priority 1 — Before any marketing):**

- [ ] Add a "Try It Now" section on the landing page:
  - Input: Zip code + category dropdown (Electronics, Furniture, Tools, etc.)
  - Output: 3-5 anonymized real results with AI scores and estimated profit
  - Below results: "Sign up free to see all deals and full analysis"
- [ ] This is the single highest-converting landing page element currently missing

### Critical Missing Element: First Flip Guide (Beginners)

**The problem:** Newbie Nick signs up, runs a scan, sees a list of scored items, and has NO IDEA what to do next. Without hand-holding, he churns in 48 hours.

**IMPLEMENTATION (Priority 1 — Before any marketing):**

- [ ] Post-onboarding "First Flip Guide" flow:
  1. Highlight one high-score item near the user: "We found this for you"
  2. Explain the score: "Scored 84/100 because similar items sell for $X on eBay"
  3. Show the comps: link to actual eBay sold listings
  4. Provide a message template: "Here's how to contact the seller"
  5. Link to "How to list on eBay" guide
  6. CTA: "Mark this as PURCHASED when you buy it"
- [ ] This converts Nick's confusion into a guided purchase flow

### Persona-Specific Landing Page Messaging

**Current hero is generic. Add persona-targeted sections:**

| Section | Target Persona | Headline |
|---------|---------------|----------|
| Hero (rotating or A/B) | All | "Stop Scrolling. Start Profiting." |
| Section 2 | Sarah (side hustle) | "Find profitable deals in under 10 minutes — not 2 hours of browsing" |
| Section 3 | Frank (full-time) | "Scan 5 marketplaces simultaneously. Scale without scaling your hours." |
| Section 4 | Nick (beginner) | "Your first profitable flip starts here. AI tells you exactly what to buy." |

### ROI Proof in Pricing Section

- [ ] Add calculator callout above pricing table:
  > "The average Flipper user finds $200+ in profit opportunities per week.
  > That's 10x your subscription on the first deal alone."
- [ ] Add "money-back" risk reversal for FLIPPER tier:
  > "Find zero profitable deals in your first 30 days? We'll refund your subscription. No questions asked."

---

## 23. LTD Strategy Revision (Pre-Mortem + Red Team)

**Original plan:** 200 seats at $79, Month 2.

**Problems identified:**
- LTD buyers are the most demanding, highest-support-cost SaaS customers
- At $19/mo, a LTD breaks even in 4 months. After that, every month is pure loss.
- You're selling $190 LTV (revised) for $79 — acceptable, but barely
- Running an LTD before having monthly subscribers cannibalizes conversion

**REVISED LTD Strategy:**

- [ ] **DO NOT run the LTD until you have 50+ monthly subscribers** (proves PMF first)
- [ ] **Cap at 50 seats** (not 200) — this is a cash injection, not a growth strategy
- [ ] **Price at $149** (not $79) — 8x monthly, still a "deal" but not giving away the farm
- [ ] **Explicitly exclude future features** — LTD gets current FLIPPER features, not future PRO features
- [ ] **Make LTD time-limited:** 12-month access, not lifetime. "Annual deal" not "lifetime deal."
- [ ] **Revenue:** 50 x $149 = $7,450 cash injection (reduced but sustainable)
- [ ] **OR skip the LTD entirely** and offer aggressive annual billing: $99/year for FLIPPER (58% off monthly). This gives you $99 upfront cash per user with no forever liability.

---

## 24. Revised Sprint Calendar (Applying All Findings)

The original 30-day calendar is revised to reflect bandwidth constraints, scraper testing requirements, and channel prioritization.

| Day | Phase | Key Actions |
|-----|-------|------------|
| 1 | Ship | Configure Stripe products/prices. Point domain DNS. Configure email DNS. |
| 2 | Ship | Deploy to production. Smoke test registration + billing (10 full cycles). |
| 3 | Ship | **Scraper stress test begins.** Run each scraper 50+ times. Log success rates. |
| 4 | Ship | Continue scraper testing. Fix any production bugs. Set up proxy rotation. |
| 5 | Ship | **Scraper results review.** All 5 platforms >80% success? If NO: fix before proceeding. |
| 6 | Ship | Build scraper health endpoint. Build "Why this score" expandable. **GO/NO-GO DECISION.** |
| 7 | Revenue | **PRODUCT IS LIVE.** Start using Flipper yourself. Run first scans. Document everything. |
| 8 | Revenue | Contact sellers, make first purchases. Screenshot every step. |
| 9 | Revenue | List flip items on eBay/Mercari. Create YouTube channel. Record first Short. |
| 10 | Revenue | Send 20-30 personal outreach messages (founding member pricing). |
| 11 | Revenue | Join Facebook reseller groups. Start engaging (no promotion yet). |
| 12 | Revenue | Continue flipping. Post YouTube Short. Backtest 200 AI-scored items vs eBay solds. |
| 13 | Revenue | Post first "value content" in Facebook groups (case study with screenshots). |
| 14 | Revenue | **CHECKPOINT: Count paying users. Review scraper stability. Review AI accuracy.** |
| 15 | Growth | Send partnership emails to List Perfectly + Vendoo. |
| 16 | Growth | Cold email 25 local pawn shops / consignment stores (B2B). |
| 17 | Growth | Set up affiliate program (Rewardful). Build `/business` B2B landing page. |
| 18 | Growth | Cold email 25 more B2B targets. Follow up with partnerships. |
| 19 | Growth | Write first SEO blog post. Build flip calculator page. |
| 20 | Growth | Begin micro-influencer outreach (1-5K sub YouTubers, $200 flat fee offers). |
| 21 | Growth | **CHECKPOINT: 50+ signups? Begin Facebook Ads ($500/mo test budget).** |
| 22 | Growth | If 50+ organic users: start testing paid ads. If not: double down on Facebook groups. |
| 23 | Growth | Build Daily Deal Digest email feature (automated morning email). |
| 24 | Growth | Continue content + flipping. Post weekly YouTube recap. |
| 25 | Growth | Contact every churned user personally. Implement top feedback. |
| 26 | Growth | Review ad performance (if running). Kill channels with CAC > $100. |
| 27 | Growth | Write second blog post. Continue B2B follow-ups. |
| 28 | Growth | If 50+ paying users: prepare limited annual deal ($99/yr). |
| 29 | Growth | Review all metrics. Plan Month 2 priorities. |
| 30 | Growth | **MONTH 1 REVIEW. Target: $500-1,000 MRR (revised down from $800-1,500).** |

**Key changes from original calendar:**
- Days 3-6 added for scraper stress testing (was 0 days)
- Product Hunt moved to Month 3+ (was Day 25)
- TikTok daily posting moved to Month 2 (was Day 13)
- Google Ads moved to after 50 organic customers (was Day 22)
- YouTube pre-roll ads moved to Month 3 (was Month 2)
- B2B outreach added (was not in plan)
- Partnership outreach added (was not in plan)
- MRR target revised to realistic $500-1,000 (was $800-1,500)

---

## 25. Revised Technical Implementation Priorities

Incorporating all elicitation findings, the technical priority order is:

### Priority 0: SURVIVAL (Before ANY Marketing)

- [ ] Scraper stress test (50+ runs per platform in production)
- [ ] Proxy rotation infrastructure (Bright Data / residential proxies)
- [ ] Scraper health dashboard endpoint
- [ ] Backtest AI scoring against 200+ real eBay sold prices
- [ ] Full billing lifecycle test (10 cycles: new > upgrade > downgrade > cancel > re-sub)
- [ ] "Why this score" expandable on each scored listing

### Priority 1: CONVERSION (Week 1-2)

- [ ] Live demo scan on landing page (zip code + category > 3-5 anonymized results)
- [ ] "First Flip Guide" post-onboarding flow
- [ ] Persona-specific landing page sections
- [ ] ROI calculator callout above pricing
- [ ] 30-day money-back guarantee badge on FLIPPER tier
- [ ] Time-gated trial: 7 days full FLIPPER access, then drops to restricted free

### Priority 2: RETENTION (Week 2-4)

- [ ] Daily Deal Digest email (automated morning email with top scored items)
- [ ] Churn prediction trigger: no scans in 3 days = "we found deals for you" email
- [ ] "Money found" dashboard widget showing cumulative opportunity value
- [ ] User feedback loop: "Was this a good deal?" button on scored items
- [ ] Onboarding email sequence (Days 1, 3, 5, 7, 14)

### Priority 3: GROWTH (Month 2)

- [ ] Affiliate tracking (`?ref=` parameter, cookie, Stripe metadata)
- [ ] `/business` B2B landing page with Calendly integration
- [ ] `/tools/flip-calculator` SEO magnet page
- [ ] Blog/content framework
- [ ] Annual billing option ($99/yr FLIPPER, $399/yr PRO)

### Priority 4: SCALE (Month 3+)

- [ ] Browser extension for one-click listing analysis
- [ ] Partnership API export (Vendoo/List Perfectly format)
- [ ] Geographic saturation monitoring (how many users per metro area per listing)
- [ ] Product Hunt launch preparation (now with social proof)

---

## 26. Structural Risk: Geographic Saturation (Red Team — Unique Finding)

**The problem:** When 10 Flipper users in the same city all see the same $40 KitchenAid mixer, the first person to message gets the deal. The other 9 paid $19/month for nothing. At scale, the product cannibalizes its own users.

**This is a FUNDAMENTAL product design challenge, not a marketing problem.**

**Short-term mitigations (Month 1-3):**
- [ ] Track how many active users are in each metro area
- [ ] Track how many users viewed the same listing
- [ ] Add "X users viewed this" indicator (creates urgency, also sets expectations)
- [ ] Focus on deal VOLUME — if the tool surfaces 50 deals/day in a metro, 10 users can each find unique opportunities

**Long-term solutions (Month 6+):**
- [ ] **Category personalization:** Different users get different categories prioritized based on their history
- [ ] **Metro area user caps** on higher tiers: "Only 50 PRO users per metro" (creates scarcity AND protects value)
- [ ] **Time-delayed results by tier:** PRO users see deals 15 minutes before FLIPPER users (justifies price)
- [ ] **Geographic expansion:** Push users toward adjacent metros and broader search radii

---

## 27. Assumption Validation Checklist (Do Before Spending Money)

Before committing to paid advertising or public marketing, validate these assumptions:

| # | Assumption | Validation Action | Timeline | Pass Criteria |
|---|-----------|-------------------|----------|--------------|
| 1 | Scrapers work reliably | 50+ test runs per platform | Days 3-6 | >80% success rate all platforms |
| 2 | AI scoring is accurate | Backtest 200 items vs eBay solds | Days 7-12 | >75% of 70+ scored items would profit |
| 3 | Free-to-paid converts | First 50 signups natural conversion | Days 7-21 | >3% conversion within 14 days |
| 4 | Users find value quickly | Track time-to-first-result for first 20 users | Days 7-14 | <5 minutes to see scored results |
| 5 | $19 pricing is right | Ask first 50 signups Van Westendorp survey | Day 21 | $19 falls in "acceptable" range |
| 6 | Churn is manageable | Week-4 retention of first cohort | Day 28 | >60% still active at day 28 |

**RULE: Do not spend $1 on paid advertising until assumptions 1-4 pass.** Everything else is noise until those numbers are real.

---

## 28. Founding Member Pricing Revision

**Original:** $14/mo locked for life, 100 seats.

**Problems:** Permanently discounts your best (most engaged, longest-retained) customers. Creates a revenue cap that can never grow.

**REVISED:**
- [ ] Founding member pricing: $14/mo for **12 months**, then reverts to standard $19/mo
- [ ] Or: 25% lifetime discount ($14.25/mo) instead of locked rate — allows base price increases later
- [ ] Cap at **50 seats** (not 100) — creates more urgency, less revenue sacrifice
- [ ] Founding members get a "Founding Member" badge in-app — builds community identity

---

## 29. GTM Strategy Integration (from docs/GO_TO_MARKET_STRATEGY.md)

The existing Go-To-Market Strategy document contains ideas not yet captured in this plan. The following are integrated here — items already covered in Sections 1-28 are omitted.

### 29.1 User-to-User Referral Program (Missing from MONEY_GRAB)

The affiliate program (Section 13) targets YouTubers and bloggers. A **user-to-user referral program** targets existing customers and is a separate, complementary growth loop.

**Design:**
- Referrer gets: 1 free month of their current plan for each successful referral
- Referee gets: 20% off first month ($15.20 for FLIPPER, $39.20 for PRO)
- Track with unique referral codes per user (generated in dashboard)
- Cap at 6 free months per year (prevents gaming)

**Implementation Checklist (AI Agent):**
- [ ] Add referral code generation to user dashboard (`/settings` or `/referrals`)
- [ ] Create `/api/referrals` route to track code usage
- [ ] Apply referee discount at Stripe checkout via coupon
- [ ] Credit referrer's account on successful referee payment (Stripe webhook)
- [ ] Add "Invite Friends" section in dashboard sidebar
- [ ] Email notification: "You earned a free month! [Name] just signed up."

**Why this was missing:** The affiliate program handles external promoters; this handles word-of-mouth from happy customers. Both should run simultaneously. User referrals are the cheapest acquisition channel (effectively $0 CAC since you're giving away margin, not cash).

### 29.2 Free "eBay Sold Price Checker" Widget (SEO Magnet)

MONEY_GRAB includes a flip calculator (Section 8). The GTM doc additionally proposes a standalone **eBay Sold Price Checker** — a free tool that lets anyone look up what an item actually sold for on eBay.

**Why this is valuable:**
- "What is [item] worth" and "eBay sold prices" are high-volume search queries
- This tool uses the eBay Browse API we already have integrated
- Zero marginal cost to serve (API calls are cheap, results are cacheable)
- Every visitor sees: "Want to find underpriced versions of this item automatically? Try Flipper.ai"

**Implementation Checklist (AI Agent):**
- [ ] Build `/tools/price-checker` page
  - Input: item name or eBay listing URL
  - Output: recent sold prices, average price, price range, days-to-sell
  - CTA: "Find this item listed below market value — try Flipper.ai free"
- [ ] SEO optimize for: "ebay sold prices," "what is [item] worth," "ebay price check"
- [ ] Add to landing page navigation as "Free Tools"

### 29.3 Discord Community + Weekly Contest

The GTM doc proposes a Discord server with a "Best Flips of the Week" contest. This was mentioned in Phase 4 but not detailed.

**Implementation (Month 2 — after 50+ users):**
- [ ] Create Flipper.ai Discord server with channels:
  - `#deals-found` — users share their best AI-scored finds
  - `#flips-completed` — before/after profit stories
  - `#help` — product support and flipping tips
  - `#feature-requests` — direct user feedback
- [ ] **Weekly contest:** "Best Flip of the Week" — user submits screenshot of their highest-profit flip found with Flipper. Winner gets 1 free month. Post winner on social media.
- [ ] This builds community lock-in (switching costs) and generates marketing content for free

### 29.4 Enhanced Email Drip Campaign

MONEY_GRAB Section 25 has a basic onboarding email sequence (Days 1, 3, 5, 7, 14). The GTM doc has sharper upgrade triggers. Merge both:

| Day | Email | Purpose |
|-----|-------|---------|
| 0 | Welcome + onboarding video + "Run your first scan now" CTA | Activation |
| 2 | "Your first scan — here's how to read AI scores" | Education |
| 5 | "See what other Flipper users found this week" (real examples) | Social proof |
| 7 | "You've found $X in opportunities — here's what you're missing on Free" | Upgrade nudge |
| 10 | "50% off your first month of FLIPPER — early supporter exclusive" | Urgency |
| 14 | "Your trial is ending — don't lose access to [features used]" | Loss aversion |
| 21 | "Still on Free? Here's what you missed this week" (show gated results) | FOMO |
| 30 | "Your first month recap — X deals found, $X potential profit" | ROI proof |

**Key addition from GTM:** The Day 10 "50% off upgrade" is a powerful conversion lever missing from the original MONEY_GRAB plan. A one-time 50% off first month ($9.50 for FLIPPER) can push fence-sitters to convert.

### 29.5 Activation Metrics & Support SLA

The GTM doc defines specific activation targets missing from MONEY_GRAB:

**Activation Metrics (Add to Section 18):**

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| Time to first scan | <5 minutes after signup | If onboarding is slow, users bounce |
| First scan completion rate | >80% of signups | Measures onboarding friction |
| "Aha moment" rate | >50% see a 70+ scored item in first session | If AI doesn't surface value fast, they leave |
| Weekly active users | >60% of registered | Measures ongoing engagement |

**Customer Support SLA (Add to Section 17 — Risk Mitigation):**
- [ ] Respond to all user messages within **1 hour** during first 3 months
- [ ] This is critical for early reputation. One unanswered support request from an early user = negative review that poisons the well.
- [ ] Set up email notifications for support requests. Check 3x/day minimum.
- [ ] After 100+ users: consider Intercom or Crisp chat widget ($0-29/mo) for in-app support

### 29.6 Reddit Ads as a Paid Channel

The GTM doc includes Reddit Ads ($100 test budget) which MONEY_GRAB missed entirely. Reddit allows targeting specific subreddits — this is uniquely valuable because r/Flipping users are the exact target.

**Add to Section 12 (Ad Budgets):**
- [ ] **Reddit Ads:** $100-200/month test budget
  - Target: r/Flipping, r/sidehustle, r/Reselling, r/eBay
  - Format: Promoted post (looks native, not banner ad)
  - Copy: "I built an AI tool that finds underpriced items on 5 marketplaces. Free to try."
  - Expected CPC: $1-3 (cheaper than Google for this niche)
  - This bypasses the "no self-promotion" rule since it's a paid ad, not an organic post

### 29.7 Micro SaaS Pitfall Reminders

From the GTM doc's "Common Mistakes" section — principles to keep top of mind:

1. **Don't over-build.** Ship fast, iterate on feedback. The plan already covers 90%+ of features needed.
2. **Respond within 1 hour.** Early customer support IS marketing. Every resolved issue is a potential testimonial.
3. **Don't compete on price.** Compete on value (lifecycle tracking, AI scoring, multi-marketplace). Never race to $0.
4. **Don't give up before Month 6.** Most micro SaaS takes 6-12 months to gain traction. The revised plan targets $500-1K MRR in Month 1 — that's validation, not failure.
5. **Build the email list from Day 1.** Even people who don't sign up should be captured: "Get 3 free flip tips weekly."

### 29.8 Recommended Reading

From the GTM doc — books directly relevant to this launch:
- **"The Mom Test"** by Rob Fitzpatrick — how to talk to customers without leading them
- **"Traction"** by Gabriel Weinberg — systematic approach to finding growth channels
- **"Zero to Sold"** by Arvid Kahl — the definitive micro SaaS playbook

---

*Part 2 findings were generated by 5 independent elicitation agents, each applying a distinct analytical method. Section 29 integrates unique ideas from the existing GO_TO_MARKET_STRATEGY.md. Where Part 2 conflicts with Part 1, Part 2 takes precedence.*

---
---

# PART 3: AI AUTOMATION STRATEGY

*How to reduce the founder's weekly workload from 80+ hours to ~25 hours using Claude Code, built-in AI features, and minimal external tools.*

---

## 30. The Automation Thesis

The elicitation (Section 20, Finding 4) identified a critical problem: the plan demands 80+ hours/week from a solo founder. AI automation is the answer — not by paying for a dozen SaaS tools, but by leveraging **Claude Code** (which you're already paying for) and the **OpenAI/Claude APIs already integrated into the product**.

**Three tiers of automation (cheapest first):**
1. **Claude Code as your AI employee** — use Claude Code sessions to generate content, write outreach, analyze data, and create marketing assets. Cost: $0 incremental (already subscribed).
2. **Built-in AI features** — code built into Flipper.ai that auto-generates digests, reports, and retention emails. Cost: $0 incremental (uses existing API budget).
3. **Minimal external tools** — only where Claude Code genuinely can't do the job (email sending infrastructure, workflow triggers). Cost: ~$48-73/mo.

### Claude Code Can Replace Most External Tools

| External Tool | Monthly Cost | Claude Code Alternative | How |
|--------------|-------------|----------------------|-----|
| ~~Byword.ai ($99/mo)~~ | $99 | Claude Code writes blog posts | `/loop` or manual: "Write an SEO blog post about best items to flip in [City] using this data: [paste scan results]" |
| ~~Typefully ($12.50/mo)~~ | $12.50 | Claude Code generates social posts | "Generate 7 Twitter posts for this week about Flipper.ai flipping results. Tone: authentic, building-in-public." |
| ~~Opus Clip ($19/mo)~~ | $19 | Can't replace (video editing) | Keep if doing video content, or use free CapCut |
| ~~AdCreative.ai ($29/mo)~~ | $29 | Claude Code writes ad copy | "Write 10 Facebook ad headline/description variants for Flipper.ai targeting resellers" |
| ~~Surfer SEO ($99/mo)~~ | $99 | Claude Code + free keyword tools | Use Ubersuggest free tier for keywords, Claude Code for content optimization |
| ~~Instantly.ai ($37/mo)~~ | $37 | Partially — Claude writes emails, you send manually or use free tier | Claude Code writes all personalized outreach. For sending at scale: Instantly free tier (50 emails/day) or Gmail + mail merge |
| ~~Crisp ($25/mo)~~ | $25 | Built-in AI chatbot (Section 32) | Build it into the product using Vercel AI SDK + existing APIs |
| Make.com ($10.59/mo) | $10.59 | Keep — workflow automation needs event triggers | Can't replace event-driven webhooks with Claude Code |
| Beehiiv ($0) | $0 | Keep — free newsletter platform | No cost anyway |

**Revised external tool budget: $10.59-48/mo** (Make.com required, Beehiiv free, Instantly free tier optional, CapCut free for video)

**Savings vs. full tool stack: $234-334/mo**

---

## 31. Claude Code as Your AI Marketing Department

Claude Code can be invoked in sessions or via `/loop` to perform these tasks on a schedule. You already pay for it — use it.

### 31.1 Weekly Blog Post Generation (Replaces Byword.ai — saves $99/mo)

**How to do it with Claude Code:**

Every Monday, start a Claude Code session:
```
"Write a 1500-word SEO blog post for the Flipper.ai blog.
Topic: [topic from the SEO keyword list in MONEY_GRAB.md Section 8]
Target keyword: [keyword]
Include: intro hook, 5-7 H2 sections, practical examples from the flipping
niche, internal link to flipper-ai.com/register, meta description.
Tone: helpful, data-driven, like a friend who's been flipping for years.
Output as markdown. Include a suggested title tag and meta description."
```

Better yet — feed it real data from your scans:
```
"Here are the top 20 items Flipper.ai found underpriced this week in Portland:
[paste data from dashboard]

Write a blog post: 'Top Underpriced Items to Flip in Portland This Week'
with analysis of each item's flip potential, estimated profit, and tips."
```

**Time: ~30 min/week** (prompt + review + publish). Replaces 2-3 hours of writing or $99/mo for Byword.ai.

### 31.2 Social Media Content Batch (Replaces Typefully — saves $12.50/mo)

**Every Sunday, one Claude Code session:**
```
"Generate my social media content for the week for Flipper.ai.
My results this week: [paste your flip data / achievements]
Current user count: [X]
Current MRR: $[X]

Generate:
1. 7 Twitter/X posts (1/day) — mix of building-in-public, flip results, tips
2. 5 short-form video scripts (30-60 sec each) for TikTok/YouTube Shorts
3. 2 Facebook group value posts (data-driven, not promotional)
4. 1 LinkedIn post (professional tone, SaaS founder journey)

For each, include suggested hashtags. Tone: authentic, not salesy."
```

Copy-paste into native schedulers (Twitter's built-in scheduler is free, or use Buffer free tier for 3 channels). **Time: ~20 min/week.**

### 31.3 Cold Outreach Email Writing (Replaces Instantly.ai paid tier — saves $37/mo)

**Claude Code writes all personalized emails. You send them.**

**B2B Outreach (pawn shops / consignment stores):**
```
"I need to email 25 pawn shops and consignment stores in [City].
Here are their names and what I found about each:
[paste list: store name, website/specialty, city]

For each, write a personalized cold email:
- Subject line (under 50 chars)
- Personalized opening referencing their store
- Pitch: AI tool finds underpriced items across 5 marketplaces
- CTA: 15-min demo via Calendly
- 2 follow-up emails (send if no response after 3 and 7 days)

Keep each email under 150 words. Tone: professional but casual."
```

**Influencer Outreach:**
```
"I need to email these YouTube flipping micro-influencers:
[paste list: name, channel, subscriber count, recent video topic]

For each, write a personalized pitch email:
- Reference their specific recent video
- Offer: free Pro account ($49/mo value) + 30% recurring affiliate commission
- Fallback offer: $200 flat fee for a review video
- Include: why their audience would love Flipper.ai

Tone: founder-to-creator, casual, not corporate."
```

**Sending options (free or near-free):**
- Gmail + Google Sheets mail merge (free, up to 500 emails/day) — use a Google Apps Script or "Yet Another Mail Merge" free tier
- Instantly.ai free tier (50 emails/day) — sufficient for 25 B2B + 20 influencer emails
- Or just send manually — 25 emails takes ~45 min when copy is pre-written by Claude

### 31.4 Ad Copy Generation (Replaces AdCreative.ai — saves $29/mo)

```
"Generate Facebook/Instagram ad copy for Flipper.ai.
Product: AI-powered marketplace scanner for resellers
Pricing: Free / $19 mo / $49 mo
Target audience: people who flip items from Craigslist, FB Marketplace,
eBay, Mercari, OfferUp for profit

Generate:
- 10 headline variants (under 40 chars each)
- 5 primary text variants (under 125 chars)
- 5 long-form description variants (under 250 chars)
- 3 different value prop angles: time savings, money found, AI advantage

Also generate Google Ads copy:
- 10 headlines (30 chars max)
- 5 descriptions (90 chars max)
- Suggested keywords to target"
```

**Time: ~15 min per batch.** Generate new batches monthly or when current ads fatigue.

### 31.5 Email Drip Campaign Writing

```
"Write a 7-email onboarding drip campaign for Flipper.ai.
Trigger: new user signup (free tier).
Goal: convert to paid ($19/mo FLIPPER plan).

Email sequence:
- Day 0: Welcome + how to run first scan
- Day 2: How to read AI scores + tips for beginners
- Day 5: Social proof (what other users found this week)
- Day 7: Feature comparison (free vs paid, what they're missing)
- Day 10: 50% off first month ($9.50) — urgency offer
- Day 14: Trial ending soon (if applicable)
- Day 21: Win-back (here's what you missed this week)

For each email: subject line (A/B variant), preview text, body (under 200 words),
CTA button text. Tone: helpful friend, not salesy corporation.
Output as markdown I can convert to React Email templates."
```

Claude Code writes all 7 emails in one session. **Then you implement them once — they run forever.**

### 31.6 Weekly Data Analysis & Reporting

```
"Analyze these metrics for Flipper.ai this week:
- New signups: [X]
- Paid conversions: [X]
- Churn: [X]
- MRR: $[X]
- Top traffic sources: [list]
- Support requests: [X] (top themes: [list])

Compare to last week. Identify:
1. What's working (double down)
2. What's not working (cut or fix)
3. One specific action item for next week
4. Any concerning trends

Keep it under 200 words. Be blunt."
```

### 31.7 Claude Code `/loop` for Recurring Tasks

For truly recurring work, use Claude Code's `/loop` command:
- `/loop 7d "Generate this week's social media content for Flipper.ai based on the latest scan results and metrics"` — weekly content generation
- `/loop 1d "Check Flipper.ai Sentry for new errors and summarize any critical issues"` — daily monitoring

---

## 32. Built-In AI Features (Build Into Flipper.ai)

These use the OpenAI/Claude APIs already in the codebase. Zero new service costs.

### Priority 1: Personalized Daily Deal Digest (3-4 hours to build)

**The single highest-ROI feature.** Transforms Flipper from "a tool you log into" to "a daily email that hands you money."

**How it works:**
1. Daily cron job at 6 AM per user's timezone
2. Queries top-scoring opportunities matching user's saved categories + location
3. Calls OpenAI to write a 2-3 sentence "why buy" blurb for each deal
4. Sends via Resend as personalized React Email

**AI Agent Implementation Checklist:**
- [ ] Create `src/lib/ai-deal-digest.ts`
  - `generateDealDigest(userId)` → queries preferences + top opportunities
  - OpenAI structured output: `{ subject, deals: { headline, whyBuy, urgency }[] }`
  - Uses existing `llm-analyzer.ts` caching patterns
- [ ] Create `src/components/emails/DealDigestEmail.tsx` (React Email)
  - Personalized subject: "3 Electronics Deals Under $50 in [City] Today"
  - Per deal: photo, title, price, AI score, "why buy" blurb, CTA
  - Footer: "Upgrade to PRO for 10 deals/day" (tier gate)
- [ ] Create `app/api/cron/deal-digest/route.ts` — daily batch
  - Group users by preferences to minimize API calls
  - Tier gating: FREE = 1 deal, FLIPPER = 5, PRO = 10
- [ ] Settings toggle: "Daily Deal Digest" (default: ON)

### Priority 2: AI Social Post Generator (2-3 hours to build)

When user marks opportunity as SOLD, auto-generate shareable content.

**AI Agent Implementation Checklist:**
- [ ] Create `src/lib/ai-social-posts.ts`
  - `generateFlipPosts(opportunity)` → `{ twitter, instagram, tiktokScript }`
- [ ] Add "Share Your Win" card on opportunity detail after SOLD status
  - One-click copy buttons per platform
  - Optional direct "Share to Twitter" link

### Priority 3: AI Weekly Flip Report (6-8 hours to build)

Personalized Monday email: deals found, profit/loss, AI recommendations.

**AI Agent Implementation Checklist:**
- [ ] Create `src/lib/ai-report-generator.ts`
  - Queries 7-day user activity → OpenAI narrative
  - "Your best flip was [X] with 43% margin. Consider expanding to furniture — 52% margins in your area."
- [ ] Create `src/components/emails/WeeklyReportEmail.tsx`
- [ ] Create `app/api/cron/weekly-report/route.ts` — Monday 8 AM
- [ ] Toggle in settings (ON for paid, OFF for free)

### Priority 4: AI Onboarding Chatbot (10-16 hours to build)

In-app chat widget replacing Crisp ($25/mo saved). Uses Vercel AI SDK.

**AI Agent Implementation Checklist:**
- [ ] `pnpm add ai @ai-sdk/openai`
- [ ] Create `app/api/chat/route.ts` — streaming chat with `streamText()`
  - System prompt: user state, product docs, scoring methodology
  - Function calling: `startScan()`, `explainScore()`, `setPreferences()`
- [ ] Create `src/components/ChatWidget.tsx` — `useChat()` hook
  - Floating bottom-right, suggested prompts
  - Escalation: "Talk to a human" → Resend email ticket
- [ ] Context injection: tier, onboarding state, recent scores

### Priority 5: AI Retention Nudge Engine (8-10 hours to build)

Daily cron detects churn risk, AI writes personalized re-engagement.

**AI Agent Implementation Checklist:**
- [ ] Create `src/lib/retention-engine.ts`
  - Triggers: `inactive_3_days`, `found_not_purchased`, `scan_no_results`, `trial_day_5`
  - Per trigger: query context → OpenAI personalized email → send via Resend
- [ ] Create `app/api/cron/retention-check/route.ts` — daily 10 AM
- [ ] Track re-engagement rates per trigger type

### Build Order & Timeline

| Day | Feature | Hours |
|-----|---------|-------|
| 1 | Daily Deal Digest | 4h |
| 1-2 | Social Post Generator | 3h |
| 2-3 | Weekly Flip Report | 8h |
| 4-5 | Onboarding Chatbot | 12h |
| 6 | Retention Nudge Engine | 10h |
| **Total** | | **~37h** |

Priorities 1-3 (~15 hours) deliver the most value and can be built in a weekend.

---

## 33. The Ultra-Lean Daily Routine (With Claude Code)

### Morning (45 min)

| Time | Task | Duration |
|------|------|----------|
| 7:00 AM | Deal Digest already sent automatically. Check your own top deals. | 5 min |
| 7:05 AM | Check email replies from outreach (Claude Code wrote them, you sent them) | 15 min |
| 7:20 AM | Check chatbot escalations (most support handled by built-in AI chatbot) | 10 min |
| 7:30 AM | Check Stripe (Make.com Slack alerts for new subs/churn) | 5 min |
| 7:35 AM | Review Sentry errors if any | 5 min |

### Midday (15 min)

| Time | Task | Duration |
|------|------|----------|
| 12:00 PM | Publish blog post Claude Code wrote earlier this week | 15 min |

### Evening (1.5 hrs — the real work)

| Time | Task | Duration |
|------|------|----------|
| 6:00 PM | Personal flipping — pick up items, photograph, list | 45 min |
| 6:45 PM | Facebook group engagement (authentic, not promotional) | 30 min |
| 7:15 PM | Strategic thinking — metrics, feature ideas, user feedback | 15 min |

### Weekly Tasks (Claude Code Sessions)

| Day | Claude Code Session | Duration |
|-----|-------------------|----------|
| Sunday | Generate all social media content for the week | 20 min |
| Monday | Write 1 SEO blog post from scan data | 30 min |
| Wednesday | Write B2B/influencer outreach batch (if needed) | 20 min |
| Friday | Analyze weekly metrics + generate report | 15 min |

**Total weekly time: ~20 hours** (2.5 hrs/day + 1.5 hrs Claude Code sessions)

### What's Fully Automated (Zero Human Touch)

- Daily Deal Digest emails (built-in AI)
- Weekly Flip Reports (built-in AI)
- Customer support FAQ (built-in chatbot)
- Retention nudge emails (built-in AI)
- Social post generation on successful flips (built-in AI)
- Signup/churn notifications (Make.com)

### What Claude Code Does (15 min/session)

- Weekly blog posts (you review, Claude writes)
- Social media content batches (you review, Claude writes)
- Outreach emails (you review, Claude writes)
- Ad copy (you review, Claude writes)
- Data analysis and reporting

### What Only You Can Do

- Personal flipping (credibility + content)
- Community engagement (authenticity)
- Relationship building (partner calls, influencer DMs)
- Strategic decisions (pricing, features, roadmap)

---

## 34. Total Cost: Ultra-Lean AI Stack

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Make.com | $10.59 | Workflow automation (only external tool required) |
| Beehiiv | $0 | Free newsletter platform |
| CapCut | $0 | Free video editing (replaces Opus Clip) |
| Buffer free tier | $0 | Social scheduling (3 channels) |
| Claude Code subscription | Already paying | Your AI marketing department |
| OpenAI API (in-product) | ~$50-150 | Deal digest, reports, chatbot, retention |
| **TOTAL NEW SPEND** | **$10.59-60/mo** | **vs $282-382/mo for full external stack** |

**Break-even: ~3 paying customers cover the entire AI automation cost.**

**Savings vs. full tool stack: $270+/month.** That's $3,240/year back in your pocket.

---

## 35. Implementation Sprint: AI Features Build Order

### Sprint 1: Revenue Drivers (Days 1-2, ~7 hours)

- [ ] `src/lib/ai-deal-digest.ts` — personalized deal digest generator
- [ ] `src/components/emails/DealDigestEmail.tsx` — React Email template
- [ ] `app/api/cron/deal-digest/route.ts` — daily cron job
- [ ] `src/lib/ai-social-posts.ts` — flip story post generator
- [ ] "Share Your Win" UI card on opportunity detail page

### Sprint 2: Retention Drivers (Days 3-4, ~8 hours)

- [ ] `src/lib/ai-report-generator.ts` — weekly flip report
- [ ] `src/components/emails/WeeklyReportEmail.tsx` — report template
- [ ] `app/api/cron/weekly-report/route.ts` — Monday cron
- [ ] User settings toggles for all email preferences

### Sprint 3: Conversion Drivers (Days 5-6, ~12 hours)

- [ ] `pnpm add ai @ai-sdk/openai` — Vercel AI SDK
- [ ] `app/api/chat/route.ts` — streaming chat endpoint
- [ ] `src/components/ChatWidget.tsx` — floating chat UI
- [ ] System prompt + function calling + user context

### Sprint 4: Churn Prevention (Day 7, ~10 hours)

- [ ] `src/lib/retention-engine.ts` — behavior triggers + AI emails
- [ ] Retention email templates
- [ ] `app/api/cron/retention-check/route.ts` — daily cron

---

*Part 3 completes the MONEY_GRAB playbook. By using Claude Code as your AI marketing department and building AI features into the product itself, total new spend is just ~$11-60/month. The founder works ~20 hours/week while AI handles content, support, outreach drafting, and retention — all from tools you're already paying for.*

**Final motto: Claude Code is your co-founder. Use it.**

---
---

# PART 4: THE DEFINITIVE EXECUTION PLAN

*This is the ONLY section you need to read day-to-day. It resolves all contradictions from Parts 1-3, applies all 10 elicitation findings, and distills 2200 lines into the actions that actually matter. Parts 1-3 are reference material. Part 4 is your operating manual.*

---

## 36. Resolved Decisions (No More Contradictions)

| Decision | FINAL Answer | Supersedes |
|----------|-------------|-----------|
| **Pricing** | FREE trial (7 days full access) → FLIPPER $19/mo → PRO $49/mo | Keep 2 paid tiers (already built). Via Negativa's 1-tier suggestion is noted — validate with data at Day 30. |
| **Founding member pricing** | $14/mo for 12 months, then $19/mo. Cap: 50 seats. | Sections 4, 6 template (update to "12 months"), Section 28 |
| **Lifetime deal** | SKIP for now. Offer $149/year annual plan instead. Same cash injection, no forever liability. | Sections 4, 8, 23 |
| **Month 1 MRR target** | $500-1,000 | Sections 1 ($1K), 7 ($800-1,500) |
| **Churn rate for all math** | 10% monthly (realistic for new SaaS) | Sections 12 (5.5%), 16 (6%) |
| **Free tier design** | 7-day full FLIPPER trial, then: 3 scans/day, 1 marketplace, scores visible but AI analysis locked | Section 4 (10 scans), Section 20 Finding 3 |
| **YouTube strategy** | Own channel from Day 4. Micro-influencers (1-5K) only, starting Day 28+. No big YouTubers until 100+ users. | Section 7 (Day 15 outreach to 300K creators) |
| **Product Hunt** | Month 3-4 at earliest. Not in Month 1 plan. | Appendix A (Day 25) |
| **Paid ads** | Not until 50 organic paying customers AND validated conversion data. | Section 8 (Day 22), Section 12 (Month 2) |
| **AI features to build** | ONE: Daily Deal Digest (4 hours). Everything else defers to Month 2+. | Section 35 (37 hours, 5 features) |
| **Marketing channels Month 1** | TWO only: (1) Personal flipping + Facebook groups. (2) B2B cold outreach. | Sections 7, 11 (10+ channels) |
| **Metrics to track** | THREE: New signups, paid conversions, MRR. Everything else is noise until Month 3. | Section 18 (11 metrics) |
| **Email drip** | THREE emails: Day 0 welcome, Day 5 "here's what you found," Day 7 trial ending + 50% off first month. | Section 29.4 (8 emails) |

---

## 37. The Essential 7 Actions (Everything Else Can Wait)

These are the ONLY things that matter for the first 45 days. In order.

### Action 1: Configure Stripe + Deploy (Days 1-2)

- [ ] Create Stripe products/prices: FLIPPER $19/mo, PRO $49/mo, FLIPPER Annual $149/yr
- [ ] Set up webhook endpoint + signing secret
- [ ] Update env vars in GCP Secret Manager
- [ ] Point domain DNS to Firebase Hosting
- [ ] Configure Resend email DNS
- [ ] Deploy via `git push origin main` (GitHub Actions → Firebase + Cloud Run)
- [ ] Smoke test: register → upgrade → verify tier change → customer portal → cancel
- [ ] Run 10 full billing lifecycle tests (new sub, upgrade, downgrade, cancel, re-sub, failed payment)

**Done when:** You can take a real payment and the user gets access. ~4-6 hours.

### Action 2: Scraper Stress Test (Days 1-5, parallel with Action 1)

- [ ] Start scraper testing on Day 1 (run overnight while DNS propagates)
- [ ] Run each of the 5 scrapers 50+ times against production infrastructure
- [ ] Log success rate per platform. Threshold: >80% per platform.
- [ ] Set up residential proxy rotation ($200-500/mo — Bright Data or Oxylabs)
- [ ] Test with proxies. Re-measure success rates.
- [ ] Backtest AI scoring: run 200 scored items against eBay sold prices. Target: >75% of 70+ items would profit.

**GO/NO-GO on Day 5-6:** If 3+ scrapers pass >80% AND scoring accuracy >75%, proceed. Otherwise, fix before any marketing.

### Action 3: Use the Tool Yourself (Days 7-45, ongoing)

- [ ] Run scans daily. Target fast-flip categories: video game consoles, power tools, small electronics (1-3 day sell-through)
- [ ] Buy 2-3 items per week. Document EVERYTHING: screenshot the listing, the AI score, the purchase, the resale listing, the sale.
- [ ] Track in Flipper's lifecycle: IDENTIFIED → PURCHASED → LISTED → SOLD
- [ ] Frame losses as content from Day 1: "Here's what the AI got wrong and what we're fixing"
- [ ] Target: 3+ successful flips before any public marketing (generates proof)
- [ ] Starting capital: $200-500

**This is non-negotiable.** It generates revenue, catches bugs, creates content, and builds credibility simultaneously.

### Action 4: Personal Network Outreach (Days 7-10)

- [ ] List everyone you know who resells, thrifts, or wants side income
- [ ] Send 20-30 personalized messages (text, DM, email — not mass blast):
  ```
  Hey [Name], I just launched an AI tool that finds underpriced items
  on 5 marketplaces for resale. I've been using it and found [specific
  flip example]. Want to try it? First month free for friends.
  [link]
  ```
- [ ] Offer first month free (Stripe coupon), not founding member discount (simpler)
- [ ] Anyone who converts: ask for a 1-sentence testimonial

**Target:** 5-15 paying customers from warm network. This is the fastest path to first revenue.

### Action 5: Facebook Group Engagement (Days 11-30)

- [ ] Join 5 groups: BOLO Flippers, Flipping for Profit, Resellers Unite, eBay Sellers, Goodwill/Thrift Flippers
- [ ] Days 11-14: Engage authentically. Answer questions. Comment on posts. Be helpful. Do NOT mention your tool.
- [ ] Day 15+: Post a case study using YOUR real flipping data:
  ```
  "Used AI to scan 5 marketplaces this week. Found 8 deals, bought 3,
  sold 2 for $127 profit. Here's the breakdown with screenshots..."
  ```
- [ ] When asked "what tool?": share link. Offer first month free.
- [ ] Repeat weekly: new case study with new data each time

**Time: 5 hours/week.** This is your primary organic acquisition channel.

### Action 6: B2B Cold Outreach (Days 15-25)

- [ ] Use Claude Code to write 50 personalized emails to local pawn shops + consignment stores
- [ ] Send via Gmail (free) or Instantly.ai free tier (50/day)
- [ ] Price: $99/mo per location (don't put this on the public pricing page)
- [ ] Offer: 14-day free pilot, 15-min demo via Calendly
- [ ] Follow up non-responders at Day 3 and Day 7

**CRITICAL second-order effect:** B2B customers and B2C customers in the same metro compete for the same deals. Never serve both without awareness. If a pawn shop signs up in Portland, monitor whether Portland consumer users' deal quality degrades.

**Target:** 3-5 B2B customers at $99/mo = $297-495/mo from a low-churn segment.

### Action 7: Build the Daily Deal Digest (Days 20-22, 4 hours of dev)

- [ ] `src/lib/ai-deal-digest.ts` — query top opportunities per user's preferences + location
- [ ] Call OpenAI for 2-sentence "why buy" blurb per deal (structured output, cached)
- [ ] `src/components/emails/DealDigestEmail.tsx` — React Email template
- [ ] `app/api/cron/deal-digest/route.ts` — daily cron at 6 AM
- [ ] Tier gating: trial users = 1 deal, FLIPPER = 5, PRO = 10
- [ ] **CRITICAL:** Randomize deal order per user in the same metro (second-order effect: prevents same-deal collision)
- [ ] **CRITICAL:** Throttle free/trial scans to off-peak hours (10 AM-2 PM). Paid users get 6 AM priority. (second-order effect: free users burning scraper capacity)

**This is the single highest-leverage product feature.** It drives retention (users open the email daily), conversion (locked deals create upgrade pressure), and differentiation (no competitor does this).

---

## 38. Definitive Calendar (Days 1-45)

| Day | Action | Hours | Notes |
|-----|--------|-------|-------|
| 1 | Stripe config. Start scraper stress test (overnight runs). DNS setup. | 4h | Actions 1+2 in parallel |
| 2 | Deploy to production. Smoke test billing (10 cycles). Continue scraper tests. | 3h | |
| 3 | Scraper testing continues. Fix any failures. Set up proxy rotation. | 3h | |
| 4 | Scraper testing. Create YouTube channel. Record first Short from demo. | 2h | |
| 5 | **Scraper results review.** Backtest 200 AI scores vs eBay solds. | 3h | |
| 6 | **GO/NO-GO DECISION.** If pass: proceed. If fail: fix scrapers (add 3-7 days). | 1h | Gate |
| 7 | **PRODUCT LIVE.** Start using Flipper yourself. Run scans. Contact sellers. | 2h | Action 3 begins |
| 8 | Buy first items. Screenshot everything. Document the process. | 2h | |
| 9 | Continue flipping. Start personal outreach (first 10 messages). | 2h | Action 4 begins |
| 10 | More outreach (10-20 more messages). List flip items on eBay/Mercari. | 2h | |
| 11 | Join Facebook groups. Start engaging (comments, answers, NO promotion). | 1.5h | Action 5 begins |
| 12 | Continue flipping + Facebook engagement. | 2h | |
| 13 | Flipping + Facebook. Post first flip result on your YouTube channel. | 2h | |
| 14 | **CHECKPOINT.** Count: signups, paying users, scraper uptime, flip P&L. | 1h | Expect: 3-10 paying users |
| 15 | Post first case study in Facebook groups (real data, real screenshots). | 2h | |
| 16 | Claude Code: write 25 B2B outreach emails. Send first batch. | 2h | Action 6 begins |
| 17 | Send remaining 25 B2B emails. Follow up with Facebook group interest. | 1.5h | |
| 18 | Continue flipping + engagement. Write 3 onboarding emails with Claude Code. | 2h | |
| 19 | Implement 3-email drip sequence (Day 0, Day 5, Day 7). | 3h | Dev work |
| 20 | **Build Daily Deal Digest (Sprint Day 1).** | 4h | Action 7 |
| 21 | Test digest. Fix issues. Deploy. | 1h | |
| 22 | B2B follow-ups (Day 7 for first batch). New Facebook case study. | 2h | |
| 23 | Contact every churned user personally. Ask why. Implement top feedback. | 1h | |
| 24 | Claude Code: write first SEO blog post from scan data. | 1h | |
| 25 | Publish blog post. Continue flipping + engagement. | 1.5h | |
| 26 | Send partnership emails to List Perfectly + Vendoo (one-way export only). | 1h | |
| 27 | Weekly YouTube recap video (10 min record, upload). | 1h | |
| 28 | **CHECKPOINT.** Signups, conversions, MRR, churn, digest open rate. | 1h | |
| 29 | If 20+ paying users: plan Month 2 expansion (affiliates, micro-influencers). | 1h | |
| 30 | **MONTH 1 REVIEW.** | 1h | Target: $500-1,000 MRR |
| 31-45 | Continue channels that work. Add: affiliate program, micro-influencer outreach ($200 flat), Facebook Ads $500 test (only if 50+ organic users). | ~2.5h/day | Scale what works |

---

## 39. Pivot Decision Framework (If Things Go Wrong)

| Scenario | Trigger | Action |
|----------|---------|--------|
| Scrapers fail (<80% success) | Day 5-6 | Halt marketing. Fix scrapers. Retest. If unfixable in 2 weeks, pivot to eBay-only (API, legal, stable). |
| Zero paying users by Day 21 | Day 21 | Product problem, not marketing problem. Interview first 20 signups. Ask: "Why didn't you pay?" Fix the #1 answer. |
| MRR is $0 by Day 30 | Day 30 | Stop all marketing. Spend 1 week doing 10 user interviews. The product may not solve a real problem at a price people pay. Validate before continuing. |
| Churn exceeds 15%/month | Day 30+ | Freeze acquisition. Every dollar spent acquiring a user who churns in 2 months is lost. Fix retention first: contact every churned user, implement top 3 feedback items. |
| B2B competes with B2C in same metro | Ongoing | Separate deal feeds by segment. Or: add B2B surcharge for "priority access" that funds metro exclusivity. |
| Scraper breaks in production | Any day | Fix within 24 hours. If >48 hours: email affected users, offer 1 week free extension. Transparency > silence. |

---

## 40. Legal Checklist (Do Before Day 7)

- [ ] **Privacy Policy:** Generate using Termly.io (free) or iubenda. Must cover: data collected (email, location, browsing), cookies, third-party services (Firebase, Stripe, OpenAI). Publish at `/privacy`.
- [ ] **Terms of Service:** Generate using Termly.io. Include: disclaimer that AI scores are estimates not guarantees, limitation of liability, acceptable use (no automated reselling bots). Publish at `/terms`.
- [ ] **Cookie consent banner:** Add a simple banner. Firebase and Stripe set cookies.
- [ ] **Trademark search:** Search USPTO TESS for "Flipper" in software/SaaS class. If conflict exists, prepare backup name.
- [ ] **Marketplace TOS review:** Read Facebook, Craigslist, and OfferUp TOS sections on automated access. Structure scraping as user-initiated (user clicks "scan", their preferences trigger the job).
- [ ] **CAN-SPAM compliance:** All marketing emails must have unsubscribe link + physical address. Resend handles this, but verify.

---

## 41. Analytics Setup (Do During Days 1-3)

- [ ] **Google Analytics 4:** Add GA4 tag to root layout. Track: page views, signup events, checkout events.
- [ ] **UTM conventions:** All links you share use `?utm_source=X&utm_medium=Y&utm_campaign=Z`. Standard: `source=facebook|reddit|email|youtube|b2b`, `medium=organic|outreach|ad`, `campaign=launch|founding|digest`.
- [ ] **Stripe Dashboard:** Your real-time MRR tracker. Check daily. Enable email alerts for new subscriptions and cancellations.
- [ ] **Sentry:** Already configured. Monitor for spikes in errors after launch.
- [ ] **Simple conversion tracking:** Log `signup`, `scan_completed`, `upgrade_clicked`, `payment_completed` events. Even console.log to start — formalize later.

---

## 42. Month 2+ Expansion (Only After Hitting Day 30 Targets)

**Unlock these ONLY after 20+ paying customers and validated conversion data:**

- [ ] Affiliate program: Rewardful ($29/mo) + 30% flat commission. Contact micro-influencers (1-5K subs, $200 flat fee).
- [ ] Facebook/Instagram ads: $500/mo test budget. Kill if CAC > $100 after 2 weeks.
- [ ] Build AI Social Post Generator (3 hours). Build AI Weekly Report (8 hours).
- [ ] Second blog post per week (Claude Code writes, you review).
- [ ] Annual billing: $149/yr FLIPPER, $399/yr PRO.
- [ ] User-to-user referral program: "Give 1 month, get 1 month."

**Unlock at 50+ paying customers:**

- [ ] Reddit Ads ($100-200/mo test).
- [ ] Onboarding chatbot (12 hours dev, replaces manual support).
- [ ] Consider the revised LTD: 50 seats at $149/year (annual, not lifetime).

**Unlock at 100+ paying customers:**

- [ ] Product Hunt launch (now with real testimonials and social proof).
- [ ] Mid-tier YouTuber outreach (10-50K subs).
- [ ] TikTok content calendar (daily posting).
- [ ] Google Ads ($750/mo).

**Unlock at 500+ paying customers:**

- [ ] Enterprise tier ($99/mo), team accounts.
- [ ] Geographic saturation monitoring and metro caps.
- [ ] Browser extension. Partnership API exports.
- [ ] Consider hiring first part-time contractor (customer support or content).

---

## 43. Second-Order Rules (Keep These Visible)

These rules prevent the hidden cascading failures identified by the Second-Order Effects analysis. Print them.

1. **Free tier users scan at off-peak hours only** (10 AM-2 PM). Paid users get 6 AM priority. Prevents free users from burning scraper capacity and IP reputation.
2. **Daily digest randomizes deal order per user per metro.** Prevents 10 users seeing the same #1 deal and 9 of them getting nothing.
3. **B2B and B2C in the same metro require awareness.** Monitor whether B2B signups degrade consumer deal quality. If so, offer B2B "priority access" surcharge or geographic exclusivity.
4. **AI chatbot NEVER recommends a specific purchase.** Only explains scores. Disclaimer on every price mention. "AI scored 87 — this means comparable items typically sell for $X" ≠ "you should buy this."
5. **Partnership integrations are one-way exports only.** Send our data to Vendoo/LP format. Never expose scoring API or deal data to partners who will eventually clone you.
6. **Claude Code content must include real data.** Never publish AI-generated blog posts without injecting real scan data, personal flip stories, and specific dollar amounts. The data is the moat, not the prose.
7. **Publish losses as content.** When a flip fails, write "what the AI got wrong" posts. Hiding bad weeks creates suspicious gaps the Reddit community will notice.
8. **Referral program rewards cross-city referrals with bonus months.** Referring locally adds a competitor in your own market. Incentivize geographic expansion.

---

*Part 4 is the definitive execution plan. It resolves all 7 contradictions identified by MECE analysis, incorporates the Essential 7 from Pareto, applies all second-order rules, adds the missing legal/analytics/pivot frameworks, and cuts everything below the 80/20 line to Month 2+ backlogs.*

*Parts 1-3 remain as reference for context, competitive intelligence, and detailed implementation checklists when you need them. But Day-to-day, you live in Part 4.*

**The plan is complete. Configure Stripe. Deploy. Start flipping. Make money.**
