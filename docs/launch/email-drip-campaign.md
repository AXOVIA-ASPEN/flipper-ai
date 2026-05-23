# Email Drip Campaign — New User Onboarding

5 emails sent over the first 14 days of a user's lifecycle. Wire these into Resend (or whatever transactional provider you're using) and trigger them off user lifecycle events, not raw timers.

**Sender:** `Stephen <stephen@<your-domain>>` — founder-from address dramatically out-performs `noreply@`.

**Plain-text wrapped in minimal HTML.** No giant brand banners, no "View in browser" links, no marketing footer with 12 social icons. Looks like a real person sent it.

**Trigger logic:**

| # | Trigger                                                              | Send delay         |
| - | -------------------------------------------------------------------- | ------------------ |
| 1 | User completes signup (email verified)                               | Immediate          |
| 2 | User has not run a scan after signup                                 | 48h after signup   |
| 3 | User has run ≥1 scan but not added an opportunity                    | 5d after first scan |
| 4 | User has added ≥1 opportunity but not upgraded                       | 10d after signup   |
| 5 | Free-tier user, 14d after signup, has not upgraded                   | 14d after signup   |

---

## Email 1 — Welcome (immediate)

**Subject:** Welcome to Flipper.ai — a quick note from the founder

**Body:**

> Hi {{firstName}},
>
> Stephen here — I'm the only person at Flipper.ai. I see every signup, and I just saw yours. So thanks.
>
> A few things to get the most out of the next 24 hours:
>
> 1. **Set up your first saved search.** ({{appUrl}}/scraper) Pick a category you actually flip in (electronics, furniture, tools, video games, collectibles all work well today; clothing is weak — that's on the list to fix). Use a tight zip-code radius for your first one.
>
> 2. **Run it once and let it work.** The first scan can take 2-3 minutes — it's identifying each item and pulling eBay sold prices. Don't refresh; results will appear when each marketplace finishes.
>
> 3. **Look for the green "Opportunity" badge.** Anything green is >50% below verified market value. That's the AI saying "this is worth your time."
>
> If after your first scan you have *zero* green badges, that usually means either (a) your search is too narrow, or (b) the category isn't well-tuned yet. Hit reply and I'll look at your saved search personally — it's the fastest way for me to debug the scoring.
>
> Welcome aboard. Hope you find a good flip this week.
>
> — Stephen
> *(reply directly to this email — it goes to my inbox, not a ticketing system)*

---

## Email 2 — User hasn't run a scan after 48h

**Subject:** {{firstName}}, the first scan is the hardest part

**Body:**

> {{firstName}},
>
> Saw you signed up two days ago but haven't run a scan yet. No judgment — onboarding to a new tool is annoying.
>
> Here's the 90-second version:
>
> 1. Click "New Search" ({{appUrl}}/scraper/new)
> 2. Pick one marketplace (start with Craigslist or eBay — they're the most reliable)
> 3. Enter a search like "vintage" or "vintage electronics" or whatever you'd type into Craigslist's search bar
> 4. Hit "Run scan"
>
> That's it. Results show up in 2-3 minutes.
>
> If something's blocking you (the form's confusing, an error, you're not sure what to search for) — hit reply and tell me what tripped you up. Genuine response, not a canned support reply.
>
> — Stephen

---

## Email 3 — User has scanned but not added an opportunity (5 days)

**Subject:** Want me to look at your search results?

**Body:**

> Hey {{firstName}},
>
> Your last scan was {{lastScanDate}}, and I notice you haven't moved any of the results into your kanban yet.
>
> Two possibilities:
>
> **(a) Nothing in the results was good enough to flip.** That's usually a sign your saved search is too broad or the category isn't well-tuned. Common fixes:
>   - Narrow the price range (e.g. $50-$300 — most good flips live here)
>   - Pick a specific brand (e.g. "Nintendo" instead of "video games")
>   - Tighten the location radius
>
> **(b) You're not sure if a result is worth pursuing.** Pull up the opportunity detail — there's a "verified market value" line and a "sellability" score. If the AI says >70 sellability and >50% margin, it's almost certainly real. If you're hesitant, screenshot the listing and reply to this email — I'll give you my honest read.
>
> If neither of those fits, what's the friction?
>
> — Stephen

---

## Email 4 — User has added opportunity but not upgraded (day 10)

**Subject:** {{firstName}}, you're using Flipper.ai well — quick offer

**Body:**

> {{firstName}},
>
> You've added {{opportunityCount}} opportunit{{ies/y}} to your kanban so far. That's more than the median free user (most never add a single one — they signup, scan once, and bounce).
>
> Since you're actually using it, two things:
>
> **1. The thing you should know about the free tier.** It's deliberately limited to 1 marketplace + 1 saved search + 10 scans/day. Most flippers make 70-80% more money when they scan all 5 marketplaces simultaneously — different sellers post on different platforms.
>
> **2. The Founder's Discount.** First 100 customers get **Lifetime Founder** ($299 once, no recurring) — every PRO feature, forever. That includes new features as I ship them. Right now there are {{founderSlotsRemaining}} slots left.
>
> If you want to think about it, no rush. If you'd rather pay monthly:
>
> - **FLIPPER** ($19/mo) — all 5 marketplaces, unlimited scans
> - **PRO** ($49/mo) — adds AI negotiation drafts + cross-platform listing
>
> Upgrade: {{appUrl}}/billing
>
> Either way, I appreciate you trying it.
>
> — Stephen

*(If `founderSlotsRemaining` <= 0, swap that paragraph for the annual plan offer at 20% off.)*

---

## Email 5 — Day 14, free user, no upgrade

**Subject:** Last note — and a question

**Body:**

> {{firstName}},
>
> Two weeks in. I'm not going to send a fifth "upgrade!" email — if the free tier hasn't gotten you to a profitable flip, that's on me, not you.
>
> Two questions, in order of usefulness:
>
> 1. **What's been the biggest annoyance?** Anything from "the scoring was wrong on this listing" to "I couldn't figure out how to do X" — every reply changes what I work on tomorrow.
>
> 2. **Did you find a good flip during your two weeks?** If yes, tell me about it (I love these stories and the answer might end up as marketing copy with your permission). If no, what got in the way?
>
> Either way, no obligation. Free tier stays free as long as your account exists. If you ever come back and decide to upgrade, the Founder's Discount link is at {{appUrl}}/billing — but the slots may be gone by then.
>
> — Stephen

---

## A few principles

1. **Every email asks one thing.** Not three. One.
2. **Every email feels like a real human wrote it to you.** No "Dear valued customer". No "We here at Flipper.ai are so excited..."
3. **Reply-able.** Replies go to a real inbox you read. Resend supports this with a verified domain.
4. **No tracking pixels in transactional flows.** Trust is fragile.
5. **No "Don't reply to this email" footer.** That sentence kills more revenue than it saves.

## Variables to wire up

- `{{firstName}}` — from `User.name` (split on first space) or fallback to "there"
- `{{appUrl}}` — env var, no trailing slash
- `{{lastScanDate}}` — relative ("yesterday", "3 days ago") not absolute
- `{{opportunityCount}}` — count of opportunities for this user
- `{{founderSlotsRemaining}}` — `100 - count(LifetimeFounderSubscriptions)` or similar; show in real time

## Suppression rules

- If user has paid → exit drip immediately at the next scheduled send.
- If user replies to any email in the drip → exit drip and route to your inbox.
- If user unsubscribes → exit all marketing emails, but keep transactional (receipts, password resets).
- Don't send Email 5 if Email 4 has bounced.
