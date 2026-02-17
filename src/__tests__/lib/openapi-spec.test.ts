/**
 * Unit tests for the OpenAPI spec definition
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { openApiSpec } from '@/lib/openapi-spec';

describe('openApiSpec', () => {
  it('is a valid OpenAPI 3.x object', () => {
    expect(openApiSpec.openapi).toMatch(/^3\.\d+\.\d+$/);
  });

  it('has required top-level fields', () => {
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.paths).toBeDefined();
    expect(openApiSpec.components).toBeDefined();
  });

  it('has a non-empty paths object', () => {
    expect(Object.keys(openApiSpec.paths).length).toBeGreaterThan(10);
  });

  it('covers all 5 supported marketplaces in Platform enum', () => {
    const platform = openApiSpec.components.schemas.Platform;
    expect((platform as { enum: string[] }).enum).toEqual(
      expect.arrayContaining([
        'CRAIGSLIST',
        'FACEBOOK_MARKETPLACE',
        'EBAY',
        'OFFERUP',
        'MERCARI',
      ])
    );
  });

  it('covers all 5 opportunity statuses', () => {
    const status = openApiSpec.components.schemas.OpportunityStatus;
    expect((status as { enum: string[] }).enum).toEqual(
      expect.arrayContaining(['IDENTIFIED', 'CONTACTED', 'PURCHASED', 'LISTED', 'SOLD'])
    );
  });

  it('Listing schema has required marketplace fields', () => {
    const listing = openApiSpec.components.schemas.Listing;
    expect((listing as { properties: Record<string, unknown> }).properties).toMatchObject({
      id: expect.any(Object),
      platform: expect.any(Object),
      url: expect.any(Object),
      title: expect.any(Object),
      askingPrice: expect.any(Object),
      valueScore: expect.any(Object),
    });
  });

  it('AnalysisResult schema has recommendation enum', () => {
    const result = openApiSpec.components.schemas.AnalysisResult as {
      properties: Record<string, { enum?: string[] }>;
    };
    expect(result.properties.recommendation.enum).toEqual(
      expect.arrayContaining(['BUY', 'SKIP', 'WATCH'])
    );
  });

  it('security schemes include BearerAuth and ApiKey', () => {
    expect(openApiSpec.components.securitySchemes).toHaveProperty('BearerAuth');
    expect(openApiSpec.components.securitySchemes).toHaveProperty('ApiKey');
  });

  it('shared error response schema has required error field', () => {
    const errorSchema = openApiSpec.components.schemas.Error as {
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(errorSchema.required).toContain('error');
    expect(errorSchema.properties.error).toBeDefined();
  });

  it('reusable parameters are defined', () => {
    expect(openApiSpec.components.parameters).toHaveProperty('LimitParam');
    expect(openApiSpec.components.parameters).toHaveProperty('OffsetParam');
    expect(openApiSpec.components.parameters).toHaveProperty('ListingId');
    expect(openApiSpec.components.parameters).toHaveProperty('OpportunityId');
  });

  it('reusable responses are defined', () => {
    expect(openApiSpec.components.responses).toHaveProperty('Unauthorized');
    expect(openApiSpec.components.responses).toHaveProperty('NotFound');
    expect(openApiSpec.components.responses).toHaveProperty('BadRequest');
    expect(openApiSpec.components.responses).toHaveProperty('InternalError');
  });

  it('health endpoint has no security requirement (public)', () => {
    const healthGet = (openApiSpec.paths['/health'] as Record<string, { security?: unknown[] }>)
      .get;
    expect(healthGet.security).toEqual([]);
  });

  it('stripe webhook endpoint has no auth (uses signature verification)', () => {
    const webhookPost = (
      openApiSpec.paths['/webhooks/stripe'] as Record<string, { security?: unknown[] }>
    ).post;
    expect(webhookPost.security).toEqual([]);
  });

  it('all scraper routes use POST method', () => {
    const scraperPaths = Object.keys(openApiSpec.paths).filter(
      (p) => p.startsWith('/scraper/') || p === '/scrape/facebook'
    );
    expect(scraperPaths.length).toBeGreaterThan(0);
    for (const p of scraperPaths) {
      expect((openApiSpec.paths[p] as Record<string, unknown>).post).toBeDefined();
    }
  });

  it('tags list matches tag names used in operations', () => {
    const definedTags = new Set(openApiSpec.tags.map((t) => t.name));
    for (const [, pathItem] of Object.entries(openApiSpec.paths)) {
      for (const [method, op] of Object.entries(
        pathItem as Record<string, { tags?: string[] }>
      )) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method) && op.tags) {
          for (const tag of op.tags) {
            expect(definedTags.has(tag)).toBe(true);
          }
        }
      }
    }
  });
});
