/**
 * Tests for POST /api/listings/ebay - eBay listing creation
 */

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

// Mock ebay-inventory module
jest.mock('@/lib/ebay-inventory', () => ({
  createDraftListing: jest.fn(),
  publishOffer: jest.fn(),
  EBAY_CONDITIONS: {
    NEW: 'NEW',
    LIKE_NEW: 'LIKE_NEW',
    NEW_OTHER: 'NEW_OTHER',
    NEW_WITH_DEFECTS: 'NEW_WITH_DEFECTS',
    MANUFACTURER_REFURBISHED: 'MANUFACTURER_REFURBISHED',
    SELLER_REFURBISHED: 'SELLER_REFURBISHED',
    USED_EXCELLENT: 'USED_EXCELLENT',
    USED_VERY_GOOD: 'USED_VERY_GOOD',
    USED_GOOD: 'USED_GOOD',
    USED_ACCEPTABLE: 'USED_ACCEPTABLE',
    FOR_PARTS_OR_NOT_WORKING: 'FOR_PARTS_OR_NOT_WORKING',
  },
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/listings/ebay/route';
import { getAuthUserId } from '@/lib/auth-middleware';
import { createDraftListing, publishOffer } from '@/lib/ebay-inventory';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockCreateDraft = createDraftListing as jest.MockedFunction<typeof createDraftListing>;
const mockPublishOffer = publishOffer as jest.MockedFunction<typeof publishOffer>;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/listings/ebay', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validBody = {
  sku: 'FLIP-001',
  title: 'iPhone 14 Pro Max 256GB',
  description: 'Excellent condition iPhone 14 Pro Max',
  categoryId: '9355',
  condition: 'USED_EXCELLENT',
  price: 799.99,
  imageUrls: ['https://example.com/photo1.jpg'],
};

describe('POST /api/listings/ebay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_OAUTH_TOKEN = 'test-token';
    mockGetAuthUserId.mockResolvedValue('user-123');
  });

  afterEach(() => {
    delete process.env.EBAY_OAUTH_TOKEN;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 503 when EBAY_OAUTH_TOKEN is missing', async () => {
    delete process.env.EBAY_OAUTH_TOKEN;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ sku: 'test' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing required fields');
  });

  it('returns 400 for invalid condition', async () => {
    const res = await POST(makeRequest({ ...validBody, condition: 'BROKEN' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid condition');
  });

  it('returns 400 for invalid price', async () => {
    const res = await POST(makeRequest({ ...validBody, price: -10 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Price must be a positive number');
  });

  it('returns 400 for empty imageUrls', async () => {
    const res = await POST(makeRequest({ ...validBody, imageUrls: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('imageUrls must be a non-empty array');
  });

  it('returns 400 for title > 80 chars', async () => {
    const res = await POST(makeRequest({ ...validBody, title: 'A'.repeat(81) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('80 characters');
  });

  it('creates a draft listing successfully', async () => {
    mockCreateDraft.mockResolvedValue({
      success: true,
      sku: 'FLIP-001',
      offerId: 'offer-123',
      status: 'DRAFT',
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.offerId).toBe('offer-123');
    expect(json.status).toBe('DRAFT');
    expect(mockCreateDraft).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when eBay API fails', async () => {
    mockCreateDraft.mockResolvedValue({
      success: false,
      sku: 'FLIP-001',
      status: 'FAILED',
      errors: ['Item creation failed'],
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.details).toContain('Item creation failed');
  });

  it('publishes listing when publish=true', async () => {
    mockCreateDraft.mockResolvedValue({
      success: true,
      sku: 'FLIP-001',
      offerId: 'offer-123',
      status: 'DRAFT',
    });
    mockPublishOffer.mockResolvedValue({
      success: true,
      listingId: 'listing-456',
    });

    const res = await POST(makeRequest({ ...validBody, publish: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('PUBLISHED');
    expect(json.listingId).toBe('listing-456');
    expect(mockPublishOffer).toHaveBeenCalledWith('offer-123');
  });

  it('returns draft with error when publish fails', async () => {
    mockCreateDraft.mockResolvedValue({
      success: true,
      sku: 'FLIP-001',
      offerId: 'offer-123',
      status: 'DRAFT',
    });
    mockPublishOffer.mockResolvedValue({
      success: false,
      errors: ['Publish failed: missing policies'],
    });

    const res = await POST(makeRequest({ ...validBody, publish: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('DRAFT');
    expect(json.publishError).toBeDefined();
  });
});

describe('GET /api/listings/ebay', () => {
  it('returns endpoint info', async () => {
    process.env.EBAY_OAUTH_TOKEN = 'test';
    const res = await GET();
    const json = await res.json();
    expect(json.endpoint).toBe('POST /api/listings/ebay');
    expect(json.status).toBe('ready');
    expect(json.requiredFields).toBeDefined();
    delete process.env.EBAY_OAUTH_TOKEN;
  });

  it('shows missing_token when not configured', async () => {
    delete process.env.EBAY_OAUTH_TOKEN;
    const res = await GET();
    const json = await res.json();
    expect(json.status).toBe('missing_token');
  });
});

// ── Branch coverage: optional fields in POST ─────────────────────────────────
describe('POST /api/listings/ebay - optional fields branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_OAUTH_TOKEN = 'test-token';
    mockGetAuthUserId.mockResolvedValue('user-123');
    mockCreateDraft.mockResolvedValue({
      success: true,
      sku: 'FLIP-OPT',
      offerId: 'offer-opt',
      status: 'DRAFT',
    });
  });

  afterEach(() => {
    delete process.env.EBAY_OAUTH_TOKEN;
  });

  it('uses optional fields when provided (covers || truthy branches)', async () => {
    // All optional fields set → covers the `field || undefined` truthy branches
    const bodyWithOptionals = {
      ...validBody,
      conditionDescription: 'Minor scuff on corner',
      currency: 'CAD',
      aspects: { Brand: ['Apple'], Storage: ['256GB'] },
      packageDimensions: { length: 6, width: 3, height: 0.5, unit: 'INCH' },
      fulfillmentPolicyId: 'fulfill-policy-123',
      paymentPolicyId: 'pay-policy-456',
      returnPolicyId: 'return-policy-789',
      merchantLocationKey: 'WAREHOUSE_A',
    };

    const res = await POST(makeRequest(bodyWithOptionals));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('DRAFT');
    // Verify optional fields were passed to createDraftListing
    const createCall = mockCreateDraft.mock.calls[0][0];
    expect(createCall.conditionDescription).toBe('Minor scuff on corner');
    expect(createCall.currency).toBe('CAD');
    expect(createCall.fulfillmentPolicyId).toBe('fulfill-policy-123');
    expect(createCall.paymentPolicyId).toBe('pay-policy-456');
    expect(createCall.returnPolicyId).toBe('return-policy-789');
    expect(createCall.merchantLocationKey).toBe('WAREHOUSE_A');
  });
});

describe('POST /api/listings/ebay - remaining branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_OAUTH_TOKEN = 'test-token';
    mockGetAuthUserId.mockResolvedValue('user-123');
    mockCreateDraft.mockResolvedValue({
      success: true,
      sku: 'FLIP-BR',
      offerId: 'offer-br',
      status: 'DRAFT',
    });
  });

  afterEach(() => {
    delete process.env.EBAY_OAUTH_TOKEN;
  });

  it('covers conditionDescription falsy branch (omit field → undefined)', async () => {
    // When conditionDescription is omitted, `body.conditionDescription || undefined` → undefined
    const bodyNoCondDesc = {
      ...validBody,
      // conditionDescription intentionally omitted
    };
    const res = await POST(makeRequest(bodyNoCondDesc));
    const createCall = mockCreateDraft.mock.calls[0]?.[0];
    expect(res.status).toBe(200);
    expect(createCall?.conditionDescription).toBeUndefined();
  });

  it('covers packageWeightLbs truthy branch (provide field → parseFloat)', async () => {
    // When packageWeightLbs IS provided, `body.packageWeightLbs ? parseFloat(...) : undefined` → number
    const bodyWithWeight = {
      ...validBody,
      packageWeightLbs: '2.5',
    };
    const res = await POST(makeRequest(bodyWithWeight));
    const createCall = mockCreateDraft.mock.calls[0]?.[0];
    expect(res.status).toBe(200);
    expect(createCall?.packageWeightLbs).toBe(2.5);
  });

  it('covers quantity truthy branch (provide quantity → parseInt)', async () => {
    // When quantity IS provided, `body.quantity ? parseInt(...) : 1` → parsed number
    const bodyWithQty = {
      ...validBody,
      quantity: '3',
    };
    const res = await POST(makeRequest(bodyWithQty));
    const createCall = mockCreateDraft.mock.calls[0]?.[0];
    expect(res.status).toBe(200);
    expect(createCall?.quantity).toBe(3);
  });
});
