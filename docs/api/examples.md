# API Usage Examples

Practical examples for common Flipper AI API workflows.

---

## Complete Flip Journey

### 1. Create a Scraper Job

**POST /api/scraper-jobs**

```bash
curl -X POST http://localhost:3000/api/scraper-jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "marketplace": "facebook",
    "searchTerm": "vintage camera",
    "location": "Tampa, FL",
    "maxPrice": 200,
    "minPrice": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_abc123",
  "status": "QUEUED",
  "message": "Scraper job created successfully"
}
```

---

### 2. Check Job Status

**GET /api/scraper-jobs/:id**

```bash
curl http://localhost:3000/api/scraper-jobs/job_abc123 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_abc123",
    "status": "COMPLETED",
    "marketplace": "facebook",
    "resultsCount": 15,
    "completedAt": "2026-03-01T19:00:00Z"
  }
}
```

---

### 3. Get Opportunities

**GET /api/opportunities?limit=10**

```bash
curl http://localhost:3000/api/opportunities?limit=10 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "opportunities": [
    {
      "id": "opp_123",
      "listingId": "lst_456",
      "estimatedProfit": 75.50,
      "profitMargin": 45.2,
      "aiScore": 8.5,
      "status": "NEW",
      "listing": {
        "title": "Vintage Canon AE-1 Camera",
        "price": 120.00,
        "marketplace": "facebook",
        "location": "Tampa, FL"
      }
    }
  ]
}
```

---

### 4. Analyze Listing with AI

**POST /api/analyze/:listingId**

```bash
curl -X POST http://localhost:3000/api/analyze/lst_456 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "force": false
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "marketValue": {
      "low": 180,
      "average": 225,
      "high": 280
    },
    "condition": {
      "score": 8.5,
      "issues": ["Minor scratches on body"],
      "rating": "Very Good"
    },
    "profitEstimate": {
      "estimatedProfit": 75.50,
      "margin": 45.2,
      "roi": 62.9
    },
    "recommendations": [
      "List on eBay for $240-260",
      "Highlight mint lens condition",
      "Include battery test video"
    ]
  }
}
```

---

### 5. Send Message to Seller

**POST /api/messages**

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "listingId": "lst_456",
    "message": "Hi! Is this still available? Can you do $110?",
    "suggestNegotiation": true
  }'
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_789",
  "sent": true,
  "aiSuggestions": [
    "Offer to pick up today for convenience",
    "Ask about battery and film functionality",
    "Mention you're a serious buyer with cash ready"
  ]
}
```

---

### 6. Create Cross-Platform Listing

**POST /api/listings**

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "opportunityId": "opp_123",
    "title": "Vintage Canon AE-1 Camera - Excellent Condition",
    "description": "Professional 35mm SLR camera...",
    "price": 249.99,
    "condition": "USED_VERY_GOOD",
    "platforms": ["ebay", "facebook", "mercari"],
    "images": ["img1.jpg", "img2.jpg"],
    "autoOptimize": true
  }'
```

**Response:**
```json
{
  "success": true,
  "listingId": "lst_new_789",
  "platformListings": {
    "ebay": {
      "id": "ebay_123",
      "url": "https://ebay.com/itm/123",
      "optimizedTitle": "Canon AE-1 35mm SLR Film Camera Excellent Tested Working",
      "status": "PUBLISHED"
    },
    "facebook": {
      "id": "fb_456",
      "url": "https://facebook.com/marketplace/item/456",
      "status": "PENDING_APPROVAL"
    },
    "mercari": {
      "id": "merc_789",
      "url": "https://mercari.com/us/item/789",
      "status": "PUBLISHED"
    }
  }
}
```

---

## Dashboard & Analytics

### Get Profit/Loss Report

**GET /api/analytics/profit-loss?granularity=month**

```bash
curl "http://localhost:3000/api/analytics/profit-loss?granularity=month" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "period": "2026-03",
      "revenue": 1250.00,
      "cost": 850.00,
      "profit": 400.00,
      "roi": 47.06,
      "itemsSold": 8
    },
    {
      "period": "2026-02",
      "revenue": 980.00,
      "cost": 650.00,
      "profit": 330.00,
      "roi": 50.77,
      "itemsSold": 6
    }
  ],
  "summary": {
    "totalRevenue": 2230.00,
    "totalCost": 1500.00,
    "totalProfit": 730.00,
    "averageROI": 48.67
  }
}
```

