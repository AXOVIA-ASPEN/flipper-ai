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
        llmModel: 'gpt-4o-mini',
        discountThreshold: 50,
        autoAnalyze: true,
        ...overrides,
      },
    }),
  };
}

import AIPreferencesSettings from '@/components/AIPreferencesSettings';

describe('AIPreferencesSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(makeSettingsResponse());
  });

  it('renders loading state initially', () => {
    render(<AIPreferencesSettings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders AI Preferences heading after load', async () => {
    render(<AIPreferencesSettings />);
    await waitFor(() => {
      expect(screen.getByText('AI Preferences')).toBeInTheDocument();
    });
  });

  it('shows LLM model selector with current value', async () => {
    render(<AIPreferencesSettings />);
    await waitFor(() => {
      const select = screen.getByLabelText('AI Model') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('gpt-4o-mini');
    });
  });

  it('shows all valid model options', async () => {
    render(<AIPreferencesSettings />);
    await waitFor(() => {
      expect(screen.getByText('GPT-4o Mini')).toBeInTheDocument();
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
    });
  });

  it('shows discount threshold slider', async () => {
    render(<AIPreferencesSettings />);
    await waitFor(() => {
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('50');
    });
  });

  it('shows auto-analyze toggle', async () => {
    render(<AIPreferencesSettings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/auto-analyze/i)).toBeInTheDocument();
    });
  });

  it('saves model change via PATCH', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ llmModel: 'gpt-4o' }));

    render(<AIPreferencesSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('AI Model')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('AI Model');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'gpt-4o' } });
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.llmModel).toBe('gpt-4o');
    });
  });

  it('saves auto-analyze toggle via PATCH', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ autoAnalyze: false }));

    render(<AIPreferencesSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/auto-analyze/i)).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText(/auto-analyze/i);
    await act(async () => {
      fireEvent.click(toggle);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
    });
  });

  it('shows success message after save', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ llmModel: 'gpt-4o' }));

    render(<AIPreferencesSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('AI Model')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('AI Model');
    await act(async () => {
      fireEvent.change(select, { target: { value: 'gpt-4o' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });

  it('saves discount threshold only on mouseUp, not on every onChange', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ discountThreshold: 75 }));

    render(<AIPreferencesSettings />);

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    const slider = screen.getByRole('slider');

    // onChange should update local state only — no PATCH fired
    await act(async () => {
      fireEvent.change(slider, { target: { value: '75' } });
    });

    const patchAfterChange = mockFetch.mock.calls.filter(
      ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
    );
    expect(patchAfterChange.length).toBe(0);

    // mouseUp should fire the PATCH
    await act(async () => {
      fireEvent.mouseUp(slider, { target: slider });
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.discountThreshold).toBe(75);
    });
  });

  it('shows error on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Failed to load settings' }),
    });

    render(<AIPreferencesSettings />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('has dark mode classes', async () => {
    render(<AIPreferencesSettings />);
    await waitFor(() => {
      expect(screen.getByText('AI Preferences')).toBeInTheDocument();
    });
    const container = screen.getByText('AI Preferences').closest('div');
    expect(container?.className).toContain('dark:bg-gray-800');
  });
});
