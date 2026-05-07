# Public FAQ

Render this at `https://<domain>/faq`. Also use it as the source-of-truth for support email canned responses.

**Maintenance:** Add a new question every time a real user asks something that wasn't here. The FAQ should *grow* over time.

---

## Getting started

### What does Flipper.ai do?

Flipper.ai is an AI tool that scans 5 marketplaces (Craigslist, eBay, Facebook Marketplace, OfferUp, and Mercari) for underpriced items, identifies each item with AI, verifies market value against eBay sold listings, and surfaces only the deals worth your time. It also helps you communicate with sellers, list items for resale, and track your profit.

### Do I need to be a professional flipper to use this?

No. The free tier is built for anyone curious about reselling. If you've ever bought something on Craigslist and thought "I bet I could resell this," you're the target user.

### Is there a free version?

Yes. Free tier includes 1 saved search, 1 marketplace, 10 scans per day, full AI scoring, eBay price verification, kanban tracking, and 30-day profit history. No credit card required.

### How accurate is the AI scoring?

For verified data points (eBay sold prices, calculated margins), the accuracy is high — it's data lookup, not estimation. For judgment calls (sellability, days-to-sell, authenticity risk), the AI is right ~70-80% of the time. We're tuning the model continuously based on user feedback. If you find a case where the score is clearly wrong, please tell us — that's how we improve.

### How long does a scan take?

- eBay: 10-20 seconds (uses official API)
- Craigslist: 30-60 seconds
- Facebook Marketplace: 2-3 minutes (uses browser automation)
- OfferUp: 30-60 seconds
- Mercari: 30-60 seconds

The first scan can be slower; subsequent scans of the same search are faster due to caching.

---

## Pricing & billing

### What do the paid tiers include?

See the full [pricing page](/pricing). Short version:
- **Hustler** ($19/mo or $179/yr) — all 5 marketplaces, unlimited scans, push alerts, AI message drafting
- **Pro** ($49/mo or $469/yr) — adds AI negotiation, cross-platform listing, SMS, all-time analytics, CSV/PDF export
- **Lifetime Founder** ($299 once, capped at 100 seats) — Pro tier forever, plus future Pro features included automatically

### Is there a free trial?

Yes — 14 days on Hustler or Pro, no credit card required to start the trial.

### Can I cancel any time?

Yes. Settings → Billing → Manage Subscription opens the Stripe Customer Portal where you can cancel with one click. No customer-retention scripts, no friction.

### What happens to my data if I cancel?

Your account moves back to the Free tier. Saved searches and opportunities remain visible (read-only) but you'll lose the ability to scan more than 10 times/day. We don't delete your data unless you explicitly request account deletion.

### Do you offer refunds?

If you're within 30 days of your first paid invoice and you're not satisfied, email `support@<domain>` and we'll refund you, no questions asked. After 30 days, refunds are case-by-case (e.g., we'll refund if a service outage prevented you from using the product).

### Why doesn't the Free tier auto-renew or expire?

It doesn't expire. Free is genuinely free, forever. We make money from the paid tiers; we don't need to ration the free tier.

### Can I get a discount for being a student / nonprofit / open-source maintainer?

Yes. Email `support@<domain>` from your `.edu` address (students), nonprofit org email, or with a link to your open-source project, and we'll give you Pro for free.

### Is there a team plan?

Not yet. If you need multiple seats, email `support@<domain>` and we'll work something out manually until we ship a team tier.

---

## How the AI works

### What models do you use?

We use a multi-provider architecture across Google Gemini, Groq (Llama models), OpenAI (GPT-4o-mini), and Anthropic Claude. Different tasks get routed to the most appropriate model, with automatic fallback if one provider has issues. This keeps the service reliable and the costs low.

### Does the AI ever make mistakes?

Yes. The AI is right most of the time but not always. Treat its output as a strong recommendation, not gospel. The kanban gives you space to mark items as PASSED if the AI's pick doesn't match your judgment.

### How is the "verified market value" calculated?

We pull recent eBay sold listings (last 60 days by default), filter outliers using IQR (interquartile range) statistics, weight recent sales heavier than older ones, and adjust for the listed condition. The result is the median expected sale price, with a low/high range. We don't include unsold listings (those are aspirational, not actual).

### Why does the same item sometimes show different scores?

The score depends on many inputs, including listing-specific text (which can change), market data (which updates daily), and your platform fee settings. Re-scoring is intentional: we want the score to reflect what's *actually* true right now, not what was true when you first saw the item.

### Can I customize the scoring weights?

Yes, in Settings → AI Preferences. You can adjust the undervalue threshold, opportunity threshold, platform fee rates, and free-item handling.

---

## Marketplace coverage

### Why these 5 marketplaces?

They cover ~95% of US used-goods volume. Other marketplaces (Poshmark, StockX, GOAT, Reverb) are great but more category-specific. We may add them based on user demand.

### Will you add [my favorite marketplace]?

Possibly. The biggest factors are: (1) is there a sustainable scraping/API approach, (2) do enough flippers want it. Email `support@<domain>` with your request and the use case.

### Does Flipper.ai work outside the US?

Partially. The eBay integration works in 24+ countries. Craigslist works wherever it's available. Facebook Marketplace is global but the AI scoring is US-tuned. OfferUp is US-only. Mercari is US + Japan. Full international support is on the roadmap but not in v1.

### Does it work on mobile?

