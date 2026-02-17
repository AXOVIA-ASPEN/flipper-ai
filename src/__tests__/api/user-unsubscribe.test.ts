/**
 * Tests for /api/user/unsubscribe route
 * Covers GET (unsubscribe link) and POST (re-subscribe) handlers
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/user/unsubscribe/route';

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    userSettings: {
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

// ── Logger mock ──────────────────────────────────────────────────────────────
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function encodeToken(email: string): string {
  return Buffer.from(email, 'utf-8').toString('base64url');
}

function makeGetRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/user/unsubscribe?token=${token}`
    : 'http://localhost/api/user/unsubscribe';
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(token?: string, resubscribe?: boolean): NextRequest {
  const params = new URLSearchParams();
  if (token !== undefined) params.set('token', token);
  if (resubscribe !== undefined) params.set('resubscribe', String(resubscribe));
  const url = `http://localhost/api/user/unsubscribe?${params.toString()}`;
  return new NextRequest(url, { method: 'POST' });
}

// ── GET /api/user/unsubscribe ─────────────────────────────────────────────────
describe('GET /api/user/unsubscribe', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Missing token ────────────────────────────────────────────────────────
  it('returns 400 JSON when token is missing', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing token');
  });

  // ── Invalid base64 / bad email ──────────────────────────────────────────
  it('returns 400 JSON for invalid base64 token', async () => {
    // Pass raw string that decodes to a non-email value
    const badToken = Buffer.from('not-an-email', 'utf-8').toString('base64url');
    const res = await GET(makeGetRequest(badToken));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid token');
  });

  it('returns 400 when token decodes to empty string (empty base64url → falsy → Missing token)', async () => {
    // Buffer.from('').toString('base64url') === '' which is falsy — hits the
    // "Missing token" guard before the email-validation step.
    const emptyToken = Buffer.from('', 'utf-8').toString('base64url'); // ''
    const res = await GET(makeGetRequest(emptyToken));
    expect(res.status).toBe(400);
    const data = await res.json();
    // An empty token string is treated the same as a missing token
    expect(data.success).toBe(false);
    expect(['Missing token', 'Invalid token']).toContain(data.error);
  });

  it('returns 400 when token decodes to a whitespace-only string', async () => {
    // Decodes fine but fails email regex — should return "Invalid token"
    const wsToken = Buffer.from('   ', 'utf-8').toString('base64url');
    const res = await GET(makeGetRequest(wsToken));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid token');
  });

  // ── User not found — should NOT leak info ───────────────────────────────
  it('returns 200 HTML even when user not found (anti-enumeration)', async () => {
    mockFindUnique.mockResolvedValue(null);
    const token = encodeToken('nobody@example.com');
    const res = await GET(makeGetRequest(token));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Unsubscribed Successfully');
  });

  // ── User exists, settings already exist ─────────────────────────────────
  it('updates existing userSettings.emailNotifications to false', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-1', settings: { id: 'settings-1' } });
    mockUpdate.mockResolvedValue({});
    const token = encodeToken('user@example.com');
    const res = await GET(makeGetRequest(token));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Unsubscribed Successfully');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { emailNotifications: false },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── User exists, no settings row yet ────────────────────────────────────
  it('creates userSettings when none exist', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-2', settings: null });
    mockCreate.mockResolvedValue({});
    const token = encodeToken('newuser@example.com');
    const res = await GET(makeGetRequest(token));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Unsubscribed Successfully');
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 'user-2', emailNotifications: false },
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // ── Email address casing normalisation ──────────────────────────────────
  it('looks up user by lowercase email', async () => {
    mockFindUnique.mockResolvedValue(null);
    const token = encodeToken('UPPER@EXAMPLE.COM');
    await GET(makeGetRequest(token));
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'upper@example.com' },
      })
    );
  });

  // ── HTML content checks ──────────────────────────────────────────────────
  it('HTML contains a link back to the app', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-3', settings: { id: 's-3' } });
    mockUpdate.mockResolvedValue({});
    const token = encodeToken('app@example.com');
    const res = await GET(makeGetRequest(token));
    const html = await res.text();
    expect(html).toContain('Go to Flipper AI');
    expect(html).toMatch(/href="https?:\/\//);
  });

  it('HTML contains unsubscribe message body', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-4', settings: { id: 's-4' } });
    mockUpdate.mockResolvedValue({});
    const token = encodeToken('body@example.com');
    const res = await GET(makeGetRequest(token));
    const html = await res.text();
    expect(html).toContain('account settings');
  });

  // ── DB error → 500 failure HTML ──────────────────────────────────────────
  it('returns 500 failure HTML on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB exploded'));
    const token = encodeToken('error@example.com');
    const res = await GET(makeGetRequest(token));
    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Something Went Wrong');
    expect(html).toContain('❌');
  });

  // ── Success HTML uses ✅ emoji ────────────────────────────────────────────
  it('success HTML includes ✅ emoji', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-5', settings: null });
    mockCreate.mockResolvedValue({});
    const token = encodeToken('emoji@example.com');
    const res = await GET(makeGetRequest(token));
    const html = await res.text();
    expect(html).toContain('✅');
  });

  // ── Uses custom APP_URL when set ────────────────────────────────────────
  it('uses process.env.APP_URL in HTML when set', async () => {
    const original = process.env.APP_URL;
    process.env.APP_URL = 'https://my-custom-app.io';
    mockFindUnique.mockResolvedValue({ id: 'user-6', settings: null });
    mockCreate.mockResolvedValue({});
    const token = encodeToken('custom@example.com');
    const res = await GET(makeGetRequest(token));
    const html = await res.text();
    expect(html).toContain('https://my-custom-app.io');
    process.env.APP_URL = original;
  });
});

// ── POST /api/user/unsubscribe (re-subscribe) ─────────────────────────────────
describe('POST /api/user/unsubscribe', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Missing token ────────────────────────────────────────────────────────
  it('returns 400 when token is missing', async () => {
    const res = await POST(makePostRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing token');
  });

  // ── User not found ───────────────────────────────────────────────────────
  it('returns 404 when user does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const token = encodeToken('ghost@example.com');
    const res = await POST(makePostRequest(token, true));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('User not found');
  });

  // ── Re-subscribe (resubscribe=true) ─────────────────────────────────────
  it('re-enables email notifications when resubscribe=true', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-10' });
    mockUpsert.mockResolvedValue({});
    const token = encodeToken('resub@example.com');
    const res = await POST(makePostRequest(token, true));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.emailNotifications).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-10' },
      update: { emailNotifications: true },
      create: { userId: 'user-10', emailNotifications: true },
    });
  });

  // ── Unsubscribe via POST (resubscribe=false / omitted) ───────────────────
  it('disables email notifications when resubscribe=false', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-11' });
    mockUpsert.mockResolvedValue({});
    const token = encodeToken('unsub@example.com');
    const res = await POST(makePostRequest(token, false));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.emailNotifications).toBe(false);
  });

  it('defaults to resubscribe=false when param omitted', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-12' });
    mockUpsert.mockResolvedValue({});
    const token = encodeToken('default@example.com');
    // No resubscribe param
    const url = `http://localhost/api/user/unsubscribe?token=${token}`;
    const req = new NextRequest(url, { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.emailNotifications).toBe(false);
  });

  // ── Email normalisation ──────────────────────────────────────────────────
  it('looks up user by lowercased email from token', async () => {
    mockFindUnique.mockResolvedValue(null);
    const token = encodeToken('ADMIN@EXAMPLE.COM');
    await POST(makePostRequest(token));
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'admin@example.com' } })
    );
  });

  // ── DB error → 500 ──────────────────────────────────────────────────────
  it('returns 500 JSON on database error', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-13' });
    mockUpsert.mockRejectedValue(new Error('DB dead'));
    const token = encodeToken('dberror@example.com');
    const res = await POST(makePostRequest(token, true));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to update preferences');
  });
});
