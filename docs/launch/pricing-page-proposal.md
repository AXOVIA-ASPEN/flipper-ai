# Pricing Page Proposal

The current implementation has FREE / FLIPPER ($19) / PRO ($49). This document proposes a refined pricing structure with copy, layout, and Stripe configuration.

**Decision required (Q7 in `RELEASE_ROADMAP.md`):** keep current ($19/$49) or shift to recommended below.

---

## Recommended structure

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│      FREE         │     HUSTLER      │       PRO         │     LIFETIME     │
│       $0          │  $19 / $179yr    │  $49 / $469yr     │   $299 once      │
│                   │                   │                   │  (first 100)     │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Why this structure

1. **Free tier is meaningfully usable.** Most flippers will land on the page from a Reddit post and need to *use the product* before believing the paid pitch. A 1-saved-search free tier with full AI scoring on that search is enough to prove value in 10 minutes.
2. **HUSTLER replaces FLIPPER.** The word change matters: "Hustler" reads like the user's identity ("I'm a hustler"), not a feature label. Copy A/B test if you want, but I'd ship Hustler.
3. **PRO at $49/mo is correctly priced** for what it includes. Keep.
4. **Lifetime Founder ($299, capped 100 seats)** is the single highest-conversion pricing trick at launch. Generates immediate cash, signals scarcity, and turns 100 users into evangelists with skin in the game.
5. **Annual plans at ~22% off** capture LTV upfront and reduce churn risk. Stripe makes the math show as "Save $59" rather than "Pay $179 now" (more compelling).

### Why I'm NOT recommending these (despite considering them)

- **Per-flip success-fee tier** ("$0/mo + 5% of profit"). Right idea, hard to implement honestly without trusting users to self-report sale prices. Defer to v2.
- **Team tier ($99/mo, 3 seats).** Premature — no validated demand. Add when 5 customers explicitly ask.
- **Higher PRO tier ($99/mo).** No justification yet for a 2x jump from PRO. PRO already includes everything; there's nothing to gate at a higher price.
- **Lower entry tier ($9/mo).** Race to the bottom. The free tier already serves "I want to spend $0".

---

## Tier breakdown — what's in each

| Feature                                          | FREE          | HUSTLER ($19/mo) | PRO ($49/mo)  | LIFETIME ($299) |
| ------------------------------------------------ | ------------- | ---------------- | ------------- | --------------- |
| Marketplaces                                     | 1 (your pick) | All 5            | All 5         | All 5           |
| Saved searches                                   | 1             | 5                | Unlimited     | Unlimited       |
| Scans per day                                    | 10            | Unlimited        | Unlimited     | Unlimited       |
| AI flippability score (0-100)                    | ✅            | ✅                | ✅            | ✅              |
| Verified eBay sold-price comps                   | ✅            | ✅                | ✅            | ✅              |
| Sellability + days-to-sell forecasts             | ✅            | ✅                | ✅            | ✅              |
| Real-time alerts (email)                         | ✅            | ✅                | ✅            | ✅              |
| Real-time alerts (push, SSE)                     | -             | ✅                | ✅            | ✅              |
| Real-time alerts (SMS)                           | -             | -                | ✅            | ✅              |
| Kanban + opportunity tracking                    | ✅            | ✅                | ✅            | ✅              |
| Profit & ROI analytics                           | Last 30d only | Last 12mo        | All-time      | All-time        |
| AI seller-message drafting                       | -             | ✅                | ✅            | ✅              |
| AI negotiation strategy                          | -             | -                | ✅            | ✅              |
| Cross-platform listing generation                | -             | -                | ✅            | ✅              |
| CSV / PDF analytics export                       | -             | -                | ✅            | ✅              |
| API access (post-launch)                         | -             | -                | -             | ✅              |
| Future PRO features                              | -             | -                | ✅ (subscribed)| ✅ (forever)    |
| Founder shoutout in CHANGELOG.md                 | -             | -                | -             | ✅              |
| Priority support (24h response)                  | -             | -                | ✅            | ✅              |
| White-glove onboarding call (15min, optional)    | -             | -                | -             | ✅              |

> **Pricing rule of thumb:** Each upsell gate should make the user think "this is what I actually need," not "this is being held back from me."

---

## Page copy

### Hero

> # Pricing built for people who actually flip
>
> Free forever for one saved search. Unlock all 5 marketplaces and AI features when you're ready.
>
> *No card required for free tier. Cancel any time.*

### Pricing toggle

```
[ Monthly ]  [ Annual — Save 22% ]
```

### FREE column

> ## Free
> ### $0 / forever
>
> Get the muscle memory.
>
> - 1 saved search
> - 1 marketplace of your choice
> - 10 scans per day
> - Full AI flippability score
> - Verified eBay sold-price comps
> - Email alerts on opportunities
> - Kanban opportunity tracking
> - 30-day profit history
>
> **[ Start free → ]**

### HUSTLER column (recommended primary)

> ## Hustler
> ### $19 / month
> ### *or $179 / year (save $49)*
>
> *Most popular for active flippers*
>
> Everything in Free, plus:
>
> - All 5 marketplaces
> - Up to 5 saved searches
> - Unlimited scans
> - Push + SSE real-time alerts
> - 12-month profit history
> - AI message drafting
>
> **[ Start 14-day trial → ]**

### PRO column (medium emphasis)

