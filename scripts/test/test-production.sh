#!/bin/bash
# Comprehensive production testing script for Flipper AI

BASE_URL="https://axovia-flipper.web.app"

echo "🐧 Flipper AI - Production Testing"
echo "===================================="
echo ""

# Test 1: Landing Page
echo "1️⃣  Testing Landing Page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$STATUS" = "200" ]; then
  echo "   ✅ Landing page: HTTP $STATUS"
else
  echo "   ❌ Landing page: HTTP $STATUS"
fi

# Test 2: Health Endpoint
echo "2️⃣  Testing Health API..."
HEALTH=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "   ✅ Health API: Working"
else
  echo "   ❌ Health API: Failed"
fi

# Test 3: Auth Pages
echo "3️⃣  Testing Auth Pages..."
LOGIN=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/login")
SIGNUP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/signup")
echo "   Login: HTTP $LOGIN"
echo "   Signup: HTTP $SIGNUP"

# Test 4: Protected Routes (should redirect or 401)
echo "4️⃣  Testing Protected Routes..."
DASH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/messages")
echo "   Messages (protected): HTTP $DASH"

# Test 5: Static Assets
echo "5️⃣  Testing Static Assets..."
FAVICON=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.ico")
echo "   Favicon: HTTP $FAVICON"

# Test 6: API Documentation
echo "6️⃣  Testing API Docs..."
DOCS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/docs")
echo "   API Docs: HTTP $DOCS"

# Test 7: Sitemap
echo "7️⃣  Testing Sitemap..."
SITEMAP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml")
echo "   Sitemap: HTTP $SITEMAP"

echo ""
echo "✅ Production testing complete!"
