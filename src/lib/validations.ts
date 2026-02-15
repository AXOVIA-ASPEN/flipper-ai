/**
 * Zod validation schemas for API input validation.
 * Centralizes all request validation for type safety and consistent error handling.
 */

import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Shared / Reusable
// ---------------------------------------------------------------------------

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const PlatformEnum = z.enum([
  "CRAIGSLIST",
  "FACEBOOK_MARKETPLACE",
  "EBAY",
  "OFFERUP",
  "MERCARI",
]);

export const OpportunityStatusEnum = z.enum([
  "IDENTIFIED",
  "CONTACTED",
  "PURCHASED",
  "LISTED",
  "SOLD",
]);

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export const OpportunityQuerySchema = PaginationSchema.extend({
  status: OpportunityStatusEnum.optional(),
});

export const CreateOpportunitySchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
  notes: z.string().max(5000).optional(),
});

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const ListingQuerySchema = PaginationSchema.extend({
  platform: PlatformEnum.optional(),
  status: z.string().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const CreateListingSchema = z.object({
  externalId: z.string().min(1, "externalId is required"),
  platform: PlatformEnum,
  url: z.string().url("Valid URL is required"),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(10000).optional(),
  askingPrice: z.number().min(0, "askingPrice must be >= 0"),
  condition: z.string().max(100).optional(),
  location: z.string().max(500).optional(),
  sellerName: z.string().max(200).optional(),
  sellerContact: z.string().max(500).optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
  category: z.string().max(200).optional(),
  postedAt: z.string().datetime().optional(),
});

// ---------------------------------------------------------------------------
// Scraper Jobs
// ---------------------------------------------------------------------------

export const ScraperJobQuerySchema = z.object({
  status: z.string().optional(),
  platform: PlatformEnum.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const CreateScraperJobSchema = z.object({
  platform: PlatformEnum,
  location: z.string().max(500).optional(),
  category: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Search Configs
// ---------------------------------------------------------------------------

export const SearchConfigQuerySchema = z.object({
  enabled: z.enum(["true", "false"]).optional(),
});

export const CreateSearchConfigSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  platform: PlatformEnum,
  location: z.string().min(1, "Location is required").max(500),
  category: z.string().max(200).optional(),
  keywords: z.string().max(1000).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  enabled: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Validation Helper
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details: z.ZodError };

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, error: messages, details: result.error };
}

export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return validateBody(schema, obj);
}
