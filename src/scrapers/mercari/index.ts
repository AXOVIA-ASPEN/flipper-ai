// Mercari Scraper Module
// Exports the scraper and related types

export {
  callMercariApi,
  scrapeMercariSearch,
  scrapeMercariWithPlaywright,
  fetchMercariListings,
  fetchSoldListings,
  normalizeCondition,
  formatLocation,
  collectImageUrls,
  buildSellerNote,
  buildMercariHeaders,
  convertMercariToRawListing,
  getRandomUserAgent,
} from './scraper';

export type {
  MercariItem,
  MercariSearchResponse,
  MercariScraperConfig,
  ScrapeRequestBody,
} from './types';

export {
  SUPPORTED_CATEGORIES,
  SUPPORTED_CONDITIONS,
  CONDITION_MAP,
  USER_AGENTS,
  SCRAPER_CONFIG,
  MERCARI_API_BASE_URL,
  MERCARI_SEARCH_URL,
  API_VERSION,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from './types';
