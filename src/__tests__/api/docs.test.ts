/**
 * Tests for GET /api/docs — OpenAPI spec endpoint
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { GET } from '@/app/api/docs/route';
import { openApiSpec } from '@/lib/openapi-spec';

describe('GET /api/docs', () => {
  it('returns 200 with JSON content type', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
  });

  it('includes CORS header', async () => {
    const res = await GET();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('includes cache control header', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBeTruthy();
  });

  it('returns a valid OpenAPI 3.0 spec', async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.openapi).toBe('3.0.3');
    expect(data.info).toBeDefined();
    expect(data.info.title).toBe('Flipper AI API');
    expect(data.info.version).toBe('1.0.0');
    expect(data.paths).toBeDefined();
    expect(data.components).toBeDefined();
    expect(data.components.schemas).toBeDefined();
  });

  it('spec contains all major path groups', async () => {
    const res = await GET();
    const data = await res.json();
    const paths = Object.keys(data.paths);

    expect(paths).toContain('/health');
    expect(paths).toContain('/listings');
    expect(paths).toContain('/opportunities');
    expect(paths).toContain('/analyze/{listingId}');
    expect(paths).toContain('/messages');
    expect(paths).toContain('/inventory/roi');
    expect(paths).toContain('/posting-queue');
    expect(paths).toContain('/descriptions');
    expect(paths).toContain('/images/proxy');
    expect(paths).toContain('/reports/generate');
    expect(paths).toContain('/analytics/profit-loss');
    expect(paths).toContain('/price-history');
    expect(paths).toContain('/search-configs');
    expect(paths).toContain('/user/settings');
    expect(paths).toContain('/checkout');
    expect(paths).toContain('/webhooks/stripe');
    expect(paths).toContain('/auth/register');
    expect(paths).toContain('/scraper/ebay');
    expect(paths).toContain('/scraper-jobs');
    expect(paths).toContain('/posting-queue/stats');
  });

  it('spec is identical to the exported openApiSpec object', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual(openApiSpec);
  });

  it('all tags reference defined tag names', async () => {
    const res = await GET();
    const data = await res.json();
    const tagNames = new Set(data.tags.map((t: { name: string }) => t.name));

    for (const [path, pathItem] of Object.entries(data.paths)) {
      for (const [method, operation] of Object.entries(
        pathItem as Record<string, { tags?: string[] }>
      )) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          if (operation.tags) {
            for (const tag of operation.tags) {
              expect(tagNames.has(tag)).toBe(true);
            }
          }
        }
      }
    }
  });

  it('all $ref schemas point to defined components', async () => {
    const res = await GET();
    const data = await res.json();
    const defined = Object.keys(data.components.schemas);
    const responsesDefined = Object.keys(data.components.responses ?? {});

    const specStr = JSON.stringify(data);
    const refMatches = [...specStr.matchAll(/"#\/components\/(schemas|responses)\/([^"]+)"/g)];

    for (const match of refMatches) {
      const [, kind, name] = match;
      if (kind === 'schemas') {
        expect(defined).toContain(name);
      } else if (kind === 'responses') {
        expect(responsesDefined).toContain(name);
      }
    }
  });

  it('all operationIds are unique', async () => {
    const res = await GET();
    const data = await res.json();
    const operationIds: string[] = [];

    for (const pathItem of Object.values(data.paths)) {
      for (const [method, operation] of Object.entries(
        pathItem as Record<string, { operationId?: string }>
      )) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          if (operation.operationId) {
            operationIds.push(operation.operationId);
          }
        }
      }
    }

    const unique = new Set(operationIds);
    expect(unique.size).toBe(operationIds.length);
  });

  it('info block has contact and license', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.info.contact).toBeDefined();
    expect(data.info.license).toBeDefined();
  });

  it('servers array is not empty', async () => {
    const res = await GET();
    const data = await res.json();
    expect(Array.isArray(data.servers)).toBe(true);
    expect(data.servers.length).toBeGreaterThan(0);
  });
});
