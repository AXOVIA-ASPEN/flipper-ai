/**
 * Image Service for Flipper AI
 * Handles downloading, caching, and proxying of listing images
 */

import { createHash } from "crypto";
import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";

// Configuration
const IMAGE_CACHE_DIR = join(process.cwd(), "public", "images", "listings");
const MAX_IMAGE_SIZE_MB = 5;
const DOWNLOAD_TIMEOUT_MS = 10000;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface CachedImage {
  localPath: string;      // Path relative to public directory
  originalUrl: string;    // Original source URL
  hash: string;           // Content hash for deduplication
  size: number;           // File size in bytes
  mimeType: string;       // MIME type
  width?: number;         // Optional: detected width
  height?: number;        // Optional: detected height
}

export interface ImageDownloadResult {
  success: boolean;
  cachedImage?: CachedImage;
  error?: string;
}

/**
 * Generate a unique hash for an image URL
 */
export function generateImageHash(url: string): string {
  return createHash("sha256").update(url).digest("hex").substring(0, 16);
}

/**
 * Get the file extension from a MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] || "jpg";
}

/**
 * Extract file extension from URL
 */
export function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(\w+)$/);
    if (match) {
      const ext = match[1].toLowerCase();
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
        return ext === "jpeg" ? "jpg" : ext;
      }
    }
  } catch {
    // Invalid URL
  }
  return "jpg"; // Default
}

/**
 * Ensure the image cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await access(IMAGE_CACHE_DIR);
  } catch {
    await mkdir(IMAGE_CACHE_DIR, { recursive: true });
  }
}

/**
 * Check if an image is already cached
 */
export async function isImageCached(urlHash: string): Promise<string | null> {
  const extensions = ["jpg", "png", "webp", "gif"];
  for (const ext of extensions) {
    const filePath = join(IMAGE_CACHE_DIR, `${urlHash}.${ext}`);
    try {
      await access(filePath);
      return `/images/listings/${urlHash}.${ext}`;
    } catch {
      // Not found with this extension
    }
  }
  return null;
}

/**
 * Download and cache a single image
 */
