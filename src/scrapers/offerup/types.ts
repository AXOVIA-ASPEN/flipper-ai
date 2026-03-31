// OfferUp scraper types and constants

// Raw item extracted from OfferUp search results page
export interface OfferUpItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  description?: string;
  imageUrls?: string[];
  postedAt?: Date;
  condition?: string;
  sellerName?: string;
}

// Search parameters for OfferUp scraper
export interface OfferUpSearchParams {
  location: string;
  category?: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Result from a scrape operation
export interface OfferUpScrapeResult {
  success: boolean;
  listings: OfferUpItem[];
  totalFound: number;
  scrapedAt: Date;
  error?: string;
  failureReason?:
    | 'selector_failure_suspected'
    | 'navigation_error'
    | 'timeout'
    | 'blocked'
    | 'unknown';
}

// Category mapping to OfferUp category slugs
export const CATEGORY_MAPPING: Record<string, string> = {
  electronics: 'electronics',
  furniture: 'home-garden',
  appliances: 'appliances',
  sporting: 'sporting-goods',
  tools: 'tools-machinery',
  jewelry: 'jewelry-accessories',
  antiques: 'antiques-collectibles',
  video_gaming: 'video-games',
  music_instr: 'musical-instruments',
  computers: 'computers-accessories',
  cell_phones: 'cell-phones',
  vehicles: 'cars-trucks',
  clothing: 'clothing-shoes',
  toys: 'toys-games',
};

// Supported locations (major metros)
export const SUPPORTED_LOCATIONS = [
  'tampa-fl',
  'orlando-fl',
  'miami-fl',
  'jacksonville-fl',
  'sarasota-fl',
  'los-angeles-ca',
  'san-francisco-ca',
  'new-york-ny',
  'chicago-il',
  'seattle-wa',
  'austin-tx',
  'denver-co',
  'phoenix-az',
  'atlanta-ga',
  'dallas-tx',
] as const;

// Pool of current user agent strings (Chrome 130+)
export const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.116 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
];

// Scraper configuration constants
export const SCRAPER_CONFIG = {
  MAX_LISTINGS: 50,
  NAVIGATION_TIMEOUT_MS: 30_000,
  SELECTOR_WAIT_TIMEOUT_MS: 15_000,
  SESSION_TIMEOUT_MS: 60_000,
  MIN_DELAY_MS: 500,
  MAX_DELAY_MS: 2000,
  RATE_LIMIT_MIN_DELAY_MS: 1000,
  RATE_LIMIT_MAX_DELAY_MS: 2000,
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 2000,
  VIEWPORT_MIN_WIDTH: 1280,
  VIEWPORT_MAX_WIDTH: 1920,
  VIEWPORT_MIN_HEIGHT: 800,
  VIEWPORT_MAX_HEIGHT: 1080,
} as const;
