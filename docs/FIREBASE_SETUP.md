# Firebase Setup Guide for Flipper AI

This guide walks you through setting up Firebase for Flipper AI's authentication and database.

## Prerequisites

- A Google account
- Node.js 18+ installed
- Access to the Flipper AI repository

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enter project name: `flipper-ai-prod` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Enable sign-in methods:
   - **Email/Password** - Enable
   - **Google** - Enable (configure OAuth consent screen)
   - **GitHub** - Enable (requires GitHub OAuth app)

### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL: `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`
4. Copy Client ID and Secret to Firebase

## Step 3: Create Firestore Database

1. Go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Production mode**
4. Select location (e.g., `us-central1`)
5. Click "Enable"

### Security Rules (Initial Setup)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /listings/{listingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /scraperJobs/{jobId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Step 4: Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" > Web (</>)
4. Register app with nickname: "Flipper AI Web"
5. Copy the `firebaseConfig` object

Example:
```javascript
{
  apiKey: "AIzaSyC...",
  authDomain: "flipper-ai-prod.firebaseapp.com",
  projectId: "flipper-ai-prod",
  storageBucket: "flipper-ai-prod.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

## Step 5: Get Service Account Key

1. Still in **Project Settings**
2. Go to **Service accounts** tab
3. Click "Generate new private key"
4. Download JSON file
5. **IMPORTANT:** Keep this file secure, never commit to git

## Step 6: Configure Environment Variables

### Local Development (.env.local)
```bash
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyC..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="flipper-ai-prod.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="flipper-ai-prod"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="flipper-ai-prod.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"

# Firebase Admin (Server-side, KEEP SECRET)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"flipper-ai-prod","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-...@flipper-ai-prod.iam.gserviceaccount.com",...}'
```

### Production (Vercel)
Add the same variables to Vercel:
1. Go to Project Settings > Environment Variables
2. Add each variable from above
3. Set availability to "Production", "Preview", and "Development"

## Step 7: Test Locally

```bash
# Install dependencies (already done if you followed migration)
npm install

# Start dev server
npm run dev

# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'

# Expected response:
# {"success":true,"message":"Account created successfully",...}
```

## Step 8: Deploy to Production

```bash
# Commit changes
git add -A
git commit -m "Migrate to Firebase Authentication & Firestore"
git push

# Vercel will auto-deploy (if connected to repo)
```

## Firestore Data Structure

### Collections

**users/**
- `uid` (document ID)
- `email`: string
- `name`: string | null
- `subscriptionTier`: "FREE" | "PRO" | "BUSINESS"
- `onboardingComplete`: boolean
- `onboardingStep`: number
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp

**userSettings/**
- `uid` (document ID)
- `llmModel`: string
- `discountThreshold`: number
- `autoAnalyze`: boolean
- `emailNotifications`: boolean
- `notifyNewDeals`: boolean
- `notifyPriceDrops`: boolean
- `notifySoldItems`: boolean
- `notifyExpiring`: boolean
- `notifyWeeklyDigest`: boolean
- `notifyFrequency`: "instant" | "daily" | "weekly"
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp

**listings/** (to be created)
- `id` (document ID)
- `userId`: string
- `platform`: string
- `title`: string
- `askingPrice`: number
- `url`: string
- `valueScore`: number
- ...

**scraperJobs/** (to be created)
- `id` (document ID)
- `userId`: string
- `platform`: string
- `status`: string
- ...

## Troubleshooting

### "Firebase Admin SDK not initialized"
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly
- Ensure it's valid JSON (use single quotes, escape special chars)
- Restart dev server after changing env vars

### "Permission denied" in Firestore
- Review security rules
- Ensure user is authenticated
- Check that `request.auth.uid` matches document userId

### "Invalid API key"
- Verify `NEXT_PUBLIC_FIREBASE_API_KEY` is correct
- Check Firebase Console > Project Settings
- Ensure API key hasn't been restricted

## Migration Complete

Your Flipper AI app is now using Firebase! The benefits:
- ✅ Simplified authentication (no more NextAuth config)
- ✅ Real-time updates (Firestore listeners)
- ✅ Managed infrastructure (no database maintenance)
- ✅ Automatic scaling
- ✅ Built-in security rules

Next steps:
- Migrate remaining API routes (listings, scraper, etc.)
- Update tests to mock Firebase
- Add Firestore indexes as needed
- Monitor usage in Firebase Console
