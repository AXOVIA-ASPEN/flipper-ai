# Affiliate Program — Launch Plan & Outreach Templates

**Goal:** Recruit 10-30 content creators in the flipping niche to promote Flipper.ai in exchange for recurring commission. Each active affiliate generates ~5-50 paid signups/month at near-zero CAC.

**Difference from referral program:** Affiliates are content creators / influencers with audiences. Referrals are users sharing with friends. They run on different infrastructure and have different commission structures.

---

## Commission structure

| Tier                    | Commission  | Duration                      | Notes                                    |
| ----------------------- | ----------- | ----------------------------- | ---------------------------------------- |
| **Standard**            | 30%         | 12 months recurring            | Default for everyone who applies         |
| **Top-Performer Boost** | 40%         | 12 months recurring (existing referred users grandfathered) | Unlocked at 50+ paid referrals or $5k+ in lifetime commissions |
| **Featured Partner**    | 50%         | 12 months recurring + co-marketing | By invitation only, ~3-5 partners       |

**Cooldown rules:**

- 30-day cookie window from initial click → signup
- Commission triggers on **referee's first paid invoice**, not signup
- If referee refunds within 60 days, commission reverses (clawback)
- After 12 months, commission ends; affiliate can re-recruit the same user via fresh link if they've churned

**Payout:**

- Monthly via Stripe Connect (or Wise for international)
- Minimum payout threshold: $50 (rolls over below that)
- 1099-NEC issued to US affiliates earning >$600/yr

---

## Tooling — pick one

| Tool          | Pricing            | Pros                                        | Cons                                       |
| ------------- | ------------------ | ------------------------------------------- | ------------------------------------------ |
| **Rewardful** | $49-149/mo         | Stripe-native, easiest setup (1 hour), good UI for affiliates | Limited customization                      |
| **Tolt**      | $29-99/mo          | Cheaper, similar Stripe integration         | Smaller team, less proven                  |
| **PartnerStack** | $500+/mo         | Enterprise-grade, multi-tier, deep analytics | Overkill for early-stage                   |
| **First Promoter** | $89-199/mo     | Decent, but UI is dated                     | Slower payouts than Rewardful              |
| **Custom build** | Dev time only    | Full control                                 | 2-3 weeks to build properly; you don't want this distraction at launch |

**Recommendation:** **Rewardful**. https://www.rewardful.com/

It's the closest to "set up in an hour, forget about it" and integrates with Stripe natively. Tolt is the budget alternative if Rewardful's pricing makes you flinch.

---

## Affiliate landing page — `/affiliates` (or `/partners`)

### Page structure

```markdown
# Earn 30% recurring on every Flipper.ai customer you refer

Most affiliate programs pay once and forget you. Ours pays for **12 months
on every customer**, on every plan, every month.

[ Apply now → ]  [ Read FAQ ]

## What you get

✓ 30% recurring commission for 12 months
✓ Custom tracking link + branded landing pages
✓ $50 minimum payout, paid monthly
✓ Pre-built creative: screenshots, demo videos, sample copy
✓ Direct line to me, the founder, for any questions

## What we look for

The program is open to anyone, but you'll do best if you have:

- An active audience interested in side hustles, flipping, reselling, or
  arbitrage (YouTube subs, newsletter subscribers, Twitter followers,
  Discord members — any of these work)
- The ability to publish at least one piece of content about Flipper.ai
  (review, walkthrough, comparison) within 60 days of approval
- An honest voice — you can review the product critically; we're not
  paying for fake hype

## What our top affiliates earn

A YouTuber with ~15k subscribers in the flipping niche earns roughly
$300-800/month from ~25 paid referrals. The math: ~30 conversions × $19/mo
× 30% × 12 months ≈ ~$2,000 lifetime per referred customer.

Your numbers will vary. Some affiliates do better; some don't take off.
The program is genuine; it's not a pyramid.

## Apply

Tell us about your platform — any of these are fine: YouTube channel,
newsletter, Reddit, Twitter/X, blog, podcast.

[ Application form: name, email, primary platform URL, audience size,
  one sentence on why you'd recommend Flipper.ai ]

We respond within 48 hours.
```

