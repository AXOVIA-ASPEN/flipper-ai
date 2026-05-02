/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeSettingsResponse(overrides: Record<string, unknown> = {}) {
  return {
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
        ...overrides,
      },
    }),
  };
}

import ScoringSettings from '@/components/ScoringSettings';

describe('ScoringSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(makeSettingsResponse());
  });

  it('renders loading state initially', () => {
    render(<ScoringSettings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders Scoring & Fees heading after load', async () => {
    render(<ScoringSettings />);
    await waitFor(() => {
      expect(screen.getByText('Scoring & Fees')).toBeInTheDocument();
    });
  });

  it('shows opportunity threshold slider with default value', async () => {
    render(<ScoringSettings />);
    await waitFor(() => {
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('70');
    });
  });

  it('shows all five platform fee inputs', async () => {
    render(<ScoringSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText('eBay')).toBeInTheDocument();
      expect(screen.getByLabelText('Mercari')).toBeInTheDocument();
      expect(screen.getByLabelText('Facebook Marketplace')).toBeInTheDocument();
      expect(screen.getByLabelText('OfferUp')).toBeInTheDocument();
      expect(screen.getByLabelText('Craigslist')).toBeInTheDocument();
    });
  });

  it('shows correct default fee values', async () => {
    render(<ScoringSettings />);
    await waitFor(() => {
      const ebayInput = screen.getByLabelText('eBay') as HTMLInputElement;
      expect(parseFloat(ebayInput.value)).toBeCloseTo(13.0);

      const craigslistInput = screen.getByLabelText('Craigslist') as HTMLInputElement;
      expect(parseFloat(craigslistInput.value)).toBe(0.0);
    });
  });

  it('shows Reset to Defaults button', async () => {
    render(<ScoringSettings />);
    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });
  });

  it('saves opportunity threshold via PATCH on mouseUp', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ opportunityThreshold: 80 }));

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    const slider = screen.getByRole('slider');
    await act(async () => {
      // Change event updates the DOM value; mouseUp reads it and triggers save
      fireEvent.change(slider, { target: { value: '80' } });
      fireEvent.mouseUp(slider);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.opportunityThreshold).toBe(80);
    });
  });

  it('saves eBay fee rate via PATCH on blur', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ feeRateEbay: 15.0 }));

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('eBay')).toBeInTheDocument();
    });

    const ebayInput = screen.getByLabelText('eBay');
    await act(async () => {
      fireEvent.change(ebayInput, { target: { value: '15.0' } });
      fireEvent.blur(ebayInput);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
    });
  });

  it('calls reset to defaults via PATCH with all default values', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse({ opportunityThreshold: 85, feeRateEbay: 20 }))
      .mockResolvedValueOnce(makeSettingsResponse());

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    const resetBtn = screen.getByText('Reset to Defaults');
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.opportunityThreshold).toBe(70);
      expect(body.feeRateEbay).toBe(13.0);
      expect(body.feeRateMercari).toBe(10.0);
      expect(body.feeRateFacebook).toBe(5.0);
      expect(body.feeRateOfferup).toBe(12.9);
      expect(body.feeRateCraigslist).toBe(0.0);
    });
  });

  it('shows success message after successful save', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse());

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    const slider = screen.getByRole('slider');
    await act(async () => {
      fireEvent.mouseUp(slider);
    });

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'DB error' }),
    });

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByText('DB error')).toBeInTheDocument();
    });
  });

  it('shows error state when settings cannot load', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables buttons and inputs while saving', async () => {
    let resolvePatch: (v: unknown) => void;
    const patchPromise = new Promise((r) => { resolvePatch = r; });

    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockReturnValueOnce(patchPromise);

    render(<ScoringSettings />);

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    const resetBtn = screen.getByText('Reset to Defaults');
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(resetBtn).toBeDisabled();

    // Resolve the pending patch
    await act(async () => {
      resolvePatch!({ ok: true, json: async () => ({ success: true, data: {} }) });
    });
  });

  it('displays threshold value in label', async () => {
    render(<ScoringSettings />);
    // Story 14.8 split the value into a separate <span> with .fp-metric-num styling.
    // Locate the slider's <label> and assert its concatenated text content includes
    // "Opportunity Threshold: 70". Querying by id avoids the multi-match problem of
    // a flexible text matcher walking up the DOM tree.
    await waitFor(() => {
      const slider = screen.getByLabelText(/Opportunity threshold/i);
      expect(slider).toBeInTheDocument();
    });
    const labelEl = document.querySelector('label[for="opportunity-threshold"]');
    expect(labelEl).not.toBeNull();
    expect((labelEl as HTMLElement).textContent ?? '').toMatch(/Opportunity Threshold:\s*70/);
  });
});
