// Craigslist scraper types and constants

// Raw item extracted from Craigslist search results page
export interface CraigslistItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  description?: string;
  condition?: string;
  imageUrls?: string[];
  postedAt?: Date;
}

// Search parameters for Craigslist scraper
export interface CraigslistSearchParams {
  location: string;
  category: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Result from a scrape operation
export interface CraigslistScrapeResult {
  success: boolean;
  listings: CraigslistItem[];
  totalFound: number;
  scrapedAt: Date;
  error?: string;
  failureReason?: 'selector_failure_suspected' | 'navigation_error' | 'timeout' | 'unknown';
}

// Category mapping to Craigslist search paths
export const CATEGORY_PATHS: Record<string, string> = {
  electronics: 'ela',
  furniture: 'fua',
  appliances: 'ppa',
  sporting: 'sga',
  tools: 'tla',
  jewelry: 'jwa',
  antiques: 'ata',
  video_gaming: 'vga',
  music_instr: 'msa',
  computers: 'sya',
  cell_phones: 'moa',
};

// Supported Craigslist locations
export const SUPPORTED_LOCATIONS = [
  'sarasota',
  'tampa',
  'orlando',
  'miami',
  'jacksonville',
  'sfbay',
  'losangeles',
  'newyork',
  'chicago',
  'seattle',
  'austin',
  'denver',
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
  SELECTOR_WAIT_TIMEOUT_MS: 10_000,
  SESSION_TIMEOUT_MS: 60_000,
  MIN_DELAY_MS: 500,
  MAX_DELAY_MS: 2000,
  RATE_LIMIT_MIN_DELAY_MS: 1000,
  RATE_LIMIT_MAX_DELAY_MS: 2000,
  MAX_RETRIES: 1,
  BACKOFF_BASE_MS: 2000,
  BACKOFF_MAX_MS: 16_000,
  VIEWPORT_MIN_WIDTH: 1280,
  VIEWPORT_MAX_WIDTH: 1920,
  VIEWPORT_MIN_HEIGHT: 800,
  VIEWPORT_MAX_HEIGHT: 1080,
} as const;
