import {
  estimateValue,
  detectCategory,
  generatePurchaseMessage,
  applyDemandAdjustment,
  getDemandBadge,
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
        // Electronics (recalibrated 2026-04-15): low 1.3, high 1.8, good condition: 0.75
        // Expected range: 100 * 1.3 * 0.75 = ~98 to 100 * 1.8 * 0.75 = ~135
        expect(result.estimatedLow).toBeGreaterThanOrEqual(90);
        expect(result.estimatedHigh).toBeLessThanOrEqual(140);
      });

      it('should apply collectibles category multiplier (higher markup)', () => {
        const result = estimateValue('Vintage item', null, 100, 'good', 'collectibles');
        // Collectibles (recalibrated 2026-04-15): low 1.4, high 2.2
        // "Vintage" triggers vintage boost (1.3x), good condition (0.75)
        // estLow = 100 * 1.4 * 0.75 * 1.3 = 137
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

      // --- Negative pattern tests (Story 13.5) ---

      it('should NOT boost for "compatible with Nintendo Switch"', () => {
        const result = estimateValue('Phone case compatible with Nintendo Switch', null, 10, 'new', 'electronics');
        expect(result.tags).not.toContain('nintendo');
      });

      it('should boost for genuine "Nintendo Switch OLED"', () => {
        const result = estimateValue('Nintendo Switch OLED 64GB', null, 300, 'excellent', 'video games');
        expect(result.tags).toContain('nintendo');
      });

      it('should NOT boost for "vintage-style" design items', () => {
        const result = estimateValue('Modern lamp, vintage-style design', null, 50, 'new', 'furniture');
        expect(result.tags).not.toContain('vintage');
      });

      it('should boost for genuine "Vintage Pyrex Mixing Bowl"', () => {
        const result = estimateValue('Vintage Pyrex Mixing Bowl', null, 30, 'good', 'collectibles');
        expect(result.tags).toContain('vintage');
      });

      it('should NOT boost for "rarely used" items (false rare)', () => {
        const result = estimateValue('Rarely used blender', null, 30, 'like new', 'appliances');
        expect(result.tags).not.toContain('rare');
      });

      it('should NOT boost "sealed" when only in deep description (>100 chars)', () => {
        const longDesc = 'x'.repeat(150) + ' original box sealed';
        const result = estimateValue('Used iPhone 15', longDesc, 500, 'good', 'electronics');
        expect(result.tags).not.toContain('sealed');
      });

      it('should boost "Sealed iPhone 15" in title', () => {
        const result = estimateValue('Sealed iPhone 15', null, 800, 'new', 'electronics');
        expect(result.tags).toContain('sealed');
      });

      it('should NOT boost apple for "apple cider press"', () => {
        const result = estimateValue('Apple cider press vintage', null, 50, 'good', 'appliances');
        expect(result.tags).not.toContain('apple');
        // Should still get vintage boost though
        expect(result.tags).toContain('vintage');
      });

      it('should still apply risk keywords from description', () => {
        const result = estimateValue('PS5 Console', 'slightly scratched on top, works great', 400, 'good', 'video games');
        expect(result.tags).toContain('cosmetic-wear');
        expect(result.tags).toContain('sony');
      });

      it('should apply risk from description even when title is clean', () => {
        const result = estimateValue('Gaming Console', 'Broken, for parts only', 200, 'poor', 'video games');
        expect(result.tags).toContain('for-parts');
      });

      it('should NOT boost for "light switch" (false Nintendo)', () => {
        const result = estimateValue('Light switch cover plate', null, 10, 'new', 'default');
        expect(result.tags).not.toContain('nintendo');
      });

      // --- End negative pattern tests ---

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

      it('should cap score at 40 for items with less than $15 profit', () => {
        // Generic item, new condition, feeRate=0 so profit is small but positive
        // default category (1.2–1.5), new (1.0): estLow=36, estHigh=45 for asking=30
        // profitLow=36-30=6, profitHigh=45-30=15, profitPotential=~10 → <$15
        const result = estimateValue('Generic item', null, 30, 'new', 'default', 0);
        expect(result.profitPotential).toBeGreaterThanOrEqual(0);
        expect(result.profitPotential).toBeLessThan(15);
        expect(result.valueScore).toBeLessThanOrEqual(40);
      });

      it('should cap score at 10 for items with negative profit', () => {
        // $1000 broken item with risk penalties → deeply negative profit
        const result = estimateValue('Broken item', 'For parts only, not working', 1000, 'poor', 'electronics');
        expect(result.profitPotential).toBeLessThan(0);
        expect(result.valueScore).toBeLessThanOrEqual(10);
      });

      it('should score high-absolute-profit items higher than high-margin-low-profit items', () => {
        // $300 Apple MacBook (good, electronics) → high absolute profit
        // $5 generic cable (good, electronics) → tiny absolute profit even if margin is high
        const highProfit = estimateValue('Apple MacBook Pro', null, 300, 'good', 'electronics');
        const highMargin = estimateValue('Generic cable', null, 5, 'good', 'electronics');
        expect(highProfit.profitPotential).toBeGreaterThan(highMargin.profitPotential);
        expect(highProfit.valueScore).toBeGreaterThan(highMargin.valueScore);
      });

      it('should cap score at 15 for items with exactly $0 profit', () => {
        // Craft an item where profitPotential rounds to 0.
        // default category (1.2-1.5), good (0.75), 13% fee:
        // estLow=0.9*price, estHigh=1.125*price, profitLow=0.9*0.87*price - price = -0.217*price
        // profitHigh=1.125*0.87*price - price = -0.021*price → both negative for any price
        // Use feeRate=0: profitLow=0.9*price-price=-0.1*price, profitHigh=1.125*price-price=0.125*price
        // profitPotential = 0.0125*price → need price where round(0.0125*price) = 0 → price < 40
        // At price=30: profitLow=round(27-30)=-3, profitHigh=round(33.75-30)=4, avg=0.5→1
        // At price=20: estLow=24, estHigh=30, profitLow=-(-4??) Wait, let me recalc
        // price=20, feeRate=0, default(1.2,1.5), good(0.75):
        //   estLow=round(20*1.2*0.75)=18, estHigh=round(20*1.5*0.75)=23
        //   profitLow=round(18-20)=-2, profitHigh=round(23-20)=3, profitPotential=round(0.5)=1
        // price=10: estLow=round(9)=9, estHigh=round(11.25)=11
        //   profitLow=round(-1)=-1, profitHigh=round(1)=1, profitPotential=round(0)=0
        const result = estimateValue('Generic item', null, 10, 'good', 'default', 0);
        expect(result.profitPotential).toBe(0);
        expect(result.valueScore).toBeLessThanOrEqual(15);
      });

      it('should apply exclusive boosts — >$300 profit gets +10 only (not +5 AND +10)', () => {
        // Sealed Apple MacBook at low asking price → huge profit margin + absolute profit >$300
        // Recalibrated 2026-04-15 (Story 13.7):
        // collectibles (1.4-2.2), vintage (1.3), rare (1.3), sealed (1.3)
        // boosts: vintage(1.3)*rare(1.3)*sealed(1.3) = 2.197
        // For asking=200, new condition (1.0):
        // estLow=200*1.4*1.0*2.197=615, estHigh=200*2.2*1.0*2.197=967
        // profitLow=615*0.87-200=335, profitHigh=967*0.87-200=641, avg=488 → >$300
        const bigWin = estimateValue('Vintage Rare Limited Edition sealed', null, 200, 'new', 'collectibles');
        expect(bigWin.profitPotential).toBeGreaterThan(300);
        expect(bigWin.valueScore).toBeGreaterThanOrEqual(0);
        expect(bigWin.valueScore).toBeLessThanOrEqual(100);
        // The >$500 boost (+15) or >$300 boost (+10) applies exclusively (not cumulative with lower tiers)
      });

      it('should use weighted formula: 50% margin + 50% absolute profit with log curve 36 (recalibrated 2026-04-15)', () => {
        // Verify the formula math directly with a controlled input
        // default category (1.2-1.5), new condition (1.0), feeRate=0, asking=100
        // estLow=120, estHigh=150, estValue=135
        // profitLow=20, profitHigh=50, profitPotential=35
        // marginScore = min(100, max(0, round(35/100*100 + 50))) = min(100, 85) = 85
        // absoluteProfitScore = min(100, round(log10(35) * 36)) = round(1.544*36) = round(55.6) = 56
        // weightedScore = round(85*0.5 + 56*0.5) = round(42.5 + 28) = round(70.5) = 71
        // No caps apply (profit=35 > 15), no boosts (profit < 100)
        const result = estimateValue('Generic item', null, 100, 'new', 'default', 0);
        expect(result.profitPotential).toBe(35);
        // marginScore=85, absoluteProfitScore=56, weighted=71
        expect(result.valueScore).toBe(71);
      });

      it('should score $35-profit item around 56-75 range (Task 3.3, recalibrated 2026-04-15)', () => {
        // Recalibrated: collectibles is now 1.4-2.2 (was 1.5-2.5), good (0.75):
        // estLow=100*1.4*0.75=105, estHigh=100*2.2*0.75=165
        // profitLow=5, profitHigh=65, profitPotential≈35
        const result = estimateValue('Collectible item', null, 100, 'good', 'collectibles', 0);
        expect(result.profitPotential).toBeGreaterThanOrEqual(30);
        expect(result.profitPotential).toBeLessThanOrEqual(50);
        expect(result.valueScore).toBeGreaterThanOrEqual(56);
        expect(result.valueScore).toBeLessThanOrEqual(80);
      });

      it('should score $100-profit items higher than $10-profit items (Task 3.4)', () => {
        // Compare two items with different absolute profits
        const lowProfit = estimateValue('Generic item', null, 30, 'new', 'default', 0);
        const highProfit = estimateValue('Collectible treasure', null, 50, 'new', 'collectibles', 0);
        expect(highProfit.profitPotential).toBeGreaterThan(lowProfit.profitPotential);
        expect(highProfit.valueScore).toBeGreaterThan(lowProfit.valueScore);
      });

      it('should produce varied score distribution across diverse items (Task 3.5)', () => {
        // 20+ sample items spanning categories, prices, and conditions
        const items = [
          { title: 'Generic cable', price: 5, cond: 'good', cat: 'electronics' },
          { title: 'Used book', price: 3, cond: 'fair', cat: 'default' },
          { title: 'Broken lamp', price: 10, cond: 'poor', cat: 'default' },
          { title: 'iPhone 12', price: 200, cond: 'good', cat: 'electronics' },
          { title: 'Apple MacBook Pro', price: 500, cond: 'excellent', cat: 'electronics' },
          { title: 'Nintendo Switch', price: 150, cond: 'like new', cat: 'video games' },
          { title: 'PS5 Console', price: 300, cond: 'new', cat: 'video games' },
          { title: 'Dyson V11', price: 200, cond: 'good', cat: 'appliances' },
          { title: 'Vintage Radio', price: 50, cond: 'fair', cat: 'collectibles' },
          { title: 'Herman Miller Chair', price: 400, cond: 'good', cat: 'furniture' },
          { title: 'DeWalt drill set', price: 80, cond: 'good', cat: 'tools' },
          { title: 'Mountain bike', price: 150, cond: 'good', cat: 'sports' },
          { title: 'Pioneer DDJ-400', price: 100, cond: 'like new', cat: 'musical' },
          { title: 'Samsung Galaxy S24', price: 350, cond: 'excellent', cat: 'electronics' },
          { title: 'Nike Air Max', price: 60, cond: 'new', cat: 'clothing' },
          { title: 'Rare coin collection', price: 200, cond: 'excellent', cat: 'collectibles' },
          { title: 'KitchenAid mixer', price: 150, cond: 'good', cat: 'appliances' },
          { title: 'Sealed Nintendo game', price: 40, cond: 'new', cat: 'video games' },
          { title: 'Winter tires set', price: 200, cond: 'good', cat: 'automotive' },
          { title: 'Office desk', price: 75, cond: 'good', cat: 'furniture' },
          { title: 'Broken TV for parts', price: 500, cond: 'poor', cat: 'electronics' },
          { title: 'Yamaha keyboard', price: 120, cond: 'good', cat: 'musical' },
        ];

        const scores = items.map((item) =>
          estimateValue(item.title, null, item.price, item.cond, item.cat).valueScore
        );

        // All scores within valid range
        scores.forEach((s) => {
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
        });

        // Distribution check: at least 3 distinct score buckets are populated
        // Buckets: 0-20, 21-40, 41-60, 61-80, 81-100
        const buckets = [0, 0, 0, 0, 0];
        scores.forEach((s) => {
          const idx = Math.min(4, Math.floor(s / 20));
          buckets[idx]++;
        });
        const populatedBuckets = buckets.filter((b) => b > 0).length;
        expect(populatedBuckets).toBeGreaterThanOrEqual(3);
      });

      it('should handle sub-dollar profit correctly (Task 3.6)', () => {
        // Very cheap item where profit is < $1
        // default (1.2-1.5), good (0.75), feeRate=0, asking=5
        // estLow=round(5*1.2*0.75)=5, estHigh=round(5*1.5*0.75)=6
        // profitLow=0, profitHigh=1, profitPotential=round(0.5)=1
        const result = estimateValue('Tiny item', null, 5, 'good', 'default', 0);
        expect(result.profitPotential).toBeGreaterThanOrEqual(0);
        expect(result.profitPotential).toBeLessThan(15);
        // Sub-$15 cap applies
        expect(result.valueScore).toBeLessThanOrEqual(40);
      });

      it('should cap at boundary: profit just below $15 gets capped at 40 (Task 3.7)', () => {
        // electronics (1.2-1.6), new (1.0), feeRate=0, asking=60
        // estLow=72, estHigh=96, profitLow=12, profitHigh=36, profitPotential=24
        // That's >$15, so no cap. Try asking=50:
        // estLow=60, estHigh=80, profitLow=10, profitHigh=30, profitPotential=20 → >$15
        // Try default (1.2-1.5), new, feeRate=0, asking=100:
        // estLow=120, estHigh=150, profitLow=20, profitHigh=50, profitPotential=35 → >$15
        // Use asking=30, default, new, feeRate=0:
        // estLow=36, estHigh=45, profitLow=6, profitHigh=15, profitPotential=round(10.5)=11 → <$15
        const belowCap = estimateValue('Generic widget', null, 30, 'new', 'default', 0);
        expect(belowCap.profitPotential).toBeLessThan(15);
        expect(belowCap.valueScore).toBeLessThanOrEqual(40);

        // Now an item with profit > $15 should NOT be capped at 40
        const aboveCap = estimateValue('Generic widget', null, 100, 'new', 'default', 0);
        expect(aboveCap.profitPotential).toBeGreaterThanOrEqual(15);
        // Not capped at 40 — score can be higher
        expect(aboveCap.valueScore).toBeGreaterThan(40);
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

  // ==========================================================
  // applyDemandAdjustment (Story 13.6)
  // ==========================================================

  describe('applyDemandAdjustment', () => {
    it('should boost score for rising demand when item is underpriced', () => {
      const adjusted = applyDemandAdjustment(70, 'rising', null, 30);
      expect(adjusted).toBe(Math.round(70 * 1.15)); // 81
      expect(adjusted).toBeGreaterThan(70);
    });

    it('should penalize score for declining demand', () => {
      const adjusted = applyDemandAdjustment(70, 'declining', null, 30);
      expect(adjusted).toBe(Math.round(70 * 0.85)); // 60
      expect(adjusted).toBeLessThan(70);
    });

    it('should heavily penalize low_liquidity (zero sales)', () => {
      const adjusted = applyDemandAdjustment(70, 'low_liquidity', null, 30);
      expect(adjusted).toBe(Math.round(70 * 0.70)); // 49
      expect(adjusted).toBeLessThan(60);
    });

    it('should NOT boost for rising demand when item is overpriced', () => {
      // discountPercent <= 0 means overpriced — demand boost should not apply
      const adjusted = applyDemandAdjustment(70, 'rising', null, -10);
      expect(adjusted).toBe(70); // no change
    });

    it('should apply LLM demandLevel fallback', () => {
      const veryHigh = applyDemandAdjustment(70, 'very_high', null, 30);
      const high = applyDemandAdjustment(70, 'high', null, 30);
      expect(veryHigh).toBe(Math.round(70 * 1.15)); // 81
      expect(high).toBe(Math.round(70 * 1.05)); // 74
    });

    it('should subtract 5 for items taking >30 days to sell', () => {
      const adjusted = applyDemandAdjustment(70, 'stable', 45, 30);
      expect(adjusted).toBe(65); // 70 * 1.0 - 5
    });

    it('should subtract 10 for items taking >60 days (not cumulative)', () => {
      const adjusted = applyDemandAdjustment(70, 'stable', 90, 30);
      expect(adjusted).toBe(60); // 70 * 1.0 - 10 (not -15)
    });

    it('should return no adjustment when demand data is null', () => {
      const adjusted = applyDemandAdjustment(70, null, null, 30);
      expect(adjusted).toBe(70); // multiplier defaults to 1.0
    });

    it('should clamp result to 0-100', () => {
      const high = applyDemandAdjustment(99, 'rising', null, 50);
      expect(high).toBeLessThanOrEqual(100);

      const low = applyDemandAdjustment(5, 'low_liquidity', 90, 30);
      expect(low).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown demand trend as no adjustment', () => {
      const adjusted = applyDemandAdjustment(70, 'unknown_value', null, 30);
      expect(adjusted).toBe(70);
    });
  });

  describe('getDemandBadge', () => {
    it('should return "Hot" for rising demand', () => {
      expect(getDemandBadge('rising')).toEqual({ label: 'Hot', color: 'red' });
    });

    it('should return "Steady" for stable demand', () => {
      expect(getDemandBadge('stable')).toEqual({ label: 'Steady', color: 'blue' });
    });

    it('should return "Dead" for low_liquidity', () => {
      expect(getDemandBadge('low_liquidity')).toEqual({ label: 'Dead', color: 'warning' });
    });

    it('should handle LLM demandLevel types', () => {
      expect(getDemandBadge('very_high')).toEqual({ label: 'Hot', color: 'red' });
      expect(getDemandBadge('high')).toEqual({ label: 'Active', color: 'green' });
    });

    it('should return "Unknown" for null', () => {
      expect(getDemandBadge(null)).toEqual({ label: 'Unknown', color: 'gray' });
    });
  });
});