The website is mobile-responsive, so yes — the full app works in your phone's browser. Native iOS/Android apps are not in v1 but are on the roadmap.

---

## Privacy & security

### Is my data private?

Yes. Your saved searches, opportunities, messages, and flip history are visible only to you. We don't sell user data. We don't share your info with third parties except service providers (Stripe for payments, Resend for email, Sentry for error tracking, etc.) and only the data they need to function.

### Where is my data stored?

In Google Cloud SQL (PostgreSQL) hosted in `us-central1`. Backups are encrypted at rest.

### How do I delete my account?

Settings → Account → Delete Account. This permanently removes your user record, listings, opportunities, and messages within 30 days. (We keep some billing records for tax compliance, anonymized.)

### Do you sell or share my data?

No. Full details in our [Privacy Policy](/privacy).

### What about the items I'm tracking — are those public?

No. Each user's listings, scoring data, and flip history are private to that user. Aggregate statistics (e.g., "average margin in vintage cameras") may be published in our blog but are anonymized — never tied to any individual user or listing.

---

## Legal & marketplace-policy

### Is scraping marketplaces legal?

We respect each marketplace's terms of service. Where official APIs exist (eBay), we use them. Where they don't, we use user-context-aware fetches (you initiate the scan; we don't run a side-database of marketplace listings). We respond promptly to any cease-and-desist or platform request.

### Will using Flipper.ai get my marketplace accounts banned?

Highly unlikely. We don't auto-buy, auto-bid, auto-message, or do anything you couldn't do manually. We surface listings; you take all actions. The single highest-risk surface is Facebook Marketplace, which is the only one that uses browser automation. We rate-limit aggressively and use realistic browsing patterns.

### Why does the AI sometimes ask for my own marketplace login (Facebook)?

To access Facebook Marketplace for your saved searches, you grant us a marketplace token. This is a standard OAuth flow — we don't see or store your password. You can revoke access at any time in Facebook's Settings → Apps and Websites.

### Are the AI-drafted seller messages sent automatically?

Never. Every message goes through an approval queue. You see and approve each draft before it's sent. We do this on purpose — automated mass-messaging would (rightly) get accounts banned.

### Do you handle the actual buying / selling?

No. You buy and sell yourself, just like before — Flipper.ai helps you find and prioritize. We're a tool, not a marketplace.

---

## Trust & sellers

### Will sellers know I'm using Flipper.ai?

No. Messages drafted by Flipper.ai look like normal buyer messages. You can edit or rewrite any draft before sending.

### Should I tell sellers I plan to resell their item?

That's up to you. Most flippers don't. It's not deceptive — sellers list items for whatever price they choose, and resellers buying things isn't unusual or unethical. But you may find that price negotiation is easier when the seller doesn't know you're a reseller.

### What if a seller asks if I'm a reseller?

Be honest if asked directly. Many sellers don't care; some do. The few who refuse to sell to resellers will tell you upfront, and you can move on.

---

## Troubleshooting

### My scan returned 0 results — what now?

Most common causes:
1. **Search too narrow.** Try broader keywords or a wider radius.
2. **Marketplace temporarily blocked you.** Wait 30 minutes and try again. If persistent, contact support.
3. **Marketplace updated something.** We monitor and fix selector breakage usually within 24 hours.

### My scan is stuck at "RUNNING"

Cancel and re-run. If it happens twice in a row, it's a bug — please email us with the search details.

### A real high-value listing isn't being flagged as an opportunity

Two possibilities:
1. **Verified market value is low** because we couldn't find good comp sales. Try a more specific search query.
2. **Sellability or risk score is dragging it down.** Open the listing detail to see the breakdown — sometimes the AI sees something you don't (e.g., listing language flagged as "no returns" or "as-is no warranty").

If you genuinely think the AI is wrong, send us the listing URL — we'll review.

### My AI analysis says "fallback active"

This means our AI providers were temporarily unavailable, so we used the algorithmic scoring (faster but less accurate). This is rare — usually <0.5% of analyses. The result is still useful but less precise. Re-run the analysis later and the LLM-based score should populate.

### Stripe charged me twice

Email `support@<domain>` immediately with your subscription details. We'll refund the duplicate charge within 24 hours.

### I forgot my password

Click "Forgot password" on the login page. A reset email arrives within 60 seconds. If it doesn't, check spam, then email us.

### How do I contact support?

Email `support@<domain>`. We respond within 24 hours on weekdays, longer on weekends. Pro tier customers get priority routing.

### I have a feature request

Email `support@<domain>` or DM us on Twitter/X. We read every request and respond. Common requests influence the public roadmap at `/changelog`.

---

## About the company

### Who builds Flipper.ai?

I'm Stephen Boyett, the founder. I'm currently the only person on Flipper.ai full-time. I read every customer email personally.

### Where are you based?

[YOUR LOCATION]. Axovia AI is the parent company.

### Are you funded?

Bootstrapped — no outside investors. The product is funded by paying customers and (so far) my savings.

### Why "Flipper.ai"?

It's literal. Flippers (people who buy and resell items) are the audience; AI is what makes the tool useful.

### Is this related to the Flipper Zero / Flipper One hardware company?

No. Different company, different product, different industry. We get this question a lot.

### Are you hiring?

Not yet, but soon. If you'd want to hear about future openings, follow [@flipperai](https://x.com/flipperai) on X.

---

## Anything else?

If you've got a question that's not here, email `support@<domain>` and I'll personally answer. The good ones become FAQ entries.
