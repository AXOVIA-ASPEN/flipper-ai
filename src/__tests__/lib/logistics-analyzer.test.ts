/**
 * Unit tests for analyzeLogistics() in src/lib/logistics-analyzer.ts
 * Story 5.5: Logistics & Shipping Cost Analysis (FR-SCORE-21, FR-SCORE-22)
 */

import { analyzeLogistics } from '@/lib/logistics-analyzer';

jest.mock('@/lib/logistics-classifier');
jest.mock('@/lib/shipping-estimator');
jest.mock('@/lib/distance-calculator');

import { classifyItemLogistics } from '@/lib/logistics-classifier';
import { estimateShippingCosts } from '@/lib/shipping-estimator';
import { calculateDistance } from '@/lib/distance-calculator';

const mockClassify = classifyItemLogistics as jest.MockedFunction<typeof classifyItemLogistics>;
const mockShipping = estimateShippingCosts as jest.MockedFunction<typeof estimateShippingCosts>;
const mockDistance = calculateDistance as jest.MockedFunction<typeof calculateDistance>;

const BASE_ITEM = {
  title: 'MacBook Pro',
  description: '2021 model',
  category: 'electronics',
  location: 'Tampa, FL 33601',
  estimation: { profitPotential: 200 },
};

const SMALL_CLASSIFICATION = {
  sizeCategory: 'small_shippable' as const,
  estimatedWeightLbs: 5,
  estimatedDimensionsInches: { length: 12, width: 9, height: 2 },
  classificationReasoning: 'Laptop',
  confidence: 'high' as const,
};

const LARGE_CLASSIFICATION = {
  sizeCategory: 'large_local_only' as const,
  estimatedWeightLbs: 80,
  estimatedDimensionsInches: { length: 60, width: 30, height: 30 },
  classificationReasoning: 'Large furniture',
  confidence: 'high' as const,
};

const FRAGILE_CLASSIFICATION = {
  sizeCategory: 'fragile_special_handling' as const,
  estimatedWeightLbs: 8,
  estimatedDimensionsInches: { length: 24, width: 18, height: 12 },
  classificationReasoning: 'Musical instrument',
  confidence: 'medium' as const,
};

