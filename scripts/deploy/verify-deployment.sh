#!/bin/bash
# verify-deployment.sh - Check if Flipper AI deployment is working

set -e

echo "🐧 Flipper AI - Deployment Verification"
echo "========================================"
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/deploy/verify-deployment.sh <your-vercel-url>"
  echo "Example: ./scripts/deploy/verify-deployment.sh https://flipper-ai-abc123.vercel.app"
  exit 1
fi

URL="$1"

echo "🔍 Testing deployment at: $URL"
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Health check passed (HTTP $HTTP_CODE)"
else
  echo "   ⚠️  Health check returned HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Landing page
echo "2️⃣  Testing landing page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Landing page loaded (HTTP $HTTP_CODE)"
  
  # Check for key content
  CONTENT=$(curl -s "$URL/" || echo "")
  if echo "$CONTENT" | grep -q "Flipper"; then
    echo "   ✅ Page contains 'Flipper' branding"
  else
    echo "   ⚠️  Page missing 'Flipper' branding"
  fi
else
  echo "   ❌ Landing page failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Signup page
echo "3️⃣  Testing signup page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/auth/signup" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Signup page loaded (HTTP $HTTP_CODE)"
else
  echo "   ⚠️  Signup page returned HTTP $HTTP_CODE"
fi
echo ""

# Test 4: Login page
echo "4️⃣  Testing login page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/auth/login" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Login page loaded (HTTP $HTTP_CODE)"
else
  echo "   ⚠️  Login page returned HTTP $HTTP_CODE"
fi
echo ""

# Test 5: API health
echo "5️⃣  Testing API endpoints..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ API health endpoint working (HTTP $HTTP_CODE)"
else
  echo "   ⚠️  API health endpoint returned HTTP $HTTP_CODE"
fi
echo ""

# Test 6: Check for errors in page
echo "6️⃣  Checking for errors..."
CONTENT=$(curl -s "$URL/" || echo "")
if echo "$CONTENT" | grep -qi "error\|exception\|500"; then
  echo "   ⚠️  Found error keywords in page content"
else
  echo "   ✅ No obvious errors detected"
fi
echo ""

# Test 7: SSL/HTTPS
echo "7️⃣  Checking SSL certificate..."
if curl -s --head "$URL" | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
  echo "   ✅ HTTPS working"
else
  echo "   ⚠️  HTTPS check inconclusive"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deployment URL: $URL"
echo ""
echo "Next steps:"
echo "1. Visit $URL in your browser"
echo "2. Create a test account"
echo "3. Try logging in"
echo "4. Check browser console for errors"
echo ""
echo "If you see errors, check:"
echo "- Vercel logs: vercel logs $URL"
echo "- Environment variables: https://vercel.com/your-project/settings/environment-variables"
echo "- Database connection (Prisma Postgres integration)"
echo ""
echo "🐧 Happy flipping!"
