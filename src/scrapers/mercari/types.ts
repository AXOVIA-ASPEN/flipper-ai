// Mercari scraper types and constants

// Mercari API configuration
export const MERCARI_API_BASE_URL = 'https://www.mercari.com/v1/api';
export const MERCARI_SEARCH_URL = 'https://www.mercari.com/search/';
export const API_VERSION = '2.0';

// Default pagination
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

// Supported categories on Mercari
export const SUPPORTED_CATEGORIES = [
  { id: '1', label: 'Women' },
  { id: '2', label: 'Men' },
  { id: '3', label: 'Electronics' },
  { id: '4', label: 'Home' },
  { id: '5', label: 'Beauty' },
  { id: '6', label: 'Sports & Outdoors' },
  { id: '7', label: 'Toys & Collectibles' },
  { id: '8', label: 'Handmade' },
  { id: '9', label: 'Pet Supplies' },
  { id: '10', label: 'Office' },
] as const;

// Supported conditions
export const SUPPORTED_CONDITIONS = [
  { id: '1', label: 'New with tags' },
  { id: '2', label: 'New without tags' },
  { id: '3', label: 'Very good' },
  { id: '4', label: 'Good' },
  { id: '5', label: 'Fair' },
  { id: '6', label: 'Poor' },
] as const;

// Mercari condition ID to display name mapping
export const CONDITION_MAP: Record<string, string> = {
  '1': 'New with tags',
  '2': 'New without tags',
  '3': 'Very good',
  '4': 'Good',
  '5': 'Fair',
  '6': 'Poor',
};

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
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 1000,
  NAVIGATION_TIMEOUT_MS: 30_000,
  SESSION_TIMEOUT_MS: 60_000,
  MIN_DELAY_MS: 500,
  MAX_DELAY_MS: 1500,
  VIEWPORT_MIN_WIDTH: 1280,
  VIEWPORT_MAX_WIDTH: 1920,
  VIEWPORT_MIN_HEIGHT: 800,
  VIEWPORT_MAX_HEIGHT: 1080,
} as const;

// Accept-Language header variants for randomization
export const ACCEPT_LANGUAGE_VARIANTS = [
  'en-US,en;q=0.9',
  'en-US,en;q=0.9,es;q=0.8',
  'en-US,en;q=0.9,fr;q=0.8',
  'en-GB,en;q=0.9,en-US;q=0.8',
  'en-US,en;q=0.8',
];

// Mercari search response types
export interface MercariItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  status: string; // "on_sale", "sold_out", etc.
  thumbnails?: string[];
  photos?: string[];
  itemCondition?: { id: string; name: string };
  seller?: {
    id: string;
    name: string;
    ratings?: { good?: number; normal?: number; bad?: number };
  };
  shippingPayer?: { id: string; name: string };
  shippingMethod?: { id: string; name: string };
  shippingFromArea?: { id: string; name: string };
  updated?: number; // Unix timestamp
  created?: number; // Unix timestamp
  rootCategory?: { id: string; name: string };
  itemBrand?: { id: string; name: string };
}

export interface MercariSearchResponse {
  result: string;
  meta?: {
    numFound: number;
    offset: number;
    limit: number;
  };
  data?: MercariItem[];
  items?: MercariItem[]; // Alternative response structure
  error?: string;
}

export interface ScrapeRequestBody {
  keywords?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  sortBy?: 'created_time' | 'price_asc' | 'price_desc' | 'num_likes';
}

export interface MercariScraperConfig {
  keywords: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  sortBy?: 'created_time' | 'price_asc' | 'price_desc' | 'num_likes';
}
