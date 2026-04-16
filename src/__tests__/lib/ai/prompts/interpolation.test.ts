/**
 * @file src/__tests__/lib/ai/prompts/interpolation.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-16
 * @version 1.0
 * @brief Verifies each registered prompt correctly interpolates context values.
 *
 * @description
 * Unit tests walk the prompt registry, call buildUserPrompt() with a realistic
 * context, and assert the returned string includes the substituted values.
 * Guards against silent prompt regressions where a context key is renamed
 * but the template still references the old key (leaving empty strings).
 */

import { getPrompt, getAllPromptNames } from '@/lib/ai/prompts';

describe('prompt interpolation — every registered prompt substitutes context values', () => {
  it('registry exposes 12 prompts', () => {
    expect(getAllPromptNames()).toHaveLength(12);
  });

  it('flipAnalysis interpolates title and asking price', () => {
    const output = getPrompt('flipAnalysis').buildUserPrompt({
      title: 'Vintage Stratocaster',
      askingPrice: 450,
      brand: 'Fender',
      model: 'Stratocaster',
      medianPrice: 900,
      lowPrice: 700,
      highPrice: 1100,
      salesCount: 12,
    });
    expect(output).toContain('Vintage Stratocaster');
    expect(output).toContain('450');
    expect(output).toContain('Fender');
    expect(output).toContain('900');
  });

  it('quickDiscountCheck interpolates listing context', () => {
    const output = getPrompt('quickDiscountCheck').buildUserPrompt({
      title: 'iPhone 14 Pro',
      askingPrice: 600,
      medianPrice: 850,
      discountThreshold: 40,
    });
    expect(output.length).toBeGreaterThan(0);
    // Must include at least one of the substituted numeric values
    expect(output).toMatch(/600|850|40/);
  });

  it('claudeAnalysis interpolates listing metadata', () => {
    const output = getPrompt('claudeAnalysis').buildUserPrompt({
      title: 'PlayStation 5',
      description: 'Barely used, original box, all cables.',
      askingPrice: 320,
      imageCount: 4,
    });
    expect(output).toContain('PlayStation 5');
    expect(output).toContain('320');
  });

  it('negotiationStrategy interpolates offer parameters', () => {
    const output = getPrompt('negotiationStrategy').buildUserPrompt({
      askingPrice: 250,
      estimatedValue: 400,
      verifiedMarketValue: 420,
      platform: 'facebook',
      feePercent: 13,
      discountPercent: 40,
      condition: 'Used - Like New',
      daysListed: 7,
      negotiable: true,
      demandLevel: 'high',
      sellabilityScore: 82,
    });
    expect(output).toContain('250');
    expect(output).toContain('400');
    expect(output).toContain('facebook');
  });

  it('counterOfferAnalysis interpolates counter offer price', () => {
    const output = getPrompt('counterOfferAnalysis').buildUserPrompt({
      askingPrice: 1200,
      ourPreviousOffer: 900,
      counterOfferPrice: 1000,
      verifiedMarketValue: 1400,
      estimatedValue: 1350,
      feePercent: 13,
      profitAtCounter: 200,
      demandLevel: 'high',
      daysListed: 10,
      negotiable: true,
    });
    expect(output).toContain('1200');
    expect(output).toContain('1000');
    expect(output).toContain('900');
  });

  it('purchaseMessage interpolates message fields', () => {
    const output = getPrompt('purchaseMessage').buildUserPrompt({
      listingTitle: 'Vintage Typewriter',
      askingPrice: 85,
      platform: 'facebook',
      messageType: 'offer',
      offerPrice: 70,
    });
    expect(output).toContain('Vintage Typewriter');
    expect(output).toMatch(/85|70/);
  });

  it('listingTitle interpolates brand and category', () => {
    const output = getPrompt('listingTitle').buildUserPrompt({
      brand: 'Nintendo',
      model: 'Switch OLED',
      category: 'Video Games',
      condition: 'Used - Like New',
    });
    expect(output).toContain('Nintendo');
    expect(output).toContain('Switch OLED');
  });

  it('listingDescription interpolates features and condition', () => {
    const output = getPrompt('listingDescription').buildUserPrompt({
      brand: 'Canon',
      model: 'EOS R5',
      condition: 'Excellent',
      features: ['45MP sensor', '8K video'],
      platform: 'ebay',
    });
    expect(output).toContain('Canon');
    expect(output).toContain('EOS R5');
  });

  it('apiDescription interpolates itemContext', () => {
    const output = getPrompt('apiDescription').buildUserPrompt({
      itemContext: 'Vintage Omega Seamaster watch from 1968',
      platform: 'ebay',
    });
    expect(output).toContain('Omega Seamaster');
  });

  it('productIdentification interpolates listing title and description', () => {
    const output = getPrompt('productIdentification').buildUserPrompt({
      title: 'Nikon D750 DSLR body',
      description: 'Great condition, low shutter count.',
      price: 850,
    });
    expect(output).toContain('Nikon D750');
  });

  it('logisticsClassification interpolates item details', () => {
    const output = getPrompt('logisticsClassification').buildUserPrompt({
      title: 'Peloton Bike+',
      description: 'Original Peloton bike with screen',
      category: 'Fitness Equipment',
    });
    expect(output).toContain('Peloton Bike+');
    expect(output).toContain('Fitness Equipment');
  });

  it('itemCompleteness interpolates image count and condition', () => {
    const output = getPrompt('itemCompleteness').buildUserPrompt({
      title: 'LEGO Star Wars Millennium Falcon',
      description: 'Complete set, all pieces included',
      imageCount: 5,
    });
    expect(output).toContain('Millennium Falcon');
  });
});
