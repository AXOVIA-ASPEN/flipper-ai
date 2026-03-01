import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('firebase.json Configuration', () => {
  let config: {
    hosting: {
      public: string;
      cleanUrls?: boolean;
      trailingSlash?: boolean;
      rewrites: Array<{
        source: string;
        run?: { serviceId: string; region: string };
        destination?: string;
      }>;
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    };
  };

  beforeAll(() => {
    const raw = readFileSync(join(ROOT, 'firebase.json'), 'utf-8');
    config = JSON.parse(raw);
  });

  describe('hosting.public', () => {
    it('should point to "out" directory (static export)', () => {
      expect(config.hosting.public).toBe('out');
    });
  });

  describe('URL handling', () => {
    it('should have cleanUrls enabled', () => {
      expect(config.hosting.cleanUrls).toBe(true);
    });

    it('should have trailingSlash disabled', () => {
      expect(config.hosting.trailingSlash).toBe(false);
    });
  });

  describe('rewrites', () => {
    it('should have API rewrite to Cloud Run before catch-all', () => {
      const apiRewrite = config.hosting.rewrites[0];
      expect(apiRewrite.source).toBe('/api/**');
      expect(apiRewrite.run).toBeDefined();
      expect(apiRewrite.run?.serviceId).toBe('flipper-ai-backend');
      expect(apiRewrite.run?.region).toBe('us-central1');
    });

    it('should have SPA catch-all rewrite after API rewrite', () => {
      const catchAll = config.hosting.rewrites[1];
      expect(catchAll.source).toBe('**');
      expect(catchAll.destination).toBe('/index.html');
    });

    it('should NOT include pinTag in Cloud Run rewrite', () => {
      const apiRewrite = config.hosting.rewrites[0];
      expect(apiRewrite.run).not.toHaveProperty('pinTag');
    });
  });

  describe('cache headers', () => {
    it('should set immutable cache for JS/CSS files', () => {
      const jsCssHeader = config.hosting.headers.find(
        (h) => h.source.includes('.@(js|css)')
      );
      expect(jsCssHeader).toBeDefined();
      const cacheControl = jsCssHeader!.headers.find(
        (h) => h.key === 'Cache-Control'
      );
      expect(cacheControl?.value).toContain('max-age=31536000');
      expect(cacheControl?.value).toContain('immutable');
    });

    it('should set immutable cache for image files', () => {
      const imgHeader = config.hosting.headers.find(
        (h) => h.source.includes('jpg|jpeg')
      );
      expect(imgHeader).toBeDefined();
      const cacheControl = imgHeader!.headers.find(
        (h) => h.key === 'Cache-Control'
      );
      expect(cacheControl?.value).toContain('max-age=31536000');
    });

    it('should set short cache for HTML files', () => {
      const htmlHeader = config.hosting.headers.find(
        (h) => h.source.includes('.html')
      );
      expect(htmlHeader).toBeDefined();
      const cacheControl = htmlHeader!.headers.find(
        (h) => h.key === 'Cache-Control'
      );
      expect(cacheControl?.value).toContain('max-age=300');
      expect(cacheControl?.value).toContain('s-maxage=600');
    });

    it('should set CORS headers for font files', () => {
      const fontHeader = config.hosting.headers.find(
        (h) => h.source.includes('woff')
      );
      expect(fontHeader).toBeDefined();
      const cors = fontHeader!.headers.find(
        (h) => h.key === 'Access-Control-Allow-Origin'
      );
      expect(cors?.value).toBe('*');
    });
  });

  describe('security headers', () => {
    it('should include all required security headers on all routes', () => {
      const globalHeader = config.hosting.headers.find(
        (h) => h.source === '**' && h.headers.some((hh) => hh.key === 'X-Content-Type-Options')
      );
      expect(globalHeader).toBeDefined();

      const headerKeys = globalHeader!.headers.map((h) => h.key);
      expect(headerKeys).toContain('X-Content-Type-Options');
      expect(headerKeys).toContain('X-Frame-Options');
      expect(headerKeys).toContain('X-XSS-Protection');
      expect(headerKeys).toContain('Referrer-Policy');
      expect(headerKeys).toContain('Strict-Transport-Security');
      expect(headerKeys).toContain('Permissions-Policy');
      expect(headerKeys).toContain('Content-Security-Policy');
    });

    it('should have Content-Security-Policy with restrictive defaults', () => {
      const globalHeader = config.hosting.headers.find(
        (h) => h.source === '**' && h.headers.some((hh) => hh.key === 'Content-Security-Policy')
      );
      expect(globalHeader).toBeDefined();
      const csp = globalHeader!.headers.find((h) => h.key === 'Content-Security-Policy');
      expect(csp?.value).toContain("default-src 'self'");
      expect(csp?.value).toContain("frame-ancestors 'none'");
    });
  });
});
