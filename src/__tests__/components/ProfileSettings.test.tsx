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
        id: 'settings-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          image: null,
        },
        ...overrides,
      },
    }),
  };
}

import ProfileSettings from '@/components/ProfileSettings';

describe('ProfileSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(makeSettingsResponse());
  });

  it('renders loading state initially', () => {
    render(<ProfileSettings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders profile section heading after load', async () => {
    render(<ProfileSettings />);
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  it('displays user name in input field', async () => {
    render(<ProfileSettings />);
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Test User');
      expect(nameInput).toBeInTheDocument();
    });
  });

  it('displays email as read-only', async () => {
    render(<ProfileSettings />);
    await waitFor(() => {
      const emailField = screen.getByText('test@example.com');
      expect(emailField).toBeInTheDocument();
    });
  });

  it('saves name via PATCH on form submit', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ user: { id: 'user-1', email: 'test@example.com', name: 'New Name', image: null } }));

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test User');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([, opts]: [string, RequestInit | undefined]) => opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1]!.body as string);
      expect(body.name).toBe('New Name');
    });
  });

  it('shows success message after save', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce(makeSettingsResponse({ user: { id: 'user-1', email: 'test@example.com', name: 'New Name', image: null } }));

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test User');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Failed to load settings' }),
    });

    render(<ProfileSettings />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('shows error on PATCH failure', async () => {
    mockFetch
      .mockResolvedValueOnce(makeSettingsResponse())
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to save settings' }),
      });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test User');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'X' } });
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });

  it('has dark mode classes', async () => {
    render(<ProfileSettings />);
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    const container = screen.getByText('Profile').closest('div');
    expect(container?.className).toContain('dark:bg-gray-800');
  });
});
