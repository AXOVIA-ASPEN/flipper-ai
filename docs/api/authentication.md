# Authentication Guide

**Last Updated:** 2026-03-01

---

## Overview

Flipper AI uses **NextAuth.js** for authentication with support for:
- Email/password authentication
- OAuth providers (Google, GitHub, Facebook)
- Session-based authentication (cookies)
- JWT tokens for API access

---

## Authentication Methods

### 1. Email/Password

**Endpoint:** `POST /api/auth/signup`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "clx1234567890",
  "message": "Account created successfully"
}
```

**Login:** `POST /api/auth/signin`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

---

### 2. OAuth (Google, GitHub, Facebook)

**Flow:**
1. Redirect user to `/api/auth/signin/google` (or `/github`, `/facebook`)
2. User authorizes on provider's page
3. Callback to `/api/auth/callback/google`
4. Session cookie automatically set

**Example (Client-side):**
```typescript
import { signIn } from 'next-auth/react';

// Google OAuth
await signIn('google', { callbackUrl: '/dashboard' });

// GitHub OAuth
await signIn('github', { callbackUrl: '/dashboard' });
```

---

## Session Management

### Getting Current User

**Client-side (React):**
```typescript
import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;
  
  return <div>Welcome {session.user.name}</div>;
}
```

**Server-side (API Route):**
```typescript
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // ... authorized code
}
```

---

## API Token Authentication

For programmatic API access (mobile apps, third-party integrations):

### Generate API Token

**Endpoint:** `POST /api/auth/tokens`

**Request:**
```json
{
  "name": "My Mobile App",
  "expiresIn": "30d"
}
```

**Response:**
```json
{
  "success": true,
  "token": "flp_live_1234567890abcdef",
  "expiresAt": "2026-03-31T00:00:00Z"
}
```

### Using API Tokens

**Header:**
```
Authorization: Bearer flp_live_1234567890abcdef
```

**Example (cURL):**
```bash
curl -H "Authorization: Bearer flp_live_1234567890abcdef" \
     https://flipper-ai.vercel.app/api/opportunities
```

---

## Protected Routes

All routes under `/dashboard/*` and most `/api/*` endpoints require authentication.

### Middleware

`middleware.ts` handles route protection:
```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/opportunities/:path*',
    '/api/listings/:path*',
    '/api/scrape/:path*',
    // ... other protected routes
  ],
};
```

### Redirect Behavior

- Unauthenticated users → `/login?callbackUrl=/dashboard`
- After login → Original destination
- After signup → `/onboarding`

---

## Security Best Practices

### Password Requirements

- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character

### Session Security

- **httpOnly cookies:** Prevents XSS attacks
- **secure flag:** HTTPS only in production
- **sameSite:** CSRF protection
- **maxAge:** 30 days (configurable)

### Rate Limiting

Authentication endpoints are rate-limited:

| Endpoint | Limit |
|----------|-------|
| `/api/auth/signup` | 5 requests / hour / IP |
| `/api/auth/signin` | 10 requests / 15 min / IP |
| `/api/auth/reset-password` | 3 requests / hour / email |

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 15 minutes",
  "retryAfter": 900
}
```

---

## Testing Authentication

### Seed Users (Development)

```bash
npm run prisma:seed
```

Creates test accounts:
```
Email: test@example.com
Password: Test1234!

Email: admin@example.com
Password: Admin1234!
```

### Manual Testing

1. **Sign Up:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test1234!","name":"Test User"}'
   ```

2. **Sign In:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test1234!"}'
   ```

3. **Get Session:**
   ```bash
   curl http://localhost:3000/api/auth/session \
     --cookie "next-auth.session-token=<token>"
   ```

---

## Environment Variables

Required in `.env`:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=<from-github>
GITHUB_CLIENT_SECRET=<from-github>

# Facebook OAuth (optional)
FACEBOOK_CLIENT_ID=<from-facebook>
FACEBOOK_CLIENT_SECRET=<from-facebook>
```

---

## Related Documentation

- [NextAuth.js Official Docs](https://next-auth.js.org)
- [OAuth Setup Guide](../deployment/OAUTH_SETUP.md)
- [API Reference](./README.md)
- [Security Best Practices](../security/README.md)