> ## Pro
> ### $49 / month
> ### *or $469 / year (save $119)*
>
> Built for serious resellers.
>
> Everything in Hustler, plus:
>
> - Unlimited saved searches
> - SMS alerts
> - AI negotiation strategy
> - Cross-platform listing generation
> - All-time analytics + CSV/PDF export
> - Priority support (24h response)
>
> **[ Start 14-day trial → ]**

### LIFETIME column (scarcity emphasis)

> ## Lifetime Founder
> ### $299 once
>
> *Only [N] of 100 seats left.*
>
> All Pro features. Forever.
>
> Everything in Pro, plus:
>
> - All future Pro features included automatically
> - API access (when launched)
> - Your name in our public CHANGELOG.md
> - 15-minute onboarding call with me, the founder
>
> **[ Claim Lifetime Founder → ]**

> When all 100 seats are claimed, this offer disappears.

### FAQ section (below the four columns)

**Q: Can I switch tiers mid-cycle?**
> Yes. Upgrade is instant; downgrade applies at the end of your current billing period. We pro-rate by the day.

**Q: What happens if I exceed Free tier limits?**
> You'll see a friendly upgrade prompt. We never auto-charge or downgrade your data — your saved searches, opportunities, and history stay intact.

**Q: Is there a free trial of paid tiers?**
> Yes — 14 days, no card required for the trial. We'll only ask for payment if you decide to keep it after day 14.

**Q: How do I cancel?**
> Settings → Billing → "Manage subscription" opens the Stripe Customer Portal. Cancel any time, no questions, no friction.

**Q: What's the Lifetime Founder catch?**
> No catch. $299 once for everything we ever build, capped at 100 customers as a thank-you to the people willing to bet on us early. It's not a sustainable price for new customers, which is why it goes away.

**Q: Do you offer student / nonprofit / open-source discounts?**
> Yes. Email `support@<your-domain>` from your `.edu` address (students), nonprofit org email, or with a link to your open-source project, and we'll get you on Pro for free.

**Q: Why not a free trial on Lifetime Founder?**
> Because Lifetime Founder is a one-time purchase capped at 100 seats. The Pro tier has the trial — buy Lifetime when you're already convinced.

**Q: Is the price ever going up?**
> The Pro price is stable. Lifetime Founder won't be re-offered after the first 100 seats sell, so this is the only chance.

**Q: I'm a flipping YouTuber / blogger / Twitch streamer. Can I get a sponsorship?**
> Yes — see our affiliate program at `<your-domain>/affiliates`.

---

## Stripe configuration

Create these as **live-mode** products and prices in https://dashboard.stripe.com/products. Naming is for your own clarity; the price IDs go into Secret Manager.

| Product                       | Price                  | Type           | Stripe Price ID env var                       |
| ----------------------------- | ---------------------- | -------------- | --------------------------------------------- |
| Hustler — Monthly             | $19.00 USD / month     | Recurring      | `PROD_STRIPE_PRICE_ID_FLIPPER`                 |
| Hustler — Annual              | $179.00 USD / year     | Recurring      | `PROD_STRIPE_PRICE_ID_FLIPPER_ANNUAL`          |
| Pro — Monthly                 | $49.00 USD / month     | Recurring      | `PROD_STRIPE_PRICE_ID_PRO`                     |
| Pro — Annual                  | $469.00 USD / year     | Recurring      | `PROD_STRIPE_PRICE_ID_PRO_ANNUAL`              |
| Lifetime Founder              | $299.00 USD            | One-time       | `PROD_STRIPE_PRICE_ID_LIFETIME_FOUNDER`        |

**Tax & billing:**
- Enable Stripe Tax for US states + EU VAT compliance: https://dashboard.stripe.com/tax
- Enable automatic invoicing on all subscriptions

**Trial config (Hustler + Pro):**
- 14-day trial, no card required at start
- Send a "trial ending in 3 days" email + a "trial ending tomorrow" email (already in `email-drip-campaign.md` as Days 11 and 13 — adjust the drip if you adopt this trial structure)

**Webhook events to subscribe (https://dashboard.stripe.com/webhooks):**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## A/B test ideas (post-launch, week 4+)

Run only **one** A/B at a time. Each needs ~500 visitors per variant for statistical significance.

1. **Pricing emphasis** — toggle whether monthly or annual is the default tab. Hypothesis: annual-default increases LTV by 25%.
2. **Pro price** — $49 vs $59 vs $39. Hypothesis: $49 maximizes revenue (higher price → fewer conversions but more $/conversion).
3. **Free tier limit** — "1 saved search" vs "10 scans/day". Hypothesis: saved-search limit converts 2x better because users hit it sooner.
4. **Lifetime Founder language** — "$299 once" vs "$24/month for 12 months, then free forever". Hypothesis: monthly framing reduces sticker shock without affecting LTV.
5. **CTA copy** — "Start 14-day trial" vs "Try Pro free for 14 days" vs "Sign up — no card required".

---

## What NOT to do

- ❌ Hide the free tier behind an email gate. It defeats the entire purpose of the free tier (which is conversion at *speed*).
- ❌ Show "$19/month" when you mean "$19/month, billed annually". Either show monthly billing as monthly or split the toggle clearly.
- ❌ Charge for failed scans. You'll get blowback. Cap them on rate limits but always let them complete or fail without billing.
- ❌ Auto-bill at trial end without explicit consent. Make the user click "Keep subscription" at end of trial.
- ❌ Hide the cancel button. Stripe Customer Portal handles this correctly out of the box; don't override it.
- ❌ Lifetime Founder available indefinitely. Cap at 100 seats and *enforce it* (visible counter). The scarcity is the value.
