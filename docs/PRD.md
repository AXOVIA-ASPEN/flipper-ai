# Flipper AI - Product Requirements Document

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Version:** 2.0  
**Date:** February 3, 2026  

---

## 🎯 Executive Summary

**Flipper AI** is an AI-powered marketplace arbitrage tool that helps users find, analyze, and flip items for profit across multiple online marketplaces. The tool automates the entire flipping workflow — from discovery to purchase communication to resale listing.

**Tagline:** *Find. Flip. Profit.* 🐧

---

## 🔍 Problem Statement

Flipping items for profit is time-consuming and requires:
- Manually searching multiple marketplaces
- Estimating resale value based on experience
- Tracking listings and price changes
- Communicating with sellers
- Creating resale listings

Most flippers miss opportunities because they can't monitor enough listings fast enough.

---

## 💡 Solution

Flipper AI automates the entire flipping workflow:

1. **Multi-Marketplace Scanning** — Continuously monitors eBay, Craigslist, Facebook Marketplace, and others
2. **AI Flippability Scoring** — Analyzes each item using price history, sales probability, and market demand
3. **Automated Seller Communication** — Drafts and manages conversations with sellers
4. **Smart Resale Listings** — Automatically creates optimized sell listings at target prices
5. **Real-time Monitoring** — Tracks listings to ensure items don't sell before purchase

---

## 👤 Target Users

### Primary: Side Hustlers & Part-Time Flippers
- Looking for extra income
- Limited time for manual searching
- Want data-driven decisions

### Secondary: Professional Resellers
- High-volume operations
- Need efficiency tools
- Value automation

---

## 🏗️ Key Features

### 1. Multi-Marketplace Scanner
- **Supported Platforms:** eBay, Craigslist, Facebook Marketplace, OfferUp, Mercari
- **Real-time Alerts:** Instant notifications for high-flippability items
- **Custom Filters:** Category, price range, location, keywords

### 2. AI Flippability Score Engine
Analyzes each listing using:

| Factor | Weight | Data Source |
|--------|--------|-------------|
| Price vs. Market Value | 30% | eBay sold listings, price guides |
| Sales Probability | 25% | Historical sales data, demand trends |
| Profit Margin | 20% | Buy price vs. expected sell price |
| Time to Sell | 15% | Average days on market |
| Condition Assessment | 10% | Listing description analysis |

**Output:** Flippability Score (0-100) + Confidence Level

### 3. Automated Seller Communication
- **Message Drafting:** AI generates personalized outreach messages
- **Conversation Management:** Full chat history in UI
- **Pickup Scheduling:** Integrates user availability for local pickups
- **Approval Flow:** User approves messages before sending

### 4. Resale Listing Generator
- **Auto-create Listings:** Generates title, description, photos
- **Price Optimization:** Sets price based on market analysis
- **Cross-platform Posting:** List on multiple marketplaces

### 5. Dashboard & Tracking
- **Flippables Queue:** Items identified but not yet contacted
- **Active Negotiations:** Ongoing conversations
- **Inventory:** Purchased items awaiting resale
- **Sales History:** Completed flips with P&L

### 6. Listing Monitoring
- **SOLD Detection:** Alerts if a tracked item sells
- **Price Changes:** Notifies of price drops
- **Listing Expiry:** Warns before listings expire

---

## 🔄 User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLIPPER AI FLOW                          │
└─────────────────────────────────────────────────────────────────┘

  [Marketplaces] ──scan──► [AI Analysis] ──score──► [Flippables Queue]
                                                           │
                                                    (User reviews)
                                                           │
                           ┌───────────────────────────────┘
                           ▼
                    [Draft Message] ──approve──► [Send to Seller]
                           │
                           ▼
                    [Negotiate] ◄──► [Seller Responses]
                           │
                    (Purchase confirmed)
                           │
                           ▼
                    [Create Sell Listing] ──post──► [Marketplaces]
                           │
                    (Item sells)
                           │
                           ▼
                      [Profit! 💰]
```

---

## 💰 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 10 scans/day, 1 marketplace, manual messaging |
| **Flipper** | $19/mo | Unlimited scans, 3 marketplaces, AI messaging |
| **Pro Flipper** | $49/mo | All marketplaces, auto-listing, priority support |
| **Enterprise** | Custom | API access, team features, custom integrations |

---

## 🛠️ Technical Architecture

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **State:** React Query + Zustand
- **Real-time:** WebSockets for live updates

### Backend
- **API:** FastAPI (Python)
- **Database:** PostgreSQL + Redis (caching)
- **Queue:** Celery for background jobs
- **AI/ML:** Claude API for analysis, custom scoring models

### Integrations
- eBay API
- Facebook Graph API (Marketplace)
- Craigslist scraping (robots.txt compliant)
- OfferUp API
- Mercari API

### Infrastructure
- **Hosting:** Firebase/Cloud Run
- **CDN:** Cloudflare
- **Monitoring:** Prometheus + Grafana

---

## 📊 Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| MAU | 1,000 |
| Paid Subscribers | 100 |
| MRR | $2,500 |
| Avg Flippability Accuracy | 80% |
| User Profit (avg) | $500/mo |

---

## 🗓️ MVP Scope (4 Weeks)

### Week 1: Core Scanner
- [ ] eBay listing scraper
- [ ] Basic flippability scoring
- [ ] Database schema
- [ ] API endpoints

### Week 2: AI Analysis
- [ ] Price comparison engine
- [ ] Sales probability model
- [ ] Flippability score calculator
- [ ] Dashboard UI

### Week 3: Communication
- [ ] Message drafting AI
- [ ] Conversation UI
- [ ] Approval workflow
- [ ] Notification system

### Week 4: Polish & Launch
- [ ] Resale listing generator
- [ ] Payment integration (Stripe)
- [ ] Onboarding flow
- [ ] Landing page

---

## 🐧 Branding

- **Mascot:** Flipper the Penguin
- **Colors:** Arctic Blue (#0EA5E9), Ice White, Deep Ocean (#0C4A6E)
- **Tone:** Friendly, smart, trustworthy
- **Domain:** flipper.ai (if available) or getflipper.ai

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Marketplace TOS violations | Comply with APIs, rate limiting, no scraping where prohibited |
| Low flippability accuracy | Continuous model training, user feedback loop |
| Seller communication failures | Human-in-the-loop approval, fallback to manual |
| Competition | Focus on UX and multi-marketplace advantage |

---

## 📝 Next Steps

1. ✅ Set up GitHub repo (AXOVIA-ASPEN/flipper-ai)
2. ✅ Create Trello board
3. [ ] Review and approve this PRD
4. [ ] Set up development environment
5. [ ] Begin Week 1 sprint

---

*Document created by ASPEN | February 3, 2026*
