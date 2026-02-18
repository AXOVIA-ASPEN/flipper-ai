/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationSettings from '../NotificationSettings';

// Mock fetch
global.fetch = jest.fn();

describe('NotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSettings = {
    success: true,
    data: {
      emailNotifications: true,
      notifyNewDeals: true,
      notifyPriceDrops: false,
      notifySoldItems: true,
      notifyExpiring: false,
      notifyWeeklyDigest: true,
      notifyFrequency: 'daily',
    },
  };

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<NotificationSettings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays notification settings', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    expect(screen.getByText('New Deal Alerts')).toBeInTheDocument();
    expect(screen.getByText('Price Drop Alerts')).toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Unauthorized' }),
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  it('toggles email notifications master switch', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockSettings.data, emailNotifications: false },
        }),
      });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    const masterToggle = screen.getByLabelText('Toggle email notifications');
    fireEvent.click(masterToggle);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications: false }),
      });
    });
  });

  it('toggles individual notification types', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockSettings.data, notifyPriceDrops: true },
        }),
      });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Price Drop Alerts')).toBeInTheDocument();
    });

    const priceDropToggle = screen.getByLabelText('Toggle Price Drop Alerts');
    fireEvent.click(priceDropToggle);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyPriceDrops: true }),
      });
    });
  });

  it('changes notification frequency', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockSettings.data, notifyFrequency: 'instant' },
        }),
      });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Notification Frequency')).toBeInTheDocument();
    });

    const instantRadio = screen.getByDisplayValue('instant') as HTMLInputElement;
    fireEvent.click(instantRadio);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyFrequency: 'instant' }),
      });
    });
  });

  it('shows success message after save', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockSettings.data, notifyNewDeals: false },
        }),
      });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('New Deal Alerts')).toBeInTheDocument();
    });

    const newDealToggle = screen.getByLabelText('Toggle New Deal Alerts');
    fireEvent.click(newDealToggle);

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('shows error message on save failure', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Network error' }),
      });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('New Deal Alerts')).toBeInTheDocument();
    });

    const newDealToggle = screen.getByLabelText('Toggle New Deal Alerts');
    fireEvent.click(newDealToggle);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables individual toggles when email notifications are off', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...mockSettings.data, emailNotifications: false },
      }),
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    const newDealToggle = screen.getByLabelText('Toggle New Deal Alerts');
    expect(newDealToggle).toBeDisabled();
  });

  it('displays all notification options', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('New Deal Alerts')).toBeInTheDocument();
    });

    expect(screen.getByText('Price Drop Alerts')).toBeInTheDocument();
    expect(screen.getByText('Item Sold Notifications')).toBeInTheDocument();
    expect(screen.getByText('Expiring Listings')).toBeInTheDocument();
    expect(screen.getByText('Receive a weekly summary of your opportunities')).toBeInTheDocument();
  });

  it('displays frequency options correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Notification Frequency')).toBeInTheDocument();
    });

    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText(/Daily Digest/i)).toBeInTheDocument();
    expect(screen.getByText(/One email per week with all updates/i)).toBeInTheDocument();

    const dailyRadio = screen.getByDisplayValue('daily') as HTMLInputElement;
    expect(dailyRadio.checked).toBe(true);
  });
});
