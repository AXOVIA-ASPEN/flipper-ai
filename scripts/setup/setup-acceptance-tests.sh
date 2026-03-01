#!/bin/bash

# Setup script for Flipper AI acceptance tests

set -e

echo "🎭 Setting up Flipper AI Acceptance Tests..."
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

# Install Playwright browsers
echo "📦 Installing Playwright browsers..."
npx playwright install --with-deps chromium firefox webkit

# Create test database (optional)
echo ""
read -p "Create separate test database? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Creating test database..."
    createdb flipper_ai_test || echo "⚠️  Database might already exist"

    # Run migrations
    echo "🔧 Running migrations on test database..."
    DATABASE_URL=postgresql://localhost/flipper_ai_test npx prisma migrate deploy
fi

# Create test user
echo ""
read -p "Create test user (test@example.com)? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "👤 Creating test user..."

    # Start dev server if not running
    if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo "🚀 Starting dev server..."
        npm run dev &
        DEV_PID=$!
        sleep 5
    fi

    # Create user via API
    curl -X POST http://localhost:3000/api/auth/signup \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@example.com",
        "password": "Password123!",
        "name": "Test User"
      }' || echo "⚠️  User might already exist"

    # Kill dev server if we started it
    if [ ! -z "$DEV_PID" ]; then
        kill $DEV_PID
    fi
fi

# Create .env.test file
echo ""
read -p "Create .env.test file? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Creating .env.test..."

    cat > .env.test << EOF
# Test environment variables
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://localhost/flipper_ai_test

# NextAuth
NEXTAUTH_SECRET=test-secret-$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# OAuth (optional - uncomment and fill in to test OAuth)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
EOF

    echo "✅ .env.test created!"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Run acceptance tests with:"
echo "   npm run test:e2e:acceptance"
echo ""
echo "🎭 Or run in UI mode:"
echo "   npx playwright test e2e/acceptance/ --ui"
echo ""
echo "📊 View test report:"
echo "   npx playwright show-report"
echo ""
