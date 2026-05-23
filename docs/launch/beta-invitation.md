# Beta Invitation Templates

Use these to recruit your first 10-20 beta users. The right beta users are **flippers who already use 2+ marketplaces and have at least a few flips a month under their belt** — they have the volume to stress-test the tool and the experience to give useful feedback.

**Where to find them:**

- People who post in r/Flipping every week (look for repeat usernames in the top posts)
- Friends-of-friends who flip
- Anyone in your existing network who has mentioned reselling on social media
- Twitter/X accounts that post about flipping with photos

**Goals of the beta:**

1. Find P0 bugs in real-world usage before public launch
2. Generate 3-5 testimonial-quality stories ("I made $X using this in week 1")
3. Tune the scoring algorithm against real user feedback
4. Get 1-2 paying customers before public launch (validation)

---

## Template A — Cold DM (Reddit)

Use for usernames you've seen in r/Flipping but don't know personally.

> Hey [username] — saw your [post about the X flip / comment about Y] last week, that was a good find.
>
> I'm building a tool called Flipper.ai that scans 5 marketplaces (CL, eBay, FB, OfferUp, Mercari) for underpriced items and scores them with AI. Before public launch I'm picking ~15 active flippers to use it for free for a month and tell me what's broken.
>
> Want in? PRO tier free for the first 30 days. No card required. The only thing I'd ask is that if you find anything genuinely useful or genuinely wrong, you tell me.
>
> If yes, reply with the email you'd like the invite sent to. If no, no worries — appreciate the work you put into the sub regardless.
>
> Stephen
> founder@<your-domain>

**Why this works:** Specific reference to *their* post (proves you're not spamming), specific scope ("~15 active flippers"), no asks beyond feedback, easy out.

---

## Template B — Warm DM (existing connection)

> Hey [name],
>
> Quick one — finally launching Flipper.ai (the marketplace scanner thing I've been building) and I'm pulling together ~15 flippers for a paid-tier-free beta this week.
>
> You'd be at the top of the list. Want in?
>
> If yes, just reply with the email you want the invite sent to (or use [their existing email if you have it]). I'll send a Lifetime Founder code that'll work forever once we're public.
>
> Stephen

**Why this works:** Shorter (you have the relationship), implies they're a top pick, the Lifetime Founder hook is meaningful (it's a $299 value).

---

## Template C — Email to a recommendation from a friend

> Hi [name],
>
> [Mutual connection's first name] suggested I reach out — they thought you'd be the right person to test something I've been working on.
>
> Short version: I built an AI tool that watches 5 used-goods marketplaces (Craigslist, eBay, Facebook, OfferUp, Mercari) and tells me when something undervalued shows up. Before I launch it publicly I'm getting it in front of ~15 experienced flippers to find what's broken.
>
> The ask is small — use it for free for a month, tell me what's wrong. PRO tier ($49/mo equivalent) free during the beta, then a Lifetime Founder code (free forever) when we go public.
>
> If you're in, just reply with a "yes" and the email you'd like the invite sent to. If not, no worries — and please tell [mutual] thanks for me anyway.
>
> Stephen Boyett
> founder@<your-domain>
> {{your_personal_url_or_LinkedIn}}

---

## Template D — Mass-bcc to your existing network (carefully)

If you have an existing email list of friends/colleagues. Use sparingly — one mass email per launch, not three.

**Subject:** I'm finally launching the thing — want to test it?

> Hi all (bcc'd, sorry for the bulk send),
>
> Some of you have heard me complain about flipping deals taking too long to find for the last [N] months. The fix I built finally has a name and a URL.
>
> It's called Flipper.ai. AI that watches 5 used-goods marketplaces, identifies what each item is, pulls real eBay sold prices for it, and surfaces only the >50%-undervalued listings. If you've ever thought "this could be a side hustle if I had more time", this is the time-multiplier.
>
> I'm doing a closed beta this week. PRO tier free for 30 days, Lifetime Founder ($299 value) free forever for the first 100 public-launch customers — but I'm reserving 15 of those slots for you all.
>
> If you want in, hit reply. If you know an active flipper who'd be a better tester than you, forward this — I'll trade them a Lifetime Founder code for honest feedback.
>
> Public launch is [estimated date]. Until then, this stays a small group.
>
> Stephen

---

## Onboarding flow for accepted beta users

When someone says yes:

1. **Within 1 hour, send a personal welcome email** (template below) with their account credentials.
2. **Tag their account** in your DB (e.g., `User.beta = true, User.cohort = 'beta-001'`) so you can track this group's behavior in analytics.
3. **Add them to a private Slack/Discord channel** if you set one up. Otherwise, just keep their emails for direct follow-up.
4. **48 hours after their first scan, send a check-in email** (also below).
5. **Day 14, send the testimonial-collection email** (below).

### Welcome email (after they say yes)

> Hi [name],
>
> Welcome to the Flipper.ai beta. Your account is set up and PRO is unlocked for 30 days.
>
> Sign in here: <appUrl>/login
> Your password reset link: [link]
>
> Three things that'll get you to "is this useful?" in under 10 minutes:
>
> 1. **Set up a saved search** for a category you actually flip in. Tight zip-code radius helps.
> 2. **Run it once** and let it complete (~2-3 min for the first scan)
> 3. **Look at the green "Opportunity" badges** — those are the AI's "this is worth your time" signals
>
> One ask: if anything is broken, weird, or confusing, hit reply and tell me. Even small things ("this button does what I didn't expect") matter at this stage.
>
> Thanks for testing.
>
> — Stephen

### 48-hour check-in

> Hey [name] — quick check-in.
>
> Two questions, both 1-line answers fine:
>
> 1. Did you run a scan yet?
> 2. If yes — was the result useful?
>
> If you're stuck, just reply with where you got stuck and I'll fix it (the bug, the docs, or your saved search — whichever is the actual problem).
>
> — Stephen

### Day-14 testimonial collection

> [name] — you've been on the beta two weeks now. Two questions:
>
> 1. **Did you flip anything because of Flipper.ai?** If yes — even a small win — I'd love to hear about it. With your permission, the story might end up on the website (with your username/face if you want, or anonymous if not — your call).
>
> 2. **What's the biggest thing that should change before public launch?** Brutally honest answers please. The whole point of a beta is finding what's wrong.
>
> Your Lifetime Founder code (free PRO forever) is attached either way: `LIFETIME-{{userCode}}`. Apply at <appUrl>/billing once we go public.
>
> Thanks for trusting me with this for two weeks. It made a meaningful difference.
>
> — Stephen

---

## What to do with feedback

- **Bug reports** → triage immediately. P0 bugs from beta users get fixed within 24 hours.
- **Feature requests** → log in a single Notion/Linear/Markdown file. Don't promise features. Common requests should change v1.1 priorities; one-off requests should not.
- **Scoring complaints** → save the listing URL + the user's "I think this should be X". Use as test cases for tuning the algorithm.
- **Pricing complaints** → these are gold. Any pattern of "I'd pay $X for Y" should change pricing pre-launch.

## What to NOT promise

- Don't promise specific features will ship by specific dates.
- Don't promise to "fix that next week" unless you've actually scoped it.
- Don't promise free upgrades to all features forever — Lifetime Founder is enough.
- Don't promise referral commissions during the beta — set those up structurally post-launch.