---

### Get Inventory Summary

**GET /api/inventory**

```bash
curl http://localhost:3000/api/inventory \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "inv_123",
      "listingId": "lst_456",
      "purchasePrice": 120.00,
      "purchaseDate": "2026-02-28",
      "status": "LISTED",
      "listedPrice": 249.99,
      "daysInInventory": 3,
      "platforms": ["ebay", "facebook"]
    }
  ],
  "stats": {
    "totalItems": 12,
    "totalInvested": 1450.00,
    "listedItems": 8,
    "soldItems": 4,
    "avgDaysToSell": 5.2
  }
}
```

---

## Marketplace Scraping

### Scrape Facebook Marketplace

**POST /api/scrape/facebook**

```bash
curl -X POST http://localhost:3000/api/scrape/facebook \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "query": "nintendo switch",
    "location": {
      "city": "Tampa",
      "state": "FL",
      "radius": 25
    },
    "filters": {
      "minPrice": 100,
      "maxPrice": 300,
      "condition": ["new", "used-like-new"]
    },
    "maxResults": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "results": 42,
  "listings": [
    {
      "title": "Nintendo Switch OLED - Like New",
      "price": 280.00,
      "url": "https://facebook.com/marketplace/item/...",
      "images": ["https://...", "https://..."],
      "seller": {
        "name": "John D.",
        "location": "Tampa, FL",
        "rating": 4.8
      }
    }
  ]
}
```

---

### Scrape eBay

**POST /api/scrape/ebay**

```bash
curl -X POST http://localhost:3000/api/scrape/ebay \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "query": "macbook pro 2020",
    "filters": {
      "condition": "Used",
      "buyItNow": true,
      "soldListings": false
    },
    "sortBy": "price_asc"
  }'
```

---

## TypeScript SDK Examples

### Using the Official SDK

```typescript
import { FlipperClient } from '@flipper-ai/sdk';

const client = new FlipperClient({
  apiKey: process.env.FLIPPER_API_KEY,
  baseUrl: 'https://flipper-ai.vercel.app',
});

// Create scraper job
const job = await client.scraper.create({
  marketplace: 'facebook',
  searchTerm: 'vintage camera',
  location: 'Tampa, FL',
});

// Get opportunities
const opportunities = await client.opportunities.list({
  limit: 10,
  minScore: 7.0,
});

// Analyze listing
const analysis = await client.analyze.run({
  listingId: 'lst_456',
});

// Create cross-platform listing
const listing = await client.listings.create({
  title: 'Vintage Canon AE-1',
  price: 249.99,
  platforms: ['ebay', 'facebook', 'mercari'],
  autoOptimize: true,
});
```

---

## Rate Limiting

All API endpoints have rate limits:

| Tier      | Requests/minute | Requests/hour |
|-----------|-----------------|---------------|
| Free      | 10              | 100           |
| Pro       | 60              | 1000          |
| Business  | 300             | 10000         |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1709319600
```

**429 Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

---

## Error Handling

### Best Practices

```typescript
async function makeApiCall() {
  try {
    const response = await fetch('/api/opportunities', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include session cookie
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/login';
          break;
        case 429:
          // Rate limited - retry after delay
          await new Promise(r => setTimeout(r, error.retryAfter * 1000));
          return makeApiCall();
        case 500:
          // Server error - log and alert user
          console.error('Server error:', error);
          alert('Something went wrong. Please try again.');
          break;
        default:
          throw new Error(error.message);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

---

## Webhooks

### Configure Webhook

**POST /api/webhooks**

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["listing.sold", "opportunity.created", "message.received"],
    "secret": "whsec_your_webhook_secret"
  }'
```

### Webhook Payload Example

```json
{
  "event": "listing.sold",
  "timestamp": "2026-03-01T19:30:00Z",
  "data": {
    "listingId": "lst_789",
    "salePrice": 249.99,
    "platform": "ebay",
    "profit": 75.50,
    "roi": 43.2
  }
}
```

---

## Related Documentation

- [API Reference](./README.md)
- [Authentication Guide](./authentication.md)
- [Rate Limits & Quotas](../guides/rate-limits.md)
- [TypeScript SDK](https://github.com/AXOVIA-ASPEN/flipper-sdk)
