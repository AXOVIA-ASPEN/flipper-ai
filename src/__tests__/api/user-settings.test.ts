import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/user/settings/route';
import { getAuthUserId } from '@/lib/auth-middleware';

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

const mockGetAuthUserId = getAuthUserId as jest.Mock;

// Mock crypto
jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((val: string) => `encrypted:${val}`),
  decrypt: jest.fn((val: string) => val.replace('encrypted:', '')),
  maskApiKey: jest.fn((val: string) => `${val.slice(0, 3)}...${val.slice(-4)}`),
}));

// Mock logger — settings route calls logger.info on preference changes
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock maps-service — settings PATCH calls invalidateUserRouteCache when homeLocation changes
jest.mock('@/lib/maps-service', () => ({
  invalidateUserRouteCache: jest.fn(),
}));

// Mock Prisma
const mockFindUnique = jest.fn();
const mockCreateSettings = jest.fn();
const mockUpdateSettings = jest.fn();
// Story 12.1: Google Calendar token lookup
const mockGcalFindUnique = jest.fn().mockResolvedValue(null);

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    userSettings: {
      create: (...args: unknown[]) => mockCreateSettings(...args),
      update: (...args: unknown[]) => mockUpdateSettings(...args),
    },
    googleCalendarToken: {
      findUnique: (...args: unknown[]) => mockGcalFindUnique(...args),
    },
  },
}));

function createMockRequest(method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/user/settings'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  subscriptionTier: 'FLIPPER',
  settings: {
    id: 'settings-1',
    userId: 'test-user-id',
    openaiApiKey: null,
    llmModel: 'gpt-4o-mini',
    discountThreshold: 50,
    autoAnalyze: true,
    emailNotifications: true,
    notifyNewDeals: true,
    notifyPriceDrops: true,
    notifySoldItems: true,
    notifyExpiring: true,
    notifyWeeklyDigest: true,
    notifyFrequency: 'instant',
    opportunityThreshold: 70,
    feeRateEbay: 13.0,
    feeRateMercari: 10.0,
    feeRateFacebook: 5.0,
    feeRateOfferup: 12.9,
    feeRateCraigslist: 0.0,
    homeLocation: null,
    maxPickupRadiusMiles: 25,
    holdingCostDailyRate: 2.0,
    messageApprovalRequired: false,
    pushNotifications: false,
    phoneNumber: null,
    phoneVerified: false,
    smsNotifications: false,
    notifyMessageReceived: true,
    notifyDraftReady: true,
    notifyMessageSent: false,
    notifyReviewReceived: true,
    notifyFlipGoneCold: true,
    notifyFlipTurnedHot: false,
    notifyPriceChanges: true,
    flipGoneColdHours: 48,
    flipTurnedHotCount: 3,
    // Story 10.6: notification preferences UI
    notifyListingUnavailable: true,
    // Story 11.3: push per-event fields
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
    // Story 11.3: SMS per-event fields
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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('GET /api/user/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user settings', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.llmModel).toBe('gpt-4o-mini');
    expect(data.data.discountThreshold).toBe(50);
    expect(data.data.autoAnalyze).toBe(true);
    expect(data.data.hasOpenaiApiKey).toBe(false);
    expect(data.data.openaiApiKey).toBeNull();
    expect(data.data.user.email).toBe('test@example.com');
    expect(data.data.user.subscriptionTier).toBe('FLIPPER');
  });

  it('should return masked API key when set', async () => {
    const userWithKey = {
      ...mockUser,
      settings: { ...mockUser.settings, openaiApiKey: 'encrypted:sk-test1234abcd' },
    };
    mockFindUnique.mockResolvedValue(userWithKey);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.hasOpenaiApiKey).toBe(true);
    expect(data.data.openaiApiKey).not.toContain('sk-test1234abcd');
  });

  it('should create settings if they do not exist', async () => {
    const userNoSettings = { ...mockUser, settings: null };
    mockFindUnique.mockResolvedValue(userNoSettings);
    const newSettings = { ...mockUser.settings };
    mockCreateSettings.mockResolvedValue(newSettings);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockCreateSettings).toHaveBeenCalled();
  });

  it('should return 404 when user not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('should return 500 on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('should return 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return Story 10.4 communication notification fields', async () => {
    mockFindUnique.mockResolvedValue(mockUser);
    const response = await GET();
    const data = await response.json();

    expect(data.data.notifyMessageReceived).toBe(true);
    expect(data.data.notifyDraftReady).toBe(true);
    expect(data.data.notifyMessageSent).toBe(false);
  });
});

