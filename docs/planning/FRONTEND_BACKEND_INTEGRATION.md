# Frontend-Backend Integration Plan

**Strategy:** Use Next.js frontend + Django backend (Option A)

---

## Architecture

```
┌─────────────────────────────────────────┐
│     Next.js Static Frontend             │
│     (Firebase Hosting)                  │
│     - Landing page                      │
│     - Auth pages (login/signup)         │
│     - Dashboard, Listings, Scraper UI   │
└─────────────────────────────────────────┘
              │
              │ HTTPS API Calls
              ▼
┌─────────────────────────────────────────┐
│     Django REST API Backend             │
│     (Cloud Run)                         │
│     https://flipper-backend...run.app   │
│     - /api/listings/                    │
│     - /api/scraper/                     │
│     - /api/opportunities/               │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     Cloud SQL (PostgreSQL)              │
│     Database: flipper_prod              │
└─────────────────────────────────────────┘
```

---

## Changes Required

### 1. Update Next.js API Client

**Current:** API calls go to `/api/*` (Next.js API routes)  
**New:** API calls go to `https://flipper-backend-xxx.run.app/api/*`

**File to update:** `src/services/api.ts` (or similar)

```typescript
// Before:
const API_BASE_URL = '/api';

// After:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://flipper-backend-yihpalu24a-uc.a.run.app/api';
```

### 2. Authentication Flow

**Current:** NextAuth sessions  
**New:** Firebase Auth + Django JWT tokens

**Changes needed:**
- Keep Firebase Auth on frontend (already configured)
- Get Firebase ID token after login
- Send token to Django in Authorization header
- Django verifies Firebase token and returns user data

```typescript
// After Firebase login:
const user = await signInWithEmailAndPassword(auth, email, password);
const idToken = await user.getIdToken();

// Use in API calls:
headers: {
  'Authorization': `Bearer ${idToken}`
}
```

### 3. Environment Variables

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_API_URL=https://flipper-backend-yihpalu24a-uc.a.run.app
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDUbLTQogeNg5YZzrIF0ATZJ_YvBbtF3Ls
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=axovia-flipper.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=axovia-flipper
```

### 4. Export as Static Site

**Update `next.config.ts`:**
```typescript
export default {
  output: 'export', // Static export
  images: {
    unoptimized: true, // Required for static export
  },
  // Remove API routes
};
```

---

## Step-by-Step Integration

### Step 1: Update API Client (30 minutes)

```bash
cd projects/flipper-ai

# Create new API client
cat > src/lib/api-client.ts << 'EOF'
import axios from 'axios';
import { auth } from '@/lib/firebase/client';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://flipper-backend-yihpalu24a-uc.a.run.app',
});

// Add Firebase ID token to all requests
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
EOF
```

### Step 2: Update All API Calls (1 hour)

Find and replace in all components:
```typescript
// OLD:
fetch('/api/listings')

// NEW:
import api from '@/lib/api-client';
api.get('/listings/')
```

**Files to update:**
- Dashboard components
- Listings pages
- Scraper pages
- Auth pages (registration logic)

### Step 3: Configure Static Export (15 minutes)

```bash
# Update next.config.ts
# Add output: 'export'
# Remove API routes

# Test build
npm run build
```

### Step 4: Deploy Frontend (30 minutes)

**Option A: Firebase Hosting**
```bash
npm install -g firebase-tools
firebase init hosting
npm run build
firebase deploy
```

---

## API Endpoints Mapping

| Frontend Call | Django Endpoint | Status |
|--------------|-----------------|--------|
| POST /api/auth/register | POST /api/users/ | ⏳ Need to create |
| GET /api/listings | GET /api/listings/ | ✅ Created |
| POST /api/listings | POST /api/listings/ | ✅ Created |
| GET /api/opportunities | GET /api/opportunities/ | ✅ Created |
| POST /api/scraper/ebay | POST /api/scraper/jobs/ | ⏳ Need to create |

---

## Testing Plan

### Local Testing
```bash
# 1. Start Django backend locally
cd projects/flipper-ai-django
python manage.py runserver 8000

# 2. Update Next.js to point to localhost
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

# 3. Test flows:
# - Registration
# - Login
# - View listings
# - Create scraper job
```

### Production Testing
```bash
# After deployment
curl https://your-frontend.web.app/
# Should load UI

# Check API calls in browser DevTools
# Should see requests to flipper-backend-xxx.run.app
```

---

## Estimated Timeline

- ✅ Django backend deployed (DONE)
- ⏳ Environment variables (fixing now)
- ⏳ Update API client (30 min)
- ⏳ Update components (1-2 hours)
- ⏳ Test locally (30 min)
- ⏳ Deploy frontend (30 min)
- ⏳ End-to-end testing (1 hour)

**Total:** 4-5 hours

---

## Advantages of This Approach

✅ **Keep all existing UI** - No need to rebuild frontend  
✅ **Reliable backend** - Django + PostgreSQL (proven stack)  
✅ **Scalable** - Cloud Run auto-scales  
✅ **Cost-effective** - Static hosting is cheap/free  
✅ **Fast** - Static frontend on CDN  
✅ **Maintainable** - Separate concerns (UI vs API)

---

## Next Steps

1. **Finish Django backend setup** (env vars + migrations)
2. **Update Next.js API client**
3. **Test locally**
4. **Deploy frontend to Firebase Hosting**
5. **Launch!** 🚀
