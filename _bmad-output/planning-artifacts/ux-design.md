# Flipper AI — UX Design Specification

**Author:** Stephen Boyett / Consolidated from existing docs
**Company:** Axovia AI
**Date:** February 27, 2026
**Version:** 1.0
**Sources:** `docs/prd/user-flows.md`, `docs/component-inventory.md`

---

## Design System

### Technology
- **Framework:** React 19 + Next.js 16 App Router
- **Styling:** Tailwind CSS 4 with dynamic CSS variables
- **Icons:** lucide-react
- **Drag & Drop:** @hello-pangea/dnd (Kanban board)
- **Component Library:** Custom-built (no external UI library)
- **Theme System:** ThemeContext providing dark/light + multiple color schemes
- **Responsive:** Mobile-first responsive patterns

### Design Tokens
- **Primary Color:** Arctic Blue (#0EA5E9)
- **Dark Accent:** Deep Ocean (#0C4A6E)
- **Neutral:** Ice White
- **Theme:** CSS variables injected at `:root` via ThemeStyles component
- **Typography:** System font stack via Tailwind defaults

### Branding
- **Mascot:** Flipper the Penguin
- **Tone:** Friendly, smart, trustworthy
- **Visual Style:** Clean, data-driven, card-based layouts

---

## Information Architecture

### Navigation Structure

```
Landing Page (/)
├── Login (/(auth)/login)
├── Register (/(auth)/register)
└── App Shell (authenticated)
    ├── Dashboard (/dashboard) — Main listing inventory
    ├── Opportunities (/opportunities) — Kanban board
    ├── Scraper (/scraper) — Multi-platform scan control
    ├── Messages (/messages) — Seller communication
    ├── Analytics (/analytics) — Profit/loss tracking
    ├── Settings (/settings) — Preferences
    ├── Docs (/docs) — Help & documentation
    └── Health (/health) — System status
```

### Provider Hierarchy
```
RootLayout
├── SessionProvider (NextAuth)
│   └── ThemeProvider (color themes)
│       └── ToastProvider (notifications)
│           ├── WebVitals (performance monitoring)
│           ├── Analytics (Vercel analytics)
│           └── {children}
```

---

## Component Inventory

### Navigation
| Component | Purpose |
|-----------|---------|
| Navigation | Main nav bar with Dashboard, Opportunities, Settings links. Active state via `usePathname()`. |

### Layout
| Component | Purpose |
|-----------|---------|
| WizardLayout | Shared layout for onboarding wizard with progress bar, back/next/skip buttons. |
| ErrorBoundary | Global error boundary with retry logic (max 3 retries) and fallback error UI. |

### Display
| Component | Purpose |
|-----------|---------|
| Toast | Individual toast notification. Types: success, error, info, alert, opportunity. Auto-dismisses. |
| KanbanBoard | Drag-and-drop board for opportunity tracking. 5 columns: IDENTIFIED, CONTACTED, PURCHASED, LISTED, SOLD. |
| WebVitals | Reports Core Web Vitals (LCP, FID, CLS, FCP, TTFB) to analytics endpoint. |

### Forms & Settings
| Component | Purpose |
|-----------|---------|
| NotificationSettings | Email notification preferences (new deals, price drops, frequency). |
| ThemeSettings | Theme selector with color previews. |
| ThemeStyles | Injects dynamic CSS variables for theme colors at `:root`. |

### Toast System
| Component | Purpose |
|-----------|---------|
| ToastProvider | Context-based toast notification system. Provides `useToast()` hook with `showToast()`. |

### Onboarding Wizard (6 steps)
| Step | Component | Purpose |
|------|-----------|---------|
| 1 | StepWelcome | Welcome message |
| 2 | StepMarketplaces | Select marketplaces (Craigslist, Facebook, eBay, OfferUp, Mercari) |
| 3 | StepCategories | Select product categories |
| 4 | StepBudget | Set budget range |
| 5 | StepLocation | Input location + search radius |
| 6 | StepComplete | Success confirmation |

### Custom Hooks
| Hook | Purpose |
|------|---------|
| useFilterParams | URL query param management for Dashboard/Opportunities filtering |
| useSseEvents | Real-time SSE event listener with auto-reconnect |
| useThemeClasses | Theme-aware Tailwind CSS utility classes |

---

## User Flows

### Flow 1: New User Onboarding

**Entry:** `/register`

```
Landing Page (/)
  > /register (fill name, email, password)
  > Verification email sent
  > /verify-email?token=...
  > /onboarding (6-step setup wizard — skippable)
  > /dashboard (first-time experience)
```

**UX Requirements:**
- Form validation shows errors inline
- Password requirements displayed visually
- Email verification required before access
- Onboarding wizard is skippable
- First-time dashboard shows empty state with guidance

### Flow 2: Returning User Login

**Entry:** `/login`

```
/login
  > (credentials) > /dashboard
  > (forgotten password) > /forgot-password > email > /reset-password
  > (OAuth Google/Facebook) > /api/auth/callback > /dashboard
```

### Flow 3: Core Flip Journey (Primary Value Flow)

```
Dashboard
  > Configure Search (keywords, location, radius, price range)
  > Run Marketplace Scan (/scraper)
  > View Results (/opportunities)
  > AI Analysis (inline or modal)
  > Mark as Opportunity
  > Contact Seller (/messages — AI-generated message)
  > Negotiate / Accept
  > Mark as Purchased (Kanban: IDENTIFIED > PURCHASED)
  > List for Resale (cross-post to eBay/FBMP/OfferUp)
  > Track Listing (/opportunities > LISTED)
  > Sale Confirmed > Mark Sold (SOLD)
  > Profit recorded > /reports
```

#### 3a. Marketplace Scan Sub-flow

```
/scraper
  ├── Select platforms (Craigslist, Facebook, eBay, OfferUp, Mercari)
  ├── Enter search keywords
  ├── Set location + radius
  ├── Set price range (min/max)
  ├── Set minimum profit threshold
  ├── Click "Scan Now"
  ├── Real-time progress (SSE events)
  └── Results appear in /opportunities
```

#### 3b. AI Analysis Sub-flow

```
Listing card (in /opportunities)
  > Click "Analyze"
  > LLM analysis request (Claude / GPT-4o)
  > Value score (0-100)
  > Estimated resale value ($)
  > Profit potential ($)
  > Recommendation: BUY / PASS / WATCH
  > Risk factors listed
  > Comparable sold listings (eBay links)
  > Suggested offer price
  > "Mark as Opportunity" CTA
```

#### 3c. Seller Communication Sub-flow

```
/messages
  ├── AI generates initial message (platform-appropriate tone)
  ├── Human reviews + edits
  ├── Approve & Send
  ├── Reply tracking (INBOUND messages)
  ├── AI suggests negotiation responses
  └── Thread history per listing
```

### Flow 4: Kanban Flip Tracking

**Entry:** `/opportunities` (Kanban view)

**Columns:** IDENTIFIED > CONTACTED > PURCHASED > LISTED > SOLD > PASSED

**Interactions:**
- Drag cards between columns
- Click card > view full details modal
- Update purchase price when moving to PURCHASED
- Add resale URL when moving to LISTED
- Record final sale price when moving to SOLD
- Auto-calculates actual profit (sale - purchase - fees)

### Flow 5: Reports & Analytics

**Entry:** `/analytics`

```
/analytics
  ├── Total profit (all time / this month / this week)
  ├── Total flips completed
  ├── Average profit per flip
  ├── Success rate (sold / attempted)
  ├── Best flip (most profit)
  ├── Profit by category (chart)
  ├── Monthly trend (bar chart)
  ├── Platform performance (which marketplace is best)
  └── Export: CSV / PDF
```

### Flow 6: Saved Searches

**Entry:** `/scraper` (saved searches section)

```
/saved-searches
  ├── Create new search config
  │     ├── Name (e.g. "Tampa Vintage Electronics")
  │     ├── Keywords (with AND/OR logic)
  │     ├── Location + radius
  │     ├── Price range
  │     ├── Platforms
  │     ├── Min value score
  │     └── Category filter
  ├── Enable/disable auto-scan schedule
  ├── Edit existing config
  └── Delete config
```

### Flow 7: Settings & Profile

**Entry:** `/settings`

```
/settings
  ├── Profile (name, email, avatar)
  ├── Notifications (email, digest frequency)
  ├── AI Preferences (model, discount threshold)
  ├── API Keys (marketplace credentials)
  ├── Billing & Subscription (/billing)
  └── Account (password change, delete account)
```

### Flow 8: System Health

**Entry:** `/health`

```
/health
  ├── Database connectivity status
  ├── LLM API status (Claude/OpenAI)
  ├── Email service status
  ├── Marketplace scrapers status
  ├── Response time metrics
  └── Auto-refresh every 30s
```

### Flow 9: Mobile Experience

Fully responsive mobile-first design:
- Login/registration optimized for mobile
- Card-based layout for browsing opportunities
- Quick actions: save listing, contact seller
- Kanban with horizontal scroll on small screens

---

## Interaction Patterns

### Feedback & Notifications
- **Toast system:** Success, error, info, alert, opportunity types
- **Auto-dismiss:** Toasts dismiss automatically after timeout
- **SSE real-time:** Live updates for new listings, scan progress, opportunity changes

### Loading States
- Skeleton screens for data-heavy pages
- Progress indicators for marketplace scans
- SSE event streaming for real-time progress

### Error Handling
- Global ErrorBoundary with retry logic (max 3)
- Inline form validation with error messages
- Toast notifications for API errors
- Fallback UI for component failures

### Accessibility
- WCAG AA target
- Mobile-first responsive design
- Keyboard navigable
- Semantic HTML

---

## Pages Summary

| Page | Route | Key Interactions |
|------|-------|-----------------|
| Landing | `/` | Hero, features, pricing, CTA |
| Login | `/(auth)/login` | Email/password, OAuth, forgot password |
| Register | `/(auth)/register` | Form with validation, terms acceptance |
| Dashboard | `/dashboard` | Stats cards, listing table, filters, pagination, bulk actions |
| Opportunities | `/opportunities` | Kanban board, drag-drop, detail modals |
| Scraper | `/scraper` | Platform selection, search config, scan execution, job history |
| Messages | `/messages` | AI-generated messages, thread view, approval workflow |
| Analytics | `/analytics` | Charts, profit tracking, export |
| Settings | `/settings` | Theme, notifications, API keys, billing |
| Onboarding | `/onboarding` | 6-step wizard with progress |
| Health | `/health` | System status dashboard |
| Docs | `/docs` | Help and documentation |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms of service |

---

## E2E Test Coverage

All user flows have corresponding Playwright E2E tests:

| Flow | Test Files | Status |
|------|-----------|--------|
| Onboarding | `new-user-onboarding.spec.ts`, `registration.spec.ts` | Covered |
| Login/Auth | `auth.spec.ts`, `session-management.spec.ts` | Covered |
| Dashboard | `dashboard.spec.ts` | Covered |
| Marketplace Scan | `scraper.spec.ts`, `scraper-jobs-crud.spec.ts` | Covered |
| AI Analysis | `ai-analysis.spec.ts` | Covered |
| Opportunities | `opportunities.spec.ts`, `opportunities-pagination.spec.ts` | Covered |
| Seller Communication | `seller-communication.spec.ts`, `messages.spec.ts` | Covered |
| Kanban Tracking | `kanban-board.spec.ts`, `kanban-drag-drop.spec.ts` | Covered |
| Cross-listing | `ebay-cross-listing.spec.ts`, `posting-queue.spec.ts` | Covered |
| Reports | `reports.spec.ts`, `inventory-roi.spec.ts` | Covered |
| Settings | `settings.spec.ts` | Covered |
| Saved Searches | `saved-searches.spec.ts`, `search-config-crud.spec.ts` | Covered |
| Mobile | `mobile-responsive.spec.ts` | Covered |
| Health | `health-dashboard.spec.ts` | Covered |

---

_Consolidated from existing project documentation | February 27, 2026_
