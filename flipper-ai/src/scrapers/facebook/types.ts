// Facebook Marketplace scraper types
import { z } from "zod";

// Zod schema for extracting listing preview data from search results
export const FacebookListingPreviewSchema = z.object({
  listings: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string(),
      price: z.string(),
      location: z.string().optional(),
      imageUrl: z.string().optional(),
      listingUrl: z.string().optional(),
    })
  ),
});

// Zod schema for extracting full listing details
export const FacebookListingDetailSchema = z.object({
  title: z.string(),
  price: z.string(),
  description: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  sellerName: z.string().optional(),
  postedDate: z.string().optional(),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
});

// TypeScript types derived from schemas
export type FacebookListingPreview = z.infer<typeof FacebookListingPreviewSchema>;
export type FacebookListingDetail = z.infer<typeof FacebookListingDetailSchema>;

// Scraper configuration options
export interface FacebookScraperConfig {
  location?: string;           // Location/city to search (e.g., "sarasota")
  category?: string;           // Category to filter (e.g., "electronics", "vehicles")
  keywords?: string[];         // Keywords to search for
  minPrice?: number;           // Minimum price filter
  maxPrice?: number;           // Maximum price filter
  maxListings?: number;        // Maximum number of listings to scrape (default: 20)
  includeDetails?: boolean;    // Whether to fetch full details for each listing (slower)
  sortBy?: "best_match" | "price_low" | "price_high" | "date_listed";
}

// Facebook Marketplace category mappings
export const FACEBOOK_CATEGORIES: Record<string, string> = {
  electronics: "electronics",
  vehicles: "vehicles",
  furniture: "furniture",
  clothing: "clothing",
  toys: "toys",
  sports: "sports",
  tools: "tools",
  appliances: "appliances",
  "video games": "videogames",
  musical: "music",
  collectibles: "antiques",
  "home goods": "home",
  garden: "garden",
  free: "free",
};

// Result from a scrape operation
export interface FacebookScrapeResult {
  success: boolean;
  listings: FacebookListingDetail[];
  totalFound: number;
  scrapedAt: Date;
  config: FacebookScraperConfig;
  error?: string;
}
