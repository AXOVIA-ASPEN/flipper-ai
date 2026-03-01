@epic-1
Feature: Production Infrastructure & Secure Deployment
  As a developer and user
  I want production infrastructure provisioned and secured
  So that the application is deployed, accessible, and operationally ready

  @E-001-S-1 @story-1-3 @FR-INFRA-01
  Scenario: Docker build produces a runnable container image
    Given the Next.js application codebase
    When I inspect the project build configuration
    Then next.config.js should have "output" set to "standalone"
    And the Dockerfile should exist at "config/docker/Dockerfile"
    And the Dockerfile should use a multi-stage build with "deps", "builder", and "runner" stages
    And the Dockerfile should copy ".next/standalone" into the runner stage
    And the Dockerfile should set the CMD to "node server.js"
    And a "build:docker" script should exist in package.json that skips database migrations
    And the Prisma schema should include "linux-musl-openssl-3.0.x" in binaryTargets

  @E-001-S-2 @story-1-3 @FR-INFRA-01
  Scenario: Container image can be pushed and deployed to Cloud Run
    Given the deploy script at "scripts/deploy/deploy-production.sh"
    When I inspect the deploy script configuration
    Then it should build the Docker image with "-f config/docker/Dockerfile"
    And it should tag images for "gcr.io/axovia-flipper/flipper-web"
    And it should deploy using "gcloud run deploy"
    And it should include a post-deploy health check against "/api/health"

  @E-001-S-3 @story-1-3 @FR-INFRA-05
  Scenario: Cloud Run auto-scales from 0 to N instances based on demand
    Given the deploy script at "scripts/deploy/deploy-production.sh"
    When I inspect the Cloud Run scaling configuration
    Then the deploy command should set "--max-instances" to a value greater than 1
    And the staging configuration should set "--min-instances" to "0"

  @E-001-S-4 @story-1-3 @FR-INFRA-05
  Scenario: Cloud Run scales to zero on idle to minimize cost
    Given the deploy script at "scripts/deploy/deploy-production.sh"
    When I inspect the Cloud Run scaling configuration for staging
    Then the staging deploy should allow scale-to-zero with "--min-instances=0"

  @E-001-S-5 @story-1-3 @FR-INFRA-08
  Scenario: Secrets are injected via Secret Manager, not set directly
    Given the Dockerfile at "config/docker/Dockerfile"
    And the deploy script at "scripts/deploy/deploy-production.sh"
    When I inspect the configuration for secret handling
    Then the Dockerfile should not contain any secret environment variables
    And the Dockerfile should not pass secrets via ARG instructions
    And the Dockerfile should not hardcode "ENV PORT=3000"
    And the deploy script should use "--set-secrets" for sensitive values
    And only non-secret config values should be set with "--set-env-vars"

  @E-001-S-6 @story-1-3 @FR-INFRA-01
  Scenario: Application loads and is functional at the deployed URL
    Given the application is running
    When I navigate to the health endpoint "/api/health"
    Then the health check should return a successful response
    And the response should include a status indicator

  # Story 1.5: Firebase Hosting & CORS Configuration

  @E-001-S-7 @story-1-5 @FR-INFRA-04
  Scenario: Firebase Hosting serves static assets with CDN cache headers
    Given the Firebase Hosting configuration at "firebase.json"
    When I inspect the hosting configuration
    Then the "public" directory should be set to "out"
    And JS and CSS files should have "Cache-Control" set to "public, max-age=31536000, immutable"
    And image files should have "Cache-Control" set to "public, max-age=31536000, immutable"
    And HTML files should have "Cache-Control" set to "public, max-age=300, s-maxage=600"
    And font files should include "Access-Control-Allow-Origin" set to "*"

  @E-001-S-8 @story-1-5 @FR-INFRA-09
  Scenario: CORS allows cross-origin requests from Firebase Hosting origins
    Given the CORS middleware is configured
    When a request is made from "https://axovia-flipper.web.app" to an API endpoint
    Then the response should include "Access-Control-Allow-Origin" matching the origin
    And the response should include "Access-Control-Allow-Credentials" set to "true"
    And the response should include "Access-Control-Allow-Methods" with standard HTTP methods

  @E-001-S-9 @story-1-5 @FR-INFRA-09
  Scenario: CORS rejects requests from unauthorized origins
    Given the CORS middleware is configured
    When a mutating request is made from "https://evil.com" to an API endpoint
    Then the response should return HTTP 403
    And the response should not include "Access-Control-Allow-Origin"

  @E-001-S-10 @story-1-5 @FR-INFRA-04
  Scenario: Firebase Hosting rewrites API requests to Cloud Run
    Given the Firebase Hosting configuration at "firebase.json"
    When I inspect the rewrite rules
    Then "/api/**" requests should be rewritten to Cloud Run service "flipper-ai-backend" in region "us-central1"
    And the catch-all "**" rewrite should serve "/index.html" for SPA routing
    And the API rewrite should appear before the catch-all rewrite

  # Story 1.4: Firebase Auth Setup & Migration

  @E-001-S-11 @story-1-4 @FR-INFRA-03
  Scenario: Firebase Auth client and admin SDKs are configured
    Given the Firebase configuration files exist
    When I inspect the Firebase Auth configuration
    Then "src/lib/firebase/config.ts" should initialize the Firebase client app with env vars
    And "src/lib/firebase/admin.ts" should initialize Firebase Admin with ADC support
    And "src/lib/firebase/auth.ts" should export sign-in, sign-up, OAuth, and sign-out helpers
    And ".env.example" should include Firebase public config variables

  @E-001-S-12 @story-1-4 @FR-INFRA-03
  Scenario: OAuth providers are supported via Firebase Auth
    Given the Firebase Auth client helpers at "src/lib/firebase/auth.ts"
    When I inspect the OAuth provider configuration
    Then the module should export a "signInWithGoogle" function
    And the module should export a "signInWithGitHub" function
    And the module should export a "signInWithFacebook" function
    And each OAuth function should call "signInWithPopup" with the appropriate provider

  @E-001-S-13 @story-1-4 @FR-INFRA-03
  Scenario: Facebook marketplace token is stored separately from auth
    Given the Facebook auth files exist
    When I inspect the Facebook token handling
    Then "signInWithFacebook" should extract the access token from the OAuth credential
    And it should POST the Facebook access token to "/api/auth/facebook/token"
    And the "FacebookToken" model should exist in the Prisma schema

  @E-001-S-14 @story-1-4 @FR-INFRA-03
  Scenario: NextAuth is fully replaced by Firebase Auth
    Given the authentication source files
    When I inspect the auth migration status
    Then "next-auth" should not be listed in package.json dependencies
    And "app/api/auth/[...nextauth]" route should not exist
    And "src/lib/auth.ts" should re-export from Firebase session module
    And "app/layout.tsx" should use "FirebaseAuthProvider" instead of "SessionProvider" from next-auth

  @E-001-S-15 @story-1-4 @FR-INFRA-03
  Scenario: Backend validates Firebase tokens and session cookies
    Given the backend auth middleware files
    When I inspect the token validation implementation
    Then "src/lib/firebase/auth-middleware.ts" should verify Bearer tokens via "verifyIdToken"
    And "src/lib/firebase/session.ts" should verify session cookies via "verifySessionCookie"
    And "src/lib/auth-middleware.ts" should try session cookie first, then fall back to Bearer token
    And "app/api/auth/session/route.ts" should exchange ID tokens for HttpOnly session cookies
    And "app/api/auth/signout/route.ts" should clear session cookies and revoke refresh tokens

  @E-001-S-16 @story-1-4 @FR-INFRA-03
  Scenario: Firebase secrets are integrated with Secret Manager
    Given the secrets configuration
    When I inspect the secret storage for Firebase credentials
    Then "helpers/secrets.py" should include Firebase admin credentials in its dataclass
    And ".env.example" should include "FIREBASE_CLIENT_EMAIL" and "FIREBASE_PRIVATE_KEY"
    And "src/lib/firebase/admin.ts" should read credentials from environment variables

  # Story 1.8: GitHub Actions CI/CD Pipeline

  @E-001-S-17 @story-1-8 @FR-INFRA-06 @NFR-TEST-05
  Scenario: Main branch push triggers full CI/CD pipeline with Cloud Run deploy
    Given the CI workflow at ".github/workflows/ci.yml"
    When I inspect the workflow configuration
    Then it should trigger on push to the "main" branch
    And it should have a "build-container" job that builds and pushes to Artifact Registry
    And it should have a "deploy-cloud-run" job that deploys to Cloud Run
    And the "deploy-cloud-run" job should depend on "test", "integration-test", "python-test", and "build-container"
    And the "build-container" job should use "config/docker/Dockerfile"
    And the deploy job should include a database migration step before deployment

  @E-001-S-18 @story-1-8 @FR-INFRA-06
  Scenario: PR triggers preview pipeline with staging deployment
    Given the CI workflow at ".github/workflows/ci.yml"
    When I inspect the workflow configuration for pull request events
    Then it should trigger on pull_request to the "main" branch
    And the deploy job should deploy to Cloud Run staging service for PRs
    And the deploy job should comment on the PR with the staging URL
    And the "build-container" job should not have a main-branch-only condition

  @E-001-S-19 @story-1-8 @FR-INFRA-06
  Scenario: Pipeline failure stops deployment
    Given the CI workflow at ".github/workflows/ci.yml"
    When I inspect the job dependency chain
    Then the "deploy-cloud-run" job should depend on "test" passing
    And the "deploy-cloud-run" job should depend on "integration-test" passing
    And the "deploy-cloud-run" job should depend on "python-test" passing
    And the "deploy-cloud-run" job should depend on "build-container" passing
    And if any dependency fails the deploy job should be skipped

  @E-001-S-20 @story-1-8 @FR-INFRA-06
  Scenario: GCP credentials are stored as GitHub secrets, not in the repository
    Given the CI workflow at ".github/workflows/ci.yml"
    When I inspect the GCP authentication configuration
    Then it should use "google-github-actions/auth@v2" for authentication
    And credentials should reference "${{ secrets.* }}" variables
    And no service account keys should be hardcoded in the workflow file
    And the required secrets should be documented in workflow comments

  @E-001-S-21 @story-1-8 @FR-INFRA-06
  Scenario: Post-deploy health check verifies the deployed service is responding
    Given the CI workflow at ".github/workflows/ci.yml"
    When I inspect the post-deploy steps
    Then a liveness check should verify "/api/health" returns status "ok"
    And a readiness check should verify "/api/health/ready" returns status "ready"
    And the health checks should retry up to 3 times with delay for cold starts
    And health check failure should mark the deploy job as failed

  # Story 1.1: GCP Project Setup & Secret Manager Module

  @E-001-S-22 @story-1-1 @FR-INFRA-11
  Scenario: GCP Secret Manager naming convention uses ENV prefix
    Given the secrets module at "helpers/secrets.py"
    When I inspect the secret name construction logic
    Then each secret should be looked up as "{BUILD_ENV_UPPER}_{FIELD_NAME}"
    And the resource path should follow "projects/axovia-flipper/secrets/{NAME}/versions/latest"
    And the GCP project ID should be hardcoded as "axovia-flipper"

  @E-001-S-23 @story-1-1 @FR-INFRA-12
  Scenario: Production environment retrieves secrets with PRODUCTION prefix
    Given the secrets module at "helpers/secrets.py"
    When BUILD_ENV is set to "production"
    Then load_secrets should call Secret Manager with "PRODUCTION_" prefixed secret names
    And all retrieved values should be set as environment variables

  @E-001-S-24 @story-1-1 @FR-INFRA-12
  Scenario: Staging environment retrieves secrets with STAGING prefix
    Given the secrets module at "helpers/secrets.py"
    When BUILD_ENV is set to "staging"
    Then load_secrets should call Secret Manager with "STAGING_" prefixed secret names
    And all retrieved values should be set as environment variables

  @E-001-S-25 @story-1-1 @FR-INFRA-12
  Scenario: Secrets are organized by category using Python dataclasses
    Given the secrets module at "helpers/secrets.py"
    When I inspect the module structure
    Then a "DatabaseSecrets" dataclass should exist with required field "DATABASE_URL"
    And an "AuthSecrets" dataclass should exist with required fields "AUTH_SECRET" and "ENCRYPTION_SECRET"
    And an "ApiKeySecrets" dataclass should exist with optional API key fields
    And a "PaymentSecrets" dataclass should exist with optional Stripe fields
    And an "EmailSecrets" dataclass should exist with optional "RESEND_API_KEY"
    And a "MonitoringSecrets" dataclass should exist with optional Sentry and metrics fields

  @E-001-S-26 @story-1-1 @FR-INFRA-11
  Scenario: helpers/secrets.py is the single source of truth for secret references
    Given the project codebase
    When I search for GCP Secret Manager name patterns outside "helpers/secrets.py"
    Then no other source file should contain secret name-to-env-var mappings
    And "helpers/secrets.py" should be the only file defining secret category dataclasses

  @E-001-S-27 @story-1-1 @FR-INFRA-12
  Scenario: Invalid or missing BUILD_ENV raises a clear error
    Given the secrets module at "helpers/secrets.py"
    When BUILD_ENV is not set or is an invalid value like "dev" or "local"
    Then load_secrets should raise a ValueError
    And the error message should indicate valid values are "staging" and "production"

  # Story 1.6: Firebase Storage Configuration

  @E-001-S-41 @story-1-6 @FR-INFRA-13
  Scenario: Firebase Storage bucket is configured with correct naming convention
    Given the Firebase configuration files exist
    When I inspect the Firebase Storage configuration
    Then ".env.example" should include "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" set to "axovia-flipper.firebasestorage.app"
    And "firebase.json" should include a "storage" section pointing to "storage.rules"
    And "firebase.json" emulators should include a "storage" entry on port 9199
    And "src/lib/firebase/admin.ts" should pass "storageBucket" from env to initializeApp

  @E-001-S-42 @story-1-6 @FR-INFRA-13
  Scenario: Security rules allow authenticated user access within their path
    Given the Firebase Storage rules at "storage.rules"
    When I inspect the security rules for authenticated user access
    Then read access should be allowed for all users on listing image paths
    And write access should require "request.auth != null"
    And write access should require "request.auth.uid == userId"

  @E-001-S-43 @story-1-6 @FR-INFRA-13
  Scenario: Security rules deny unauthorized write access
    Given the Firebase Storage rules at "storage.rules"
    When I inspect the security rules for unauthorized access
    Then the catch-all rule should deny all read and write access
    And write access on listing paths should require authentication
    And write access should enforce content type matching "image/.*"
    And write access should enforce file size under 5MB

  @E-001-S-44 @story-1-6 @FR-INFRA-13
  Scenario: Storage path follows structured convention
    Given the storage helper at "src/lib/firebase/storage.ts"
    When I inspect the buildStoragePath function
    Then it should generate paths in the format "{userId}/{platform}/{listingId}/{imageIndex}.{ext}"
    And the upload functions should return a public URL containing the storage path

  @E-001-S-45 @story-1-6 @FR-INFRA-13
  Scenario: Firebase Storage credentials are integrated with Secret Manager
    Given the secrets configuration at "helpers/secrets.py"
    When I inspect the FirebaseSecrets dataclass
    Then it should include "FIREBASE_CLIENT_EMAIL"
    And it should include "FIREBASE_PRIVATE_KEY"
    And "src/lib/firebase/admin.ts" should read credentials from environment variables
    And "src/lib/env.ts" should validate "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"

  @E-001-S-46 @story-1-6 @FR-INFRA-13
  Scenario: ListingImage database model stores image metadata
    Given the Prisma schema at "prisma/schema.prisma"
    When I inspect the ListingImage model
    Then it should have fields for storagePath, storageUrl, originalUrl, fileSize, and contentType
    And it should have optional fields for width and height
    And it should have a foreign key relation to Listing with cascade delete
    And it should have a unique constraint on listingId and imageIndex
    And the Listing model should have an "images" relation to ListingImage

  @E-001-S-47 @story-1-6 @FR-INFRA-13
  Scenario: Storage helper utilities support upload, download URL, and deletion
    Given the storage helper at "src/lib/firebase/storage.ts"
    When I inspect the exported functions
    Then it should export "getStorageBucket" for bucket access
    And it should export "buildStoragePath" for structured path generation
    And it should export "uploadImage" with content-type, file-size, and magic-bytes validation
    And it should export "uploadImageFromUrl" for downloading and uploading from URLs
    And it should export "getPublicUrl" for generating download URLs
    And it should export "deleteImage" for single file deletion with error handling
    And it should export "deleteListingImages" for resilient batch deletion by listing prefix

  # Story 1.9: Health Check & Monitoring Endpoints

  @E-001-S-29 @story-1-9 @FR-INFRA-10
  Scenario: Liveness probe returns 200 with health status
    Given the application is running
    When Cloud Run sends a request to "/api/health"
    Then a 200 response is returned
    And the response includes a "status" field set to "ok"
    And the response includes "uptime", "version", and "environment" fields

  @E-001-S-30 @story-1-9 @FR-INFRA-10
  Scenario: Readiness probe returns 200 when database is reachable
    Given the application is running
    And the database connection is active
    When Cloud Run sends a request to "/api/health/ready"
    Then a 200 response is returned with status "ready"
    And the response includes database check with "ok" status and latency

  @E-001-S-31 @story-1-9 @FR-INFRA-10
  Scenario: Readiness probe returns 503 when database is unreachable
    Given the application is running
    And the database connection is unavailable
    When Cloud Run sends a request to "/api/health/ready"
    Then a 503 response is returned with status "not_ready"
    And the database check shows "error" status

  @E-001-S-32 @story-1-9 @FR-INFRA-10
  Scenario: Metrics endpoint includes request count and database stats
    Given the application is running
    When a request is made to "/api/health/metrics"
    Then the response includes "requests" with totalRequests, avgResponseTimeMs, and errorRate
    And the response includes "database" with status and maxConnections
    And the response includes "db_performance" with totalQueries, avgDurationMs, and slowQueries
    And the response includes "memory" with heapUsedMB, heapTotalMB, and rssMB

  @E-001-S-33 @story-1-9 @NFR-RELY-03
  Scenario: Cloud Run probes are configured for liveness and startup
    Given the Cloud Run service configuration at "config/cloud-run/service.yaml"
    When the readiness and liveness probes are reviewed
    Then the liveness probe points to "/api/health" with 30-second interval
    And the startup probe points to "/api/health" with 50-second max startup time
    And the startup probe allows for Next.js and Prisma cold start

  @E-001-S-34 @story-1-9 @NFR-RELY-04
  Scenario: Structured logging uses pino with Cloud Logging compatible format
    Given the logger module at "src/lib/logger.ts"
    When the application logs events
    Then logs use pino with JSON format
    And the log output includes "severity" field mapped from log level
    And the log output includes "message" field via messageKey configuration
    And the log output includes "service" field set to "flipper-ai"

  @E-001-S-35 @story-1-9 @NFR-RELY-04
  Scenario: Request IDs are propagated through middleware to route handlers
    Given the Next.js middleware at "middleware.ts"
    When a request passes through middleware
    Then a UUID request ID is generated
    And the request ID is set on the request headers as "x-request-id"
    And the request ID is set on the response headers as "X-Request-Id"
    And route handlers can read the request ID via "getRequestLogger()"

  # Story 1.7: Firebase Cloud Messaging Setup

  @E-001-S-36 @story-1-7 @FR-INFRA-14
  Scenario: FCM environment variables are configured for messaging
    Given the environment configuration at "src/lib/env.ts"
    And the environment example at ".env.example"
    When I inspect the FCM configuration
    Then "NEXT_PUBLIC_FIREBASE_VAPID_KEY" should be validated with min length 50
    And "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" should be an optional string
    And "NEXT_PUBLIC_FIREBASE_APP_ID" should be an optional string
    And ".env.example" should include documentation for all FCM variables

  @E-001-S-37 @story-1-7 @FR-INFRA-14
  Scenario: FCM service worker stub exists and can receive background messages
    Given the service worker file at "public/firebase-messaging-sw.js"
    When I inspect the service worker configuration
    Then it should import Firebase compat SDK via "importScripts"
    And the Firebase version should match the installed "firebase" package version
    And it should call "firebase.initializeApp" with project configuration
    And it should call "messaging.onBackgroundMessage" with a notification handler
    And the service worker should be served at the root URL path "/"

  @E-001-S-38 @story-1-7 @FR-INFRA-14
  Scenario: Client-side FCM module supports token generation and foreground messages
    Given the client messaging module at "src/lib/firebase/messaging.ts"
    When I inspect the client SDK integration
    Then the module should have a "use client" directive
    And it should export "getMessagingInstance" using dynamic imports to prevent SSR crashes
    And it should export "requestNotificationPermission" that returns a boolean
    And it should export "getFCMToken" that passes VAPID key to getToken
    And it should export "onForegroundMessage" that wraps onMessage
    And all exports should return null or no-op when browser APIs are unavailable

  @E-001-S-39 @story-1-7 @FR-INFRA-14
  Scenario: Server-side FCM module supports sending to devices and topics
    Given the server messaging module at "src/lib/firebase/messaging-admin.ts"
    When I inspect the server SDK integration
    Then it should export "getMessagingAdmin" that initializes from Admin SDK
    And it should export "sendToDevice" using the modern "messaging.send()" API with token at top level
    And it should export "sendToTopic" using the modern "messaging.send()" API with topic field
    And it should export the "NotificationPayload" interface
    And it should handle "messaging/invalid-registration-token" errors for stale token detection
    And it should not reference browser globals (window, navigator, self)

  @E-001-S-40 @story-1-7 @FR-INFRA-14
  Scenario: FCM service worker registration is available but not auto-triggered
    Given the service worker registration module at "src/lib/firebase/register-sw.ts"
    When I inspect the registration module
    Then it should export "registerFCMServiceWorker" function
    And the function should register "/firebase-messaging-sw.js" with scope "/"
    And the function should guard with "typeof window" and "serviceWorker in navigator" checks
    And the service worker should NOT be auto-registered on application load

  # Story 1.2: Cloud SQL Database Provisioning

  @E-001-S-48 @story-1-2 @FR-INFRA-02
  Scenario: Cloud SQL instance is provisioned with cost-optimized tier and automated backups
    Given the Cloud SQL setup documentation at "docs/deployment/cloud-sql-setup.md"
    When I inspect the instance configuration
    Then the instance tier should be "db-f1-micro"
    And automated daily backups should be enabled with 7-day retention
    And point-in-time recovery should be enabled
    And a maintenance window should be configured for Sunday 03:00 UTC

  @E-001-S-49 @story-1-2 @FR-INFRA-02
  Scenario: Prisma schema migrates successfully against Cloud SQL with all models
    Given the Prisma schema at "prisma/schema.prisma"
    And the build script in "package.json"
    When I inspect the database migration configuration
    Then the datasource provider should be "postgresql"
    And the build script should use "prisma migrate deploy" instead of "prisma db push"
    And the build script should not contain "--accept-data-loss"
    And the schema should define at least 14 database models

  @E-001-S-50 @story-1-2 @FR-INFRA-07
  Scenario: Cloud Run connects to Cloud SQL via Unix socket with Auth Proxy
    Given the Cloud SQL setup documentation at "docs/deployment/cloud-sql-setup.md"
    When I inspect the Cloud Run connection configuration
    Then the production DATABASE_URL should use a Unix socket path via "host=/cloudsql/"
    And the deploy command should include "--add-cloudsql-instances" for Auth Proxy sidecar
    And the deploy command should use "--set-secrets" to inject DATABASE_URL from Secret Manager

  @E-001-S-51 @story-1-2 @FR-INFRA-07
  Scenario: Database connection string is stored in Secret Manager not hardcoded
    Given the environment configuration files
    When I inspect where DATABASE_URL is defined
    Then ".env.production.example" should contain placeholder values not real credentials
    And the Cloud Run deploy command should reference Secret Manager for DATABASE_URL
    And "DIRECT_DATABASE_URL" should also be stored in Secret Manager for migrations

  @E-001-S-52 @story-1-2 @NFR-SCALE-02
  Scenario: Connection pooling prevents database connection exhaustion
    Given the database client configuration at "src/lib/db.ts"
    When I inspect the connection pool settings
    Then the PrismaPg adapter should be configured with max connections of 2
    And the connection timeout should be set to 10000 milliseconds
    And the idle timeout should be set to 30000 milliseconds
    And the pool size should account for db-f1-micro limits with Cloud Run scaling
