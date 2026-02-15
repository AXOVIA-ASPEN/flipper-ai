# 🐧 Flipper AI — User Guide

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Version:** 1.0.0  
**Last Updated:** February 15, 2026

---

## What is Flipper AI?

Flipper AI is an intelligent multi-marketplace flipping tool that helps you find underpriced items, analyze their resale value using AI, and manage the entire flip lifecycle — from discovery to profit.

---

## Getting Started

### 1. Create an Account
Sign up with email/password at the login page. Optionally connect your Facebook account for Marketplace scanning.

### 2. Configure Settings
Navigate to **Settings** to:
- Choose your AI model (GPT-4o Mini default)
- Set your discount threshold (minimum % below market value to flag)
- Enable auto-analysis for new listings
- Add your OpenAI API key (optional, for enhanced analysis)

### 3. Set Up Search Configs
Create saved searches that automatically scan marketplaces:
- **Query:** What to search for (e.g., "Nintendo Switch OLED")
- **Platforms:** Which marketplaces to scan
- **Price range:** Min/max budget
- **Location:** Your area for local deals

---

## Core Workflows

### 🔍 Finding Deals

1. **Dashboard** — Overview of recent opportunities, active flips, and profit stats
2. **Scan Marketplaces** — Run manual searches or let saved configs auto-scan
3. **Review Listings** — Browse scraped items sorted by value score

### 🤖 AI Analysis

When you find an interesting listing:
1. Click **Analyze** to run AI analysis
2. AI identifies: brand, model, condition, market value
3. Get a BUY/PASS/WATCH recommendation with confidence score
4. See comparable sold items from eBay for verification

### 💬 Contacting Sellers

1. AI generates a negotiation message based on the listing
2. Review/edit the message
3. Send directly through the platform or copy to clipboard
4. Track message status (sent, replied, no response)

### 📈 Managing Opportunities

Track every flip through its lifecycle:

| Status | Description |
|--------|-------------|
| **NEW** | Just discovered, needs review |
| **WATCHING** | Monitoring price/availability |
| **PURCHASED** | Bought the item |
| **LISTED** | Listed for resale |
| **SOLD** | Successfully flipped! |
| **PASSED** | Decided to skip |

### 💰 Tracking Profits

- **Purchase Price:** What you paid
- **Resale Price:** What you sold for
- **Actual Profit:** Auto-calculated (resale - purchase - fees)
- **Dashboard Stats:** Total profit, ROI, success rate

---

## Supported Marketplaces

| Marketplace | Scanning | Analysis | Status |
|-------------|----------|----------|--------|
| eBay | ✅ | ✅ (sold comps) | Full support |
| Craigslist | ✅ | ✅ | Full support |
| Facebook Marketplace | ✅ | ✅ | OAuth required |
| OfferUp | ✅ | ✅ | Full support |
| Mercari | ✅ | ✅ | Full support |

---

## Tips for Success

1. **Set realistic thresholds** — 40-60% below market is the sweet spot
2. **Use saved searches** — Automate scanning so you don't miss deals
3. **Trust the AI, verify the price** — Always check sold comps before buying
4. **Respond fast** — Good deals go quickly; use AI-generated messages for speed
5. **Track everything** — Log purchases and sales to understand your ROI

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `n` | New search |
| `a` | Analyze selected listing |
| `Esc` | Close modal/dialog |

---

## FAQ

**Q: Do I need an OpenAI API key?**  
A: Optional. The built-in AI works without one. Adding your key enables enhanced analysis features.

**Q: How often do saved searches run?**  
A: Configurable per search. Default is every 4 hours.

**Q: Is Facebook Marketplace scanning free?**  
A: Yes, but requires connecting your Facebook account for authentication.

**Q: What are the subscription tiers?**  
A: Free (5 analyses/day), Flipper ($15/mo, 50/day), Pro ($40/mo, unlimited).