describe('analyzeLogistics()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShipping.mockResolvedValue(null);
    mockDistance.mockResolvedValue(null);
  });

  describe('small_shippable items', () => {
    beforeEach(() => {
      mockClassify.mockResolvedValue(SMALL_CLASSIFICATION);
    });

    it('calls estimateShippingCosts with correct args', async () => {
      mockShipping.mockResolvedValue({
        usps: 10, ups: 14, fedex: 15, lowestCost: 10, currency: 'USD',
      });

      await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(mockShipping).toHaveBeenCalledWith(
        SMALL_CLASSIFICATION.estimatedWeightLbs,
        SMALL_CLASSIFICATION.estimatedDimensionsInches,
        expect.any(String)
      );
    });

    it('sets estimatedShippingCost to lowestCost from ShippingEstimates', async () => {
      mockShipping.mockResolvedValue({
        usps: 8, ups: 12, fedex: 15, lowestCost: 8, currency: 'USD',
      });

      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.estimatedShippingCost).toBe(8);
    });

    it('calculates adjustedProfitMargin = profitPotential - lowestCost', async () => {
      mockShipping.mockResolvedValue({
        usps: 20, ups: null, fedex: null, lowestCost: 20, currency: 'USD',
      });

      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.adjustedProfitMargin).toBe(200 - 20);
    });

    it('sets null adjustedProfitMargin when shipping returns null', async () => {
      mockShipping.mockResolvedValue(null);
      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.adjustedProfitMargin).toBeNull();
    });

    it('sets adjustedProfitMargin = profitPotential when lowestCost is 0 (all carriers failed)', async () => {
      mockShipping.mockResolvedValue({ usps: null, ups: null, fedex: null, lowestCost: 0, currency: 'USD' });
      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.adjustedProfitMargin).toBe(200); // 200 - 0
    });

    it('does NOT call calculateDistance for shippable items', async () => {
      await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(mockDistance).not.toHaveBeenCalled();
    });

    it('extracts ZIP from location for toZip param', async () => {
      mockShipping.mockResolvedValue({ usps: 5, ups: null, fedex: null, lowestCost: 5, currency: 'USD' });
      await analyzeLogistics({ ...BASE_ITEM, location: 'Chicago, IL 60601' }, 'Tampa, FL', 50);
      expect(mockShipping).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Object),
        '60601'
      );
    });

    it('uses fallback ZIP 10001 when location has no ZIP', async () => {
      mockShipping.mockResolvedValue({ usps: 5, ups: null, fedex: null, lowestCost: 5, currency: 'USD' });
      await analyzeLogistics({ ...BASE_ITEM, location: 'Chicago, IL' }, 'Tampa, FL', 50);
      expect(mockShipping).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Object),
        '10001'
      );
    });

    it('uses fallback ZIP 10001 when location is null', async () => {
      mockShipping.mockResolvedValue({ usps: 5, ups: null, fedex: null, lowestCost: 5, currency: 'USD' });
      await analyzeLogistics({ ...BASE_ITEM, location: null }, 'Tampa, FL', 50);
      expect(mockShipping).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Object),
        '10001'
      );
    });
  });

  describe('fragile_special_handling items', () => {
    beforeEach(() => {
      mockClassify.mockResolvedValue(FRAGILE_CLASSIFICATION);
    });

    it('also calls estimateShippingCosts (fragile items are still shippable)', async () => {
      mockShipping.mockResolvedValue({ usps: 25, ups: null, fedex: null, lowestCost: 25, currency: 'USD' });
      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(mockShipping).toHaveBeenCalled();
      expect(result.sizeCategory).toBe('fragile_special_handling');
    });

    it('does NOT call calculateDistance for fragile items', async () => {
      await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(mockDistance).not.toHaveBeenCalled();
    });
  });

  describe('large_local_only items', () => {
    beforeEach(() => {
      mockClassify.mockResolvedValue(LARGE_CLASSIFICATION);
    });

    it('does NOT call estimateShippingCosts', async () => {
      await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(mockShipping).not.toHaveBeenCalled();
    });

    it('calls calculateDistance when userLocation and listing.location are both set', async () => {
      mockDistance.mockResolvedValue({
        distanceMiles: 30, fromLocation: 'Tampa, FL', toLocation: 'Tampa, FL 33601',
        calculationMethod: 'geoapify',
      });

      await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(mockDistance).toHaveBeenCalledWith('Tampa, FL', 'Tampa, FL 33601');
    });

    it('flags outsidePickupRadius when distance exceeds maxPickupRadiusMiles', async () => {
      mockDistance.mockResolvedValue({
        distanceMiles: 80, fromLocation: 'Tampa, FL', toLocation: 'Tampa, FL 33601',
        calculationMethod: 'geoapify',
      });

      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.pickupDistanceMiles).toBe(80);
      expect(result.outsidePickupRadius).toBe(true);
    });

    it('does NOT flag outsidePickupRadius when within radius', async () => {
      mockDistance.mockResolvedValue({
        distanceMiles: 25, fromLocation: 'Tampa, FL', toLocation: 'Tampa, FL 33601',
        calculationMethod: 'geoapify',
      });

      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.outsidePickupRadius).toBe(false);
    });

    it('sets adjustedProfitMargin = profitPotential (no shipping for local pickup)', async () => {
      mockDistance.mockResolvedValue({ distanceMiles: 10, fromLocation: 'A', toLocation: 'B', calculationMethod: 'geoapify' });
      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.adjustedProfitMargin).toBe(200);
    });

    it('does not call calculateDistance when userLocation is null', async () => {
      await analyzeLogistics(BASE_ITEM, null, 50);
      expect(mockDistance).not.toHaveBeenCalled();
    });

    it('does not call calculateDistance when listing.location is null', async () => {
      await analyzeLogistics({ ...BASE_ITEM, location: null }, 'Tampa, FL', 50);
      expect(mockDistance).not.toHaveBeenCalled();
    });
  });

  describe('graceful degradation', () => {
    it('returns safe default when classifyItemLogistics throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockClassify.mockRejectedValue(new Error('Classification failed'));

      const result = await analyzeLogistics(BASE_ITEM, 'Tampa, FL', 50);
      expect(result.sizeCategory).toBe('small_shippable');
      expect(result.shippingEstimates).toBeNull();
      consoleSpy.mockRestore();
    });

    it('safe default has analysisDate set', async () => {
      mockClassify.mockRejectedValue(new Error('fail'));
      const before = new Date();
      const result = await analyzeLogistics(BASE_ITEM, null, 50);
      const after = new Date();
      expect(result.analysisDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.analysisDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('sets estimatedWeightLbs from classification', async () => {
      mockClassify.mockResolvedValue(SMALL_CLASSIFICATION);
      const result = await analyzeLogistics(BASE_ITEM, null, 50);
      expect(result.estimatedWeightLbs).toBe(5);
    });
  });
});
