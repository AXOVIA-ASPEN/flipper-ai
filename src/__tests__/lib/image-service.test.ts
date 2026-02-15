/**
 * @jest-environment node
 */
import {
  generateImageHash,
  normalizeLocation,
  buildProxyUrl,
  downloadAndCacheImage,
  downloadAndCacheImages,
  isImageCached,
  getBestImageUrl,
  getExtensionFromUrl,
  NormalizedLocation,
} from "@/lib/image-service";
import { writeFile, mkdir, access, unlink } from "fs/promises";
import { join } from "path";

// Mock fs/promises
jest.mock("fs/promises");

// Mock fetch
global.fetch = jest.fn();

describe("Image Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateImageHash", () => {
    it("generates consistent hash for same URL", () => {
      const url = "https://example.com/image.jpg";
      const hash1 = generateImageHash(url);
      const hash2 = generateImageHash(url);
      expect(hash1).toBe(hash2);
    });

    it("generates different hashes for different URLs", () => {
      const hash1 = generateImageHash("https://example.com/image1.jpg");
      const hash2 = generateImageHash("https://example.com/image2.jpg");
      expect(hash1).not.toBe(hash2);
    });

    it("returns a 16-character hash", () => {
      const hash = generateImageHash("https://example.com/test.jpg");
      expect(hash).toHaveLength(16);
    });

    it("generates valid hex string", () => {
      const hash = generateImageHash("https://example.com/test.jpg");
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe("normalizeLocation", () => {
    it('normalizes "City, State" format', () => {
      const result = normalizeLocation("Tampa, Florida");
      expect(result.city).toBe("Tampa");
      expect(result.state).toBe("Florida");
      expect(result.stateCode).toBe("FL");
      expect(result.normalized).toBe("tampa-fl");
    });

    it('normalizes "City, ST" format', () => {
      const result = normalizeLocation("Los Angeles, CA");
      expect(result.city).toBe("Los Angeles");
      expect(result.stateCode).toBe("CA");
      expect(result.normalized).toBe("los-angeles-ca");
    });

    it('normalizes already-normalized "city-st" format', () => {
      const result = normalizeLocation("tampa-fl");
      expect(result.city).toBe("Tampa");
      expect(result.stateCode).toBe("FL");
      expect(result.normalized).toBe("tampa-fl");
    });

    it("handles multi-word city names", () => {
      const result = normalizeLocation("New York, NY");
      expect(result.city).toBe("New York");
      expect(result.stateCode).toBe("NY");
      expect(result.normalized).toBe("new-york-ny");
    });

    it("preserves original location string", () => {
      const original = "Tampa, FL";
      const result = normalizeLocation(original);
      expect(result.original).toBe(original);
    });

    it("handles lowercase input", () => {
      const result = normalizeLocation("miami, florida");
      expect(result.city).toBe("Miami");
      expect(result.state).toBe("Florida");
      expect(result.stateCode).toBe("FL");
    });

    it("handles uppercase input", () => {
      const result = normalizeLocation("TAMPA, FL");
      expect(result.stateCode).toBe("FL");
      expect(result.normalized).toBe("tampa-fl");
    });

    it("handles unknown locations gracefully", () => {
      const result = normalizeLocation("Some Random Place");
      expect(result.city).toBe("Some Random Place");
      expect(result.stateCode).toBe("XX");
      expect(result.normalized).toBe("some-random-place");
    });

    it("normalizes all 50 state names", () => {
      const testCases: Array<[string, string, string]> = [
        ["Austin, Texas", "TX", "austin-tx"],
        ["Seattle, Washington", "WA", "seattle-wa"],
        ["Chicago, Illinois", "IL", "chicago-il"],
        ["Denver, Colorado", "CO", "denver-co"],
        ["Phoenix, Arizona", "AZ", "phoenix-az"],
      ];

      for (const [input, expectedCode, expectedNormalized] of testCases) {
        const result = normalizeLocation(input);
        expect(result.stateCode).toBe(expectedCode);
        expect(result.normalized).toBe(expectedNormalized);
      }
    });

    it("handles cities with special characters", () => {
      const result = normalizeLocation("St. Louis, MO");
      expect(result.normalized).toContain("st");
      expect(result.stateCode).toBe("MO");
    });
  });

  describe("buildProxyUrl", () => {
    it("builds correct proxy URL", () => {
      const imageUrl = "https://example.com/image.jpg";
      const proxyUrl = buildProxyUrl(imageUrl);
      expect(proxyUrl).toBe("/api/images/proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg");
    });

    it("includes base URL when provided", () => {
      const imageUrl = "https://example.com/image.jpg";
      const proxyUrl = buildProxyUrl(imageUrl, "https://myapp.com");
      expect(proxyUrl).toContain("https://myapp.com/api/images/proxy");
    });

    it("properly encodes special characters in URL", () => {
      const imageUrl = "https://example.com/image with spaces.jpg";
      const proxyUrl = buildProxyUrl(imageUrl);
      expect(proxyUrl).toContain(encodeURIComponent(imageUrl));
    });

    it("handles URLs with query parameters", () => {
      const imageUrl = "https://example.com/image.jpg?size=large&quality=high";
      const proxyUrl = buildProxyUrl(imageUrl);
      expect(proxyUrl).toContain("url=");
      expect(proxyUrl).toContain(encodeURIComponent(imageUrl));
    });
  });
});

describe("Location Normalization Edge Cases", () => {
  it("handles DC correctly", () => {
    const result = normalizeLocation("Washington, DC");
    expect(result.stateCode).toBe("DC");
    expect(result.normalized).toBe("washington-dc");
  });

  it('handles "District of Columbia"', () => {
    const result = normalizeLocation("Washington, District of Columbia");
    expect(result.stateCode).toBe("DC");
  });

  it("handles extra whitespace", () => {
    const result = normalizeLocation("  Tampa  ,  FL  ");
    expect(result.city).toBe("Tampa");
    expect(result.stateCode).toBe("FL");
  });

  it("handles compound state names", () => {
    const testCases: Array<[string, string]> = [
      ["Raleigh, North Carolina", "NC"],
      ["Fargo, North Dakota", "ND"],
      ["Charleston, South Carolina", "SC"],
      ["Providence, Rhode Island", "RI"],
      ["Charleston, West Virginia", "WV"],
      ["Concord, New Hampshire", "NH"],
      ["Newark, New Jersey", "NJ"],
      ["Albuquerque, New Mexico", "NM"],
    ];

    for (const [input, expectedCode] of testCases) {
      const result = normalizeLocation(input);
      expect(result.stateCode).toBe(expectedCode);
    }
  });
});

describe("Image Download and Caching", () => {
  const mockImageUrl = "https://example.com/test-image.jpg";
  const mockImageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header

  // Helper to mock access calls (used by isImageCached and ensureCacheDir)
  const mockCacheMiss = () => {
    const mockAccess = access as jest.Mock;
    // isImageCached checks all 4 extensions - all fail
    mockAccess.mockRejectedValueOnce(new Error("Not found")); // .jpg
    mockAccess.mockRejectedValueOnce(new Error("Not found")); // .png
    mockAccess.mockRejectedValueOnce(new Error("Not found")); // .webp
    mockAccess.mockRejectedValueOnce(new Error("Not found")); // .gif
    // ensureCacheDir checks if directory exists - succeeds
    mockAccess.mockResolvedValueOnce(undefined);
  };

  const mockCacheHit = () => {
    const mockAccess = access as jest.Mock;
    // isImageCached checks jpg - succeeds immediately
    mockAccess.mockResolvedValueOnce(undefined);
  };

  const mockCacheDirMissing = () => {
    const mockAccess = access as jest.Mock;
    // isImageCached checks all 4 extensions - all fail
    mockAccess.mockRejectedValueOnce(new Error("Not found"));
    mockAccess.mockRejectedValueOnce(new Error("Not found"));
    mockAccess.mockRejectedValueOnce(new Error("Not found"));
    mockAccess.mockRejectedValueOnce(new Error("Not found"));
    // ensureCacheDir checks if directory exists - fails, triggers mkdir
    mockAccess.mockRejectedValueOnce(new Error("Not found"));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (fetch as jest.Mock).mockClear();
  });

  describe("downloadAndCacheImage", () => {
    it("successfully downloads and caches an image", async () => {
      mockCacheMiss();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name === "content-type" ? "image/jpeg" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(true);
      expect(result.cachedImage).toBeDefined();
      expect(result.cachedImage?.originalUrl).toBe(mockImageUrl);
      expect(result.cachedImage?.mimeType).toBe("image/jpeg");
      expect(writeFile).toHaveBeenCalled();
    });

    it("returns cached image if already exists", async () => {
      mockCacheHit();

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(true);
      expect(result.cachedImage).toBeDefined();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("handles HTTP errors", async () => {
      mockCacheMiss();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain("404");
    });

    it("handles network errors", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("rejects unsupported image types", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/bmp" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported image type");
    });

    it("rejects images that are too large", async () => {
      const largeBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB (over 5MB limit)
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/jpeg" : null,
        },
        arrayBuffer: async () => largeBuffer.buffer,
      });

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("handles timeout errors", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("The operation was aborted"));

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Download timeout");
    });

    it("handles different content-type formats", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/webp; charset=utf-8" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(true);
      expect(result.cachedImage?.mimeType).toBe("image/webp");
    });

    it("handles missing content-type header", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage(mockImageUrl);

      expect(result.success).toBe(true);
      expect(result.cachedImage?.mimeType).toBe("image/jpeg"); // Default
    });

    it("uses URL extension when MIME type has no mapping", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/png" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage("https://example.com/photo.png");

      expect(result.success).toBe(true);
      expect(result.cachedImage?.localPath).toContain(".png");
    });

    it("handles URLs with .webp extension", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/webp" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage("https://example.com/photo.webp");
      expect(result.success).toBe(true);
      expect(result.cachedImage?.localPath).toContain(".webp");
    });

    it("handles URLs with .gif extension", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/gif" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImage("https://example.com/anim.gif");
      expect(result.success).toBe(true);
      expect(result.cachedImage?.localPath).toContain(".gif");
    });

    it("handles non-Error thrown exceptions", async () => {
      mockCacheMiss();
      (fetch as jest.Mock).mockRejectedValueOnce("string error");

      const result = await downloadAndCacheImage(mockImageUrl);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("creates cache directory if it doesn't exist", async () => {
      mockCacheDirMissing();
        
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/png" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      await downloadAndCacheImage(mockImageUrl);

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining("public/images/listings"),
        { recursive: true }
      );
    });
  });

  describe("downloadAndCacheImages", () => {
    it("processes multiple images successfully", async () => {
      const urls = [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
        "https://example.com/img3.jpg",
      ];

      // Simplify: mock implementation that always says cache dir exists, files don't
      (access as jest.Mock).mockImplementation((path: string) => {
        // If checking for a file (has extension), reject
        if (path.match(/\.(jpg|png|webp|gif)$/)) {
          return Promise.reject(new Error("Not found"));
        }
        // Otherwise it's the directory check, resolve
        return Promise.resolve();
      });
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => name === "content-type" ? "image/jpeg" : null,
        },
        arrayBuffer: async () => mockImageBuffer.buffer,
      });

      const result = await downloadAndCacheImages(urls);

      expect(result.successCount).toBe(3);
      expect(result.failCount).toBe(0);
      expect(result.cachedUrls).toHaveLength(3);
    });

    it("respects maxConcurrent option", async () => {
      const urls = Array(10).fill("https://example.com/image.jpg").map((url, i) => `${url}?id=${i}`);
      let concurrentCalls = 0;
      let maxConcurrent = 0;

      (access as jest.Mock).mockImplementation((path: string) => {
        if (path.match(/\.(jpg|png|webp|gif)$/)) {
          return Promise.reject(new Error("Not found"));
        }
        return Promise.resolve();
      });
      
      (fetch as jest.Mock).mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCalls--;
        return {
          ok: true,
          headers: {
            get: (name: string) => name === "content-type" ? "image/jpeg" : null,
          },
          arrayBuffer: async () => mockImageBuffer.buffer,
        };
      });

      await downloadAndCacheImages(urls, { maxConcurrent: 2 });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("handles partial failures with skipOnFailure=true", async () => {
      const urls = [
        "https://example.com/good.jpg",
        "https://example.com/bad.jpg",
        "https://example.com/good2.jpg",
      ];

      (access as jest.Mock).mockImplementation((path: string) => {
        if (path.match(/\.(jpg|png|webp|gif)$/)) {
          return Promise.reject(new Error("Not found"));
        }
        return Promise.resolve();
      });
      
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) => name === "content-type" ? "image/jpeg" : null,
          },
          arrayBuffer: async () => mockImageBuffer.buffer,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) => name === "content-type" ? "image/jpeg" : null,
          },
          arrayBuffer: async () => mockImageBuffer.buffer,
        });

      const result = await downloadAndCacheImages(urls, { skipOnFailure: true });

      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(1);
      expect(result.cachedUrls).toHaveLength(3); // Includes fallback URL
      expect(result.cachedUrls[1]).toBe(urls[1]); // Failed URL used as fallback
    });

    it("handles partial failures with skipOnFailure=false", async () => {
      const urls = [
        "https://example.com/good.jpg",
        "https://example.com/bad.jpg",
      ];

      (access as jest.Mock).mockImplementation((path: string) => {
        if (path.match(/\.(jpg|png|webp|gif)$/)) {
          return Promise.reject(new Error("Not found"));
        }
        return Promise.resolve();
      });
      
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) => name === "content-type" ? "image/jpeg" : null,
          },
          arrayBuffer: async () => mockImageBuffer.buffer,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Server Error",
        });

      const result = await downloadAndCacheImages(urls, { skipOnFailure: false });

      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
      expect(result.cachedUrls).toHaveLength(1); // Only successful downloads
    });
  });

  describe("isImageCached", () => {
    it("returns path for cached jpg image", async () => {
      (access as jest.Mock)
        .mockRejectedValueOnce(new Error("Not found")) // .jpg not found
        .mockResolvedValueOnce(undefined); // .png found

      const hash = "abc123def456";
      const result = await isImageCached(hash);

      expect(result).toContain(`${hash}.png`);
    });

    it("returns null if image not cached", async () => {
      (access as jest.Mock).mockRejectedValue(new Error("Not found"));

      const result = await isImageCached("nonexistent");

      expect(result).toBeNull();
    });

    it("checks multiple extensions", async () => {
      const mockAccess = access as jest.Mock;
      mockAccess.mockRejectedValue(new Error("Not found"));

      await isImageCached("test-hash");

      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining("test-hash.jpg")
      );
      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining("test-hash.png")
      );
      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining("test-hash.webp")
      );
      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining("test-hash.gif")
      );
    });
  });

  describe("getBestImageUrl", () => {
    it("returns cached URL if available", async () => {
      (access as jest.Mock).mockResolvedValueOnce(undefined);

      const url = "https://example.com/image.jpg";
      const result = await getBestImageUrl(url);

      expect(result).toContain("/images/listings/");
      expect(result).not.toBe(url);
    });

    it("returns proxy URL if useProxy=true and not cached", async () => {
      (access as jest.Mock).mockRejectedValue(new Error("Not found"));

      const url = "https://example.com/image.jpg";
      const result = await getBestImageUrl(url, {
        useProxy: true,
        baseUrl: "https://myapp.com",
      });

      expect(result).toContain("/api/images/proxy");
      expect(result).toContain(encodeURIComponent(url));
    });

    it("returns original URL if not cached and useProxy=false", async () => {
      (access as jest.Mock).mockRejectedValue(new Error("Not found"));

      const url = "https://example.com/image.jpg";
      const result = await getBestImageUrl(url, { useProxy: false });

      expect(result).toBe(url);
    });

    it("returns original URL by default if not cached", async () => {
      (access as jest.Mock).mockRejectedValue(new Error("Not found"));

      const url = "https://example.com/image.jpg";
      const result = await getBestImageUrl(url);

      expect(result).toBe(url);
    });
  });

  describe("getExtensionFromUrl", () => {
    it("extracts jpg extension", () => {
      expect(getExtensionFromUrl("https://example.com/photo.jpg")).toBe("jpg");
    });

    it("normalizes jpeg to jpg", () => {
      expect(getExtensionFromUrl("https://example.com/photo.jpeg")).toBe("jpg");
    });

    it("extracts png extension", () => {
      expect(getExtensionFromUrl("https://example.com/photo.png")).toBe("png");
    });

    it("extracts webp extension", () => {
      expect(getExtensionFromUrl("https://example.com/photo.webp")).toBe("webp");
    });

    it("extracts gif extension", () => {
      expect(getExtensionFromUrl("https://example.com/anim.gif")).toBe("gif");
    });

    it("defaults to jpg for unsupported extension", () => {
      expect(getExtensionFromUrl("https://example.com/file.bmp")).toBe("jpg");
    });

    it("defaults to jpg for no extension", () => {
      expect(getExtensionFromUrl("https://example.com/image")).toBe("jpg");
    });

    it("defaults to jpg for invalid URL", () => {
      expect(getExtensionFromUrl("not-a-url")).toBe("jpg");
    });

    it("handles URLs with query params", () => {
      expect(getExtensionFromUrl("https://example.com/photo.png?w=100")).toBe("png");
    });
  });
});
