# Flipper.ai

AI-powered marketplace scraper to find underpriced items for flipping profit. Automatically scrapes Craigslist, Facebook Marketplace, eBay, and OfferUp to identify flip opportunities.

## Features

- **Multi-Platform Scraping** - Scrapes Craigslist, Facebook Marketplace, eBay, and OfferUp
- **AI-Powered Analysis** - Uses Stagehand with Gemini AI for intelligent data extraction
- **Value Estimation** - Automatically estimates market value and profit potential
- **Opportunity Tracking** - Track items from discovery through sale
- **Dashboard UI** - Clean interface to browse and manage opportunities

## Quick Start

```bash
# Install dependencies and start preview
make preview
```

Or manually:

```bash
# Install dependencies
pnpm install

# Run database migrations
npx prisma migrate dev

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Available Commands

| Command | Description |
|---------|-------------|
| `make preview` | Install deps, run migrations, start dev server |
| `make dev` | Start development server |
| `make build` | Build for production |
| `make db-migrate` | Run database migrations |
| `make db-studio` | Open Prisma Studio (database GUI) |
| `make db-reset` | Reset database (deletes all data) |

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Scraping**: Stagehand with Google Gemini AI

## Project Structure

```
flipper-ai/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── listings/  # Listings CRUD
│   │   │   └── opportunities/ # Opportunities CRUD
│   │   ├── page.tsx       # Dashboard
│   │   └── layout.tsx     # Root layout
│   ├── lib/
│   │   ├── db.ts          # Prisma client
│   │   └── value-estimator.ts # Profit calculation
│   └── generated/
│       └── prisma/        # Generated Prisma client
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Migration history
├── docs/
│   └── PRISMA.md          # Prisma integration guide
└── Makefile               # Build commands
```

## Environment Variables

Create a `.env` file:

```env
# Database (SQLite)
DATABASE_URL="file:./dev.db"

# For scraping (optional - uses Stagehand with Gemini)
GOOGLE_API_KEY="your-google-api-key"

# eBay Browse API (required for /api/scraper/ebay)
EBAY_OAUTH_TOKEN="your-oauth-token"
# Optional overrides
EBAY_MARKETPLACE_ID="EBAY_US"
EBAY_BROWSE_API_BASE_URL="https://api.ebay.com/buy/browse/v1"
```

## API Endpoints

### Listings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/listings` | Get all listings |
| GET | `/api/listings?status=OPPORTUNITY` | Filter by status |
| GET | `/api/listings?minScore=70` | Filter by value score |
| POST | `/api/listings` | Create listing (from scraper) |
| GET | `/api/listings/[id]` | Get single listing |
| PATCH | `/api/listings/[id]` | Update listing |
| DELETE | `/api/listings/[id]` | Delete listing |

### Opportunities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/opportunities` | Get all opportunities |
| POST | `/api/opportunities` | Create opportunity from listing |

### Scrapers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scraper/craigslist` | Returns supported Craigslist locations/categories |
| POST | `/api/scraper/craigslist` | Launches the Playwright-based Craigslist scraper |
| GET | `/api/scraper/ebay` | Returns supported eBay categories, condition enums, and parameter hints |
| POST | `/api/scraper/ebay` | Pulls fixed-price listings via the eBay Browse API and stores opportunities |

## Database Schema

See [docs/PRISMA.md](docs/PRISMA.md) for full Prisma integration details.

**Key Models:**
- `Listing` - Scraped items with value analysis
- `Opportunity` - Flips being actively pursued
- `ScraperJob` - Scraper run history
- `SearchConfig` - Saved search configurations

## Value Scoring

Items are scored 0-100 based on:
- **Category multipliers** - Electronics, furniture, collectibles, etc.
- **Brand detection** - Apple, Sony, Dyson, vintage items
- **Condition analysis** - New, like new, good, fair, poor
- **Risk factors** - "broken", "parts only", "needs repair"

Scores 70+ are automatically flagged as opportunities.

## License

MIT
