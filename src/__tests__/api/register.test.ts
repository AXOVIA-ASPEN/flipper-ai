import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
}));

// Mock prisma
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new user successfully', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      createdAt: new Date(),
    });

    const res = await POST(
      createRequest({
        email: 'Test@Example.com',
        password: 'password123',
        name: 'Test User',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe('test@example.com');
  });

  it('returns 400 when email missing', async () => {
    const res = await POST(createRequest({ password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password missing', async () => {
    const res = await POST(createRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(createRequest({ email: 'notanemail', password: 'password123' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid email');
  });

  it('returns 400 for short password', async () => {
    const res = await POST(createRequest({ email: 'test@example.com', password: 'short' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('8 characters');
  });

  it('returns 409 when user already exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' });

    const res = await POST(createRequest({ email: 'test@example.com', password: 'password123' }));
    expect(res.status).toBe(409);
  });

  it('creates user without name', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'user-2',
      email: 'test@example.com',
      name: null,
      image: null,
      createdAt: new Date(),
    });

    const res = await POST(createRequest({ email: 'test@example.com', password: 'password123' }));
    expect(res.status).toBe(200);
  });

  it('returns 500 on unexpected error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const res = await POST(createRequest({ email: 'test@example.com', password: 'password123' }));
    expect(res.status).toBe(500);
  });
});
