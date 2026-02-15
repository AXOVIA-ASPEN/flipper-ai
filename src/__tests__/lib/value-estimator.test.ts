import {
  estimateValue,
  detectCategory,
  generatePurchaseMessage,
  EstimationResult,
  ComparableUrl,
} from '../../lib/value-estimator';

describe('Value Estimator', () => {
  describe('estimateValue', () => {
    describe('basic estimation', () => {
      it('should return all required fields in the result', () => {
        const result = estimateValue('Test Item', 'A simple test item', 100, 'good', 'electronics');

        expect(result).toHaveProperty('estimatedValue');
        expect(result).toHaveProperty('estimatedLow');
        expect(result).toHaveProperty('estimatedHigh');
        expect(result).toHaveProperty('profitPotential');
        expect(result).toHaveProperty('profitLow');
        expect(result).toHaveProperty('profitHigh');
        expect(result).toHaveProperty('valueScore');
        expect(result).toHaveProperty('discountPercent');
        expect(result).toHaveProperty('resaleDifficulty');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('reasoning');
        expect(result).toHaveProperty('notes');
        expect(result).toHaveProperty('comparableUrls');
        expect(result).toHaveProperty('shippable');
        expect(result).toHaveProperty('negotiable');
        expect(result).toHaveProperty('tags');
      });

      it('should calculate estimated value higher than asking price for good deals', () => {
        const result = estimateValue(
          'iPhone 12 Pro',
          'Excellent condition Apple phone',
          200,
          'excellent',
          'electronics'
        );

        expect(result.estimatedValue).toBeGreaterThan(200);
        expect(result.estimatedLow).toBeLessThanOrEqual(result.estimatedValue);
        expect(result.estimatedHigh).toBeGreaterThanOrEqual(result.estimatedValue);
      });

      it('should return numeric values for all numeric fields', () => {
        const result = estimateValue('Test Item', null, 50, null, null);

        expect(typeof result.estimatedValue).toBe('number');
        expect(typeof result.estimatedLow).toBe('number');
        expect(typeof result.estimatedHigh).toBe('number');
        expect(typeof result.profitPotential).toBe('number');
        expect(typeof result.valueScore).toBe('number');
        expect(typeof result.discountPercent).toBe('number');
      });
    });

    describe('category multipliers', () => {
      it('should apply electronics category multiplier', () => {
        const result = estimateValue('Generic gadget', null, 100, 'good', 'electronics');
        // Electronics: low 1.2, high 1.6, good condition: 0.75
        // Expected range: 100 * 1.2 * 0.75 = 90 to 100 * 1.6 * 0.75 = 120
        expect(result.estimatedLow).toBeGreaterThanOrEqual(80);
        expect(result.estimatedHigh).toBeLessThanOrEqual(130);
      });

      it('should apply collectibles category multiplier (higher markup)', () => {
        const result = estimateValue('Vintage item', null, 100, 'good', 'collectibles');
        // Collectibles: low 1.5, high 2.5
        expect(result.estimatedLow).toBeGreaterThan(100);
        expect(result.estimatedHigh).toBeGreaterThan(result.estimatedLow);
      });

      it('should use default category when unknown category provided', () => {
        const result = estimateValue('Random item', null, 100, 'good', 'unknown_category');
        // Default: low 1.2, high 1.5
        expect(result.estimatedLow).toBeGreaterThanOrEqual(80);
        expect(result.estimatedHigh).toBeLessThanOrEqual(120);
      });

      it('should use default category when no category provided', () => {
        const result = estimateValue('Random item', null, 100, 'good', null);
        expect(result.tags).toContain('default');
      });
    });

    describe('condition multipliers', () => {
      it('should apply higher multiplier for new condition', () => {
        const newResult = estimateValue('Item', null, 100, 'new', 'electronics');
        const usedResult = estimateValue('Item', null, 100, 'fair', 'electronics');

        expect(newResult.estimatedValue).toBeGreaterThan(usedResult.estimatedValue);
      });

      it('should apply like new condition multiplier', () => {
        const likeNewResult = estimateValue('Item', null, 100, 'like new', 'electronics');
        const newResult = estimateValue('Item', null, 100, 'new', 'electronics');

        expect(likeNewResult.estimatedValue).toBeLessThan(newResult.estimatedValue);
        expect(likeNewResult.estimatedValue).toBeGreaterThan(0);
      });

      it('should use default condition when unknown condition provided', () => {
        const result = estimateValue('Item', null, 100, 'mystery_condition', 'electronics');
        // Should use 0.75 (good) as default
        expect(result.estimatedValue).toBeGreaterThan(0);
      });
    });

    describe('value keywords', () => {
      it('should boost value for Apple products', () => {
        const appleResult = estimateValue('iPhone 13 Pro', null, 500, 'good', 'electronics');
        const genericResult = estimateValue('Generic Phone', null, 500, 'good', 'electronics');

        expect(appleResult.estimatedValue).toBeGreaterThan(genericResult.estimatedValue);
        expect(appleResult.tags).toContain('apple');
      });

      it('should boost value for Samsung products', () => {
        const result = estimateValue(
          'Samsung Galaxy S21',
          'Great Samsung phone',
          400,
          'good',
          'electronics'
        );
        expect(result.tags).toContain('samsung');
      });

      it('should boost value for Nintendo products', () => {
        const result = estimateValue('Nintendo Switch OLED', null, 300, 'excellent', 'video games');
        expect(result.tags).toContain('nintendo');
        expect(result.confidence).toBe('high');
      });

      it('should boost value for Sony/PlayStation products', () => {
        const result = estimateValue(
          'PS5 Digital Edition',
          'PlayStation 5',
          400,
          'like new',
          'video games'
        );
        expect(result.tags).toContain('sony');
      });

      it('should boost value for Dyson products', () => {
        const result = estimateValue('Dyson V11 Vacuum', null, 300, 'good', 'appliances');
        expect(result.tags).toContain('dyson');
      });

      it('should boost value for vintage/collectible items', () => {
        const result = estimateValue(
          'Vintage 1950s Radio',
          'Antique collectible',
          100,
          'fair',
          'collectibles'
        );
        expect(result.tags).toContain('vintage');
      });

      it('should boost value for sealed/new in box items', () => {
        const result = estimateValue('Item NIB', 'New in box, sealed', 100, 'new', 'electronics');
        expect(result.tags).toContain('sealed');
      });

      it('should boost value for rare/limited edition items', () => {
        const result = estimateValue(
          'Limited Edition Console',
          'Rare collector item',
          500,
          'excellent',
          'video games'
        );
        expect(result.tags).toContain('rare');
      });

      it('should boost value for Pioneer DJ equipment', () => {
        const result = estimateValue(
          'Pioneer DDJ-SB3',
          'DJ controller',
          200,
          'like new',
          'musical'
        );
        expect(result.tags).toContain('dj-equipment');
      });

      it('should set high confidence when value keywords match and no risks', () => {
        const result = estimateValue(
          'Apple MacBook Pro',
          'Like new condition',
          800,
          'excellent',
          'electronics'
        );
        expect(result.confidence).toBe('high');
      });
    });

    describe('risk keywords', () => {
      it('should penalize broken/parts only items', () => {
        const brokenResult = estimateValue(
          'iPhone for parts only',
          'Broken screen',
          100,
          'poor',
          'electronics'
        );
        const workingResult = estimateValue(
          'iPhone working great',
          null,
          100,
          'good',
          'electronics'
        );

        expect(brokenResult.estimatedValue).toBeLessThan(workingResult.estimatedValue);
        expect(brokenResult.tags).toContain('for-parts');
        expect(brokenResult.confidence).toBe('low');
      });

      it('should penalize items needing repair', () => {
        const result = estimateValue(
          'TV needs repair',
          'Not working properly',
          200,
          'fair',
          'electronics'
        );
        expect(result.tags).toContain('needs-repair');
        expect(result.notes).toContain('Caution');
      });

      it('should penalize scratched/dented items', () => {
        const result = estimateValue(
          'Laptop scratched',
          'Some dents on case',
          500,
          'fair',
          'electronics'
        );
        expect(result.tags).toContain('cosmetic-wear');
      });

      it('should penalize incomplete items', () => {
        const result = estimateValue(
          'Game console',
          'Missing controller',
          150,
          'good',
          'video games'
        );
        expect(result.tags).toContain('incomplete');
      });

      it('should increase difficulty for items with risk factors', () => {
        const riskyResult = estimateValue(
          'Broken laptop for parts',
          null,
          100,
          'poor',
          'electronics'
        );
        const goodResult = estimateValue('Working laptop', null, 100, 'good', 'electronics');

        // Risk items should have higher difficulty (harder to resell)
        const difficultyOrder = ['VERY_EASY', 'EASY', 'MODERATE', 'HARD', 'VERY_HARD'];
        const riskyIndex = difficultyOrder.indexOf(riskyResult.resaleDifficulty);
        const goodIndex = difficultyOrder.indexOf(goodResult.resaleDifficulty);

        expect(riskyIndex).toBeGreaterThanOrEqual(goodIndex);
      });
    });

    describe('negotiable detection', () => {
      it('should detect OBO (or best offer)', () => {
        const result = estimateValue('Item for sale OBO', null, 100, 'good', null);
        expect(result.negotiable).toBe(true);
        expect(result.tags).toContain('negotiable');
      });

      it('should detect "or best offer" phrase', () => {
        const result = estimateValue('Item', 'Asking $100 or best offer', 100, 'good', null);
        expect(result.negotiable).toBe(true);
      });

      it('should detect "negotiable" keyword', () => {
        const result = estimateValue('Item', 'Price is negotiable', 100, 'good', null);
        expect(result.negotiable).toBe(true);
      });

      it('should detect "make offer" phrase', () => {
        const result = estimateValue('Item', 'Make an offer!', 100, 'good', null);
        expect(result.negotiable).toBe(true);
      });

      it('should not mark as negotiable when no indicators present', () => {
        const result = estimateValue('Item for sale', 'Fixed price, firm', 100, 'good', null);
        expect(result.negotiable).toBe(false);
        expect(result.tags).not.toContain('negotiable');
      });
    });

    describe('shippable detection', () => {
      it('should detect local pickup only items', () => {
        const result = estimateValue(
          'Large furniture',
          'Local pickup only',
          500,
          'good',
          'furniture'
        );
        expect(result.shippable).toBe(false);
        expect(result.tags).toContain('local-only');
      });

      it('should detect no shipping items', () => {
        const result = estimateValue('Item', 'No shipping, cash only', 100, 'good', null);
        expect(result.shippable).toBe(false);
      });

      it('should detect must pick up items', () => {
        const result = estimateValue(
          'Couch',
          'Must pick up from my location',
          300,
          'good',
          'furniture'
        );
        expect(result.shippable).toBe(false);
      });

      it('should mark as shippable when no local-only indicators', () => {
        const result = estimateValue(
          'Small electronics',
          'Will ship anywhere',
          50,
          'good',
          'electronics'
        );
        expect(result.shippable).toBe(true);
        expect(result.tags).not.toContain('local-only');
      });

      it('should increase difficulty for non-shippable items', () => {
        const localResult = estimateValue('Item', 'Local pickup only', 100, 'good', 'electronics');
        const shippableResult = estimateValue('Item', 'Ships anywhere', 100, 'good', 'electronics');

        const difficultyOrder = ['VERY_EASY', 'EASY', 'MODERATE', 'HARD', 'VERY_HARD'];
        const localIndex = difficultyOrder.indexOf(localResult.resaleDifficulty);
        const shippableIndex = difficultyOrder.indexOf(shippableResult.resaleDifficulty);

        expect(localIndex).toBeGreaterThanOrEqual(shippableIndex);
      });
    });

    describe('profit calculations', () => {
      it('should calculate profit accounting for 13% platform fees', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        // Profit should be estimated value * (1 - 0.13) - asking price
        const expectedProfitMid = result.estimatedValue * 0.87 - 100;
        expect(result.profitPotential).toBeCloseTo(expectedProfitMid, 0);
      });

      it('should calculate profit range from low to high', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        expect(result.profitLow).toBeLessThanOrEqual(result.profitPotential);
        expect(result.profitHigh).toBeGreaterThanOrEqual(result.profitPotential);
      });

      it('should show negative profit for overpriced items', () => {
        // An item with severe penalties should show negative profit
        const result = estimateValue(
          'Broken item',
          'For parts only, not working',
          1000,
          'poor',
          'electronics'
        );
        expect(result.profitPotential).toBeLessThan(0);
      });
    });

    describe('value score', () => {
      it('should return score between 0 and 100', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        expect(result.valueScore).toBeGreaterThanOrEqual(0);
        expect(result.valueScore).toBeLessThanOrEqual(100);
      });

      it('should give higher score for items with good profit margin', () => {
        const goodDeal = estimateValue(
          'Apple iPhone sealed',
          'New in box',
          200,
          'new',
          'electronics'
        );
        const badDeal = estimateValue(
          'Broken junk',
          'For parts, not working',
          500,
          'poor',
          'electronics'
        );

        expect(goodDeal.valueScore).toBeGreaterThan(badDeal.valueScore);
      });

      it('should cap score at 30 for items with less than $10 profit', () => {
        // Create an item with very low profit potential
        const result = estimateValue('Generic item', null, 100, 'poor', 'default');
        if (result.profitPotential < 10) {
          expect(result.valueScore).toBeLessThanOrEqual(30);
        }
      });

      it('should cap score at 10 for items with negative profit', () => {
        const result = estimateValue('Broken item', 'For parts only', 1000, 'poor', 'electronics');
        if (result.profitPotential < 0) {
          expect(result.valueScore).toBeLessThanOrEqual(10);
        }
      });
    });

    describe('discount percent', () => {
      it('should calculate discount percentage correctly', () => {
        const result = estimateValue('Item', null, 50, 'good', 'electronics');
        // Discount = (estimatedValue - askingPrice) / estimatedValue * 100
        const expectedDiscount = ((result.estimatedValue - 50) / result.estimatedValue) * 100;
        expect(result.discountPercent).toBeCloseTo(expectedDiscount, 0);
      });

      it('should show positive discount when item is priced below market', () => {
        const result = estimateValue(
          'Apple MacBook Pro',
          'Like new',
          500,
          'excellent',
          'electronics'
        );
        expect(result.discountPercent).toBeGreaterThan(0);
      });
    });

    describe('resale difficulty', () => {
      it('should return valid difficulty level', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        const validDifficulties = ['VERY_EASY', 'EASY', 'MODERATE', 'HARD', 'VERY_HARD'];
        expect(validDifficulties).toContain(result.resaleDifficulty);
      });

      it('should rate video games as easier to resell', () => {
        const result = estimateValue('Nintendo Switch game', null, 30, 'good', 'video games');
        const difficultyOrder = ['VERY_EASY', 'EASY', 'MODERATE', 'HARD', 'VERY_HARD'];
        const index = difficultyOrder.indexOf(result.resaleDifficulty);
        expect(index).toBeLessThanOrEqual(2); // Should be EASY or easier
      });

      it('should rate furniture as harder to resell', () => {
        const result = estimateValue('Large couch', null, 200, 'good', 'furniture');
        const difficultyOrder = ['VERY_EASY', 'EASY', 'MODERATE', 'HARD', 'VERY_HARD'];
        const index = difficultyOrder.indexOf(result.resaleDifficulty);
        expect(index).toBeGreaterThanOrEqual(2); // Should be MODERATE or harder
      });

      it('should reduce difficulty for known brands', () => {
        const brandedResult = estimateValue('Apple iPhone', null, 300, 'good', 'electronics');
        const genericResult = estimateValue('Generic phone', null, 300, 'good', 'electronics');

        const difficultyOrder = ['VERY_EASY', 'EASY', 'MODERATE', 'HARD', 'VERY_HARD'];
        const brandedIndex = difficultyOrder.indexOf(brandedResult.resaleDifficulty);
        const genericIndex = difficultyOrder.indexOf(genericResult.resaleDifficulty);

        expect(brandedIndex).toBeLessThanOrEqual(genericIndex);
      });
    });

    describe('comparable URLs', () => {
      it('should generate 4 comparable URLs', () => {
        const result = estimateValue('iPhone 12', null, 300, 'good', 'electronics');
        expect(result.comparableUrls).toHaveLength(4);
      });

      it('should include eBay sold listings URL', () => {
        const result = estimateValue('iPhone 12', null, 300, 'good', 'electronics');
        const ebaySold = result.comparableUrls.find(
          (url: ComparableUrl) => url.platform === 'eBay' && url.type === 'sold'
        );
        expect(ebaySold).toBeDefined();
        expect(ebaySold?.url).toContain('ebay.com');
        expect(ebaySold?.url).toContain('LH_Sold=1');
      });

      it('should include eBay active listings URL', () => {
        const result = estimateValue('iPhone 12', null, 300, 'good', 'electronics');
        const ebayActive = result.comparableUrls.find(
          (url: ComparableUrl) => url.platform === 'eBay' && url.type === 'active'
        );
        expect(ebayActive).toBeDefined();
        expect(ebayActive?.url).toContain('ebay.com');
      });

      it('should include Facebook Marketplace URL', () => {
        const result = estimateValue('iPhone 12', null, 300, 'good', 'electronics');
        const facebook = result.comparableUrls.find(
          (url: ComparableUrl) => url.platform === 'Facebook'
        );
        expect(facebook).toBeDefined();
        expect(facebook?.url).toContain('facebook.com/marketplace');
      });

      it('should include Mercari URL', () => {
        const result = estimateValue('iPhone 12', null, 300, 'good', 'electronics');
        const mercari = result.comparableUrls.find(
          (url: ComparableUrl) => url.platform === 'Mercari'
        );
        expect(mercari).toBeDefined();
        expect(mercari?.url).toContain('mercari.com');
      });

      it('should encode search query in URLs', () => {
        const result = estimateValue('Apple iPhone 12 Pro Max', null, 500, 'good', 'electronics');
        const ebaySold = result.comparableUrls.find((url: ComparableUrl) => url.type === 'sold');
        // URL should be encoded
        expect(ebaySold?.url).toContain('%20');
      });
    });

    describe('reasoning and notes', () => {
      it('should include category in reasoning', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        expect(result.reasoning).toContain('electronics');
      });

      it('should include condition factor in reasoning', () => {
        const result = estimateValue('Item', null, 100, 'excellent', 'electronics');
        expect(result.reasoning).toContain('Condition factor');
      });

      it('should include value indicators in reasoning when present', () => {
        const result = estimateValue('Apple iPhone', null, 300, 'good', 'electronics');
        expect(result.reasoning).toContain('Value indicators');
        expect(result.reasoning).toContain('Apple');
      });

      it('should include risk factors in reasoning when present', () => {
        const result = estimateValue('Broken item', 'For parts only', 100, 'poor', 'electronics');
        expect(result.reasoning).toContain('Risk factors');
      });

      it('should generate notes about flip potential', () => {
        const result = estimateValue(
          'Apple iPhone sealed',
          'New in box',
          200,
          'new',
          'electronics'
        );
        expect(result.notes.length).toBeGreaterThan(0);
      });

      it('should mention negotiable in notes when detected', () => {
        const result = estimateValue('Item OBO', 'Price negotiable', 100, 'good', null);
        expect(result.notes).toContain('negotiable');
      });

      it('should mention local pickup in notes when detected', () => {
        const result = estimateValue('Item', 'Local pickup only', 100, 'good', null);
        expect(result.notes).toContain('Local pickup');
      });
    });

    describe('tags', () => {
      it('should include category in tags', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        expect(result.tags).toContain('electronics');
      });

      it('should include multiple brand tags when detected', () => {
        const result = estimateValue('Apple Samsung bundle', null, 500, 'good', 'electronics');
        expect(result.tags).toContain('apple');
        expect(result.tags).toContain('samsung');
      });

      it('should return array of strings for tags', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        expect(Array.isArray(result.tags)).toBe(true);
        result.tags.forEach((tag: string) => {
          expect(typeof tag).toBe('string');
        });
      });
    });

    describe('edge cases', () => {
      it('should handle null description', () => {
        const result = estimateValue('Item', null, 100, 'good', 'electronics');
        expect(result).toBeDefined();
        expect(result.estimatedValue).toBeGreaterThan(0);
      });

      it('should handle null condition', () => {
        const result = estimateValue('Item', 'Description', 100, null, 'electronics');
        expect(result).toBeDefined();
        expect(result.estimatedValue).toBeGreaterThan(0);
      });

      it('should handle null category', () => {
        const result = estimateValue('Item', 'Description', 100, 'good', null);
        expect(result).toBeDefined();
        expect(result.tags).toContain('default');
      });

      it('should handle very low asking price', () => {
        const result = estimateValue('Item', null, 1, 'good', 'electronics');
        expect(result.estimatedValue).toBeGreaterThan(0);
        expect(result.profitPotential).toBeDefined();
      });

      it('should handle very high asking price', () => {
        const result = estimateValue('Item', null, 100000, 'good', 'electronics');
        expect(result.estimatedValue).toBeGreaterThan(0);
        expect(result.profitPotential).toBeDefined();
      });

      it('should handle empty string title', () => {
        const result = estimateValue('', null, 100, 'good', 'electronics');
        expect(result).toBeDefined();
      });

      it('should handle special characters in title', () => {
        const result = estimateValue('Item!@#$%^&*()', 'Special chars!', 100, 'good', null);
        expect(result).toBeDefined();
        expect(result.comparableUrls.length).toBe(4);
      });
    });
  });

  describe('detectCategory', () => {
    describe('electronics detection', () => {
      it('should detect phones as electronics', () => {
        expect(detectCategory('iPhone 12 Pro', null)).toBe('electronics');
        expect(detectCategory('Samsung phone', 'Great phone')).toBe('electronics');
      });

      it('should detect computers as electronics', () => {
        expect(detectCategory('Gaming laptop', null)).toBe('electronics');
        expect(detectCategory('Dell computer', 'Desktop PC')).toBe('electronics');
      });

      it('should detect tablets as electronics', () => {
        expect(detectCategory('iPad Pro', null)).toBe('electronics');
        expect(detectCategory('Android tablet', null)).toBe('electronics');
      });

      it('should detect TVs and monitors as electronics', () => {
        expect(detectCategory('Samsung 55" TV', null)).toBe('electronics');
        expect(detectCategory('Gaming monitor', '27 inch display')).toBe('electronics');
      });

      it('should detect cameras as electronics', () => {
        expect(detectCategory('Canon DSLR camera', null)).toBe('electronics');
      });

      it('should detect speakers and headphones as electronics', () => {
        expect(detectCategory('Bluetooth speaker', null)).toBe('electronics');
        expect(detectCategory('Sony headphones', 'Wireless headphone')).toBe('electronics');
      });
    });

    describe('furniture detection', () => {
      it('should detect couches and sofas as furniture', () => {
        expect(detectCategory('Leather couch', null)).toBe('furniture');
        expect(detectCategory('Sectional sofa', 'Living room sofa')).toBe('furniture');
      });

      it('should detect tables and desks as furniture', () => {
        expect(detectCategory('Dining table', null)).toBe('furniture');
        expect(detectCategory('Office desk', 'Standing desk')).toBe('furniture');
      });

      it('should detect chairs as furniture', () => {
        expect(detectCategory('Office chair', null)).toBe('furniture');
      });

      it('should detect beds and dressers as furniture', () => {
        expect(detectCategory('Queen bed frame', null)).toBe('furniture');
        expect(detectCategory('Wooden dresser', null)).toBe('furniture');
      });
    });

    describe('appliances detection', () => {
      it('should detect washing machines as appliances', () => {
        expect(detectCategory('Samsung washer', null)).toBe('appliances');
      });

      it('should detect dryers as appliances', () => {
        expect(detectCategory('LG dryer', 'Electric dryer')).toBe('appliances');
      });

      it('should detect refrigerators as appliances', () => {
        expect(detectCategory('French door refrigerator', null)).toBe('appliances');
        expect(detectCategory('Mini fridge', null)).toBe('appliances');
      });

      it('should detect vacuums as appliances', () => {
        expect(detectCategory('Dyson vacuum', null)).toBe('appliances');
      });
    });

    describe('tools detection', () => {
      it('should detect power tools as tools', () => {
        expect(detectCategory('Dewalt drill', null)).toBe('tools');
        expect(detectCategory('Milwaukee saw', 'Power saw')).toBe('tools');
      });

      it('should detect hand tools as tools', () => {
        expect(detectCategory('Wrench set', null)).toBe('tools');
        expect(detectCategory('Hammer', null)).toBe('tools');
      });

      it('should detect tool brands as tools', () => {
        expect(detectCategory('Makita set', null)).toBe('tools');
      });
    });

    describe('video games detection', () => {
      it('should detect gaming consoles as video games', () => {
        expect(detectCategory('PS5 console', 'PlayStation 5')).toBe('video games');
        expect(detectCategory('Xbox Series X', null)).toBe('video games');
        expect(detectCategory('Nintendo Switch', null)).toBe('video games');
      });

      it('should detect game controllers as video games', () => {
        expect(detectCategory('PS4 controller', null)).toBe('video games');
      });

      it('should detect games as video games', () => {
        expect(detectCategory('Video game collection', null)).toBe('video games');
      });
    });

    describe('collectibles detection', () => {
      it('should detect vintage items as collectibles', () => {
        expect(detectCategory('Vintage radio', null)).toBe('collectibles');
      });

      it('should detect antiques as collectibles', () => {
        expect(detectCategory('Antique clock', null)).toBe('collectibles');
      });

      it('should detect rare items as collectibles', () => {
        expect(detectCategory('Rare coin', 'Collectible coin')).toBe('collectibles');
      });

      it('should detect trading cards as collectibles', () => {
        expect(detectCategory('Pokemon card collection', null)).toBe('collectibles');
      });
    });

    describe('clothing detection', () => {
      it('should detect shirts and pants as clothing', () => {
        expect(detectCategory('Designer shirt', null)).toBe('clothing');
        expect(detectCategory('Jeans pants', null)).toBe('clothing');
      });

      it('should detect shoes as clothing', () => {
        expect(detectCategory('Nike shoes', null)).toBe('clothing');
      });

      it('should detect jackets and coats as clothing', () => {
        expect(detectCategory('Winter jacket', null)).toBe('clothing');
        expect(detectCategory('Wool coat', null)).toBe('clothing');
      });
    });

    describe('sports detection', () => {
      it('should detect bikes as sports', () => {
        expect(detectCategory('Mountain bike', null)).toBe('sports');
        expect(detectCategory('Road bicycle', null)).toBe('sports');
      });

      it('should detect fitness equipment as sports', () => {
        expect(detectCategory('Gym weights', 'Fitness equipment')).toBe('sports');
        expect(detectCategory('Treadmill', null)).toBe('sports');
      });

      it('should detect golf equipment as sports', () => {
        expect(detectCategory('Golf clubs', null)).toBe('sports');
      });
    });

    describe('musical detection', () => {
      it('should detect guitars as musical', () => {
        expect(detectCategory('Fender guitar', null)).toBe('musical');
      });

      it('should detect keyboards as musical', () => {
        expect(detectCategory('Yamaha keyboard', 'Electric piano')).toBe('musical');
      });

      it('should detect DJ equipment as musical', () => {
        expect(detectCategory('Pioneer DDJ', 'DJ controller')).toBe('musical');
      });

      it('should detect amplifiers as musical', () => {
        expect(detectCategory('Guitar amp', 'Marshall amplifier')).toBe('musical');
      });
    });

    describe('automotive detection', () => {
      it('should detect car parts as automotive', () => {
        expect(detectCategory('Car parts', null)).toBe('automotive');
      });

      it('should detect tires as automotive', () => {
        expect(detectCategory('Winter tires', 'Set of 4 tire')).toBe('automotive');
      });

      it('should detect wheels as automotive', () => {
        expect(detectCategory('Chrome wheels', 'Alloy wheel set')).toBe('automotive');
      });
    });

    describe('other category', () => {
      it('should return other for unrecognized items', () => {
        expect(detectCategory('Random thing', null)).toBe('other');
        expect(detectCategory('Stuff for sale', 'Miscellaneous items')).toBe('other');
      });
    });

    describe('edge cases', () => {
      it('should handle null description', () => {
        const result = detectCategory('iPhone', null);
        expect(result).toBe('electronics');
      });

      it('should handle empty string description', () => {
        const result = detectCategory('iPhone', '');
        expect(result).toBe('electronics');
      });

      it('should be case insensitive', () => {
        expect(detectCategory('IPHONE', null)).toBe('electronics');
        expect(detectCategory('iPhone', 'LAPTOP computer')).toBe('electronics');
      });

      it('should check both title and description', () => {
        // Title doesn't match but description does
        expect(detectCategory('Item for sale', 'This is a laptop')).toBe('electronics');
      });
    });
  });

  describe('generatePurchaseMessage', () => {
    describe('non-negotiable items', () => {
      it('should generate message for non-negotiable item', () => {
        const message = generatePurchaseMessage('iPhone 12', 300, false, 'John');

        expect(message).toContain('Hi John,');
        expect(message).toContain('iPhone 12');
        expect(message).toContain('$300');
        expect(message).toContain('still available');
        expect(message).not.toContain('Would you consider');
      });

      it('should use generic greeting without seller name', () => {
        const message = generatePurchaseMessage('iPhone 12', 300, false, null);

        expect(message).toContain('Hi,');
        expect(message).not.toContain('Hi null');
      });

      it('should mention pickup and cash payment', () => {
        const message = generatePurchaseMessage('Item', 100, false, null);

        expect(message).toContain('pick up');
        expect(message).toContain('cash');
      });
    });

    describe('negotiable items', () => {
      it('should generate message with offer for negotiable item', () => {
        const message = generatePurchaseMessage('iPhone 12', 300, true, 'John');

        expect(message).toContain('Hi John,');
        expect(message).toContain('Would you consider');
        // Should offer 85% of asking price
        expect(message).toContain('$255');
      });

      it('should calculate 15% discount offer', () => {
        const message = generatePurchaseMessage('Item', 200, true, null);
        // 200 * 0.85 = 170
        expect(message).toContain('$170');
      });

      it('should round offer price to whole number', () => {
        const message = generatePurchaseMessage('Item', 99, true, null);
        // 99 * 0.85 = 84.15, should round to 84
        expect(message).toContain('$84');
      });

      it('should mention same day pickup for negotiable items', () => {
        const message = generatePurchaseMessage('Item', 100, true, null);
        expect(message).toContain('today/tomorrow');
      });
    });

    describe('title truncation', () => {
      it('should truncate long titles', () => {
        const longTitle =
          'This is a very long title that exceeds the maximum allowed character limit for display purposes';
        const message = generatePurchaseMessage(longTitle, 100, false, null);

        expect(message).toContain('...');
        expect(message.length).toBeLessThan(longTitle.length + 200);
      });

      it('should not truncate short titles', () => {
        const shortTitle = 'iPhone 12';
        const message = generatePurchaseMessage(shortTitle, 100, false, null);

        expect(message).toContain(shortTitle);
        expect(message).not.toContain('...');
      });
    });

    describe('edge cases', () => {
      it('should handle zero price', () => {
        const message = generatePurchaseMessage('Free item', 0, false, null);
        expect(message).toContain('$0');
      });

      it('should handle undefined seller name', () => {
        const message = generatePurchaseMessage('Item', 100, false, undefined);
        expect(message).toContain('Hi,');
      });

      it('should handle empty seller name', () => {
        const message = generatePurchaseMessage('Item', 100, false, '');
        // Empty string is falsy, should use generic greeting
        expect(message).toContain('Hi,');
      });

      it('should always end with Thanks', () => {
        const message1 = generatePurchaseMessage('Item', 100, false, null);
        const message2 = generatePurchaseMessage('Item', 100, true, 'Seller');

        expect(message1).toContain('Thanks!');
        expect(message2).toContain('Thanks!');
      });
    });
  });
});
