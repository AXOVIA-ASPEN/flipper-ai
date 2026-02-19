# Vercel Environment Variables Setup

Add these to: https://vercel.com/axovia-ai/flipper-ai/settings/environment-variables

## Required Variables (Copy-paste these)

### Firebase Client Config (Public - All Environments)
```
NEXT_PUBLIC_FIREBASE_API_KEY
AIzaSyDUbLTQogeNg5YZzrIF0ATZJ_YvBbtF3Ls

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
axovia-flipper.firebaseapp.com

NEXT_PUBLIC_FIREBASE_PROJECT_ID
axovia-flipper

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
axovia-flipper.firebasestorage.app

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
45047000631

NEXT_PUBLIC_FIREBASE_APP_ID
1:45047000631:web:56aa94d525f688245599b2

NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
G-9TVC4FWSK6
```

### Firebase Admin SDK (Server-side - All Environments)
**IMPORTANT:** This must be on ONE LINE with escaped newlines

```
FIREBASE_SERVICE_ACCOUNT_KEY
<PASTE YOUR FIREBASE SERVICE ACCOUNT JSON HERE - GET FROM FIREBASE CONSOLE>
```

**Get this from:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Paste the ENTIRE JSON contents as ONE LINE (with `\n` for newlines in the private_key field)

### Existing (Keep These)
```
BLOB_READ_WRITE_TOKEN
vercel_blob_rw_yNdv3dPYgdE1gzbu_s0yBNT2vypafs5BwRzKqFT38uQCfcz
```

---

## Steps:

1. Go to https://vercel.com/axovia-ai/flipper-ai/settings/environment-variables
2. For EACH variable above:
   - Click "Add New"
   - Paste variable name
   - Paste value
   - Select "Production", "Preview", "Development" (all 3)
   - Click "Save"
3. After adding ALL variables, go to Deployments
4. Click "..." menu on latest deployment → "Redeploy"
5. Wait for deployment to complete (~2-3 minutes)
6. Test registration!

---

## Test Registration After Deploy:

```bash
curl -X POST https://flipper-ai-ten.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "uid": "...",
      "email": "test@example.com",
      "name": "Test User"
    },
    "customToken": "..."
  }
}
```

---

## Important Notes:

- Remove old `NEXTAUTH_URL` and `NEXTAUTH_SECRET` (not needed anymore)
- `FIREBASE_SERVICE_ACCOUNT_KEY` must be ONE LINE (no line breaks in the JSON itself, just `\n` escape sequences)
- All `NEXT_PUBLIC_*` vars are safe (exposed to browser)
- `FIREBASE_SERVICE_ACCOUNT_KEY` is secret (server-only)

---

## If You Get Errors:

### "Firebase Admin SDK not initialized"
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` is formatted correctly (one line, escaped newlines)
- Verify it's set to all environments (Production, Preview, Development)

### "Permission denied" 
- Enable Firestore: Firebase Console → Build → Firestore Database → Create
- Check security rules allow authenticated writes

### Build fails
- Check Vercel build logs
- Ensure all variables are set before redeploying
