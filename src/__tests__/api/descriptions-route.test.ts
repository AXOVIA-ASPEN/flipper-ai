/**
 * Tests for POST /api/descriptions route
 * Covers: validation, platform routing, LLM vs algorithmic, error handling
 */

import { POST } from '@/app/api/descriptions/route';
import { NextRequest } from 'next/server';
import * as descGen from '@/lib/description-generator';

jest.mock('@/lib/description-generator');

const mockDescGen = descGen as jest.Mocked<typeof descGen>;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/descriptions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validBody = {
  brand: 'Apple',
  model: 'iPhone 15',
  condition: 'Good',
  askingPrice: 500,
  category: 'Electronics',
};

describe('POST /api/descriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when condition is missing', async () => {
    const res = await POST(makeRequest({ askingPrice: 100 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('condition');
  });

  it('returns 400 when askingPrice is missing', async () => {
    const res = await POST(makeRequest({ condition: 'Good' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('askingPrice');
  });

  it('returns 400 when askingPrice is negative', async () => {
    const res = await POST(makeRequest({ condition: 'Good', askingPrice: -1 }));
    expect(res.status).toBe(400);
  });

  it('generates descriptions for all platforms by default', async () => {
    const mockResult = { ebay: { title: 'test', description: 'test' } };
    mockDescGen.generateDescriptionsForAllPlatforms.mockReturnValue(mockResult as any);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockDescGen.generateDescriptionsForAllPlatforms).toHaveBeenCalled();
    const json = await res.json();
    expect(json).toEqual(mockResult);
  });

  it('generates algorithmic description for specific platform', async () => {
    const mockResult = { title: 'eBay Title', description: 'eBay Desc' };
    mockDescGen.generateAlgorithmicDescription.mockReturnValue(mockResult as any);

    const res = await POST(makeRequest({ ...validBody, platform: 'ebay' }));
    expect(res.status).toBe(200);
    expect(mockDescGen.generateAlgorithmicDescription).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'Apple', condition: 'Good' }),
      'ebay'
    );
  });

  it('generates LLM description when useLLM is true', async () => {
    const mockResult = { title: 'AI Title', description: 'AI Desc' };
    mockDescGen.generateLLMDescription.mockResolvedValue(mockResult as any);

    const res = await POST(makeRequest({ ...validBody, platform: 'mercari', useLLM: true }));
    expect(res.status).toBe(200);
    expect(mockDescGen.generateLLMDescription).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'Apple' }),
      'mercari'
    );
  });

  it('returns 400 for invalid platform', async () => {
    const res = await POST(makeRequest({ ...validBody, platform: 'amazon' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid platform');
  });

  it('handles all valid platforms', async () => {
    mockDescGen.generateAlgorithmicDescription.mockReturnValue({ title: 't', description: 'd' } as any);
    for (const platform of ['ebay', 'mercari', 'facebook', 'offerup', 'generic']) {
      const res = await POST(makeRequest({ ...validBody, platform }));
      expect(res.status).toBe(200);
    }
  });

  it('handles errors gracefully', async () => {
    mockDescGen.generateDescriptionsForAllPlatforms.mockImplementation(() => {
      throw new Error('Generation failed');
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Failed to generate');
  });

  it('passes optional fields correctly', async () => {
    mockDescGen.generateDescriptionsForAllPlatforms.mockReturnValue({} as any);

    const fullBody = {
      ...validBody,
      originalPrice: 999,
      defects: ['scratch'],
      features: ['5G'],
      includesAccessories: ['charger'],
      sellerNotes: 'Great phone',
    };

    await POST(makeRequest(fullBody));
    expect(mockDescGen.generateDescriptionsForAllPlatforms).toHaveBeenCalledWith(
      expect.objectContaining({
        originalPrice: 999,
        defects: ['scratch'],
        features: ['5G'],
        includesAccessories: ['charger'],
        sellerNotes: 'Great phone',
      })
    );
  });

  it('uses defaults for missing optional fields', async () => {
    mockDescGen.generateDescriptionsForAllPlatforms.mockReturnValue({} as any);

    await POST(makeRequest({ condition: 'Fair', askingPrice: 50 }));
    expect(mockDescGen.generateDescriptionsForAllPlatforms).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: null,
        model: null,
        variant: null,
        category: null,
        originalPrice: null,
        defects: [],
        features: [],
        includesAccessories: [],
        sellerNotes: null,
      })
    );
  });
});
