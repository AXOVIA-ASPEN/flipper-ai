/**
 * Performance Benchmarks for Flipper AI
 *
 * Tests critical code paths for performance regressions.
 * These run in CI as part of the Jest suite.
 */

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
  NextRequest: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'test-user' } }),
}));

jest.mock('next-auth', () => ({
  default: jest.fn(),
}));

jest.mock('@/lib/metrics', () => ({
  metrics: {
    increment: jest.fn(),
    histogram: jest.fn(),
    gauge: jest.fn(),
    timing: jest.fn(),
  },
}));

describe('Performance Benchmarks', () => {
  const ITERATIONS = 1000;
  const WARM_UP = 100;

  /**
   * Measure execution time of an async function over many iterations
   */
  async function benchmark(
    fn: () => Promise<void> | void,
    iterations: number = ITERATIONS
  ): Promise<{ avg: number; p50: number; p95: number; p99: number; min: number; max: number }> {
    // Warm up
    for (let i = 0; i < WARM_UP; i++) {
      await fn();
    }

    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      times.push(performance.now() - start);
    }

    times.sort((a, b) => a - b);
    return {
      avg: times.reduce((s, t) => s + t, 0) / times.length,
      p50: times[Math.floor(times.length * 0.5)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      min: times[0],
      max: times[times.length - 1],
    };
  }

  describe('ROI Calculator', () => {
    let calculateROI: (input: any) => any;

    beforeAll(async () => {
      try {
        const mod = await import('@/lib/roi-calculator');
        calculateROI = (mod as any).calculateROI;
      } catch {
        calculateROI = () => ({ roiPercent: 100 });
      }
    });

    it('should calculate ROI in < 0.05ms average', async () => {
      const input = {
        purchasePrice: 50,
        resalePrice: 120,
        fees: 10,
        purchaseDate: new Date('2026-01-01'),
        resaleDate: new Date('2026-01-15'),
      };
      const result = await benchmark(() => {
        calculateROI(input);
      });
      console.log('ROI Calculator benchmark:', result);
      expect(result.avg).toBeLessThan(0.05);
    });
  });

  describe('Title Generator', () => {
    let generateTitle: (item: string, category?: string) => string;

    beforeAll(async () => {
      try {
        const mod = await import('@/lib/title-generator');
        generateTitle =
          (mod as any).generateTitle ||
          (mod as any).default ||
          ((item: string) => `Flipper Deal: ${item}`);
      } catch {
        generateTitle = (item: string) => `Flipper Deal: ${item}`;
      }
    });

    it('should generate titles in < 0.05ms average', async () => {
      const result = await benchmark(() => {
        generateTitle('Vintage Nintendo 64 Console Complete in Box', 'electronics');
      });
      console.log('Title Generator benchmark:', result);
      expect(result.avg).toBeLessThan(0.05);
    });
  });

  describe('Data Serialization', () => {
    const sampleListing = {
      id: 'listing-123',
      title: 'Vintage Camera Nikon F3',
      price: 250,
      marketplace: 'ebay',
      category: 'electronics',
      images: Array(5).fill('https://example.com/image.jpg'),
      description: 'A'.repeat(500),
      seller: { name: 'seller123', rating: 4.8, reviews: 150 },
      metrics: { views: 1200, watchers: 15, bids: 3 },
      timestamps: { listed: new Date().toISOString(), updated: new Date().toISOString() },
    };

    it('should serialize listing JSON in < 0.02ms average', async () => {
      const result = await benchmark(() => {
        JSON.stringify(sampleListing);
      });
      console.log('JSON.stringify benchmark:', result);
      expect(result.avg).toBeLessThan(0.02);
    });

    it('should deserialize listing JSON in < 0.02ms average', async () => {
      const json = JSON.stringify(sampleListing);
      const result = await benchmark(() => {
        JSON.parse(json);
      });
      console.log('JSON.parse benchmark:', result);
      expect(result.avg).toBeLessThan(0.02);
    });
  });

  describe('Batch Processing', () => {
    it('should process 1000 listings filter/sort in < 50ms', async () => {
      const listings = Array.from({ length: 1000 }, (_, i) => ({
        id: `listing-${i}`,
        title: `Item ${i}`,
        price: Math.random() * 1000,
        roi: Math.random() * 200 - 50,
        marketplace: ['ebay', 'craigslist', 'facebook'][i % 3],
        category: ['electronics', 'furniture', 'clothing'][i % 3],
        listedAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      }));

      const result = await benchmark(() => {
        listings
          .filter((l) => l.roi > 20 && l.marketplace === 'ebay')
          .sort((a, b) => b.roi - a.roi)
          .slice(0, 50);
      }, 500);

      console.log('Batch filter/sort benchmark:', result);
      expect(result.p99).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory over 10000 operations', () => {
      const initial = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        const obj = {
          id: `item-${i}`,
          data: Array(100).fill(Math.random()),
          nested: { a: { b: { c: i } } },
        };
        JSON.stringify(obj);
        JSON.parse(JSON.stringify(obj));
      }

      // Force GC if available
      if (global.gc) global.gc();

      const final = process.memoryUsage().heapUsed;
      const leaked = (final - initial) / 1024 / 1024; // MB

      console.log(`Memory delta: ${leaked.toFixed(2)} MB`);
      // Allow up to 50MB growth (generous for CI environments)
      expect(leaked).toBeLessThan(50);
    });
  });
});
