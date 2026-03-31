// eBay Browse API scraper types and constants

// eBay item summary from Browse API v1 /item_summary/search
export interface EbayItemSummary {
  itemId: string;
  title: string;
  shortDescription?: string;
  description?: string;
  itemWebUrl: string;
  price?: { value?: string; currency?: string };
  buyingOptions?: string[];
  condition?: string;
  image?: { imageUrl: string };
  additionalImages?: Array<{ imageUrl: string }>;
  seller?: {
    username?: string;
    feedbackScore?: number;
    feedbackPercentage?: string;
  };
  itemLocation?: {
    city?: string;
    stateOrProvince?: string;
    country?: string;
    postalCode?: string;
  };
  categories?: Array<{ categoryId?: string; categoryName?: string }>;
  itemCreationDate?: string;
  itemEndDate?: string;
}

// eBay Browse API search response
export interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
}

// Configuration for eBay scraper
export interface EbayScraperConfig {
  keywords: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

// Supported eBay categories
export const SUPPORTED_CATEGORIES = [
  { id: '293', label: 'Electronics' },
  { id: '11450', label: 'Clothing, Shoes & Accessories' },
  { id: '12576', label: 'Collectibles' },
  { id: '6000', label: 'Musical Instruments & Gear' },
  { id: '888', label: 'Video Games & Consoles' },
  { id: '281', label: 'Antiques' },
] as const;

// Supported eBay item conditions
export const SUPPORTED_CONDITIONS = [
  { id: 'NEW', label: 'New' },
  { id: 'OPEN_BOX', label: 'Open Box' },
  { id: 'CERTIFIED_REFURBISHED', label: 'Certified Refurbished' },
  { id: 'EXCELLENT_REFURBISHED', label: 'Excellent - Refurbished' },
  { id: 'VERY_GOOD_REFURBISHED', label: 'Very Good - Refurbished' },
  { id: 'USED', label: 'Used' },
] as const;

// eBay API constants
export const EBAY_API_DEFAULTS = {
  BASE_URL: 'https://api.ebay.com/buy/browse/v1',
  MARKETPLACE_ID: 'EBAY_US',
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  FIELD_GROUPS: 'EXTENDED',
  SORT: '-price',
} as const;