---

## Initial affiliate recruitment — direct outreach

Don't wait for affiliates to find you. Hand-pick the top 30 candidates and DM each one with a personalized message.

### Where to find them

**YouTube** — search:
- "flipping for profit"
- "ebay reseller"
- "facebook marketplace flipping"
- "thrift store reselling"
- "garage sale flipping"
- Filter by: 5,000+ subscribers, channel active in last 90 days

**Twitter/X** — search:
- bio contains: "reseller", "flipper", "ebay seller", "side hustle"
- minimum 2,000 followers, posts at least weekly

**Reddit** — top contributors in r/Flipping last 90 days who run their own blog/YouTube/newsletter (check their bio links)

**Newsletters** — subscribe to:
- Reseller's Roundup
- Flipping Friday
- Side Hustle Stack (broader audience)
- Small newsletters in the indie-hacker / arbitrage space

### Outreach DM template — YouTuber (cold)

> Hey [name] — your video on [specific recent video they made] was the most clear-headed take I've seen on [their topic]. Subscribed.
>
> I'm Stephen, the founder of Flipper.ai — an AI tool that scans 5 marketplaces (Craigslist, eBay, FB, OfferUp, Mercari) for underpriced items and tracks the resale lifecycle. Public-launched [N] months ago.
>
> I'm putting together a paid affiliate program (30% recurring for 12 months) and you'd be one of the first ~10 people I'd want in it. No pressure to push the product — I just want it in the hands of people whose audience would actually find it useful.
>
> If you're up for it, I'll send you a free PRO account and we'll go from there. If your audience finds it useful, you make recurring revenue; if they don't, no harm.
>
> Reply with a "yes" or "tell me more" and I'll send the details.
>
> Stephen Boyett
> founder@<your-domain>
> <your-domain>

### Outreach DM — Newsletter writer

