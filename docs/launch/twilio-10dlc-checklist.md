# Twilio 10DLC Registration Checklist

**Conditional document.** Only complete if your answer to RELEASE_ROADMAP.md Q5 is "ship SMS at launch". Otherwise, skip — disable SMS notifications in v1 and revisit pre-v1.1.

**Why this exists:** The US carriers (AT&T, T-Mobile, Verizon) require all "Application-to-Person" (A2P) SMS senders to register their brand and use cases. Unregistered senders see throttling (≤1 msg/sec instead of 200+/sec), high failure rates, and potentially full blocking. Twilio enforces this — you cannot send transactional SMS at scale without 10DLC registration.

**Time required:** 7-14 calendar days end-to-end. Most of that is carrier review.

---

## Background — what 10DLC is

- **10DLC** = "10-digit long code" — a regular US phone number used for A2P messaging.
- Replaced the previous "shared shortcode" approach.
- Run by **The Campaign Registry (TCR)** with carrier oversight.
- Requires you to register: (1) a **brand**, (2) one or more **campaigns** (use cases).

---

## Cost

| Item                                       | Cost (paid via Twilio)                    |
| ------------------------------------------ | ----------------------------------------- |
| Brand registration (one-time)              | $4 vetting + $2/quarter brand fee          |
| Campaign registration (one-time per use case) | $10 setup + $1.50-10/month per campaign |
| Per-segment SMS surcharge (carrier fees)   | $0.0040-0.0070 per segment, on top of Twilio's regular SMS price |
| Per-MMS surcharge                          | $0.0050-0.0500 per message                 |

For Flipper.ai's use case (transactional alerts + occasional marketing), expect ~$5-15/month in 10DLC overhead before any actual SMS volume.

---

## Pre-registration prep (do these first)

- [ ] **Verify your business is a US legal entity.** LLC, C-Corp, S-Corp, sole proprietor — any of these work. International entities can register but need extra docs.
- [ ] **Get your EIN ready.** From the IRS letter or your tax records.
- [ ] **Confirm your business address** matches your registered EIN address.
- [ ] **Have a compliant Privacy Policy live** at `https://<domain>/privacy`. It must:
  - State that you collect phone numbers
  - Explain how SMS data is used
  - Describe opt-out (STOP keyword) handling
  - State carriers and TCR may receive opt-in metadata
- [ ] **Have a compliant Terms of Service live** at `https://<domain>/terms`. It must include SMS terms.
- [ ] **Document the SMS opt-in flow.** A screenshot of where the user gives explicit consent — required during campaign registration.
  - Required text near the opt-in checkbox: *"By providing your phone number, you agree to receive transactional SMS from Flipper.ai. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help."*
- [ ] **Implement STOP/HELP keyword handling** in `app/api/twilio/sms-webhook/route.ts`.

---

## Step 1 — Register your brand in Twilio Console

URL: https://console.twilio.com/us1/develop/sms/regulatory-compliance/customer-profiles

