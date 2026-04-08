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

// Mock Prisma
const mockFindUnique = jest.fn();
const mockCreateSettings = jest.fn();
const mockUpdateSettings = jest.fn();

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
    // Toggle on then off — only settings change, no message status change
    const updated = { ...mockUser.settings, messageApprovalRequired: false };
    mockUpdateSettings.mockResolvedValue(updated);

    const req = createMockRequest('PATCH', { messageApprovalRequired: false });
    const response = await PATCH(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    // The update only touches userSettings, not messages
    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
  });
});