> Hey [name],
>
> Reader of [their newsletter] here. The recent piece on [specific recent post] was great — particularly your take on [specific claim].
>
> I'm Stephen, founder of Flipper.ai. We're an AI marketplace scanner aimed at flippers and side-hustle resellers. We just opened a paid affiliate program — 30% recurring for 12 months on every customer.
>
> A handful of newsletters with audiences like yours have signed up; I'd love to have you in the early cohort. If you'd consider mentioning the tool in a future issue (assuming it's a fit for your audience), I'll send a free PRO account so you can try it for real before recommending it.
>
> Worth a 5-minute reply?
>
> Stephen
> <your-domain>/affiliates

### Outreach — Reddit power user

> Hey [username] — saw your contribution to [specific recent thread]. Your point about [specific point] is the clearest articulation I've seen of [topic].
>
> I'm Stephen, building Flipper.ai (AI marketplace scanner for flippers). We have an affiliate program at 30% recurring; not a lot of redditors apply because most don't have an audience platform — but with your karma + flipping focus, the link in your sig alone would convert.
>
> I'm not going to ask you to spam your link in /r/Flipping. But if you ever write a "what tools do you use" post organically, I'd appreciate a fair mention with your affiliate link.
>
> Reply if interested and I'll set up a free PRO account + send your unique tracking link.
>
> Stephen
> founder@<your-domain>

---

## What to send approved affiliates (creative kit)

Bundle this in a Notion page or Google Drive folder; share the link in their welcome email.

### 1. Logo files
- PNG (transparent), SVG, dark and light variants
- Sizes: 512x512, 1024x1024, social-square (1080x1080), banner (1500x500)

### 2. Product screenshots (15-20 images)
- Dashboard overview
- Saved-search setup
- Single opportunity detail (with AI analysis visible)
- Kanban board
- Analytics page
- Mobile screens (5-7)

### 3. Demo video (90s) — same one used for Product Hunt
- MP4 + a YouTube unlisted link

### 4. Sample copy (multiple lengths)

**One-liner (Twitter bio, sponsorship reads):**
> Flipper.ai — AI that finds underpriced flips on 5 marketplaces. 30% off with my link.

**Three-line (newsletter sponsor read):**
> Tired of scrolling Craigslist for hours looking for flips? Flipper.ai watches Craigslist, eBay, FB, OfferUp, and Mercari for you, scores items 0-100 for flip potential, and only shows you the >50%-undervalued ones. My listeners get 20% off with [affiliate link].

**60s YouTube ad-read script:**
> If you've ever found a $40 lamp on Craigslist that resold for $400 on eBay, you know how time-consuming the *finding* part of flipping is. I just spent the last few weeks using a tool called Flipper.ai — it's an AI that scans 5 marketplaces continuously and flags items that are way underpriced. It identifies what each item actually is — the brand, the model, the condition — then pulls eBay sold prices to verify the real market value. So instead of scrolling for two hours, you scroll for ten minutes through curated deals. Free tier exists. If you want to try it, my link [<your-affiliate-link>] gets you 20% off the first paid month.

**500-word blog post template:**
- Provided in the kit, ready to drop into their site

### 5. FAQ (for affiliates' audiences)

Common pre-baked answers to questions affiliates' audiences ask, so they don't have to research:

- "Is the free tier any good?"
- "How accurate is the scoring?"
- "Will it get me banned from FB Marketplace?"
- "How is this different from [common competitor]?"
- "How much does the tool cost to use beyond the subscription?"

---

## Affiliate onboarding sequence

When someone is approved:

1. **Welcome email** within 24h with: their unique link, login to Rewardful dashboard, link to creative kit, my direct line for questions.
2. **PRO account activated** automatically.
3. **30-day check-in** — Stephen personally emails: how's it going? Anything blocking content production? Any feedback on the product or program?
4. **90-day review** — analytics review with the affiliate. If 0 paid referrals after 90 days, gentle suggestion that this fit may not be right.
5. **Hall of fame** — top affiliates by earnings get a private monthly digest with: leaderboard ranking, total earned, top-converting content of the month, suggestions for next month.

---

## Operational rules to enforce

1. **No paid search bidding on "Flipper.ai" branded keywords.** Affiliates can't run Google Ads on `flipper.ai` or `flipperai`. This is in the program ToS.
2. **No spammy promotion** in subreddits that ban affiliate links. Disclosure required (FTC compliance).
3. **No cookie-stuffing.** Detected via Rewardful's anti-fraud module.
4. **One application per person** — no multiple-account farming.
5. **Quarterly review** — affiliates who haven't produced any tracked clicks in 6 months are silently moved to inactive. Email them a "want to keep your affiliate access?" once before deactivation.

---

## Year-1 targets

- **Month 1-3:** 5-10 affiliates approved; 2-3 actively producing content; combined ~$200/mo affiliate-attributed MRR
- **Month 4-6:** 15-25 approved; 5-8 actively producing; ~$1,500/mo affiliate-attributed MRR
- **Month 7-12:** 30-50 approved; 10-15 actively producing; ~$5,000/mo affiliate-attributed MRR

If you hit those, affiliates are a profitable channel. If you're at <$200/mo affiliate MRR by month 6, the program isn't working — either the audience fit is wrong or the commission isn't competitive enough. Reassess before throwing more energy at it.

---

## Don't do

- ❌ Pay one-time per signup (creates noise, low quality). Recurring is the only structure that filters for affiliates who care about lifetime value.
- ❌ Allow tier-jumping mid-month (if affiliate hits 50 referrals, the boost applies to *future* commissions, not retroactive).
- ❌ Use a closed-source tracking system that doesn't show affiliates their own data. Rewardful's affiliate dashboard is part of the value prop.
- ❌ Run public promo codes that *also* trigger affiliate commission. Pick one or the other per campaign — otherwise you double-pay.
- ❌ Rate-limit honest negative reviews. If an affiliate fairly criticizes the product in their content, that's *more* trust-building than a sycophantic review.
