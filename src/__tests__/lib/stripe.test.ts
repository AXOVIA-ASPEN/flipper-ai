/**
 * Tests for lib/stripe.ts - Stripe configuration and helpers
 * Author: ASPEN
 * Company: Axovia AI
 */

describe('lib/stripe', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should warn when STRIPE_SECRET_KEY is not set in production and use placeholder key', () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.NODE_ENV = 'production';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // With placeholder key the module loads without throwing
    const mod = require('@/lib/stripe');
    expect(mod.stripe).toBeDefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('STRIPE_SECRET_KEY not set')
    );
    warnSpy.mockRestore();
  });

  it('should not warn when STRIPE_SECRET_KEY is set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake123';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    require('@/lib/stripe');

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should export stripe client instance', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake123';
    const { stripe } = require('@/lib/stripe');
    expect(stripe).toBeDefined();
  });

  it('should use env vars for STRIPE_PRICE_IDS when set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake123';
    process.env.STRIPE_PRICE_FLIPPER = 'price_custom_flipper';
    process.env.STRIPE_PRICE_PRO = 'price_custom_pro';

    const { STRIPE_PRICE_IDS } = require('@/lib/stripe');
    expect(STRIPE_PRICE_IDS.FLIPPER).toBe('price_custom_flipper');
    expect(STRIPE_PRICE_IDS.PRO).toBe('price_custom_pro');
  });

  it('should use defaults for STRIPE_PRICE_IDS when env not set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake123';
    delete process.env.STRIPE_PRICE_FLIPPER;
    delete process.env.STRIPE_PRICE_PRO;

    const { STRIPE_PRICE_IDS } = require('@/lib/stripe');
    expect(STRIPE_PRICE_IDS.FLIPPER).toBe('price_flipper_monthly');
    expect(STRIPE_PRICE_IDS.PRO).toBe('price_pro_monthly');
  });

  it('should map PRICE_TO_TIER correctly', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake123';
    delete process.env.STRIPE_PRICE_FLIPPER;
    delete process.env.STRIPE_PRICE_PRO;

    const { PRICE_TO_TIER } = require('@/lib/stripe');
    expect(PRICE_TO_TIER['price_flipper_monthly']).toBe('FLIPPER');
    expect(PRICE_TO_TIER['price_pro_monthly']).toBe('PRO');
  });

  it('should export TIER_PRICING with correct values', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake123';
    const { TIER_PRICING } = require('@/lib/stripe');

    expect(TIER_PRICING.FREE.monthly).toBe(0);
    expect(TIER_PRICING.FLIPPER.monthly).toBe(1500);
    expect(TIER_PRICING.PRO.monthly).toBe(4000);
    expect(TIER_PRICING.FREE.label).toBe('Free');
    expect(TIER_PRICING.FLIPPER.label).toBe('$15/mo');
    expect(TIER_PRICING.PRO.label).toBe('$40/mo');
  });
});
