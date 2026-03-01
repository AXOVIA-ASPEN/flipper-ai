# Firebase Migration Tracker

**Started:** 2026-02-19 01:36 UTC  
**Status:** In Progress

## Migration Strategy

### Phase 1: Authentication & Core (DONE ✅)
- [x] `/api/auth/register` - Firebase Auth
- [x] Firebase client config
- [x] Firebase admin config

### Phase 2: Essential Routes (Priority 1)
- [ ] `/api/listings` - Core functionality
- [ ] `/api/listings/[id]` - Single listing
- [ ] `/api/opportunities` - Deal tracking
- [ ] `/api/opportunities/[id]` - Single opportunity
- [ ] `/api/scraper/ebay` - Main scraper
- [ ] `/api/scraper/craigslist` - Secondary scraper
- [ ] `/api/scraper/facebook` - Secondary scraper

### Phase 3: Supporting Routes (Priority 2)
- [ ] `/api/analyze/[listingId]` - AI analysis
- [ ] `/api/search-configs` - Search settings
- [ ] `/api/search-configs/[id]` - Single config
- [ ] `/api/messages` - Communications
- [ ] `/api/messages/[id]` - Single message
- [ ] `/api/diagnostics` - Health check

### Phase 4: Advanced Routes (Priority 3)
- [ ] `/api/scraper/offerup` - Additional platform
- [ ] `/api/scraper/mercari` - Additional platform
- [ ] `/api/posting-queue` - Cross-listing
- [ ] `/api/posting-queue/[id]` - Queue item
- [ ] `/api/listings/[id]/description` - Description gen

## Firestore Collections Structure

```
users/
  {uid}/
    - email, name, subscriptionTier, onboardingComplete, createdAt, updatedAt

userSettings/
  {uid}/
    - llmModel, discountThreshold, autoAnalyze, notifications..., createdAt, updatedAt

listings/
  {listingId}/
    - userId, platform, externalId, url, title, description
    - askingPrice, condition, location, sellerName, sellerContact
    - imageUrls[], category, postedAt, scrapedAt
    - estimatedValue, estimatedLow, estimatedHigh
    - profitPotential, profitLow, profitHigh
    - valueScore, confidence, isOpportunity
    - aiAnalysisComplete, analyzedAt

opportunities/
  {opportunityId}/
    - userId, listingId
    - reason, estimatedProfit, riskLevel
    - status (OPEN, CONTACTED, PURCHASED, LISTED, SOLD, PASSED)
    - createdAt, updatedAt

scraperJobs/
  {jobId}/
    - userId, platform, searchQuery, location, maxPrice
    - status (PENDING, RUNNING, COMPLETED, FAILED)
    - resultsCount, errorMessage
    - createdAt, completedAt

searchConfigs/
  {configId}/
    - userId, name, platform, keywords, location
    - maxPrice, minValueScore, autoAnalyze
    - scheduleEnabled, scheduleFrequency
    - createdAt, updatedAt

messages/
  {messageId}/
    - userId, listingId, recipientType, recipientId
    - subject, body, sentAt, readAt

postingQueue/
  {queueId}/
    - userId, listingId, targetPlatform
    - status, scheduledFor, postedAt
    - externalId, externalUrl
    - createdAt, updatedAt
```

## Progress

**Total Routes:** 21  
**Completed:** 1  
**Remaining:** 20  
**ETA:** 2-3 hours

---

## Next Steps

1. Create Firestore helper utilities
2. Migrate listings routes (most critical)
3. Migrate scraper routes (core functionality)
4. Migrate supporting routes
5. Update tests
6. Deploy and verify