- [ ] Open the regulatory compliance section
- [ ] Click "Create a customer profile" (this is the Twilio terminology for the brand owner)
- [ ] Fill in:
  - Business name (matches EIN)
  - Business type (LLC / Corp / Partnership / etc.)
  - EIN
  - Business industry: **Technology** or **Marketing/Advertising** (Flipper.ai is closest to "Technology" with marketing aspects)
  - Business website: `https://<domain>`
  - Business address (matches EIN)
  - Authorized rep info (you, the founder)
  - Authorized rep ID (driver's license or passport — Twilio asks during the verification step)
- [ ] Submit profile for verification (24-48 hour wait for Twilio to review)

---

## Step 2 — Register your A2P brand with TCR

URL: https://console.twilio.com/us1/develop/sms/a2p-10dlc/brand-registration

- [ ] Once the customer profile is **verified**, register the brand
- [ ] Choose: **Standard** (recommended for $4 vetting; shows higher trust score than Low Volume)
- [ ] Brand name: `Flipper.ai`
- [ ] DBA (if applicable)
- [ ] Vertical: **Technology**
- [ ] Submit for vetting (~1-3 business days for the trust score to come back)

**Trust score ranges:**
- 80-100: Standard tier (high throughput, all features)
- 50-79: Low Volume tier (some throughput limits)
- <50: Reject — would need to reapply with corrections

If you're a new entity with a sparse online footprint, your trust score may come back at 50-79. This is fine for launch — you can re-vet later as the business grows.

---

## Step 3 — Register your campaigns

You'll need to register one campaign per distinct use case. For Flipper.ai, expect 2 campaigns:

### Campaign 1: Transactional Alerts (account/billing/notifications)

- [ ] Use case: **Mixed** (covers transactional + product updates)
- [ ] Description (sample): *"Account-related notifications for Flipper.ai users including new opportunity alerts, message inbox notifications, billing alerts, and security notices. Users explicitly opt in via account settings and can opt out via STOP keyword."*
- [ ] Sample messages (provide 2-5 representative examples):
  1. *"Flipper.ai: New opportunity found — vintage Bose 901 speakers, $150 (est. $400-600 resale). View: https://<domain>/o/abc123. Reply STOP to opt out."*
  2. *"Flipper.ai: Your watch has gone live — eBay listing for [item] just dropped to $X. View: https://<domain>/p/abc123. Reply STOP to opt out."*
  3. *"Flipper.ai: Subscription renewal upcoming — your Pro plan renews on [date] for $49. Manage: https://<domain>/billing. Reply STOP to opt out."*
- [ ] Opt-in mechanism: *"Users opt-in via web form in app settings. Phone number confirmation requires SMS reply 'YES' to confirm."*
- [ ] Opt-out: STOP keyword auto-removes
- [ ] Help: HELP keyword returns *"Reply STOP to opt out. Visit <domain>/support for help. Msg & data rates may apply."*
- [ ] Submit. ~1-3 business days for carrier review.

### Campaign 2: Marketing (optional — only if you'll send promotional SMS)

- [ ] Use case: **Marketing**
- [ ] Description: *"Promotional SMS to Flipper.ai users about new features, special offers, and product updates. Strict opt-in required; opt-out via STOP."*
- [ ] Sample messages:
  1. *"Flipper.ai: New feature — cross-platform listing now available on Pro tier. Try free: https://<domain>/listings. Reply STOP to opt out."*
- [ ] Opt-in: *"Users opt-in to marketing SMS via separate checkbox in account settings (default off)."*

> **Recommendation:** Skip Campaign 2 at launch. Marketing SMS has stricter opt-in audit requirements and rarely justifies the work. Push notifications and email cover the same use case more cheaply.

---

## Step 4 — Buy a 10DLC-eligible phone number

URL: https://console.twilio.com/us1/develop/phone-numbers/manage/search

- [ ] Search for a 10DLC-capable number in your area code
- [ ] Filter: must support SMS + MMS (use SMS-only if you're not sending images)
- [ ] Purchase ($1.15/mo for a US local number)
- [ ] **Save the number's SID and E.164 number** to GCP Secret Manager as `PROD_TWILIO_PHONE_NUMBER`

---

## Step 5 — Assign the number to your campaign

URL: https://console.twilio.com/us1/develop/sms/a2p-10dlc/messaging-services

- [ ] Go to Messaging Services → create a service
- [ ] Service name: `flipper-ai-transactional`
- [ ] Add your purchased phone number as a sender
- [ ] Attach Campaign 1 to this Messaging Service
- [ ] Configure delivery callbacks: `https://<domain>/api/twilio/delivery-webhook`
- [ ] Configure inbound SMS webhook: `https://<domain>/api/twilio/sms-webhook`
- [ ] Set fallback URL (Twilio's status page is fine if you don't have a custom one)

---

## Step 6 — Implement the webhooks

You need three endpoints. (Some may already exist on django-main; verify before duplicating.)

### `app/api/twilio/sms-webhook/route.ts` — inbound SMS

Handles STOP, HELP, and any other inbound replies.

**Required keyword handlers:**
- `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` → mark `User.smsOptOut = true`, reply with *"You've been unsubscribed from Flipper.ai SMS. Reply START to resubscribe."*
- `HELP`, `INFO` → reply with the canned help message
- `START`, `YES`, `UNSTOP` → re-enable opt-in
- Anything else → log + ignore (or route to a manual review queue if you want to handle replies)

### `app/api/twilio/delivery-webhook/route.ts` — delivery status

Logs delivery success/failure per message. Update `Message` table with status (`DELIVERED`, `FAILED`, `UNDELIVERED`).

Useful for:
- Debugging deliverability issues
- Pruning invalid numbers from your DB
- Computing delivery success rate

### `app/api/twilio/opt-in-confirmation/route.ts` — initial double opt-in

When a user enters their phone in settings:
1. Call this route to send a confirmation SMS: *"Reply YES to confirm SMS notifications from Flipper.ai. Reply STOP to cancel."*
2. The user's reply lands at the inbound webhook
3. The inbound webhook flips `User.smsOptInConfirmed = true`

---

## Step 7 — Test

Before flipping the switch:

- [ ] Test from your own phone: enter your number → confirm via reply → trigger a transactional alert → receive within 30 seconds
- [ ] Test STOP: reply STOP → confirm next message attempt is blocked at the application layer (not just relying on Twilio)
- [ ] Test HELP: reply HELP → receive canned message
- [ ] Test inbound from a non-registered number: should be logged but not crash
- [ ] Test delivery failure: send to a deliberately invalid number → confirm `Message.status = FAILED` after webhook

---

## Step 8 — Production rollout

- [ ] Enable SMS in user settings UI (was previously hidden behind a feature flag)
- [ ] Update FAQ + Privacy Policy to mention SMS specifics
- [ ] Add the carrier per-segment fees to your AI cost monitoring (so SMS doesn't silently become an unbudgeted line item)
- [ ] Monitor delivery success rate for the first week. Healthy: >95%. <90% = something is wrong.

---

## Common pitfalls

1. **Sending without registration.** Twilio will throttle at 1 msg/sec; carriers may block entirely. Always register before any volume.
2. **Inadequate opt-in audit trail.** During TCR vetting, they may ask for proof of opt-in mechanism. Your settings UI should have a clear log of when each user toggled SMS on.
3. **Mismatched brand info.** If your Twilio brand name says `Flipper AI Inc.` but your domain says `Flipper.ai`, vetting may flag for review.
4. **Forgetting the STOP keyword.** Carriers test this — if a STOP doesn't work, you can be deregistered.
5. **Not including identifier in messages.** Best practice: every SMS leads with `Flipper.ai:` so users know who it's from.
6. **Marketing campaign without explicit opt-in.** Transactional alerts only need account opt-in; marketing needs a *separate* checkbox. Conflating these is a fast track to deregistration.

---

## What if you skip 10DLC at launch?

Recommended path if you want to move fast:

1. **Disable the SMS toggle** in user settings UI (hide behind a feature flag).
2. **Keep all the infrastructure code** — it's already done on django-main.
3. **Email + push notifications** cover ~95% of the value of SMS alerts.
4. **Re-enable SMS in v1.1** once you have time to do 10DLC registration without launch pressure.
5. Update the public FAQ to say "SMS is coming soon — push notifications and email are available now."

This is the recommended posture for launch. SMS adds ~$15/month in fixed costs + ~7-14 days of registration overhead for a feature that's not differentiating at launch.
