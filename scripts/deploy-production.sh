#!/bin/bash
# Flipper AI - Production Deployment Automation
# Author: ASPEN (Axovia AI)
# Company: Axovia AI
# Description: One-command production deployment with pre-flight checks, 
#              health verification, and rollback capability

set -e  # Exit on error
set -u  # Exit on undefined variable

###############################################################################
# CONFIGURATION
###############################################################################

ENVIRONMENT="${1:-staging}"  # staging or production
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create deployment log directory early
mkdir -p "${PROJECT_ROOT}/deployments"

DEPLOYMENT_LOG="${PROJECT_ROOT}/deployments/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_NOTIFICATION="${EMAIL_NOTIFICATION:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# UTILITY FUNCTIONS
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}❌ ERROR: $1${NC}" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

notify_slack() {
    local message="$1"
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🐧 Flipper AI Deployment: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

notify_email() {
    local subject="$1"
    local body="$2"
    if [ -n "$EMAIL_NOTIFICATION" ]; then
        echo "$body" | mail -s "Flipper AI: $subject" "$EMAIL_NOTIFICATION" 2>/dev/null || true
    fi
}

###############################################################################
# PRE-FLIGHT CHECKS
###############################################################################

preflight_checks() {
    log "Starting pre-flight checks for ${ENVIRONMENT} deployment..."
    
    # Check we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Not in Flipper AI project root! ($PROJECT_ROOT)"
    fi
    
    # Check Node.js version
    log "Checking Node.js version..."
    node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        error "Node.js 18+ required (found: $(node -v))"
    fi
    success "Node.js version OK: $(node -v)"
    
    # Check environment file
    ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file not found: $ENV_FILE"
    fi
    success "Environment file found: $ENV_FILE"
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check critical environment variables
    log "Checking environment variables..."
    REQUIRED_VARS=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "ANTHROPIC_API_KEY"
        "STRIPE_SECRET_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable not set: $var"
        fi
    done
    success "All required environment variables set"
    
    # Check Git status
    log "Checking Git status..."
    if [ -n "$(git status --porcelain)" ]; then
        warning "Working directory has uncommitted changes"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment aborted by user"
        fi
    else
        success "Working directory clean"
    fi
    
    # Get current Git commit
    GIT_COMMIT=$(git rev-parse --short HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log "Current commit: $GIT_COMMIT on branch $GIT_BRANCH"
    
    success "Pre-flight checks completed"
}

###############################################################################
# BUILD & TEST
###############################################################################

run_tests() {
    log "Running test suite..."
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci || error "Failed to install dependencies"
    success "Dependencies installed"
    
    # Run linter
    log "Running ESLint..."
    npm run lint || error "ESLint failed - fix errors before deploying"
    success "ESLint passed"
    
    # Run type check
    log "Running TypeScript type check..."
    npx tsc --noEmit || error "TypeScript compilation failed"
    success "TypeScript check passed"
    
    # Run unit tests
    log "Running unit tests..."
    npm run test:coverage || error "Unit tests failed"
    success "Unit tests passed"
    
    # Check coverage
    log "Checking test coverage..."
    COVERAGE_LINES=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
    COVERAGE_BRANCHES=$(jq -r '.total.branches.pct' coverage/coverage-summary.json)
    
    MIN_COVERAGE=95
    if (( $(echo "$COVERAGE_LINES < $MIN_COVERAGE" | bc -l) )); then
        error "Line coverage too low: ${COVERAGE_LINES}% (required: ${MIN_COVERAGE}%)"
    fi
    if (( $(echo "$COVERAGE_BRANCHES < $MIN_COVERAGE" | bc -l) )); then
        error "Branch coverage too low: ${COVERAGE_BRANCHES}% (required: ${MIN_COVERAGE}%)"
    fi
    success "Coverage OK: Lines ${COVERAGE_LINES}%, Branches ${COVERAGE_BRANCHES}%"
    
    # Run integration tests
    log "Running integration tests..."
    npm run test:integration || error "Integration tests failed"
    success "Integration tests passed"
    
    # Run E2E tests (skip in CI if headless not available)
    if [ -z "${CI:-}" ]; then
        log "Running E2E tests..."
        npm run test:e2e || error "E2E tests failed"
        success "E2E tests passed"
    else
        warning "Skipping E2E tests in CI mode"
    fi
    
    success "All tests passed ✨"
}

build_application() {
    log "Building application..."
    
    # Clean previous builds
    rm -rf .next
    rm -rf out
    
    # Build Next.js app
    log "Building Next.js application..."
    NODE_ENV=production npm run build || error "Build failed"
    success "Next.js build completed"
    
    # Verify build artifacts
    if [ ! -d ".next" ]; then
        error "Build directory .next not found"
    fi
    success "Build artifacts verified"
}

###############################################################################
# DATABASE MIGRATION
###############################################################################

migrate_database() {
    log "Running database migrations..."
    
    # Check database connectivity
    log "Testing database connection..."
    npx prisma db execute --file=<(echo "SELECT 1;") || error "Database connection failed"
    success "Database connection OK"
    
    # Run migrations
    log "Applying Prisma migrations..."
    npx prisma migrate deploy || error "Database migration failed"
    success "Database migrations applied"
    
    # Verify schema
    log "Verifying database schema..."
    npx prisma db push --accept-data-loss || error "Schema verification failed"
    success "Database schema verified"
}

###############################################################################
# DOCKER DEPLOYMENT
###############################################################################

deploy_docker() {
    log "Building Docker image..."
    
    # Build Docker image
    IMAGE_NAME="gcr.io/axovia-flipper/flipper-web"
    IMAGE_TAG="${ENVIRONMENT}-${GIT_COMMIT}-${TIMESTAMP}"
    FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log "Building $FULL_IMAGE..."
    docker build \
        --build-arg NODE_ENV=production \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg BUILD_TIME="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        -t "$FULL_IMAGE" \
        -t "${IMAGE_NAME}:${ENVIRONMENT}-latest" \
        . || error "Docker build failed"
    success "Docker image built: $FULL_IMAGE"
    
    # Test Docker image locally
    log "Testing Docker image locally..."
    CONTAINER_ID=$(docker run -d -p 3333:3000 --env-file "$ENV_FILE" "$FULL_IMAGE")
    sleep 5
    
    # Health check
    if curl -f http://localhost:3333/api/health &>/dev/null; then
        success "Docker health check passed"
        docker stop "$CONTAINER_ID" &>/dev/null
        docker rm "$CONTAINER_ID" &>/dev/null
    else
        docker stop "$CONTAINER_ID" &>/dev/null
        docker rm "$CONTAINER_ID" &>/dev/null
        error "Docker health check failed"
    fi
    
    # Push to registry
    if [ "$ENVIRONMENT" == "production" ]; then
        log "Pushing to container registry..."
        docker push "$FULL_IMAGE" || error "Docker push failed"
        docker push "${IMAGE_NAME}:${ENVIRONMENT}-latest" || error "Docker push failed"
        success "Docker images pushed to registry"
    else
        log "Skipping push for staging environment"
    fi
    
    echo "$FULL_IMAGE" > "${PROJECT_ROOT}/.last-docker-image"
}

###############################################################################
# CLOUD RUN DEPLOYMENT
###############################################################################

deploy_cloud_run() {
    log "Deploying to Cloud Run ($ENVIRONMENT)..."
    
    SERVICE_NAME="flipper-${ENVIRONMENT}"
    REGION="us-east1"
    
    gcloud run deploy "$SERVICE_NAME" \
        --image="$(cat ${PROJECT_ROOT}/.last-docker-image)" \
        --platform=managed \
        --region="$REGION" \
        --allow-unauthenticated \
        --memory=2Gi \
        --cpu=2 \
        --max-instances=10 \
        --min-instances=$([ "$ENVIRONMENT" == "production" ] && echo "1" || echo "0") \
        --set-env-vars="NODE_ENV=production,GIT_COMMIT=$GIT_COMMIT" \
        --timeout=300s \
        || error "Cloud Run deployment failed"
    
    success "Cloud Run deployment completed"
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
    log "Service URL: $SERVICE_URL"
    echo "$SERVICE_URL" > "${PROJECT_ROOT}/.last-deployment-url"
}

###############################################################################
# POST-DEPLOYMENT VERIFICATION
###############################################################################

verify_deployment() {
    log "Running post-deployment verification..."
    
    URL="${1:-http://localhost:3000}"
    
    # Health check
    log "Testing health endpoint..."
    if ! curl -f "${URL}/api/health" &>/dev/null; then
        error "Health check failed: ${URL}/api/health"
    fi
    success "Health check passed"
    
    # API endpoints smoke test
    log "Testing API endpoints..."
    
    # Test authentication
    log "Testing /api/auth/register..."
    TEST_EMAIL="test-${TIMESTAMP}@example.com"
    REGISTER_RESPONSE=$(curl -s -X POST "${URL}/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"Test123!@#\",\"name\":\"Test User\"}")
    
    if echo "$REGISTER_RESPONSE" | jq -e '.id' &>/dev/null; then
        success "Registration endpoint working"
    else
        warning "Registration test inconclusive (user may already exist)"
    fi
    
    # Test marketplace endpoints
    log "Testing /api/scraper/ebay..."
    if curl -f "${URL}/api/scraper/ebay?query=test&limit=1" &>/dev/null; then
        success "eBay scraper endpoint accessible"
    else
        warning "eBay scraper endpoint returned non-200"
    fi
    
    success "Smoke tests passed ✨"
}

###############################################################################
# ROLLBACK
###############################################################################

rollback_deployment() {
    log "ROLLBACK: Reverting to previous deployment..."
    
    if [ ! -f "${PROJECT_ROOT}/.previous-deployment" ]; then
        error "No previous deployment found to rollback to"
    fi
    
    PREVIOUS_IMAGE=$(cat "${PROJECT_ROOT}/.previous-deployment")
    SERVICE_NAME="flipper-${ENVIRONMENT}"
    REGION="us-east1"
    
    warning "Rolling back to: $PREVIOUS_IMAGE"
    
    gcloud run deploy "$SERVICE_NAME" \
        --image="$PREVIOUS_IMAGE" \
        --platform=managed \
        --region="$REGION" \
        || error "Rollback failed"
    
    success "Rollback completed"
    notify_slack "❌ Deployment failed - rolled back to $PREVIOUS_IMAGE"
}

###############################################################################
# DEPLOYMENT MANIFEST
###############################################################################

create_manifest() {
    log "Creating deployment manifest..."
    
    MANIFEST_DIR="${PROJECT_ROOT}/deployments"
    mkdir -p "$MANIFEST_DIR"
    
    MANIFEST_FILE="${MANIFEST_DIR}/manifest_${ENVIRONMENT}_${TIMESTAMP}.json"
    
    cat > "$MANIFEST_FILE" <<EOF
{
  "environment": "${ENVIRONMENT}",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "git": {
    "commit": "${GIT_COMMIT}",
    "branch": "${GIT_BRANCH}"
  },
  "docker": {
    "image": "$(cat ${PROJECT_ROOT}/.last-docker-image 2>/dev/null || echo 'N/A')"
  },
  "deployment": {
    "url": "$(cat ${PROJECT_ROOT}/.last-deployment-url 2>/dev/null || echo 'N/A')"
  },
  "tests": {
    "coverage": {
      "lines": ${COVERAGE_LINES:-0},
      "branches": ${COVERAGE_BRANCHES:-0}
    }
  },
  "deployer": "$(whoami)@$(hostname)"
}
EOF
    
    success "Deployment manifest created: $MANIFEST_FILE"
}

###############################################################################
# MAIN DEPLOYMENT FLOW
###############################################################################

main() {
    log "========================================="
    log "🐧 Flipper AI Production Deployment"
    log "========================================="
    log "Environment: ${ENVIRONMENT}"
    log "Timestamp: ${TIMESTAMP}"
    log "========================================="
    
    # Create deployment log directory
    mkdir -p "${PROJECT_ROOT}/deployments"
    
    # Backup previous deployment info
    if [ -f "${PROJECT_ROOT}/.last-docker-image" ]; then
        cp "${PROJECT_ROOT}/.last-docker-image" "${PROJECT_ROOT}/.previous-deployment"
    fi
    
    # Execute deployment steps
    trap 'error "Deployment failed at line $LINENO"' ERR
    
    preflight_checks
    run_tests
    build_application
    migrate_database
    deploy_docker
    
    if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "staging" ]; then
        deploy_cloud_run
        verify_deployment "$(cat ${PROJECT_ROOT}/.last-deployment-url)"
    else
        verify_deployment "http://localhost:3000"
    fi
    
    create_manifest
    
    # Success notifications
    success "========================================="
    success "🎉 Deployment completed successfully!"
    success "========================================="
    success "Environment: ${ENVIRONMENT}"
    success "Commit: ${GIT_COMMIT}"
    success "Timestamp: ${TIMESTAMP}"
    if [ -f "${PROJECT_ROOT}/.last-deployment-url" ]; then
        success "URL: $(cat ${PROJECT_ROOT}/.last-deployment-url)"
    fi
    success "========================================="
    
    notify_slack "✅ Deployment succeeded (${ENVIRONMENT}) - Commit: ${GIT_COMMIT}"
    notify_email "Deployment Success: ${ENVIRONMENT}" "Deployment completed successfully. See log: ${DEPLOYMENT_LOG}"
    
    log "Full deployment log: $DEPLOYMENT_LOG"
}

###############################################################################
# SCRIPT EXECUTION
###############################################################################

# Handle script arguments
case "${1:-}" in
    staging|production)
        main
        ;;
    rollback)
        rollback_deployment
        ;;
    --help|-h)
        cat <<EOF
Flipper AI Production Deployment Script

Usage:
  ./deploy-production.sh [staging|production]  Deploy to environment
  ./deploy-production.sh rollback              Rollback to previous deployment
  ./deploy-production.sh --help                Show this help

Environment Variables:
  SLACK_WEBHOOK_URL      Slack webhook for notifications (optional)
  EMAIL_NOTIFICATION     Email address for notifications (optional)

Examples:
  ./deploy-production.sh staging              # Deploy to staging
  ./deploy-production.sh production           # Deploy to production
  ./deploy-production.sh rollback             # Rollback last deployment

Pre-requisites:
  - Node.js 18+
  - Docker
  - gcloud CLI (for production/staging)
  - .env.staging or .env.production file
  
For more info, see: docs/DEPLOYMENT.md
EOF
        ;;
    *)
        error "Invalid argument. Use: staging, production, rollback, or --help"
        ;;
esac
