import {
  generateAlgorithmicDescription,
  generateDescriptionsForAllPlatforms,
  fromIdentification,
  type DescriptionGeneratorInput,
} from '@/lib/description-generator';

const baseInput: DescriptionGeneratorInput = {
  brand: 'Sony',
  model: 'WH-1000XM5',
  variant: 'Black',
  condition: 'like_new',
  category: 'electronics',
  askingPrice: 200,
  originalPrice: 350,
  defects: [],
  features: ['Active Noise Cancellation', '30-hour battery life'],
  includesAccessories: ['Carrying case', 'USB-C cable'],
  sellerNotes: null,
};

describe('description-generator', () => {
  describe('generateAlgorithmicDescription', () => {
    it('generates a description with item name', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('Sony WH-1000XM5 Black');
      expect(result.platform).toBe('ebay');
    });

    it('includes condition details', () => {
      const result = generateAlgorithmicDescription(baseInput, 'generic');
      expect(result.description).toContain('Like new condition');
      expect(result.hasConditionDetails).toBe(true);
    });

    it('includes features as bullet points', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('Active Noise Cancellation');
      expect(result.description).toContain('30-hour battery life');
    });

    it('includes accessories', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('Carrying case');
      expect(result.description).toContain('USB-C cable');
    });

    it('includes savings when original price is higher', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('$350');
      expect(result.description).toMatch(/save \d+%/i);
    });

    it('omits savings when no original price', () => {
      const input = { ...baseInput, originalPrice: null };
      const result = generateAlgorithmicDescription(input, 'ebay');
      expect(result.description).not.toContain('Retails for');
    });

    it('includes defects when present', () => {
      const input = { ...baseInput, defects: ['Small scratch on left ear cup'] };
      const result = generateAlgorithmicDescription(input, 'ebay');
      expect(result.description).toContain('Small scratch on left ear cup');
    });

    it('includes shipping note', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.hasShippingNote).toBe(true);
      expect(result.description).toMatch(/ship/i);
    });

    it('uses local pickup note for facebook/offerup', () => {
      const fbResult = generateAlgorithmicDescription(baseInput, 'facebook');
      expect(fbResult.description).toContain('Local pickup');

      const ouResult = generateAlgorithmicDescription(baseInput, 'offerup');
      expect(ouResult.description).toContain('Local pickup');
    });

    it('handles minimal input gracefully', () => {
      const minimal: DescriptionGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: 'good',
        category: null,
        askingPrice: 50,
      };
      const result = generateAlgorithmicDescription(minimal, 'generic');
      expect(result.description).toContain('Item for sale');
      expect(result.description).toContain('Good condition');
    });

    it('includes seller notes', () => {
      const input = { ...baseInput, sellerNotes: 'Moving sale - must go this week!' };
      const result = generateAlgorithmicDescription(input, 'generic');
      expect(result.description).toContain('Moving sale');
    });

    it('handles poor condition correctly', () => {
      const input = { ...baseInput, condition: 'poor' };
      const result = generateAlgorithmicDescription(input, 'ebay');
      expect(result.description).toContain('parts or repair');
    });
  });

  describe('generateDescriptionsForAllPlatforms', () => {
    it('generates descriptions for 4 platforms', () => {
      const result = generateDescriptionsForAllPlatforms(baseInput);
      expect(result.descriptions).toHaveLength(4);
      expect(result.descriptions.map((d) => d.platform)).toEqual([
        'ebay', 'mercari', 'facebook', 'offerup',
      ]);
    });

    it('returns eBay description as primary', () => {
      const result = generateDescriptionsForAllPlatforms(baseInput);
      expect(result.primary).toBe(
        result.descriptions.find((d) => d.platform === 'ebay')!.description
      );
    });

    it('each description has word count', () => {
      const result = generateDescriptionsForAllPlatforms(baseInput);
      for (const desc of result.descriptions) {
        expect(desc.wordCount).toBeGreaterThan(0);
      }
    });
  });

  describe('fromIdentification', () => {
    it('converts ItemIdentification to DescriptionGeneratorInput', () => {
      const identification = {
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        variant: '256GB Space Black',
        condition: 'good',
        category: 'phones',
        confidence: 0.95,
      };
      const result = fromIdentification(identification, 800, {
        originalPrice: 1199,
        defects: ['Hairline scratch on screen'],
        features: ['A17 Pro chip', 'Titanium frame'],
        includesAccessories: ['Original box', 'Lightning cable'],
        sellerNotes: 'Unlocked, works on all carriers',
      });

      expect(result.brand).toBe('Apple');
      expect(result.model).toBe('iPhone 15 Pro');
      expect(result.askingPrice).toBe(800);
      expect(result.originalPrice).toBe(1199);
      expect(result.defects).toContain('Hairline scratch on screen');
    });

    it('handles minimal extras', () => {
      const identification = {
        brand: 'Nike',
        model: 'Air Max 90',
        variant: null,
        condition: 'new',
        category: 'shoes',
        confidence: 0.9,
      };
      const result = fromIdentification(identification, 120);
      expect(result.brand).toBe('Nike');
      expect(result.askingPrice).toBe(120);
      expect(result.originalPrice).toBeNull();
      expect(result.defects).toBeUndefined();
    });
  });
});
