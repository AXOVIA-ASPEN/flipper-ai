# Referral Program — Technical & Operational Spec

**Goal:** Convert satisfied users into a viral acquisition channel without paying upfront. Each successful referral costs Flipper.ai one free month of revenue but earns a paying customer with a higher LTV than cold acquisition.

**Decision required:** Whether to ship at launch (recommended) or v1.1.

---

## Mechanics — what users see

### Existing user side

> # Get free Flipper.ai
>
> ## Refer a friend → get a free month
>
> Share your unique link below. When a friend signs up and stays for a month on any paid tier, your subscription gets credited one free month.
>
> **Your link:**
> `https://<domain>/r/stephenboyett-x4f9`
> [ Copy link ]  [ Share on X ]  [ Email a friend ]
>
> **Your referrals:**
> - **3 invited** → 2 signed up → 1 paid → **1 month credited** (next billing: 2026-06-15)
>
> **Your friend gets:**
> - 20% off their first month on any paid tier
>
> **You get:**
> - 1 free month of your current tier when they pay their first invoice
> - No cap. Refer 12 friends in a year, get a free year of Flipper.ai.

### Referee side (the friend who clicks the link)

When someone clicks `https://<domain>/r/stephenboyett-x4f9`:
1. Cookie is set (`flipper_ref=stephenboyett-x4f9`, 30-day expiry)
2. They're redirected to the landing page
3. The landing page shows a banner: *"Stephen invited you — get 20% off your first month"*
4. On signup, the cookie value is stored in `User.referredBy`
5. On their first paid invoice, the 20% discount applies (one-time, first month only)
6. The referrer's account gets credited 1 free month

---

## Database schema additions

```prisma
// prisma/schema.prisma

model User {
  // ... existing fields
  referralCode         String?  @unique  // user's own code, e.g. "stephenboyett-x4f9"
  referredBy           String?            // referralCode of the user who referred them
  referralCredits      Int      @default(0)  // number of unredeemed free months
  referralsEnrolled    Int      @default(0)  // count of total invitees who signed up
  referralsConverted   Int      @default(0)  // count of invitees who paid their first invoice

  referrals            Referral[]    @relation("ReferralReferrer")
  referredAs           Referral?     @relation("ReferralReferee")
}

model Referral {
  id                  String    @id @default(cuid())
  referrerId          String
  refereeId           String    @unique           // each user can only be referred once
  status              String    @default("CLICKED") // CLICKED → SIGNED_UP → CONVERTED → CREDITED
  referrerDiscountApplied   Boolean   @default(false)  // free month given to referrer
  refereeDiscountApplied    Boolean   @default(false)  // 20% off given to referee
  clickedAt           DateTime  @default(now())
  signedUpAt          DateTime?
  convertedAt         DateTime?  // first paid invoice
  creditedAt          DateTime?  // referrer credit applied
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  referrer            User      @relation("ReferralReferrer", fields: [referrerId], references: [id])
  referee             User      @relation("ReferralReferee", fields: [refereeId], references: [id])

  @@index([referrerId])
  @@index([refereeId])
  @@index([status])
}
```

> **Migration:** `prisma migrate dev --name add_referral_program`. Add a backfill script (`scripts/db/backfill-referral-codes.ts`) that generates a `referralCode` for every existing user (e.g., `<displayName-slug>-<random4chars>`).

---

## API surface (new routes)

| Route                                  | Method | Auth          | Purpose                                          |
| -------------------------------------- | ------ | ------------- | ------------------------------------------------ |
| `/api/referrals/me`                    | GET    | Authenticated | Returns user's referral code, count, credits    |
| `/api/referrals/track-click`           | POST   | None          | Records a referral cookie click (analytics only) |
| `/r/[code]`                            | GET    | None          | Landing redirect — sets cookie, redirects home   |

Webhook handler additions in `app/api/webhooks/stripe/route.ts`:
- On `checkout.session.completed` for a subscription with `referredBy` set → mark `Referral.signedUpAt`
- On `invoice.payment_succeeded` for first invoice → mark `Referral.convertedAt`, credit referrer with 1 free month, send notification email to referrer

---

## Stripe integration

There are two ways to handle the referrer's free month:

### Option A — Stripe Coupon per credit (recommended)

For each credit the referrer earns:
1. Create a Stripe coupon with `duration: once`, `amount_off: <referrer's monthly price>`, `max_redemptions: 1`
2. Apply it to the next invoice via `subscriptions.update({customer, coupon})`
3. The next invoice is $0 (or $0 + tax)

**Pros:** Clean, native Stripe, shows up correctly in invoices and the customer portal.
**Cons:** A coupon per credit creates many Stripe API calls; cap at e.g. 12/year/user.

### Option B — Account-level credit balance

1. Add `Customer.balance` adjustments via `customers.update({customer, balance: -<amount>})`
2. Stripe applies negative balance to the next invoice automatically

**Pros:** Single API call, no coupon management.
**Cons:** Stripe Customer Portal shows "credit balance: $X" which can confuse users; doesn't auto-translate to "1 free month".

> **Recommendation:** Option A. The user-visible math ("free month of FLIPPER tier") is more comprehensible than "$19 credit on next invoice".

For the referee's **20% off first month** discount:
- Create a single coupon at setup: `REFERRAL_FRIEND_20OFF` (`duration: once`, `percent_off: 20`)
- Auto-apply via `checkout.sessions.create({discounts: [{coupon: 'REFERRAL_FRIEND_20OFF'}]})` when `User.referredBy` is set

