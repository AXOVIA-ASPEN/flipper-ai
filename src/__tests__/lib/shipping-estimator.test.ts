/**
 * Unit tests for estimateShippingCosts() in src/lib/shipping-estimator.ts
 * Story 5.5: Logistics & Shipping Cost Analysis (FR-SCORE-21)
 */

const mockShipmentsCreate = jest.fn();

jest.mock('shippo', () => ({
  __esModule: true,
  Shippo: jest.fn().mockImplementation(() => ({
    shipments: {
      create: (...args: unknown[]) => mockShipmentsCreate(...args),
    },
  })),
}));

import { estimateShippingCosts } from '@/lib/shipping-estimator';

const DIMS = { length: 10, width: 8, height: 4 };

describe('estimateShippingCosts()', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SHIPPO_API_TOKEN;
    delete process.env.SHIPPO_FROM_ZIP;
  });

  describe('when SHIPPO_API_TOKEN is not set', () => {
    it('returns null and logs a warning', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await estimateShippingCosts(5, DIMS, '33601');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SHIPPO_API_TOKEN'));
      consoleSpy.mockRestore();
    });
  });

  describe('when SHIPPO_API_TOKEN is set', () => {
    beforeEach(() => {
      process.env.SHIPPO_API_TOKEN = 'test-token';
    });

    it('returns ShippingEstimates with carrier rates', async () => {
      mockShipmentsCreate.mockResolvedValue({
        rates: [
          { provider: 'USPS', amount: '8.50' },
          { provider: 'UPS', amount: '12.00' },
          { provider: 'FedEx', amount: '14.00' },
        ],
      });

      const result = await estimateShippingCosts(5, DIMS, '90210');
      expect(result).not.toBeNull();
      expect(result!.usps).toBe(8.5);
      expect(result!.ups).toBe(12.0);
      expect(result!.fedex).toBe(14.0);
      expect(result!.lowestCost).toBe(8.5);
      expect(result!.currency).toBe('USD');
    });

    it('keeps the lowest rate per carrier when multiple rates exist for same carrier', async () => {
      mockShipmentsCreate.mockResolvedValue({
        rates: [
          { provider: 'USPS', amount: '10.00' },
          { provider: 'USPS', amount: '7.50' },
        ],
      });

      const result = await estimateShippingCosts(3, DIMS, '10001');
      expect(result!.usps).toBe(7.5);
    });

    it('skips rates with invalid or zero amounts', async () => {
      mockShipmentsCreate.mockResolvedValue({
        rates: [
          { provider: 'USPS', amount: '0' },
          { provider: 'UPS', amount: 'invalid' },
          { provider: 'FedEx', amount: '9.99' },
        ],
      });

      const result = await estimateShippingCosts(2, DIMS, '60601');
      expect(result!.usps).toBeNull();
      expect(result!.ups).toBeNull();
      expect(result!.fedex).toBe(9.99);
      expect(result!.lowestCost).toBe(9.99);
    });

    it('sets lowestCost to 0 when all rates are null', async () => {
      mockShipmentsCreate.mockResolvedValue({ rates: [] });

      const result = await estimateShippingCosts(1, DIMS, '10001');
      expect(result!.lowestCost).toBe(0);
      expect(result!.usps).toBeNull();
      expect(result!.ups).toBeNull();
      expect(result!.fedex).toBeNull();
    });

    it('returns null and logs warning when Shippo API throws', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockShipmentsCreate.mockRejectedValue(new Error('Shippo error'));

      const result = await estimateShippingCosts(5, DIMS, '33601');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Shippo'), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles missing rates array gracefully', async () => {
      mockShipmentsCreate.mockResolvedValue({});

      const result = await estimateShippingCosts(1, DIMS, '10001');
      expect(result).not.toBeNull();
      expect(result!.lowestCost).toBe(0);
    });

    it('uses SHIPPO_FROM_ZIP env var as origin ZIP', async () => {
      process.env.SHIPPO_FROM_ZIP = '33601';
      mockShipmentsCreate.mockResolvedValue({
        rates: [{ provider: 'USPS', amount: '5.00' }],
      });

      await estimateShippingCosts(2, DIMS, '90210');
      expect(mockShipmentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          addressFrom: expect.objectContaining({ zip: '33601' }),
        })
      );
    });

    it('uses default ZIP 10001 when SHIPPO_FROM_ZIP is not set', async () => {
      mockShipmentsCreate.mockResolvedValue({ rates: [] });

      await estimateShippingCosts(2, DIMS, '90210');
      expect(mockShipmentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          addressFrom: expect.objectContaining({ zip: '10001' }),
        })
      );
    });
  });
});
