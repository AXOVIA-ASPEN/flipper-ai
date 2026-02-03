import {
  generateImageHash,
  normalizeLocation,
  buildProxyUrl,
  NormalizedLocation,
} from "@/lib/image-service";

describe("Image Service", () => {
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