---

## Anti-abuse rules

The single most important detail: **referrals only count when the referee pays their first invoice**, not when they sign up. Otherwise people will refer themselves with throwaway emails.

Additional guardrails:

1. **Same-payment-method block:** If referee uses a card already on the referrer's account, reject the credit.
2. **Same-IP grace:** If referee signs up from the same IP as the referrer, flag for manual review (don't auto-credit). Won't catch all abuse but raises the bar.
3. **Email domain check:** If referee's email domain is the same as the referrer's *and* personal (gmail/icloud/etc.), allow. Same business domain (e.g., both `@yourcompany.com`)? Allow. Disposable email domain (10minutemail, etc.)? Reject.
4. **Refund cascade:** If referee refunds within 60 days, *reverse the referrer credit* if not yet redeemed.
5. **Cap at 12 credits per referrer per rolling 12 months** to prevent industrial-scale referral farming. Higher caps unlock at PRO tier.
6. **Self-referral attempt:** If `referrerId === refereeId`, reject with friendly error.

---

## Email notifications (use Resend)

| Trigger                                        | Recipient | Subject                                              |
| ---------------------------------------------- | --------- | ---------------------------------------------------- |
| Friend signs up via referral link              | Referrer  | "{{firstName}} just signed up via your link"          |
| Friend pays first invoice                      | Referrer  | "🎉 You earned a free month — credited to your next invoice" |
| Friend pays first invoice                      | Referee   | "Welcome — your 20% discount was applied"             |
| Referrer's account credited                    | Referrer  | "Your next billing date moved to {{newDate}}"          |
| Referrer hits 5 successful referrals           | Referrer  | "5 referrals = 5 free months. You're crushing this." |

---

## Where to put the referral CTA in-product

**High-impact placements:**

1. **Settings → Account → Referrals tab** (primary, always visible)
2. **Sticky banner in dashboard** for users who have ≥1 successful flip ("You found a $X flip — your friends would love this. Get a free month per referral.")
3. **Post-payment success page** (after upgrade) — "Want this for free? Refer a friend."
4. **In transactional emails** — every welcome / billing email has a footer "PS — get free months by inviting a friend: <link>"

**Low-impact placements (don't overdo it):**

- Onboarding step 6 (don't ask new users to refer before they've used it)
- Email signature / footer of every outbound email

---

## Analytics

Track in your analytics pipeline:

- **Referral landing-page views** (split by source: Twitter, email, direct)
- **Referral signup conversion** (clicks → signup)
- **Referral paid conversion** (signup → first invoice)
- **Average referrals per active user**
- **Top 10 referrers by total credit earned**
- **Refund rate of referred users vs cold users** (validate quality)

**Healthy metric ranges:**

- 8-15% of paying users become referrers
- 1.2-2.0 average successful referrals per referrer
- Referred users have 15-30% lower 30-day churn vs cold acquisition
- Cost per referred-paid-user: ~$19 (the free month given), vs ~$50-150 for paid acquisition

---

## Launch checklist

- [ ] Schema migration tested in staging
- [ ] Backfill script run for all existing users (gives them codes)
- [ ] Stripe coupons created (`REFERRAL_FRIEND_20OFF`)
- [ ] `/r/[code]` route renders correctly with cookie
- [ ] Webhook handlers updated and tested with `stripe trigger`
- [ ] Email templates created in Resend
- [ ] Settings → Referrals page shows the user's link, current count, credits
- [ ] Anti-abuse rules tested (self-referral, same-IP, disposable email)
- [ ] First DM template ready for users to share their link

---

## Marketing copy — "share your referral link" templates

Pre-fill these in the user's referral dashboard so they can copy-paste with one click.

**Tweet template:**

> I've been using Flipper.ai to find underpriced items on Craigslist/eBay/FB to flip. Found a $40 lamp last week that sold for $385. Try it free — get 20% off your first month with my link: <referral_url>

**Email-a-friend template:**

> Hey [name],
>
> I've been using Flipper.ai for the last [N] weeks. It's an AI that scans Craigslist, eBay, FB Marketplace, OfferUp, and Mercari for items priced way below market value, then flags the best flips. Saves me 5+ hours of scrolling per week.
>
> Free tier exists. If you want to try it, here's a link that gets you 20% off your first month: <referral_url>
>
> No pressure — but you mentioned you wanted a side hustle and this is what's actually working for me.
>
> [name]

**Reddit / Discord template (for posting in flipping communities):**

> If anyone wants to try Flipper.ai (the AI marketplace scanner) — here's my referral link for 20% off the first month: <referral_url>. Free tier available too if you just want to test it.

---

## What NOT to do

- ❌ Allow self-referral. Even with anti-abuse rules, the messaging will be confusing.
- ❌ Pay cash referrals. Service-credit referrals work better and don't have tax/operational complexity.
- ❌ Cap at "first month only" for the referee. 20% first-month is the right bound — referee gets a discount that hurts you minimally.
- ❌ Make the referee enter a code manually. Use the `/r/<code>` URL + cookie pattern. Code-entry forms cut conversion by ~60%.
- ❌ Build a leaderboard publicly visible. Top referrers get gamification ideas (a private leaderboard email per month is fine; public is awkward).
- ❌ Run the program forever without revisiting. Re-evaluate at month 6: what's the actual ROI vs cold acquisition? Adjust generosity accordingly.
