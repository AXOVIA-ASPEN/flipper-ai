/**
 * @jest-environment jsdom
 */
/**
 * @file src/components/__tests__/NotificationSettings.test.tsx
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-10
 * @version 2.0
 * @brief Tests for redesigned NotificationSettings component (Story 10.6).
 *
 * @description
 * Component tests covering the Story 10.6 redesign: category-based email
 * notification preferences table, Communication section, Monitoring section,
 * configurable alert thresholds, Phase 2 Coming Soon placeholders, toast
 * feedback, optimistic toggle updates, and loading skeleton.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationSettings from '../NotificationSettings';

// ── Mock ToastContainer ────────────────────────────────────────────────────
const mockShowToast = jest.fn();
jest.mock('@/components/ToastContainer', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// ── Mock firebase imports (optional dynamic imports inside component) ───────
jest.mock('@/lib/firebase/register-sw', () => ({
  registerFCMServiceWorker: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(false),
  getFCMToken: jest.fn().mockResolvedValue(null),
}));

// ── Mock fetch globally ───────────────────────────────────────────────────
global.fetch = jest.fn();

// ── Full settings response fixture ───────────────────────────────────────
const mockSettings = {
  success: true,
  data: {
    emailNotifications: true,
    notifyNewDeals: true,
    notifySoldItems: true,
    notifyMessageReceived: true,
    notifyDraftReady: true,
    notifyMessageSent: false,
    notifyReviewReceived: true,
    notifyFlipGoneCold: true,
    notifyFlipTurnedHot: true,
    notifyPriceDrops: true,
    flipGoneColdHours: 24,
    flipTurnedHotCount: 3,
    notifyListingUnavailable: true,
    notifyExpiring: true,
    notifyWeeklyDigest: true,
    notifyFrequency: 'instant',
    pushNotifications: false,
    phoneNumber: null,
    phoneVerified: false,
    smsNotifications: false,
    // Story 11.3: Per-event push fields (present in fixture so component receives correct initial state)
    pushNotifyNewDeals: true,
    pushNotifySoldItems: true,
    pushNotifyMessageReceived: true,
    pushNotifyDraftReady: true,
    pushNotifyMessageSent: false,
    pushNotifyReviewReceived: true,
    pushNotifyFlipGoneCold: true,
    pushNotifyFlipTurnedHot: true,
    pushNotifyPriceDrops: true,
    pushNotifyExpiring: true,
    pushNotifyListingUnavailable: true,
    pushNotifyWeeklyDigest: false,
    // Story 11.3: Per-event SMS fields
    smsNotifyNewDeals: true,
    smsNotifySoldItems: true,
    smsNotifyMessageReceived: true,
    smsNotifyDraftReady: false,
    smsNotifyMessageSent: false,
    smsNotifyReviewReceived: true,
    smsNotifyFlipGoneCold: true,
    smsNotifyFlipTurnedHot: true,
    smsNotifyPriceDrops: false,
    smsNotifyExpiring: false,
    smsNotifyListingUnavailable: false,
    smsNotifyWeeklyDigest: false,
  },
};

function mockFetch(
  ...responses: Array<{ ok: boolean; json: () => Promise<unknown> }>
) {
  let call = 0;
  (global.fetch as jest.Mock).mockImplementation(() => {
    const res = responses[call] ?? responses[responses.length - 1];
    call++;
    return Promise.resolve(res);
  });
}

describe('NotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────────────
  it('shows a loading skeleton while settings are fetching', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<NotificationSettings />);
    // Skeleton renders animated pulse divs — no text content
    expect(screen.queryByText('Email Notifications')).not.toBeInTheDocument();
    // At least one skeleton bar should be present
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  // ── Renders all category sections ────────────────────────────────────────
  it('renders all category section headers after load', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Flip Lifecycle')).toBeInTheDocument());

    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Smart Alerts')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Digest')).toBeInTheDocument();
  });

  // ── Flip Lifecycle events ────────────────────────────────────────────────
  it('renders Flip Lifecycle events', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());
    expect(screen.getByText('Flip Lifecycle Updates')).toBeInTheDocument();
  });

  // ── Communication events ─────────────────────────────────────────────────
  it('renders Communication events', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Seller Reply Received')).toBeInTheDocument());
    expect(screen.getByText('AI Draft Ready')).toBeInTheDocument();
    expect(screen.getByText('Message Sent')).toBeInTheDocument();
  });

  // ── Smart Alert events ────────────────────────────────────────────────────
  it('renders Smart Alert events', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Review Received')).toBeInTheDocument());
    expect(screen.getByText('Flip Gone Cold')).toBeInTheDocument();
    expect(screen.getByText('Flip Turned Hot')).toBeInTheDocument();
    expect(screen.getByText('Price Change Alert')).toBeInTheDocument();
  });

  // ── Monitoring events ─────────────────────────────────────────────────────
  it('renders Monitoring events including Listing Unavailable', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Listing Expiring')).toBeInTheDocument());
    expect(screen.getByText('Listing Unavailable')).toBeInTheDocument();
  });

  // ── Coming Soon columns ───────────────────────────────────────────────────
  it('renders Push and SMS column headers (Story 11.3 live columns)', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Email Notifications')).toBeInTheDocument());

    // Story 11.3 replaced "Coming Soon" placeholders with real Push and SMS columns
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
  });

  it('push toggles are aria-disabled when push permission not granted', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    // Component uses aria-disabled + CSS rather than HTML disabled attribute
    const pushButtons = screen
      .getAllByRole('switch', { name: /push notification/i });
    pushButtons.forEach((btn) => expect(btn).toHaveAttribute('aria-disabled', 'true'));
  });

  // ── Master toggle gating ─────────────────────────────────────────────────
  it('disables all individual toggles when email notifications are off', async () => {
    const offSettings = {
      ...mockSettings,
      data: { ...mockSettings.data, emailNotifications: false },
    };
    mockFetch({ ok: true, json: async () => offSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Email Notifications')).toBeInTheDocument());

    const newOpportunityToggle = screen.getByRole('switch', {
      name: /toggle new opportunity found email notification/i,
    });
    // Component uses aria-disabled + CSS cursor rather than HTML disabled attribute
    expect(newOpportunityToggle).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows disabled info banner when master toggle is off', async () => {
    const offSettings = {
      ...mockSettings,
      data: { ...mockSettings.data, emailNotifications: false },
    };
    mockFetch({ ok: true, json: async () => offSettings });
    render(<NotificationSettings />);

    await waitFor(() => {
      expect(
        screen.getByText(/email notifications are turned off/i)
      ).toBeInTheDocument();
    });
  });

  // ── Toggle saves via PATCH ───────────────────────────────────────────────
  it('saves notifyListingUnavailable on toggle click', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, notifyListingUnavailable: false },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Listing Unavailable')).toBeInTheDocument());

    const toggle = screen.getByRole('switch', {
      name: /toggle listing unavailable email notification/i,
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ notifyListingUnavailable: false }),
        })
      );
    });
  });

  it('saves notifyMessageReceived on toggle click', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, notifyMessageReceived: false },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Seller Reply Received')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('switch', { name: /toggle seller reply received email notification/i })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ notifyMessageReceived: false }),
        })
      );
    });
  });

  it('saves notifyDraftReady on toggle click', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, notifyDraftReady: false },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('AI Draft Ready')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('switch', { name: /toggle ai draft ready email notification/i })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ notifyDraftReady: false }),
        })
      );
    });
  });

  it('saves master email toggle on click', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, emailNotifications: false },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Email Notifications')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('switch', { name: /toggle email notifications/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ emailNotifications: false }),
        })
      );
    });
  });

  // ── Toast feedback ───────────────────────────────────────────────────────
  it('shows success toast after save', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, notifyNewDeals: false },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('switch', { name: /toggle new opportunity found email notification/i })
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('shows error toast and reverts on save failure', async () => {
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: false, json: async () => ({ success: false, error: { detail: 'Network error' } }) }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('switch', { name: /toggle new opportunity found email notification/i })
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });

  // ── saveSettings error handling ──────────────────────────────────────────
  it('shows error toast when frequency save fails', async () => {
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: false, json: async () => ({ success: false, error: { detail: 'Server error' } }) }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Notification Frequency')).toBeInTheDocument());

    fireEvent.click(screen.getByDisplayValue('daily'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });

  it('shows error toast when threshold save fails and does not show success', async () => {
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: false, json: async () => ({ success: false, error: { detail: 'Server error' } }) }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByLabelText(/hours before cold flip alert/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/hours before cold flip alert/i), { target: { value: '48' } });
    fireEvent.blur(screen.getByLabelText(/hours before cold flip alert/i));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
    // Must NOT show success toast when save fails
    const successCalls = mockShowToast.mock.calls.filter(
      (call: [{ type: string }]) => call[0].type === 'success'
    );
    expect(successCalls.length).toBe(0);
  });

  it('shows success toast only after threshold save succeeds', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, flipGoneColdHours: 48 },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByLabelText(/hours before cold flip alert/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/hours before cold flip alert/i), { target: { value: '48' } });
    fireEvent.blur(screen.getByLabelText(/hours before cold flip alert/i));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: 'Cold flip threshold updated.' })
      );
    });
  });

  // ── Threshold inputs ────────────────────────────────────────────────────
  it('renders Flip Gone Cold threshold input when toggle is on', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Flip Gone Cold Time')).toBeInTheDocument());
    const input = screen.getByLabelText(/hours before cold flip alert/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(24);
  });

  it('renders Flip Turned Hot threshold input when toggle is on', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Flip Turned Hot Threshold')).toBeInTheDocument());
    const input = screen.getByLabelText(/consecutive inbound messages before hot flip alert/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(3);
  });

  it('hides cold hours input when Flip Gone Cold toggle is off', async () => {
    const coldOff = {
      ...mockSettings,
      data: { ...mockSettings.data, notifyFlipGoneCold: false },
    };
    mockFetch({ ok: true, json: async () => coldOff });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Flip Gone Cold')).toBeInTheDocument());
    expect(screen.queryByLabelText(/hours before cold flip alert/i)).not.toBeInTheDocument();
  });

  it('shows inline validation error for cold hours out of range', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByLabelText(/hours before cold flip alert/i)).toBeInTheDocument());

    const input = screen.getByLabelText(/hours before cold flip alert/i);
    fireEvent.change(input, { target: { value: '200' } });

    expect(screen.getByText('Must be between 1 and 168')).toBeInTheDocument();
  });

  // ── Notification frequency ───────────────────────────────────────────────
  it('renders notification frequency section', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Notification Frequency')).toBeInTheDocument());

    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText('Daily Digest')).toBeInTheDocument();
    expect(screen.getByText('One email per week with all updates')).toBeInTheDocument();

    const instantRadio = screen.getByDisplayValue('instant') as HTMLInputElement;
    expect(instantRadio.checked).toBe(true);
  });

  it('saves frequency change on radio click', async () => {
    const updated = {
      ...mockSettings,
      data: { ...mockSettings.data, notifyFrequency: 'daily' },
    };
    mockFetch(
      { ok: true, json: async () => mockSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Notification Frequency')).toBeInTheDocument());

    fireEvent.click(screen.getByDisplayValue('daily'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ notifyFrequency: 'daily' }),
        })
      );
    });
  });

  // ── role="switch" and aria-checked ──────────────────────────────────────
  it('all email toggle buttons have role=switch and aria-checked', async () => {
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    const switches = screen.getAllByRole('switch');
    const emailSwitches = switches.filter(
      (btn) => btn.getAttribute('aria-label')?.includes('email notification')
    );
    expect(emailSwitches.length).toBeGreaterThan(0);
    emailSwitches.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-checked');
    });
  });

  // ── New users default all toggles to true ────────────────────────────────
  it('new user settings show all email toggles enabled except notifyMessageSent', async () => {
    // notifyMessageSent defaults to false
    mockFetch({ ok: true, json: async () => mockSettings });
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('Message Sent')).toBeInTheDocument());

    const messageSentToggle = screen.getByRole('switch', {
      name: /toggle message sent email notification/i,
    });
    expect(messageSentToggle).toHaveAttribute('aria-checked', 'false');

    const newOpportunityToggle = screen.getByRole('switch', {
      name: /toggle new opportunity found email notification/i,
    });
    expect(newOpportunityToggle).toHaveAttribute('aria-checked', 'true');
  });

  // ── Story 11.3: Push toggle saves via PATCH ──────────────────────────────
  it('saves pushNotifyNewDeals on toggle click when push permission is granted', async () => {
    // Grant push permission so the push column is interactive
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted' },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
      writable: true,
    });

    const pushEnabledSettings = {
      ...mockSettings,
      data: { ...mockSettings.data, pushNotifications: true, pushNotifyNewDeals: true },
    };
    const updated = {
      ...pushEnabledSettings,
      data: { ...pushEnabledSettings.data, pushNotifyNewDeals: false },
    };
    mockFetch(
      { ok: true, json: async () => pushEnabledSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('switch', { name: /toggle new opportunity found push notification/i })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ pushNotifyNewDeals: false }),
        })
      );
    });
  });

  // ── Story 11.3: SMS toggle saves via PATCH ───────────────────────────────
  it('saves smsNotifyNewDeals on toggle click when phone is verified', async () => {
    const smsEnabledSettings = {
      ...mockSettings,
      data: {
        ...mockSettings.data,
        phoneVerified: true,
        smsNotifications: true,
        smsNotifyNewDeals: true,
      },
    };
    const updated = {
      ...smsEnabledSettings,
      data: { ...smsEnabledSettings.data, smsNotifyNewDeals: false },
    };
    mockFetch(
      { ok: true, json: async () => smsEnabledSettings },
      { ok: true, json: async () => updated }
    );
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('switch', { name: /toggle new opportunity found sms notification/i })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/settings',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ smsNotifyNewDeals: false }),
        })
      );
    });
  });

  // ── Story 11.3: SMS column disabled when phone not verified ───────────────
  it('SMS toggles are aria-disabled when phone not verified', async () => {
    mockFetch({ ok: true, json: async () => mockSettings }); // phoneVerified: false
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getByText('New Opportunity Found')).toBeInTheDocument());

    // Match per-event SMS ToggleButtons ("Toggle … SMS notification") but NOT
    // the master SMS toggle button ("Toggle SMS notifications"), which uses the
    // HTML disabled attribute instead of aria-disabled.
    const smsButtons = screen
      .getAllByRole('switch', { name: /toggle .+ sms notification/i });
    expect(smsButtons.length).toBeGreaterThan(0);
    smsButtons.forEach((btn) => expect(btn).toHaveAttribute('aria-disabled', 'true'));
  });

  // ── Fetch error via toast ─────────────────────────────────────────────────
  it('shows error toast when settings fetch fails', async () => {
    mockFetch({
      ok: false,
      json: async () => ({ success: false, error: { detail: 'Unauthorized' } }),
    });
    render(<NotificationSettings />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});
