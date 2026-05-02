#!/bin/bash
# setup-oauth.sh - Interactive OAuth setup for Flipper AI

set -e

echo "🔐 Flipper AI - OAuth Setup"
echo "============================"
echo ""
echo "This script will help you configure Google and GitHub OAuth."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
fi

# Function to add or update env var
update_env() {
  local key=$1
  local value=$2
  local file=".env.local"
  
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # Update existing
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    # Add new
    echo "${key}=${value}" >> "$file"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📧 GOOGLE OAUTH SETUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://console.developers.google.com"
echo "2. Create a new project (or select existing)"
echo "3. Enable Google+ API"
echo "4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID"
echo "5. Application type: Web application"
echo "6. Authorized redirect URIs:"
echo "   - Development: http://localhost:3200/api/auth/callback/google"
echo "   - Production: https://your-domain.com/api/auth/callback/google"
echo ""
read -p "Do you want to set up Google OAuth? (y/n): " setup_google

if [ "$setup_google" = "y" ]; then
  read -p "Enter GOOGLE_CLIENT_ID: " google_client_id
  read -p "Enter GOOGLE_CLIENT_SECRET: " google_client_secret
  
  update_env "GOOGLE_CLIENT_ID" "$google_client_id"
  update_env "GOOGLE_CLIENT_SECRET" "$google_client_secret"
  
  echo "✅ Google OAuth credentials saved to .env.local"
else
  echo "⏭️  Skipping Google OAuth setup"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐙 GITHUB OAUTH SETUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://github.com/settings/developers"
echo "2. Click 'New OAuth App'"
echo "3. Fill in:"
echo "   - Application name: Flipper AI"
echo "   - Homepage URL: http://localhost:3200 (dev) or https://your-domain.com (prod)"
echo "   - Authorization callback URL:"
echo "     - Development: http://localhost:3200/api/auth/callback/github"
echo "     - Production: https://your-domain.com/api/auth/callback/github"
echo "4. Click 'Register application'"
echo "5. Copy Client ID and generate a Client Secret"
echo ""
read -p "Do you want to set up GitHub OAuth? (y/n): " setup_github

if [ "$setup_github" = "y" ]; then
  read -p "Enter GITHUB_CLIENT_ID: " github_client_id
  read -p "Enter GITHUB_CLIENT_SECRET: " github_client_secret
  
  update_env "GITHUB_CLIENT_ID" "$github_client_id"
  update_env "GITHUB_CLIENT_SECRET" "$github_client_secret"
  
  echo "✅ GitHub OAuth credentials saved to .env.local"
else
  echo "⏭️  Skipping GitHub OAuth setup"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ OAUTH SETUP COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Deploy to Cloud Run (if not already done):"
echo "   gcloud run deploy flipper-ai --source ."
echo ""
echo "2. Add environment variables to GCP Secret Manager:"
echo "   gcloud secrets create GOOGLE_CLIENT_ID --data-file=-"
echo "   gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-"
echo "   gcloud secrets create GITHUB_CLIENT_ID --data-file=-"
echo "   gcloud secrets create GITHUB_CLIENT_SECRET --data-file=-"
echo ""
echo "3. Update OAuth redirect URIs with your production URL:"
echo "   https://axovia-flipper.web.app/api/auth/callback/google"
echo "   https://axovia-flipper.web.app/api/auth/callback/github"
echo ""
echo "4. Test OAuth sign-in:"
echo "   npm run dev"
echo "   Open http://localhost:3200/auth/login"
echo "   Click 'Continue with Google' or 'Continue with GitHub'"
echo ""
echo "5. Run acceptance tests:"
echo "   npm run test:acceptance"
echo ""
echo "🐧 Happy flipping!"