export async function downloadAndCacheImage(
  imageUrl: string
): Promise<ImageDownloadResult> {
  try {
    // Generate hash for deduplication
    const urlHash = generateImageHash(imageUrl);

    // Check if already cached
    const existingPath = await isImageCached(urlHash);
    if (existingPath) {
      return {
        success: true,
        cachedImage: {
          localPath: existingPath,
          originalUrl: imageUrl,
          hash: urlHash,
          size: 0, // Would need to stat the file
          mimeType: "image/jpeg",
        },
      };
    }

    // Ensure cache directory exists
    await ensureCacheDir();

    // Download the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();

    // Validate image type
    if (!SUPPORTED_TYPES.includes(mimeType)) {
      return {
        success: false,
        error: `Unsupported image type: ${mimeType}`,
      };
    }

    // Get the image data
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check size
    if (bytes.length > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return {
        success: false,
        error: `Image too large: ${(bytes.length / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    // Determine extension
    const extension = getExtensionFromMimeType(mimeType) || getExtensionFromUrl(imageUrl);
    const fileName = `${urlHash}.${extension}`;
    const filePath = join(IMAGE_CACHE_DIR, fileName);
    const publicPath = `/images/listings/${fileName}`;

    // Write to disk
    await writeFile(filePath, bytes);

    return {
      success: true,
      cachedImage: {
        localPath: publicPath,
        originalUrl: imageUrl,
        hash: urlHash,
        size: bytes.length,
        mimeType,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("abort")) {
      return { success: false, error: "Download timeout" };
    }
    return { success: false, error: message };
  }
}

/**
 * Download and cache multiple images
 * Returns an array of local paths (successful) or original URLs (failed)
 */
export async function downloadAndCacheImages(
  imageUrls: string[],
  options?: {
    maxConcurrent?: number;
    skipOnFailure?: boolean;
  }
): Promise<{
  cachedUrls: string[];
  results: ImageDownloadResult[];
  successCount: number;
  failCount: number;
}> {
  const { maxConcurrent = 3, skipOnFailure = true } = options || {};
  const results: ImageDownloadResult[] = [];
  const cachedUrls: string[] = [];

  // Process in batches for rate limiting
  for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
    const batch = imageUrls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((url) => downloadAndCacheImage(url))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const originalUrl = batch[j];
      results.push(result);

      if (result.success && result.cachedImage) {
        cachedUrls.push(result.cachedImage.localPath);
      } else if (skipOnFailure) {
        // Use original URL as fallback
        cachedUrls.push(originalUrl);
      }
    }
  }

  return {
    cachedUrls,
    results,
    successCount: results.filter((r) => r.success).length,
    failCount: results.filter((r) => !r.success).length,
  };
}

/**
 * Normalize location data to a consistent format
 */
export interface NormalizedLocation {
  city: string;
  state: string;
  stateCode: string;
  normalized: string;  // "city-statecode" format
  original: string;
}

const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const STATE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([name, code]) => [code, name])
);

/**
 * Normalize a location string to a consistent format
 */
export function normalizeLocation(locationStr: string): NormalizedLocation {
  const original = locationStr;
  const cleaned = locationStr.trim().toLowerCase();

  // Pattern 1: "City, State" or "City, ST" (allow multi-word states)
  const commaPattern = /^([^,]+),\s*(.+)$/;
  const commaMatch = cleaned.match(commaPattern);

  if (commaMatch) {
    const city = commaMatch[1].trim();
    const stateInput = commaMatch[2].trim();

    // Check if it's already a state code (2 letters)
    let stateCode: string;
    if (stateInput.length === 2) {
      stateCode = stateInput.toUpperCase();
    } else {
      // Look up the full state name in STATE_CODES
      stateCode = STATE_CODES[stateInput] || "XX";
    }
    
    const stateName = STATE_CODE_TO_NAME[stateCode] || stateInput;
    const normalizedCity = city.replace(/\s+/g, "-");

    return {
      city: city.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      state: stateName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      stateCode,
      normalized: `${normalizedCity}-${stateCode.toLowerCase()}`,
      original,
    };
  }

  // Pattern 2: "city-state" format (already normalized)
  const dashPattern = /^([\w-]+)-([a-z]{2})$/;
  const dashMatch = cleaned.match(dashPattern);

  if (dashMatch) {
    const city = dashMatch[1].replace(/-/g, " ");
    const stateCode = dashMatch[2].toUpperCase();
    const stateName = STATE_CODE_TO_NAME[stateCode] || stateCode;

    return {
      city: city.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      state: stateName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      stateCode,
      normalized: cleaned,
      original,
    };
  }

  // Pattern 3: Just city name - try to detect state from context
  // Default to keeping as-is with unknown state
  const normalizedCity = cleaned.replace(/\s+/g, "-");

  return {
    city: locationStr.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    state: "Unknown",
    stateCode: "XX",
    normalized: normalizedCity,
    original,
  };
}

/**
 * Build a proxy URL for an external image
 * This allows serving external images through our domain for reliability
 */
export function buildProxyUrl(imageUrl: string, baseUrl: string = ""): string {
  const encoded = encodeURIComponent(imageUrl);
  return `${baseUrl}/api/images/proxy?url=${encoded}`;
}

/**
 * Get the best available URL for an image
 * Prefers cached version, falls back to proxy, then original
 */
export async function getBestImageUrl(
  imageUrl: string,
  options?: {
    useProxy?: boolean;
    baseUrl?: string;
  }
): Promise<string> {
  const urlHash = generateImageHash(imageUrl);
  const cached = await isImageCached(urlHash);

  if (cached) {
    return cached;
  }

  if (options?.useProxy) {
    return buildProxyUrl(imageUrl, options.baseUrl);
  }

  return imageUrl;
}
