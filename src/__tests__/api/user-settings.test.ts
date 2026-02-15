import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/user/settings/route';

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  getUserIdOrDefault: jest.fn(() => Promise.resolve('test-user-id')),
}));

// Mock crypto
jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((val: string) => `encrypted:${val}`),
  decrypt: jest.fn((val: string) => val.replace('encrypted:', '')),
  maskApiKey: jest.fn((val: string) => `sk-****${val.slice(-4)}`),
}));

// Mock prisma
const mockUserFindUnique = jest.fn();
const mockSettingsCreate = jest.fn();
const mockSettingsUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    userSettings: {
      create: (...args: unknown[]) => mockSettingsCreate(...args),
      update: (...args: unknown[]) => mockSettingsUpdate(...args),
    },
  },
}));

const baseUser = {
  id: 'test-user-id',
  email: 'test@test.com',
  name: 'Test',
  image: null,
  settings: {
    id: 'settings-1',
    userId: 'test-user-id',
    openaiApiKey: null,
    llmModel: 'gpt-4o-mini',
    discountThreshold: 50,
    autoAnalyze: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('GET /api/user/settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user settings', async () => {
    mockUserFindUnique.mockResolvedValue(baseUser);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.llmModel).toBe('gpt-4o-mini');
    expect(data.data.hasOpenaiApiKey).toBe(false);
  });

  it('returns settings with masked API key', async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      settings: { ...baseUser.settings, openaiApiKey: 'encrypted:sk-abc123' },
    });

    const res = await GET();
    const data = await res.json();

    expect(data.data.hasOpenaiApiKey).toBe(true);
    expect(data.data.openaiApiKey).toContain('****');
  });

  it('creates settings if missing', async () => {
    mockUserFindUnique.mockResolvedValue({ ...baseUser, settings: null });
    mockSettingsCreate.mockResolvedValue(baseUser.settings);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockSettingsCreate).toHaveBeenCalled();
  });

  it('returns 500 when user not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/user/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindUnique.mockResolvedValue(baseUser);
  });

  it('updates llmModel', async () => {
    mockSettingsUpdate.mockResolvedValue({ ...baseUser.settings, llmModel: 'gpt-4o' });

    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ llmModel: 'gpt-4o' }),
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.llmModel).toBe('gpt-4o');
  });

  it('rejects invalid model', async () => {
    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ llmModel: 'invalid-model' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid discount threshold', async () => {
    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ discountThreshold: 150 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('rejects NaN discount threshold', async () => {
    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ discountThreshold: 'abc' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('encrypts and stores API key', async () => {
    mockSettingsUpdate.mockResolvedValue({
      ...baseUser.settings,
      openaiApiKey: 'encrypted:sk-newkey123',
    });

    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ openaiApiKey: 'sk-newkey123' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it('clears API key when null', async () => {
    mockSettingsUpdate.mockResolvedValue({ ...baseUser.settings, openaiApiKey: null });

    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ openaiApiKey: null }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it('clears API key when empty string', async () => {
    mockSettingsUpdate.mockResolvedValue({ ...baseUser.settings, openaiApiKey: null });

    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ openaiApiKey: '' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it('updates autoAnalyze', async () => {
    mockSettingsUpdate.mockResolvedValue({ ...baseUser.settings, autoAnalyze: false });

    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ autoAnalyze: false }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });

  it('returns 500 on error', async () => {
    mockUserFindUnique.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ llmModel: 'gpt-4o' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });
});