describe('PATCH /api/user/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(mockUser);
  });

  it('should update llmModel', async () => {
    const updated = { ...mockUser.settings, llmModel: 'gpt-4o' };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { llmModel: 'gpt-4o' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.llmModel).toBe('gpt-4o');
  });

  it('should reject invalid llmModel', async () => {
    const req = createMockRequest('PATCH', { llmModel: 'invalid-model' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid LLM model');
  });

  it('should update discountThreshold', async () => {
    const updated = { ...mockUser.settings, discountThreshold: 75 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { discountThreshold: 75 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.discountThreshold).toBe(75);
  });

  it('should reject invalid discountThreshold (>100)', async () => {
    const req = createMockRequest('PATCH', { discountThreshold: 150 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject negative discountThreshold', async () => {
    const req = createMockRequest('PATCH', { discountThreshold: -5 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
  });

  it('should update autoAnalyze', async () => {
    const updated = { ...mockUser.settings, autoAnalyze: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { autoAnalyze: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.autoAnalyze).toBe(false);
  });

  it('should encrypt and store openaiApiKey', async () => {
    const updated = { ...mockUser.settings, openaiApiKey: 'encrypted:sk-newkey123' };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { openaiApiKey: 'sk-newkey123' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.hasOpenaiApiKey).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          openaiApiKey: 'encrypted:sk-newkey123',
        }),
      })
    );
  });

  it('should clear openaiApiKey when set to null', async () => {
    const updated = { ...mockUser.settings, openaiApiKey: null };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { openaiApiKey: null });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.hasOpenaiApiKey).toBe(false);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ openaiApiKey: null }),
      })
    );
  });

  it('should clear openaiApiKey when set to empty string', async () => {
    const updated = { ...mockUser.settings, openaiApiKey: null };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { openaiApiKey: '' });
    const response = await PATCH(req);

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ openaiApiKey: null }),
      })
    );
  });

  it('should handle multiple field updates at once', async () => {
    const updated = {
      ...mockUser.settings,
      llmModel: 'gpt-4-turbo',
      discountThreshold: 30,
      autoAnalyze: false,
    };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', {
      llmModel: 'gpt-4-turbo',
      discountThreshold: 30,
      autoAnalyze: false,
    });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.llmModel).toBe('gpt-4-turbo');
    expect(data.data.discountThreshold).toBe(30);
    expect(data.data.autoAnalyze).toBe(false);
  });

  it('should return 500 on database error', async () => {
    mockUpdateSettings.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest('PATCH', { llmModel: 'gpt-4o' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  // Email notification preference tests
  it('should update emailNotifications toggle', async () => {
    const updated = { ...mockUser.settings, emailNotifications: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { emailNotifications: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.emailNotifications).toBe(false);
  });

  it('should update individual notification preferences', async () => {
    const updated = {
      ...mockUser.settings,
      notifyNewDeals: false,
      notifyPriceDrops: false,
      notifySoldItems: true,
      notifyExpiring: false,
      notifyWeeklyDigest: false,
    };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', {
      notifyNewDeals: false,
      notifyPriceDrops: false,
      notifyExpiring: false,
      notifyWeeklyDigest: false,
    });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.notifyNewDeals).toBe(false);
    expect(data.data.notifyPriceDrops).toBe(false);
    expect(data.data.notifySoldItems).toBe(true);
    expect(data.data.notifyExpiring).toBe(false);
    expect(data.data.notifyWeeklyDigest).toBe(false);
  });

  it('should update notifyFrequency to daily', async () => {
    const updated = { ...mockUser.settings, notifyFrequency: 'daily' };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyFrequency: 'daily' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.notifyFrequency).toBe('daily');
  });

  it('should reject invalid notifyFrequency', async () => {
    const req = createMockRequest('PATCH', { notifyFrequency: 'hourly' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid notification frequency');
  });

  it('should update notifySoldItems preference', async () => {
    const updated = { ...mockUser.settings, notifySoldItems: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifySoldItems: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.notifySoldItems).toBe(false);
  });

  it('should return notification preferences in GET response', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.data.emailNotifications).toBe(true);
    expect(data.data.notifyNewDeals).toBe(true);
    expect(data.data.notifyPriceDrops).toBe(true);
    expect(data.data.notifySoldItems).toBe(true);
    expect(data.data.notifyExpiring).toBe(true);
    expect(data.data.notifyWeeklyDigest).toBe(true);
    expect(data.data.notifyFrequency).toBe('instant');
  });

  // Unauthorized paths
  it('should return 401 when not authenticated for PATCH', async () => {
    mockGetAuthUserId.mockResolvedValueOnce(null);

    const req = createMockRequest('PATCH', { llmModel: 'gpt-4o' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  // opportunityThreshold validation
  it('should reject opportunityThreshold below 10', async () => {
    const req = createMockRequest('PATCH', { opportunityThreshold: 5 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject opportunityThreshold above 100', async () => {
    const req = createMockRequest('PATCH', { opportunityThreshold: 110 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should update valid opportunityThreshold', async () => {
    const updated = { ...mockUser.settings, opportunityThreshold: 50 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { opportunityThreshold: 50 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ opportunityThreshold: 50 }),
      })
    );
  });

  // Fee rate validation
  it('should reject fee rate above 50', async () => {
    const req = createMockRequest('PATCH', { feeRateEbay: 60 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject negative fee rate', async () => {
    const req = createMockRequest('PATCH', { feeRateMercari: -1 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should update valid fee rates', async () => {
    const updated = { ...mockUser.settings, feeRateEbay: 12.9, feeRateMercari: 10 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { feeRateEbay: 12.9, feeRateMercari: 10 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feeRateEbay: 12.9, feeRateMercari: 10 }),
      })
    );
  });

  it('should update feeRateFacebook, feeRateOfferup, and feeRateCraigslist', async () => {
    const updated = { ...mockUser.settings, feeRateFacebook: 3.0, feeRateOfferup: 11.0, feeRateCraigslist: 0.5 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { feeRateFacebook: 3.0, feeRateOfferup: 11.0, feeRateCraigslist: 0.5 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feeRateFacebook: 3.0, feeRateOfferup: 11.0, feeRateCraigslist: 0.5 }),
      })
    );
  });

  // holdingCostDailyRate validation (Story 6.6)
  it('should return holdingCostDailyRate in GET response', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.holdingCostDailyRate).toBe(2.0);
  });

  it('should update valid holdingCostDailyRate', async () => {
    const updated = { ...mockUser.settings, holdingCostDailyRate: 3.5 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { holdingCostDailyRate: 3.5 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.holdingCostDailyRate).toBe(3.5);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ holdingCostDailyRate: 3.5 }),
      })
    );
  });

  it('should accept holdingCostDailyRate of 0 (boundary)', async () => {
    const updated = { ...mockUser.settings, holdingCostDailyRate: 0 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { holdingCostDailyRate: 0 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.holdingCostDailyRate).toBe(0);
  });

  it('should accept holdingCostDailyRate of 100 (boundary)', async () => {
    const updated = { ...mockUser.settings, holdingCostDailyRate: 100 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { holdingCostDailyRate: 100 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.holdingCostDailyRate).toBe(100);
  });

  it('should reject holdingCostDailyRate above 100', async () => {
    const req = createMockRequest('PATCH', { holdingCostDailyRate: 101 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject negative holdingCostDailyRate', async () => {
    const req = createMockRequest('PATCH', { holdingCostDailyRate: -1 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject non-numeric holdingCostDailyRate', async () => {
    const req = createMockRequest('PATCH', { holdingCostDailyRate: 'abc' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  // messageApprovalRequired tests (Story 8.4)
  it('should return messageApprovalRequired in GET response', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.messageApprovalRequired).toBe(false);
  });

  it('should update messageApprovalRequired to true', async () => {
    const updated = { ...mockUser.settings, messageApprovalRequired: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { messageApprovalRequired: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.messageApprovalRequired).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ messageApprovalRequired: true }),
      })
    );
  });

  it('should default messageApprovalRequired to false', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.data.messageApprovalRequired).toBe(false);
  });

  it('should not auto-transition existing PENDING_APPROVAL messages when toggling setting', async () => {
    const updated = { ...mockUser.settings, messageApprovalRequired: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { messageApprovalRequired: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
  });

  // pushNotifications (Story 11.1)
  it('should update pushNotifications toggle', async () => {
    const updated = { ...mockUser.settings, pushNotifications: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { pushNotifications: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pushNotifications: true }) })
    );
  });

  // smsNotifications (Story 11.2)
  it('should reject enabling smsNotifications when phone is not verified', async () => {
    const req = createMockRequest('PATCH', { smsNotifications: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should allow enabling smsNotifications when phone is verified', async () => {
    const userWithPhone = {
      ...mockUser,
      settings: { ...mockUser.settings, phoneVerified: true },
    };
    mockFindUnique.mockResolvedValueOnce(userWithPhone);
    const updated = { ...userWithPhone.settings, smsNotifications: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { smsNotifications: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ smsNotifications: true }) })
    );
  });

  it('should allow disabling smsNotifications without phone check', async () => {
    const updated = { ...mockUser.settings, smsNotifications: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { smsNotifications: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  // removePhoneNumber (Story 11.2)
  it('should clear phone fields when removePhoneNumber is true', async () => {
    const updated = {
      ...mockUser.settings,
      phoneNumber: null,
      phoneVerified: false,
      smsNotifications: false,
    };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { removePhoneNumber: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: null,
          phoneVerified: false,
          smsNotifications: false,
        }),
      })
    );
  });

  // homeLocation
  it('should convert empty homeLocation to null', async () => {
    const updated = { ...mockUser.settings, homeLocation: null };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { homeLocation: '' });
    await PATCH(req);

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ homeLocation: null }) })
    );
  });

  it('should set homeLocation to provided value', async () => {
    const updated = { ...mockUser.settings, homeLocation: 'Portland, OR' };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { homeLocation: 'Portland, OR' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  // maxPickupRadiusMiles validation
  it('should reject maxPickupRadiusMiles below 5', async () => {
    const req = createMockRequest('PATCH', { maxPickupRadiusMiles: 3 });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
  });

  it('should reject maxPickupRadiusMiles above 500', async () => {
    const req = createMockRequest('PATCH', { maxPickupRadiusMiles: 501 });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
  });

  it('should update valid maxPickupRadiusMiles', async () => {
    const updated = { ...mockUser.settings, maxPickupRadiusMiles: 50 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { maxPickupRadiusMiles: 50 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ maxPickupRadiusMiles: 50 }) })
    );
  });

  // Story 10.4: Per-event communication notification toggles
  it('should update notifyMessageReceived toggle', async () => {
    const updated = { ...mockUser.settings, notifyMessageReceived: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyMessageReceived: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notifyMessageReceived: false }) })
    );
  });

  it('should update notifyDraftReady toggle', async () => {
    const updated = { ...mockUser.settings, notifyDraftReady: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyDraftReady: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notifyDraftReady: false }) })
    );
  });

  it('should update notifyMessageSent toggle', async () => {
    const updated = { ...mockUser.settings, notifyMessageSent: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyMessageSent: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notifyMessageSent: true }) })
    );
  });

  // Story 10.5: Smart alert notification toggles
  it('should update notifyReviewReceived', async () => {
    const updated = { ...mockUser.settings, notifyReviewReceived: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyReviewReceived: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notifyReviewReceived: false }) })
    );
  });

  it('should update notifyFlipGoneCold', async () => {
    const updated = { ...mockUser.settings, notifyFlipGoneCold: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyFlipGoneCold: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update notifyFlipTurnedHot', async () => {
    const updated = { ...mockUser.settings, notifyFlipTurnedHot: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyFlipTurnedHot: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update notifyPriceChanges', async () => {
    const updated = { ...mockUser.settings, notifyPriceChanges: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyPriceChanges: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should reject flipGoneColdHours below 1', async () => {
    const req = createMockRequest('PATCH', { flipGoneColdHours: 0 });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
  });

  it('should reject flipGoneColdHours above 168', async () => {
    const req = createMockRequest('PATCH', { flipGoneColdHours: 200 });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
  });

  it('should update valid flipGoneColdHours', async () => {
    const updated = { ...mockUser.settings, flipGoneColdHours: 72 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { flipGoneColdHours: 72 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ flipGoneColdHours: 72 }) })
    );
  });

  it('should reject flipTurnedHotCount below 1', async () => {
    const req = createMockRequest('PATCH', { flipTurnedHotCount: 0 });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
  });

  it('should reject flipTurnedHotCount above 20', async () => {
    const req = createMockRequest('PATCH', { flipTurnedHotCount: 25 });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
  });

  it('should update valid flipTurnedHotCount', async () => {
    const updated = { ...mockUser.settings, flipTurnedHotCount: 5 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { flipTurnedHotCount: 5 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ flipTurnedHotCount: 5 }) })
    );
  });

  // Same-value updates — logger NOT called when value is unchanged
  it('should update notifyReviewReceived to same value without logging', async () => {
    // mockUser.settings.notifyReviewReceived is true — setting to true again = no change
    const updated = { ...mockUser.settings, notifyReviewReceived: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyReviewReceived: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update notifyFlipGoneCold to same value without logging', async () => {
    // mockUser.settings.notifyFlipGoneCold is true — no change
    const updated = { ...mockUser.settings };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyFlipGoneCold: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update notifyFlipTurnedHot to same value without logging', async () => {
    // mockUser.settings.notifyFlipTurnedHot is false — no change
    const updated = { ...mockUser.settings };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyFlipTurnedHot: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update notifyPriceChanges to same value without logging', async () => {
    // mockUser.settings.notifyPriceChanges is true — no change
    const updated = { ...mockUser.settings };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyPriceChanges: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update flipGoneColdHours to same value without logging', async () => {
    // mockUser.settings.flipGoneColdHours is 48 — no change
    const updated = { ...mockUser.settings };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { flipGoneColdHours: 48 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should update flipTurnedHotCount to same value without logging', async () => {
    // mockUser.settings.flipTurnedHotCount is 3 — no change
    const updated = { ...mockUser.settings };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { flipTurnedHotCount: 3 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  // Story 10.6: Notification preferences UI — notifyListingUnavailable toggle
  it('should update notifyListingUnavailable to false', async () => {
    const updated = { ...mockUser.settings, notifyListingUnavailable: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyListingUnavailable: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notifyListingUnavailable: false }),
      })
    );
  });

  it('should update notifyListingUnavailable back to true', async () => {
    const updated = { ...mockUser.settings, notifyListingUnavailable: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyListingUnavailable: true });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notifyListingUnavailable: true }),
      })
    );
  });

  it('should return notifyListingUnavailable in GET response with default true', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.notifyListingUnavailable).toBe(true);
  });

  it('should coerce notifyListingUnavailable from truthy string to boolean', async () => {
    const updated = { ...mockUser.settings, notifyListingUnavailable: true };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyListingUnavailable: 'true' });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notifyListingUnavailable: true }),
      })
    );
  });

  // Story 10.6: flipGoneColdHours and flipTurnedHotCount float rounding
  it('should round flipGoneColdHours float to integer', async () => {
    const updated = { ...mockUser.settings, flipGoneColdHours: 24 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { flipGoneColdHours: 24.7 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ flipGoneColdHours: 25 }),
      })
    );
  });

  it('should round flipTurnedHotCount float to integer', async () => {
    const updated = { ...mockUser.settings, flipTurnedHotCount: 4 };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { flipTurnedHotCount: 3.6 });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ flipTurnedHotCount: 4 }),
      })
    );
  });

  it('should reject non-numeric flipGoneColdHours', async () => {
    const req = createMockRequest('PATCH', { flipGoneColdHours: 'not-a-number' });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject non-numeric flipTurnedHotCount', async () => {
    const req = createMockRequest('PATCH', { flipTurnedHotCount: 'abc' });
    const response = await PATCH(req);

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  // Story 10.6: PATCH response shape consistency — must include user object
  it('should include user object in PATCH response matching GET response shape', async () => {
    const updated = { ...mockUser.settings, notifyListingUnavailable: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { notifyListingUnavailable: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.user).toBeDefined();
    expect(data.data.user.id).toBe('test-user-id');
    expect(data.data.user.subscriptionTier).toBe('FLIPPER');
  });

  // Story 11.3: Push / SMS per-event preference fields
  it('GET should return all 24 push/SMS per-event preference fields', async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    // Push fields
    expect(data.data.pushNotifyNewDeals).toBe(true);
    expect(data.data.pushNotifySoldItems).toBe(true);
    expect(data.data.pushNotifyMessageReceived).toBe(true);
    expect(data.data.pushNotifyDraftReady).toBe(true);
    expect(data.data.pushNotifyMessageSent).toBe(false);
    expect(data.data.pushNotifyReviewReceived).toBe(true);
    expect(data.data.pushNotifyFlipGoneCold).toBe(true);
    expect(data.data.pushNotifyFlipTurnedHot).toBe(true);
    expect(data.data.pushNotifyPriceDrops).toBe(true);
    expect(data.data.pushNotifyExpiring).toBe(true);
    expect(data.data.pushNotifyListingUnavailable).toBe(true);
    expect(data.data.pushNotifyWeeklyDigest).toBe(false);
    // SMS fields
    expect(data.data.smsNotifyNewDeals).toBe(true);
    expect(data.data.smsNotifySoldItems).toBe(true);
    expect(data.data.smsNotifyMessageReceived).toBe(true);
    expect(data.data.smsNotifyDraftReady).toBe(false);
    expect(data.data.smsNotifyMessageSent).toBe(false);
    expect(data.data.smsNotifyReviewReceived).toBe(true);
    expect(data.data.smsNotifyFlipGoneCold).toBe(true);
    expect(data.data.smsNotifyFlipTurnedHot).toBe(true);
    expect(data.data.smsNotifyPriceDrops).toBe(false);
    expect(data.data.smsNotifyExpiring).toBe(false);
    expect(data.data.smsNotifyListingUnavailable).toBe(false);
    expect(data.data.smsNotifyWeeklyDigest).toBe(false);
  });

  it('PATCH should update pushNotifyNewDeals toggle', async () => {
    const updated = { ...mockUser.settings, pushNotifyNewDeals: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { pushNotifyNewDeals: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pushNotifyNewDeals: false }) })
    );
  });

  it('PATCH should update smsNotifyFlipGoneCold toggle', async () => {
    const updated = { ...mockUser.settings, smsNotifyFlipGoneCold: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { smsNotifyFlipGoneCold: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ smsNotifyFlipGoneCold: false }) })
    );
  });

  it('PATCH should coerce boolean false value for pushNotifyNewDeals', async () => {
    const updated = { ...mockUser.settings, pushNotifyNewDeals: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { pushNotifyNewDeals: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pushNotifyNewDeals: false }) })
    );
  });

  it('PATCH should return push/SMS per-event fields in response', async () => {
    const updated = { ...mockUser.settings, pushNotifyFlipTurnedHot: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { pushNotifyFlipTurnedHot: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.pushNotifyFlipTurnedHot).toBe(false);
    expect(data.data.smsNotifyFlipGoneCold).toBe(true); // unchanged, still in response
  });
});
