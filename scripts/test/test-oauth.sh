#!/bin/bash
# Test OAuth configuration

echo "🔍 Testing OAuth Configuration"
echo "==============================="
echo ""

# Test Google OAuth
echo "1️⃣  Testing Google OAuth..."
curl -s "https://flipper-ai-ten.vercel.app/api/auth/providers" | grep -q "google" && echo "   ✅ Google provider configured" || echo "   ⚠️  Google provider not found in providers list"

# Test GitHub OAuth
echo "2️⃣  Testing GitHub OAuth..."
curl -s "https://flipper-ai-ten.vercel.app/api/auth/providers" | grep -q "github" && echo "   ✅ GitHub provider configured" || echo "   ⚠️  GitHub provider not found in providers list"

# Test signin page
echo "3️⃣  Testing signin page..."
SIGNIN=$(curl -s "https://flipper-ai-ten.vercel.app/auth/login" | grep -c "Continue with")
if [ "$SIGNIN" -gt 0 ]; then
  echo "   ✅ OAuth buttons present on page"
else
  echo "   ⚠️  OAuth buttons not found"
fi

echo ""
echo "ℹ️  Note: Providers showing as configured means the code is ready."
echo "   To make OAuth work, add credentials to Vercel environment variables."
echo ""
echo "📖 See QUICK_OAUTH_FIX.md for step-by-step instructions!"
