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
        openaiApiKey: null,
        hasOpenaiApiKey: false,
        ...overrides,
      },
    }),
  };
}

import APIKeySettings from '@/components/APIKeySettings';

describe('APIKeySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(makeSettingsResponse());
  });

  it('renders loading state initially', () => {
    render(<APIKeySettings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders API Keys heading after load', async () => {
    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument();
    });
  });

  it('shows "No key set" when no API key exists', async () => {
    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByText(/no key set/i)).toBeInTheDocument();
    });
  });

  it('displays masked key when API key exists', async () => {
    mockFetch.mockResolvedValue(
      makeSettingsResponse({
        openaiApiKey: '••••••••abcd',
        hasOpenaiApiKey: true,
      })
    );

    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByText('••••••••abcd')).toBeInTheDocument();
    });
  });

  it('never shows full API key in rendered output', async () => {
    mockFetch.mockResolvedValue(
      makeSettingsResponse({
        openaiApiKey: '••••••••abcd',
        hasOpenaiApiKey: true,
      })
    );

    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByText('••••••••abcd')).toBeInTheDocument();
    });

    // Full key should never appear in the DOM
    expect(screen.queryByText(/sk-/)).toBeNull();
  });

  it('shows input field for entering new key', async () => {
    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/sk-/i)).toBeInTheDocument();
    });
  });

  it('saves new API key via PATCH', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(
        makeSettingsResponse({
          openaiApiKey: '••••••••1234',
          hasOpenaiApiKey: true,
        })
      );

    render(<APIKeySettings />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/sk-/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/sk-/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'sk-test-key-abcd1234' } });
    });

    const saveButton = screen.getByRole('button', { name: /save key/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.openaiApiKey).toBe('sk-test-key-abcd1234');
    });
  });

  it('clears API key when clear button clicked', async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeSettingsResponse({
          openaiApiKey: '••••••••abcd',
          hasOpenaiApiKey: true,
        })
      )
      .mockResolvedValueOnce(makeSettingsResponse());

    render(<APIKeySettings />);

    await waitFor(() => {
      expect(screen.getByText('••••••••abcd')).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /clear key/i });
    await act(async () => {
      fireEvent.click(clearButton);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.openaiApiKey).toBeNull();
    });
  });

  it('shows success message after saving key', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(
        makeSettingsResponse({
          openaiApiKey: '••••••••1234',
          hasOpenaiApiKey: true,
        })
      );

    render(<APIKeySettings />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/sk-/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/sk-/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'sk-test-key-abcd1234' } });
    });

    const saveButton = screen.getByRole('button', { name: /save key/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });

  it('has dark mode classes', async () => {
    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByText('API Keys')).toBeInTheDocument();
    });
    const container = screen.getByText('API Keys').closest('div');
    expect(container?.className).toContain('dark:bg-gray-800');
  });

  it('toggles input field visibility', async () => {
    render(<APIKeySettings />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/sk-/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/sk-/i) as HTMLInputElement;
    expect(input.type).toBe('password');

    const toggleButton = screen.getByLabelText(/toggle key visibility/i);
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(input.type).toBe('text');
  });
});
