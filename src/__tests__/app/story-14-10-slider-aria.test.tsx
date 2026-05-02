/**
 * @file src/__tests__/app/story-14-10-slider-aria.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Verifies every range slider in FilterPanel + ScoringSettings exposes the full ARIA quartet (Story 14.10 AC #3).
 *
 * @description
 * Renders the two production slider hosts (FilterPanel and ScoringSettings)
 * and asserts every <input type="range"> has aria-valuemin, aria-valuemax,
 * aria-valuenow, AND aria-valuetext (4 attrs total) populated with non-empty
 * values. Per ADR — assistive-technology rendering of a slider depends on
 * the full quartet, not just `min`/`max`/`value` HTML attrs.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import FilterPanel from '@/components/FilterPanel';
import ScoringSettings from '@/components/ScoringSettings';

const REQUIRED_ATTRS = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'] as const;

function assertSliderQuartet(slider: HTMLElement, label: string) {
  REQUIRED_ATTRS.forEach((attr) => {
    const value = slider.getAttribute(attr);
    expect(value).not.toBeNull();
    expect((value ?? '').length).toBeGreaterThan(0);
    if (attr === 'aria-valuetext') {
      // aria-valuetext must be a meaningful descriptor, not the bare numeric value.
      expect(value).toMatch(/[A-Za-z]/);
    }
  });
  // Sanity assertion so failures point at the offending slider by label.
  expect(slider.getAttribute('aria-label') ?? slider.id ?? label).toBeTruthy();
}

describe('Story 14.10 — slider ARIA quartet (AC #3)', () => {
  test('FilterPanel score sliders expose the full ARIA quartet', () => {
    render(
      <FilterPanel
        filters={{
          platforms: '',
          categories: '',
          statuses: '',
          minScore: '0',
          maxScore: '100',
          minProfit: '',
          maxProfit: '',
        }}
        setFilter={() => {}}
        setFilters={() => {}}
        clearFilters={() => {}}
        activeFilterCount={0}
      />
    );
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(2);
    sliders.forEach((s) => assertSliderQuartet(s, 'FilterPanel slider'));
  });

  test('ScoringSettings opportunity-threshold slider exposes the full ARIA quartet', async () => {
    // Stub the settings fetch so the component renders the slider without
    // hitting a real network endpoint.
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          opportunityThreshold: 70,
          feeRateEbay: 13.0,
          feeRateMercari: 10.0,
          feeRateFacebook: 5.0,
          feeRateOfferup: 12.9,
          feeRateCraigslist: 0.0,
          holdingCostDailyRate: 2.0,
        },
      }),
    }) as unknown as typeof fetch;

    try {
      render(<ScoringSettings />);
      // Wait for the slider to render after the fetch resolves.
      const slider = await screen.findByRole('slider');
      assertSliderQuartet(slider, 'ScoringSettings slider');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
