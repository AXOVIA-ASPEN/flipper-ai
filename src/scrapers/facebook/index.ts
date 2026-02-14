// Facebook Marketplace Scraper Module
// Exports the scraper and related types

export {
  scrapeFacebookMarketplace,
  scrapeAndConvert,
  convertToRawListing,
} from "./scraper";

export type {
  FacebookScraperConfig,
  FacebookListingDetail,
  FacebookListingPreview,
  FacebookScrapeResult,
} from "./types";

export {
  FACEBOOK_CATEGORIES,
  FacebookListingPreviewSchema,
  FacebookListingDetailSchema,
} from "./types";
