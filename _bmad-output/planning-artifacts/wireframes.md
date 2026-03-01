# Flipper.ai — Full App Wireframes

> **Version:** 1.0
> **Date:** March 1, 2026
> **Author:** BMAD UX Designer
> **Status:** Draft

---

## Table of Contents

1. [Global Shell & Navigation](#1-global-shell--navigation)
2. [Landing Page (Public)](#2-landing-page-public)
3. [Login](#3-login)
4. [Register](#4-register)
5. [Onboarding Wizard](#5-onboarding-wizard)
6. [Dashboard](#6-dashboard)
7. [Opportunities (Kanban)](#7-opportunities-kanban)
8. [Scraper](#8-scraper)
9. [Messages](#9-messages)
10. [Analytics](#10-analytics)
11. [Settings](#11-settings)
12. [Responsive Breakpoints](#12-responsive-breakpoints)
13. [Shared Component Specs](#13-shared-component-specs)

---

## 1. Global Shell & Navigation

The app shell wraps every authenticated page.

### Desktop (md+)

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR  (sticky top, backdrop-blur)                                │
│                                                                      │
│  🐧 Flipper AI          Dashboard   Opportunities   Settings    [👤]│
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                                                                      │
│                         PAGE CONTENT                                 │
│                       (scrollable area)                              │
│                                                                      │
│                                                                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile (< md)

```
┌──────────────────────────────┐
│  🐧 Flipper AI          [☰] │  ← Hamburger menu
├──────────────────────────────┤
│                              │
│       PAGE CONTENT           │
│                              │
└──────────────────────────────┘

  Hamburger expanded:
  ┌──────────────────────────────┐
  │  Dashboard                   │
  │  Opportunities               │
  │  Settings                    │
  │  ─────────────────────       │
  │  Log out                     │
  └──────────────────────────────┘
```

### Nav States

| Element         | Default            | Active                 | Hover               |
|-----------------|--------------------|------------------------|----------------------|
| Nav link        | Gray text           | Blue bg, blue text     | Light blue bg        |
| User avatar     | Gray circle + icon  | —                      | Ring highlight       |
| Logo            | Penguin + text      | —                      | Opacity bump         |

---

## 2. Landing Page (Public)

**Route:** `/`
**Purpose:** Convert visitors to sign-ups. No auth required.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV: 🐧 Flipper AI                           [Log In]  [Sign Up]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐                                          ┌─────────┐   │
│  │ Avg      │     ★ AI-Powered Marketplace             │ Success │   │
│  │ Profit   │       Flipping Made Easy                 │ Rate    │   │
│  │ $127     │                                          │ 94%     │   │
│  └─────────┘     Find underpriced items across         └─────────┘   │
│                  5 platforms and flip for profit.                     │
│  ┌─────────┐                                          ┌─────────┐   │
│  │ AI       │     [ Get Started Free ]                 │ Deals   │   │
│  │ Powered  │     [ See How It Works  ]                │ Found   │   │
│  │ 100%     │                                          │ 10K+    │   │
│  └─────────┘                                          └─────────┘   │
│                                                                      │
│  ── ANIMATED GRADIENT BACKGROUND ──────────────────────────────────  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FEATURES GRID (3 cols)                                              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ 🔍            │  │ 🤖            │  │ 💰            │              │
│  │ Multi-Platform│  │ AI Value      │  │ Profit        │              │
│  │ Scanning      │  │ Detection     │  │ Calculator    │              │
│  │               │  │               │  │               │              │
│  │ Scan 5 market-│  │ ML scores     │  │ See exact     │              │
│  │ places at once│  │ every deal    │  │ profit margin │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ 🔔            │  │ 📊            │  │ 🛡️            │              │
│  │ Real-Time     │  │ Market        │  │ Scam          │              │
│  │ Alerts        │  │ Insights      │  │ Detection     │              │
│  │               │  │               │  │               │              │
│  │ Never miss a  │  │ Data-driven   │  │ AI flags      │              │
│  │ hot deal      │  │ pricing       │  │ suspicious    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PRICING (3 cols)                                                    │
│                                                                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐           │
│  │    FREE       │  │  ★ MOST POPULAR │  │   BUSINESS   │           │
│  │   $0/mo       │  │    PRO          │  │   $99/mo     │           │
│  │               │  │   $29/mo        │  │              │           │
│  │ • 5 scans/day │  │                 │  │ • Everything │           │
│  │ • 1 platform  │  │ • Unlimited     │  │   in Pro     │           │
│  │ • Basic AI    │  │ • 5 platforms   │  │ • API access │           │
│  │               │  │ • Full AI       │  │ • Team collab│           │
│  │ [Start Free]  │  │ • Priority      │  │              │           │
│  │               │  │                 │  │ [Contact Us] │           │
│  │               │  │ [Upgrade to Pro]│  │              │           │
│  └──────────────┘  └─────────────────┘  └──────────────┘           │
│                     ↑ scaled larger                                   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  CTA BANNER (gradient bg)                                            │
│                                                                      │
│       Ready to start flipping?                                       │
│       [ Create Free Account ]                                        │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  FOOTER                                                              │
│  Privacy Policy  |  Terms of Service  |  Contact                     │
│  © 2026 Flipper AI                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile

```
┌──────────────────────────────┐
│  🐧 Flipper AI   [Log In]   │
├──────────────────────────────┤
│                              │
│   ★ AI-Powered Marketplace   │
│     Flipping Made Easy       │
│                              │
│   [ Get Started Free ]       │
│                              │
│  ┌────────┐  ┌────────┐     │
│  │ $127   │  │ 94%    │     │
│  │ profit │  │ rate   │     │
│  └────────┘  └────────┘     │
│                              │
│  FEATURES (1 col, stacked)   │
│  ┌──────────────────────┐    │
│  │ 🔍 Multi-Platform    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 🤖 AI Value Detection│    │
│  └──────────────────────┘    │
│          ...                 │
│                              │
│  PRICING (1 col, stacked)    │
│  PRO card first (featured)   │
│                              │
│  FOOTER (stacked links)      │
└──────────────────────────────┘
```

---

## 3. Login

**Route:** `/login`
**Purpose:** Authenticate returning users.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ANIMATED GRADIENT BACKGROUND (purple, pink, blue, emerald orbs)     │
│                                                                      │
│  ┌──────────┐                                      ┌──────────┐     │
│  │ Feature  │                                      │ Feature  │     │
│  │ Card 1   │     ┌────────────────────────┐       │ Card 2   │     │
│  │ "AI      │     │                        │       │ "Market  │     │
│  │  Powered"│     │  🐧 Flipper AI         │       │  Intel"  │     │
│  └──────────┘     │                        │       └──────────┘     │
│                   │  ┌──────────────────┐  │                        │
│  ┌──────────┐     │  │ ⓘ Error message  │  │       ┌──────────┐    │
│  │ Feature  │     │  └──────────────────┘  │       │ Feature  │    │
│  │ Card 3   │     │                        │       │ Card 4   │    │
│  │ "Multi-  │     │  [  🔵 Google  ]       │       │ "Real-   │    │
│  │ Platform"│     │  [  ⚫ GitHub  ]       │       │  Time"   │    │
│  └──────────┘     │                        │       └──────────┘    │
│                   │  ─── or ───            │                        │
│                   │                        │                        │
│                   │  📧 Email              │                        │
│                   │  ┌──────────────────┐  │                        │
│                   │  │                  │  │                        │
│                   │  └──────────────────┘  │                        │
│                   │                        │                        │
│                   │  🔒 Password       [👁]│                        │
│                   │  ┌──────────────────┐  │                        │
│                   │  │                  │  │                        │
│                   │  └──────────────────┘  │                        │
│                   │                        │                        │
│                   │  ┌─ CAPTCHA ────────┐  │  ← Shown conditionally │
│                   │  │ (hCaptcha)       │  │                        │
│                   │  └─────────────────-┘  │                        │
│                   │                        │                        │
│                   │  [ ★ Sign In        ]  │                        │
│                   │                        │                        │
│                   │  Forgot password?      │                        │
│                   │                        │                        │
│                   │  ────────────────────  │                        │
│                   │  Don't have an account?│                        │
│                   │  Create one free →     │                        │
│                   └────────────────────────┘                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### States

| State            | Visual                                                  |
|------------------|---------------------------------------------------------|
| Default          | Clean form, no messages                                 |
| Error            | Red alert banner above form with icon                   |
| Post-logout      | Green success banner: "Signed out successfully"         |
| Loading          | Button shows spinner, inputs disabled                   |
| CAPTCHA required | hCaptcha widget appears above Sign In button            |

---

## 4. Register

**Route:** `/register`
**Purpose:** Create new account with email or OAuth.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ANIMATED GRADIENT BACKGROUND                                        │
│                                                                      │
│  ┌──────────┐                                      ┌──────────┐     │
│  │ Feature  │     ┌────────────────────────┐       │ Feature  │     │
│  │ Cards    │     │                        │       │ Cards    │     │
│  │ (xl only)│     │  🐧 Create Account     │       │ (xl only)│     │
│  └──────────┘     │                        │       └──────────┘     │
│                   │  [  🔵 Google  ]       │                        │
│                   │  [  ⚫ GitHub  ]       │                        │
│                   │                        │                        │
│                   │  ─── or ───            │                        │
│                   │                        │                        │
│                   │  👤 Full Name          │                        │
│                   │  ┌──────────────────┐  │                        │
│                   │  │                  │  │                        │
│                   │  └──────────────────┘  │                        │
│                   │                        │                        │
│                   │  📧 Email              │                        │
│                   │  ┌──────────────────┐  │                        │
│                   │  │                  │  │                        │
│                   │  └──────────────────┘  │                        │
│                   │                        │                        │
│                   │  🔒 Password       [👁]│                        │
│                   │  ┌──────────────────┐  │                        │
│                   │  │                  │  │                        │
│                   │  └──────────────────┘  │                        │
│                   │                        │                        │
│                   │  STRENGTH: ████░░░░    │                        │
│                   │  ✅ 8+ chars           │                        │
│                   │  ✅ Uppercase          │                        │
│                   │  ⬜ Lowercase          │                        │
│                   │  ⬜ Number             │                        │
│                   │                        │                        │
│                   │  🔒 Confirm Password   │                        │
│                   │  ┌──────────────────┐  │                        │
│                   │  │                  │  │                        │
│                   │  └──────────────────┘  │                        │
│                   │                        │                        │
│                   │  [ ★ Create Account ]  │                        │
│                   │                        │                        │
│                   │  By signing up you     │                        │
│                   │  agree to our Terms    │                        │
│                   │                        │                        │
│                   │  ────────────────────  │                        │
│                   │  Already have account? │                        │
│                   │  Sign in →             │                        │
│                   └────────────────────────┘                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Password Strength Indicator

```
Weak:     ██░░░░░░  (red)
Fair:     ████░░░░  (orange)
Good:     ██████░░  (yellow)
Strong:   ████████  (green)
```

---

## 5. Onboarding Wizard

**Route:** `/onboarding`
**Purpose:** Collect user preferences after first registration.

### Wizard Layout (all steps)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  PROGRESS BAR                                                        │
│  ████████████████░░░░░░░░░░░░░░░░  Step 2 of 6                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │                                                            │      │
│  │                    STEP CONTENT                            │      │
│  │                  (varies by step)                          │      │
│  │                                                            │      │
│  │                                                            │      │
│  │                                                            │      │
│  └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│  [ ← Back ]                               [ Skip ]  [ Continue → ]  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Step 1: Welcome

```
│                                                            │
│          🐧                                                │
│                                                            │
│     Welcome to Flipper AI!                                 │
│                                                            │
│     We'll help you find the best                           │
│     deals to flip for profit.                              │
│                                                            │
│     ✓ Scan 5 marketplaces                                  │
│     ✓ AI-powered analysis                                  │
│     ✓ Track your flips                                     │
│                                                            │
│     [ Let's Get Started → ]                                │
│                                                            │
```

### Step 2: Marketplaces

```
│                                                            │
│     Which marketplaces do you use?                         │
│     (Select all that apply)                                │
│                                                            │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│     │ ☑ Craigslist │  │ ☑ Facebook  │  │ ☐ eBay      │    │
│     └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                            │
│     ┌─────────────┐  ┌─────────────┐                      │
│     │ ☐ OfferUp   │  │ ☐ Mercari   │                      │
│     └─────────────┘  └─────────────┘                      │
│                                                            │
```

### Step 3: Categories

```
│                                                            │
│     What do you like to flip?                              │
│     (Select your preferred categories)                     │
│                                                            │
│     ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│     │ Electronics│ │ Furniture  │ │ Appliances │         │
│     │     ☑      │ │     ☐      │ │     ☐      │         │
│     └────────────┘ └────────────┘ └────────────┘         │
│     ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│     │ Clothing   │ │ Sports     │ │ Toys       │         │
│     │     ☐      │ │     ☑      │ │     ☐      │         │
│     └────────────┘ └────────────┘ └────────────┘         │
│     ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│     │ Tools      │ │ Automotive │ │ Other      │         │
│     │     ☐      │ │     ☐      │ │     ☐      │         │
│     └────────────┘ └────────────┘ └────────────┘         │
│                                                            │
```

### Step 4: Budget

```
│                                                            │
│     What's your typical flip budget?                       │
│                                                            │
│     ○  Small   — Under $50 per item                        │
│     ●  Medium  — $50 – $200 per item                       │
│     ○  Large   — $200 – $1,000 per item                    │
│     ○  XL      — $1,000+ per item                          │
│                                                            │
```

### Step 5: Location

```
│                                                            │
│     Where are you located?                                 │
│                                                            │
│     ZIP Code                                               │
│     ┌──────────────────────────────┐                      │
│     │ 90210                        │                      │
│     └──────────────────────────────┘                      │
│                                                            │
│     Search radius                                          │
│     0 mi ──────●─────────────── 50 mi                     │
│                25 miles                                     │
│                                                            │
```

### Step 6: Complete

```
│                                                            │
│          🎉                                                │
│                                                            │
│     You're all set!                                        │
│                                                            │
│     Your preferences have been saved.                      │
│     Head to your dashboard to start                        │
│     finding deals.                                         │
│                                                            │
│     [ Go to Dashboard → ]                                  │
│                                                            │
```

---

## 6. Dashboard

**Route:** `/dashboard`
**Purpose:** Overview of all listings, stats at a glance, entry point to detail views.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Flipper Dashboard                                                   │
│  Your marketplace deals at a glance                                  │
│                                                                      │
│  STATS ROW (3 cols)                                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│  │ 📦 Total Listings │ │ ⭐ Opportunities  │ │ 💰 Avg Profit    │     │
│  │                   │ │                   │ │                   │     │
│  │       142         │ │        37         │ │      $89          │     │
│  │                   │ │                   │ │                   │     │
│  │   (gray border)   │ │ (purple border)   │ │  (green border)   │     │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘     │
│                                                                      │
│  LISTINGS GRID (3 cols lg, 2 cols md)                                │
│                                                                      │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │     │
│  │ │              │ │ │ │              │ │ │ │              │ │     │
│  │ │    IMAGE     │ │ │ │    IMAGE     │ │ │ │    IMAGE     │ │     │
│  │ │    (h-48)    │ │ │ │    (h-48)    │ │ │ │    (h-48)    │ │     │
│  │ │              │ │ │ │              │ │ │ │              │ │     │
│  │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │     │
│  │ eBay ●    ⭐      │ │ Craigslist ●     │ │ OfferUp ●   ⭐   │     │
│  │                   │ │                   │ │                   │     │
│  │ iPhone 14 Pro     │ │ Vintage Sofa      │ │ PS5 Console       │     │
│  │ Max 256GB Like…   │ │ Mid-Century…      │ │ Barely Used…      │     │
│  │                   │ │                   │ │                   │     │
│  │ Ask: $450         │ │ Ask: $120         │ │ Ask: $280         │     │
│  │ Est: $680         │ │ Est: $350         │ │ Est: $420         │     │
│  │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │     │
│  │ │ +$230 profit │ │ │ │ +$230 profit │ │ │ │ +$140 profit │ │     │
│  │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │     │
│  │ 📍 Los Angeles  🔗│ │ 📍 Portland    🔗│ │ 📍 Seattle     🔗│     │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘     │
│                                                                      │
│  ... more cards ...                                                  │
│                                                                      │
│  PAGINATION                                                          │
│         [ ◀ ]  [ 1 ]  [●2 ]  [ 3 ]  [ 4 ]  [ ▶ ]                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Listing Card Detail

```
┌──────────────────────┐
│ ┌──────────────────┐ │
│ │   IMAGE           │ │  ← object-cover, h-48
│ │   (placeholder    │ │     Fallback: gray bg + 📦 icon
│ │    if no image)   │ │
│ └──────────────────┘ │
│                      │
│ eBay ●          ⭐    │  ← Platform badge (color-coded) + Star toggle
│                      │
│ Item Title Here      │  ← line-clamp-2 (max 2 lines)
│ That Can Wrap…       │
│                      │
│ Asking:    $450      │  ← gray label
│ Estimated: $680      │  ← bold
│                      │
│ ┌──────────────────┐ │
│ │  +$230 profit    │ │  ← green badge
│ └──────────────────┘ │
│                      │
│ 📍 Los Angeles    🔗  │  ← Location + external link icon
└──────────────────────┘
```

### Platform Badge Colors

| Platform   | Badge Color   |
|------------|---------------|
| eBay       | Yellow        |
| Craigslist | Blue          |
| Facebook   | Blue-600      |
| OfferUp    | Green         |
| Mercari    | Orange        |

### Empty State

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    📦                                                 │
│                                                                      │
│              No listings found                                       │
│                                                                      │
│      Try running a scrape to find deals.                             │
│                                                                      │
│              [ Go to Scraper → ]                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Opportunities (Kanban)

**Route:** `/opportunities`
**Purpose:** Track deal lifecycle from discovery to sale via drag-and-drop board.

### Desktop — Kanban View

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Opportunities              [Search 🔍]     [📋 List] [▦ Kanban]    │
│                                                                      │
│  KANBAN BOARD (horizontal scroll on overflow)                        │
│                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  │ IDENTIFIED │ │ CONTACTED  │ │ PURCHASED  │ │  LISTED    │ │   SOLD     │
│  │   (3)      │ │   (2)      │ │   (1)      │ │   (2)      │ │   (5)      │
│  │  ▔▔▔▔▔▔▔▔  │ │  ▔▔▔▔▔▔▔▔  │ │  ▔▔▔▔▔▔▔▔  │ │  ▔▔▔▔▔▔▔▔  │ │  ▔▔▔▔▔▔▔▔  │
│  │  blue bar   │ │ yellow bar │ │ purple bar │ │ orange bar │ │ green bar  │
│  │            │ │            │ │            │ │            │ │            │
│  │ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │
│  │ │ 📷     │ │ │ │ 📷     │ │ │ │ 📷     │ │ │ │ 📷     │ │ │ │ 📷     │ │
│  │ │ iPhone │ │ │ │ Sofa   │ │ │ │ PS5    │ │ │ │ Camera │ │ │ │ Guitar │ │
│  │ │ $450   │ │ │ │ $120   │ │ │ │ $280   │ │ │ │ $90    │ │ │ │ $150   │ │
│  │ │ +$230  │ │ │ │ +$230  │ │ │ │ +$140  │ │ │ │ +$60   │ │ │ │ +$200  │ │
│  │ │[✏][🗑] │ │ │ │[✏][🗑] │ │ │ │[✏][🗑] │ │ │ │[✏][🗑] │ │ │ │[✏][🗑] │ │
│  │ └────────┘ │ │ └────────┘ │ │ └────────┘ │ │ └────────┘ │ │ └────────┘ │
│  │            │ │            │ │            │ │            │ │            │
│  │ ┌────────┐ │ │ ┌────────┐ │ │            │ │ ┌────────┐ │ │ ┌────────┐ │
│  │ │ Card 2 │ │ │ │ Card 2 │ │ │            │ │ │ Card 2 │ │ │ │ Card 2 │ │
│  │ └────────┘ │ │ └────────┘ │ │            │ │ └────────┘ │ │ └────────┘ │
│  │            │ │            │ │            │ │            │ │            │
│  │ ┌────────┐ │ │            │ │            │ │            │ │  ... more  │
│  │ │ Card 3 │ │ │            │ │            │ │            │ │            │
│  │ └────────┘ │ │            │ │            │ │            │ │            │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
│                                                                      │
│  ← Drag cards between columns to update status →                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Kanban Card Detail

```
┌──────────────┐
│ 📷 Thumbnail  │  ← small image, left-aligned
│              │
│ iPhone 14    │  ← Title (truncated)
│ 📱 eBay      │  ← Platform with emoji
│              │
│ Ask: $450    │
│ Est: $680    │
│ ┌──────────┐ │
│ │ +$230    │ │  ← green profit badge
│ └──────────┘ │
│              │
│ 👤 John D.   │  ← Seller (if available)
│              │
│ [✏️] [🗑️]    │  ← Edit / Delete actions
└──────────────┘
```

### Mobile — List View (default on mobile)

```
┌──────────────────────────────┐
│  Opportunities        [▦][📋]│
├──────────────────────────────┤
│  Filter: [All Statuses ▾]   │
│  Search: [____________]     │
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │ 📷 │ iPhone 14 Pro   │    │
│  │    │ eBay · $450     │    │
│  │    │ +$230 · IDENTIFIED│   │
│  │    │ [✏️] [🗑️]        │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │ 📷 │ Vintage Sofa    │    │
│  │    │ CL · $120       │    │
│  │    │ +$230 · CONTACTED│    │
│  │    │ [✏️] [🗑️]        │    │
│  └──────────────────────┘    │
│                              │
│  ... more items ...          │
│                              │
└──────────────────────────────┘
```

---

## 8. Scraper

**Route:** `/scraper`
**Purpose:** Configure and run marketplace scrapes, view results and job history.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [ ← Dashboard ]                                                     │
│                                                                      │
│  🔍 Scrape Listings                                                  │
│  Find deals on your favorite marketplaces                            │
│                                                                      │
│  QUICK ACTIONS                                                       │
│  ┌──────────────────────────────────┐  [Manage in Settings]          │
│  │ Saved Searches ▾                 │                                │
│  │  • Electronics under $100        │                                │
│  │  • Furniture Portland            │                                │
│  └──────────────────────────────────┘                                │
│                                                                      │
│  SCRAPER FORM                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  Platform              Location                              │    │
│  │  ┌──────────────┐     ┌──────────────────────────────┐      │    │
│  │  │ Craigslist ▾ │     │ Portland, OR                 │      │    │
│  │  └──────────────┘     └──────────────────────────────┘      │    │
│  │                                                              │    │
│  │  Category              Keywords                              │    │
│  │  ┌──────────────┐     ┌──────────────────────────────┐      │    │
│  │  │ Electronics ▾│     │ iphone macbook               │      │    │
│  │  └──────────────┘     └──────────────────────────────┘      │    │
│  │                                                              │    │
│  │  Min Price             Max Price                             │    │
│  │  ┌──────────────┐     ┌──────────────────────────────┐      │    │
│  │  │ $10          │     │ $500                         │      │    │
│  │  └──────────────┘     └──────────────────────────────┘      │    │
│  │                                                              │    │
│  │  [ 🔍 Start Scraping                                 ] [💾] │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  RESULTS (shown after scrape completes)                              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  ✅ Found 47 listings (showing first 10)                     │    │
│  │                                                              │    │
│  │  📷 iPhone 13 · Portland · $250               [View →]      │    │
│  │  📷 MacBook Air · Portland · $400              [View →]      │    │
│  │  📷 iPad Pro · Portland · $180                 [View →]      │    │
│  │  ...                                                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  JOB HISTORY                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  Filter: [All] [Completed] [Failed] [Running]               │    │
│  │  Date:   [All time] [Today] [This week] [This month]        │    │
│  │                                                  [Clear ✕]  │    │
│  │                                                              │    │
│  │  ✅ Craigslist · Completed · 2 min ago                      │    │
│  │     47 listings · 12 opportunities                   [🗑]   │    │
│  │                                                              │    │
│  │  ❌ OfferUp · Failed · 1 hour ago                           │    │
│  │     Error: Rate limited                              [🗑]   │    │
│  │                                                              │    │
│  │  ⏳ eBay · Running · Just now                               │    │
│  │     Scanning...                                      [🗑]   │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Save Search Modal

```
       ┌──────────────────────────────────┐
       │                                  │
       │  💾 Save Search Configuration    │
       │                                  │
       │  Name                            │
       │  ┌────────────────────────────┐  │
       │  │ Electronics Portland       │  │
       │  └────────────────────────────┘  │
       │                                  │
       │  [ Cancel ]         [ Save ]     │
       │                                  │
       └──────────────────────────────────┘
```

---

## 9. Messages

**Route:** `/messages`
**Purpose:** View and manage seller communications.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  💬 Messages (24)                                [ ← Dashboard ]     │
│                                                                      │
│  TABS                                                                │
│  [ All (24) ]  [ Inbox (18) ]  [ Sent (6) ]                        │
│                                                                      │
│  SEARCH + SORT                                                       │
│  ┌────────────────────────────────┐                                  │
│  │ 🔍 Search messages...          │  Sort: [Date ↓] [Status] [Name] │
│  └────────────────────────────────┘                                  │
│                                                                      │
│  MESSAGE LIST                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  ↓ Received  ● New        John Smith                        │    │
│  │  Re: iPhone 14 Pro Max                           2 min ago  │    │
│  │  Hey, I still have it. Can you come by this…                │    │
│  │  📎 Ref: iPhone 14 Pro Max 256GB                            │    │
│  │                                                              │    │
│  │  ─────────────────────────────────────────────────────────  │    │
│  │                                                              │    │
│  │  ↑ Sent     ● Delivered   Jane Doe                          │    │
│  │  Interested in Vintage Sofa                      1 hr ago   │    │
│  │  Hi, is this still available? I'd like to…                  │    │
│  │  📎 Ref: Mid-Century Sofa Restored                          │    │
│  │                                                              │    │
│  │  ─────────────────────────────────────────────────────────  │    │
│  │                                                              │    │
│  │  ↓ Received  ● Read       Mike Johnson                      │    │
│  │  Price negotiation                               3 hrs ago  │    │
│  │  I can do $250 if you pick up today…                        │    │
│  │  📎 Ref: PS5 Console Barely Used                            │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  PAGINATION                                                          │
│  [ ← Previous ]  Showing 1-10 of 24  [ Next → ]                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Direction Badges

| Direction | Badge    | Color |
|-----------|----------|-------|
| Received  | ↓ Recv   | Green |
| Sent      | ↑ Sent   | Blue  |

### Status Badges

| Status    | Color  |
|-----------|--------|
| New       | Blue   |
| Read      | Gray   |
| Replied   | Green  |
| Delivered | Purple |

### Empty State

```
       💬

   No messages yet

   Messages with sellers will
   appear here.
```

---

## 10. Analytics

**Route:** `/analytics`
**Purpose:** Profit & loss tracking, ROI analysis, deal performance.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📊 Profit & Loss Dashboard                     [ ← Dashboard ]     │
│  Track your flipping performance                                     │
│                                                                      │
│  SUMMARY CARDS (4 cols lg, 2 cols md)                                │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│  │ Invested   │ │ Revenue   │ │ Net Profit│ │ ROI       │           │
│  │ $4,250     │ │ $7,180    │ │ +$2,930   │ │ +68.9%    │           │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │
│                                                                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│  │ Completed  │ │ Active    │ │ Win Rate  │ │ Avg Days  │           │
│  │ 23 deals   │ │ 8 deals   │ │ 87%       │ │ 12 days   │           │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │
│                                                                      │
│  TRENDS TABLE                                                        │
│  Granularity: [● Monthly] [○ Weekly]                                │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Period     │ Purchased │ Sold │ Costs   │ Revenue │ Profit  │    │
│  │─────────────┼───────────┼──────┼─────────┼─────────┼─────────│    │
│  │  Feb 2026   │    12     │  8   │ $1,800  │ $3,200  │ +$1,400│    │
│  │  Jan 2026   │    15     │  11  │ $2,100  │ $3,500  │ +$1,400│    │
│  │  Dec 2025   │     8     │   4  │   $350  │   $480  │   +$130│    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  CATEGORY BREAKDOWN                                                  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Category    │ Items │ Invested │ Revenue │ Profit │ Avg ROI│    │
│  │──────────────┼───────┼──────────┼─────────┼────────┼────────│    │
│  │  Electronics │  15   │  $2,800  │  $4,900 │ +$2,100│  +75%  │    │
│  │  Furniture   │   5   │    $900  │  $1,400 │   +$500│  +56%  │    │
│  │  Sports      │   3   │    $550  │    $880 │   +$330│  +60%  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  BEST / WORST DEALS (2 cols)                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐         │
│  │ 🏆 Best Deal              │  │ 📉 Worst Deal             │         │
│  │                           │  │                           │         │
│  │ iPhone 14 Pro             │  │ Broken TV                 │         │
│  │ eBay                      │  │ Craigslist                │         │
│  │ Profit: +$340             │  │ Loss: -$45                │         │
│  │ ROI: +142%                │  │ ROI: -30%                 │         │
│  │                           │  │                           │         │
│  │ (green border)            │  │ (red border)              │         │
│  └──────────────────────────┘  └──────────────────────────┘         │
│                                                                      │
│  ALL DEALS TABLE                                                     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Item       │ Platform │ Status    │ Bought │ Sold  │ Profit│    │
│  │─────────────┼──────────┼───────────┼────────┼───────┼───────│    │
│  │  iPhone 14  │ eBay     │ ● SOLD    │  $240  │ $580  │ +$340│    │
│  │  Vintage…   │ CL       │ ● LISTED  │  $120  │  —    │   —  │    │
│  │  PS5        │ OfferUp  │ ● PURCHASED│ $280  │  —    │   —  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Status Colors in Tables

| Status    | Badge Color |
|-----------|-------------|
| PURCHASED | Yellow      |
| LISTED    | Blue        |
| SOLD      | Green       |

### Empty State

```
       🐧

   No deals tracked yet!

   Start by finding and purchasing
   items from the Scraper.

   [ Go to Scraper → ]
```

---

## 11. Settings

**Route:** `/settings`
**Purpose:** Theme customization and notification preferences.

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THEME SETTINGS                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  (dark gradient background)                                  │    │
│  │                                                              │    │
│  │  THEME GRID (3 cols lg, 2 cols md, 1 col mobile)            │    │
│  │                                                              │    │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │    │
│  │  │ ● Active       │ │                │ │                │   │    │
│  │  │ ○ ○ ○          │ │ ○ ○ ○          │ │ ○ ○ ○          │   │    │
│  │  │ (color orbs)   │ │ (color orbs)   │ │ (color orbs)   │   │    │
│  │  │                │ │                │ │                │   │    │
│  │  │ Cosmic Purple  │ │ Ocean Blue     │ │ Sunset Warm    │   │    │
│  │  │ Deep space     │ │ Calm waters    │ │ Golden hour    │   │    │
│  │  │ vibes          │ │ feel           │ │ tones          │   │    │
│  │  │                │ │                │ │                │   │    │
│  │  │ ████████████   │ │ ████████████   │ │ ████████████   │   │    │
│  │  │ ████████████   │ │ ████████████   │ │ ████████████   │   │    │
│  │  │                │ │                │ │                │   │    │
│  │  │ ACTIVE THEME   │ │                │ │                │   │    │
│  │  └────────────────┘ └────────────────┘ └────────────────┘   │    │
│  │                                                              │    │
│  │  ... more theme cards ...                                    │    │
│  │                                                              │    │
│  │  CURRENT THEME INFO                                          │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │  Cosmic Purple                                       │   │    │
│  │  │                                                      │   │    │
│  │  │  Primary    Secondary    Accent Blue   Accent Green  │   │    │
│  │  │  ■ #8B5CF6  ■ #EC4899    ■ #3B82F6    ■ #10B981    │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  NOTIFICATION SETTINGS                                               │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  🔔 Notifications                                            │    │
│  │                                                              │    │
│  │  Email notifications         [████ ON ]                     │    │
│  │  Push notifications          [░░░░ OFF]                     │    │
│  │  Deal alerts                 [████ ON ]                     │    │
│  │  Weekly digest               [████ ON ]                     │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Theme Card Detail

```
┌────────────────────┐
│ ● Active (green)   │  ← Pulsing green dot if active
│                    │
│   ○  ○  ○          │  ← 3 color orbs (theme preview)
│                    │
│ Theme Name         │  ← Bold title
│ Short description  │  ← Muted text
│                    │
│ ████████████████   │  ← Primary gradient bar
│ ████████████████   │  ← Secondary gradient bar
│                    │
│ ACTIVE THEME       │  ← Green label (only on active)
└────────────────────┘
```

---

## 12. Responsive Breakpoints

| Breakpoint | Width  | Layout Adjustments                              |
|------------|--------|-------------------------------------------------|
| Default    | < 640  | Single column, stacked everything, hamburger nav|
| `sm`       | 640px  | Minor spacing adjustments                       |
| `md`       | 768px  | 2-column grids, inline nav links appear         |
| `lg`       | 1024px | 3-column grids, full kanban board               |
| `xl`       | 1280px | Max container widths, floating feature cards    |

### Per-Screen Responsive Rules

| Screen        | Mobile              | Tablet (md)        | Desktop (lg+)       |
|---------------|---------------------|--------------------|----------------------|
| Landing       | 1-col stacked       | 2-col features     | 3-col features/pricing|
| Login         | Full-width card     | Centered card      | Card + feature cards |
| Dashboard     | 1-col cards         | 2-col cards        | 3-col cards          |
| Opportunities | List view default   | List view          | Kanban board         |
| Scraper       | Stacked form        | 2-col form inputs  | 2-col form inputs    |
| Messages      | Compact list        | Full list          | Full list            |
| Analytics     | Stacked cards+tables| 2-col summary      | 4-col summary        |
| Settings      | 1-col themes        | 2-col themes       | 3-col themes         |

---

## 13. Shared Component Specs

### Toast Notification

```
Position: Bottom-right (fixed)

┌──────────────────────────────┐
│ ✅ Scrape completed!    [✕]  │  ← Success (green left border)
│    47 listings found         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ❌ Scrape failed        [✕]  │  ← Error (red left border)
│    Rate limit exceeded       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ⚠️ Warning              [✕]  │  ← Warning (yellow left border)
│    Approaching scan limit    │
└──────────────────────────────┘

Auto-dismiss: 5 seconds
Stack: Up to 3 visible, newest on top
```

### Loading States

```
Skeleton card:
┌──────────────────────┐
│ ┌──────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░ │ │  ← Pulsing gray block (image)
│ │ ░░░░░░░░░░░░░░░░ │ │
│ └──────────────────┘ │
│ ░░░░░░░░░░           │  ← Title skeleton
│ ░░░░░░░░░░░░░░       │  ← Text skeleton
│ ░░░░                 │  ← Price skeleton
└──────────────────────┘

Full-page spinner:
┌──────────────────────────────┐
│                              │
│         ⟳ Loading...         │
│                              │
└──────────────────────────────┘
```

### Error Alert

```
┌──────────────────────────────────────────────────────┐
│ ⚠ Error                                              │
│                                                      │
│ Something went wrong. Please try again.              │
│                                                      │
│ [ Retry ]                                            │
└──────────────────────────────────────────────────────┘
```

### Pagination

```
Standard:    [ ◀ ]  [ 1 ]  [●2 ]  [ 3 ]  ...  [ 8 ]  [ ▶ ]
Simplified:  [ ← Previous ]  Page 2 of 8  [ Next → ]
```

### Confirmation Modal

```
       ┌──────────────────────────────────┐
       │                                  │
       │  ⚠ Are you sure?                 │
       │                                  │
       │  This action cannot be undone.   │
       │                                  │
       │  [ Cancel ]        [ Delete ]    │
       │                     (red btn)    │
       └──────────────────────────────────┘
```

---

## Interaction Notes

### Drag-and-Drop (Kanban)
- Cards show a grab cursor on hover
- Dragging card gets slight elevation (shadow-lg) and opacity reduction
- Drop zones highlight with dashed border when card hovers
- Status updates via API on drop
- Optimistic UI update (card moves immediately, reverts on error)

### Form Validation
- Inline validation on blur
- Red border + error text below invalid fields
- Submit button disabled until form is valid
- Success state: green border + checkmark icon

### Transitions
- Page transitions: fade in (200ms)
- Card hover: shadow-lg transition (150ms)
- Modal: fade + scale in (200ms)
- Toast: slide in from right (300ms)

---

*End of wireframes. See also:*
- *[UX Design Spec](./_bmad-output/planning-artifacts/ux-design.md)*
- *[User Flows](./docs/prd/user-flows.md)*
- *[PRD](./_bmad-output/planning-artifacts/PRD.md)*
