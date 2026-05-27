# Story 1.8: GitHub Actions CI/CD Pipeline

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a40843c014b7e15bb74e8d

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want automated build, test, and deploy on every push and PR,
so that code quality is enforced and deployments are consistent and repeatable.

## Acceptance Criteria

1. **Main Branch Push Triggers Full Pipeline**
   - Given a GitHub Actions workflow is configured
   - When a push is made to the `main` branch
   - Then the pipeline runs: lint, unit tests, build container image, deploy to Cloud Run production

2. **PR Opens Triggers Preview Pipeline**
   - Given a GitHub Actions workflow is configured
   - When a pull request is opened
   - Then the pipeline runs: lint, unit tests, build container image, deploy to Cloud Run staging (preview)

3. **Pipeline Failure Stops Deployment**
   - Given the CI pipeline is running
   - When any step fails (lint, test, build)
   - Then the deployment step is skipped and the failure is reported

4. **GCP Credentials Stored as GitHub Secrets**
   - Given the pipeline needs GCP credentials
   - When checking where service account keys are stored
   - Then they are configured as GitHub Actions secrets (not in the repository)

5. **Post-Deploy Health Check**
   - Given a successful deployment
   - When the pipeline completes
   - Then a health check is run against the deployed service to verify it is responding

**FRs fulfilled:** FR-INFRA-06
**NFRs addressed:** NFR-TEST-05

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-INFRA-06 | AC 1, AC 2, AC 3, AC 4, AC 5 | @FR-INFRA-06 @story-1-8 |
| NFR-TEST-05 | AC 1, AC 2 | @NFR-TEST-05 @story-1-8 |

## Tasks / Subtasks

- [x] Task 1: Consolidate and update the main CI workflow (`ci.yml`) for Cloud Run (AC: #1, #2, #3)
  - [x] 1.1 Update the existing `.github/workflows/ci.yml` to replace the `deploy-vercel` job with a `deploy-cloud-run` job that uses `google-github-actions/deploy-cloudrun@v2`
  - [x] 1.2 Replace the existing `docker` job with a `build-container` job. Remove the `if: github.ref == 'refs/heads/main'` condition so it runs on both pushes and PRs. Use `docker/build-push-action@v6` with `file: config/docker/Dockerfile` and `push: true`. Tag with `us-central1-docker.pkg.dev/axovia-flipper/flipper-ai/app:${{ github.sha }}` and `:latest`. **WARNING:** The existing `docker` job is missing the `file:` parameter — the new job MUST include it since the Dockerfile is at `config/docker/Dockerfile`, not project root
  - [x] 1.3 Keep existing `lint-and-typecheck`, `test`, `integration-test`, `python-test`, and `build` jobs intact — they already work correctly with pnpm + Node 22
  - [x] 1.4 The existing `ci.yml` already has a workflow-level concurrency group (`${{ github.workflow }}-${{ github.ref }}`). No additional concurrency config needed unless job-level deploy cancellation is specifically desired
  - [x] 1.5 For PR events: deploy to Cloud Run staging service (`flipper-staging`) instead of production. Add PR comment with staging URL using `actions/github-script@v7`. **NOTE:** Service name `flipper-staging` matches Story 1.3's naming convention
  - [x] 1.6 For main branch pushes: deploy to Cloud Run production service (`flipper-production`). **NOTE:** Service name `flipper-production` matches Story 1.3's naming convention
  - [x] 1.7 Ensure the `deploy-cloud-run` job has `needs: [test, integration-test, python-test, build-container]` to block deployment on any failure (AC: #3). The `python-test` job tests the Secret Manager module and MUST pass before deploy

- [x] Task 2: Configure GCP authentication in GitHub Actions (AC: #4)
  - [x] 2.1 Use `google-github-actions/auth@v2` with Workload Identity Federation (preferred over service account key JSON). If WIF not available, fall back to `credentials_json` secret
  - [x] 2.2 Document the required GitHub secrets in a code comment at the top of the workflow:
    - `GCP_PROJECT_ID`: `axovia-flipper`
    - `GCP_SA_KEY` (or `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT`): Service account credentials
    - `GCP_REGION`: `us-central1`
    - `CLOUD_RUN_SERVICE_PROD`: `flipper-production` (matches Story 1.3 naming)
    - `CLOUD_RUN_SERVICE_STAGING`: `flipper-staging` (matches Story 1.3 naming)
  - [x] 2.3 Use `google-github-actions/setup-gcloud@v2` for `gcloud` CLI access in subsequent steps
  - [x] 2.4 Ensure the CI service account (`flipper-run@axovia-flipper.iam.gserviceaccount.com` or a dedicated CI SA) has these IAM roles: `roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer`, `roles/secretmanager.secretAccessor`
  - [x] 2.5 Verify Artifact Registry repository exists. If not, create it:
    ```bash
    gcloud artifacts repositories create flipper-ai \
      --repository-format=docker --location=us-central1 \
      --description="Flipper AI Docker images"
    ```
    **NOTE:** Story 1.3 may have used `gcr.io/axovia-flipper/flipper-web` instead. Verify which registry Story 1.3 actually created and align. If Story 1.3 used GCR, migrate to Artifact Registry as GCR is deprecated

- [x] Task 3: Add post-deploy health check step (AC: #5)
  - [x] 3.1 After Cloud Run deploy, extract the deployed service URL from the deploy step output
  - [x] 3.2 Run liveness check: `curl -sf --max-time 30 --retry 3 --retry-delay 5 "$SERVICE_URL/api/health"` — retry up to 3 times with 5s delay (Cloud Run cold start). Verify `status === "ok"`
  - [x] 3.3 Run readiness check: `curl -sf --max-time 30 --retry 3 --retry-delay 5 "$SERVICE_URL/api/health/ready"`. Verify `status === "ready"` (not "ok" — the readiness endpoint uses different status values). This catches cases where the container started but database or secret injection failed
  - [x] 3.4 If either health check fails, output error and mark job as failed. Do NOT auto-rollback (manual rollback via `gcloud run services update-traffic` is safer)

- [x] Task 4: Add Cloud Run secret injection to deploy step (AC: #1, #4)
  - [x] 4.1 **IMPORTANT — Verify secret names before writing config:** Story 1.1 specifies the convention `{BUILD_ENV}_{KEY}` (e.g., `PRODUCTION_DATABASE_URL`), but Story 1.3 used a simpler pattern (`DATABASE_URL` without prefix) as an interim approach. Before writing `--set-secrets`, run `gcloud secrets list --project=axovia-flipper` to verify actual secret names. Adapt the mapping accordingly
  - [x] 4.2 Use `google-github-actions/deploy-cloudrun@v2` action's `secrets` input parameter (NOT `gcloud run deploy --set-secrets`). The action format differs from the gcloud CLI:
    ```yaml
    - uses: google-github-actions/deploy-cloudrun@v2
      with:
        service: flipper-production
        region: us-central1
        image: us-central1-docker.pkg.dev/axovia-flipper/flipper-ai/app:${{ github.sha }}
        secrets: |
          DATABASE_URL=PRODUCTION_DATABASE_URL:latest
          AUTH_SECRET=PRODUCTION_AUTH_SECRET:latest
          ENCRYPTION_SECRET=PRODUCTION_ENCRYPTION_SECRET:latest
          STRIPE_SECRET_KEY=PRODUCTION_STRIPE_SECRET_KEY:latest
          STRIPE_WEBHOOK_SECRET=PRODUCTION_STRIPE_WEBHOOK_SECRET:latest
          OPENAI_API_KEY=PRODUCTION_OPENAI_API_KEY:latest
          ANTHROPIC_API_KEY=PRODUCTION_ANTHROPIC_API_KEY:latest
          RESEND_API_KEY=PRODUCTION_RESEND_API_KEY:latest
          SENTRY_DSN=PRODUCTION_SENTRY_DSN:latest
          SENTRY_AUTH_TOKEN=PRODUCTION_SENTRY_AUTH_TOKEN:latest
          GOOGLE_CLIENT_ID=PRODUCTION_GOOGLE_CLIENT_ID:latest
          GOOGLE_CLIENT_SECRET=PRODUCTION_GOOGLE_CLIENT_SECRET:latest
          GITHUB_CLIENT_ID=PRODUCTION_GITHUB_CLIENT_ID:latest
          GITHUB_CLIENT_SECRET=PRODUCTION_GITHUB_CLIENT_SECRET:latest
          HCAPTCHA_SECRET_KEY=PRODUCTION_HCAPTCHA_SECRET_KEY:latest
        env_vars: |
          NODE_ENV=production
          BUILD_ENV=production
          NEXT_TELEMETRY_DISABLED=1
          GIT_COMMIT=${{ github.sha }}
    ```
    **NOTE:** Cross-reference `.env.example` for the complete list. Every non-`NEXT_PUBLIC_*` secret must be mapped. Optional secrets (not yet configured) can be omitted — the app handles missing optional vars gracefully
  - [x] 4.3 For staging deployments, use `STAGING_` prefix secrets, `BUILD_ENV=staging`, and `service: flipper-staging`

- [x] Task 5: Add database migration step to deploy pipeline (AC: #1)
  - [x] 5.1 Add migration as a step WITHIN the `deploy-cloud-run` job, running BEFORE the deploy step (not a separate job — simpler, avoids duplicating GCP auth). Requires `DATABASE_URL` secret available to the CI runner
  - [x] 5.2 Retrieve the connection string: `DATABASE_URL=$(gcloud secrets versions access latest --secret=PRODUCTION_DATABASE_URL --project=axovia-flipper)`. Then run: `DATABASE_URL=$DATABASE_URL npx prisma migrate deploy`
  - [x] 5.3 If migration fails, the job fails and the deploy step is skipped automatically (GitHub Actions stops on step failure)
  - [x] 5.4 For staging, use `STAGING_DATABASE_URL` secret

- [x] Task 6: Update/retire the Vercel deploy workflow (AC: #1)
  - [x] 6.1 Add a comment to `.github/workflows/vercel-deploy.yml` marking it as deprecated: `# DEPRECATED: Cloud Run is now the primary deployment target. See ci.yml for the Cloud Run deploy job.`
  - [x] 6.2 Disable the workflow trigger by changing `on:` to `on: workflow_dispatch:` only (manual trigger for fallback)
  - [x] 6.3 Do NOT delete — keep as fallback until Cloud Run is fully validated

- [x] Task 7: Update Firebase deploy workflow (AC: #1)
  - [x] 7.1 Ensure `.github/workflows/deploy-firebase.yml` is compatible with the new pipeline — it deploys Firebase Hosting (static assets) and should still trigger on main push
  - [x] 7.2 Replace `npm ci` with `pnpm install --frozen-lockfile` and add `pnpm/action-setup@v4` step
  - [x] 7.3 Update `node-version` from `'20'` to `'22.x'` for consistency with all other CI jobs
  - [x] 7.4 Change `cache: 'npm'` to `cache: 'pnpm'` in the `actions/setup-node` step
  - [x] 7.5 Add `npx prisma generate` step before build (required by Next.js build)
  - [x] 7.6 Add required build-time env vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`) matching the CI test env pattern
  - [x] 7.7 Consider making this workflow depend on the CI workflow's success (use `workflow_run` trigger or refactor as a job within `ci.yml`)

- [x] Task 8: Update health-check workflow (AC: #5)
  - [x] 8.1 In `.github/workflows/health-check.yml`, update the fallback message to reference Cloud Run URL instead of Vercel (currently says "set PRODUCTION_URL = https://your-app.vercel.app")
  - [x] 8.2 Verify the health check workflow's curl command is compatible with the new Cloud Run health endpoints

- [x] Task 9: Testing (AC: #1-#5)
  - [x] 9.1 Extend the existing `src/__tests__/build-script.test.ts` (which validates package.json build script safety) to also validate CI workflow YAML files parse correctly (use `js-yaml` to load `.github/workflows/*.yml` and verify required keys exist)
  - [x] 9.2 Test that all required GitHub secrets are referenced in workflow comments
  - [x] 9.3 Manually test the full pipeline by pushing a test branch and opening a PR — verify:
    - Lint job passes
    - Unit tests pass with coverage
    - Integration tests pass
    - Container builds successfully
    - Staging deploy works (PR)
    - Production deploy works (merge to main)
    - Post-deploy health check passes
  - [x] 9.4 Verify that failing tests prevent deployment (add an intentionally failing test, confirm deploy job is skipped)

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-001-S-<N>` — sequential scenario number within Epic 1
- `@story-1-8`
- Applicable requirement tags: `@FR-INFRA-06`, `@NFR-TEST-05`

**DoD Checklist:**
- [x] Gherkin acceptance tests written for all 5 ACs
- [x] Every scenario tagged with `@E-001-S-<N>`, `@story-1-8`, and relevant `@FR-INFRA-*` / `@NFR-TEST-*` tags
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] All acceptance test scenarios pass
- [x] All unit/integration tests pass (`make test`)
- [x] Build succeeds (`make build`)
- [x] Lint passes (`make lint`)
- [x] No regressions in existing test suite

> See `_bmad-output/planning-artifacts/epics.md` → "Definition of Done (DoD) — All Stories" for full tagging rules and examples.
> **This DoD must be verified as complete during the `/bmad-bmm-code-review` workflow. A story cannot be marked "done" without passing all DoD items.**

## Dev Notes

### Critical: Existing CI Workflow Already Handles Lint + Test + Build

The current `.github/workflows/ci.yml` already has well-structured jobs:
- `lint-and-typecheck` → ESLint + Prettier check
- `test` → Jest unit tests with coverage enforcement
- `integration-test` → Jest integration tests with SQLite
- `build` → `pnpm build` verification
- `bdd` → Cucumber BDD tests (non-blocking, `continue-on-error: true`)
- `e2e-cross-browser` → Playwright matrix tests (non-blocking)
- `security` → `pnpm audit`
- `python-test` → Secret Manager module Python tests (MUST pass before deploy)
- `docker` → Docker image build (no push, main only) — **replace with `build-container`**
- `deploy-vercel` → Vercel production deploy (main only) — **replace with `deploy-cloud-run`**

**DO NOT rewrite the existing lint/test/build jobs** — they are tested and working. The main task is:
1. Replace `deploy-vercel` with `deploy-cloud-run`
2. Replace `docker` job with `build-container` (adds push to Artifact Registry, removes main-only restriction)
3. Add database migration, secret injection, and health check steps

### Critical: Dockerfile Location Changed

The Dockerfile was moved to `config/docker/Dockerfile` (from root). The `docker/build-push-action` context must use `.` (project root) but the `file:` parameter must point to `config/docker/Dockerfile`:
```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    file: config/docker/Dockerfile
    push: true
    tags: |
      us-central1-docker.pkg.dev/axovia-flipper/flipper-ai/app:${{ github.sha }}
      us-central1-docker.pkg.dev/axovia-flipper/flipper-ai/app:latest
```

### Critical: Cloud Run Service Configuration

From Story 1.3, Cloud Run services use these parameters:

| Parameter | Staging | Production |
|-----------|---------|------------|
| Memory | 2 GiB | 2 GiB |
| CPU | 2 vCPUs | 2 vCPUs |
| Min instances | 0 | 1 |
| Max instances | 10 | 10 |
| Timeout | 300s | 300s |
| Port | 3000 | 3000 |
| Region | us-central1 | us-central1 |

These should be set in the `deploy-cloud-run` step or via a Cloud Run service YAML.

### Critical: Workload Identity Federation vs Service Account Key

**Preferred:** Workload Identity Federation (WIF) — no long-lived keys, more secure:
```yaml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github'
    service_account: 'flipper-ci@axovia-flipper.iam.gserviceaccount.com'
```

**Fallback:** Service account key JSON stored as GitHub secret `GCP_SA_KEY`:
```yaml
- uses: google-github-actions/auth@v2
  with:
    credentials_json: '${{ secrets.GCP_SA_KEY }}'
```

Document both approaches. The developer should check if WIF is configured (Story 1.1 may have set this up) before falling back to key-based auth.

### Critical: Firebase Admin SDK Credentials in CI

Firebase Admin SDK uses **Application Default Credentials (ADC)** — Google Cloud's mechanism for automatically providing credentials without explicit keys. On Cloud Run, the attached service account provides ADC automatically. Locally, `gcloud auth application-default login` provides ADC.

**In CI/CD, ADC is NOT available by default.** However, the `google-github-actions/auth@v2` action (used for GCP auth above) sets up ADC for the CI runner when configured with either WIF or a service account key. This means:

- **If CI only runs mocked unit tests** (current state — all 2574 tests mock Firebase Admin): No real Firebase credentials needed. Tests pass without ADC.
- **If CI runs integration tests against real Firebase** (future): The GCP auth step already provides ADC, so Firebase Admin SDK will work automatically. No separate `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` secrets needed in GitHub Actions.
- **The `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` env vars** in `helpers/secrets.py` are a fallback for environments where ADC isn't available. On Cloud Run and in CI (with GCP auth configured), ADC handles everything — these env vars are not required in Secret Manager unless a non-GCP environment needs Firebase Admin access.

**Decision: Do NOT create `PRODUCTION_FIREBASE_CLIENT_EMAIL` / `PRODUCTION_FIREBASE_PRIVATE_KEY` in Secret Manager.** ADC covers Cloud Run and CI. Only create these if a future requirement arises for Firebase Admin access from a non-GCP environment.

### Critical: Artifact Registry (Not GCR)

Google Container Registry (`gcr.io`) is deprecated. Use Artifact Registry:
- Registry: `us-central1-docker.pkg.dev/axovia-flipper/flipper-ai`
- Image: `us-central1-docker.pkg.dev/axovia-flipper/flipper-ai/app:{tag}`

If the Artifact Registry repository doesn't exist yet, the developer must create it:
```bash
gcloud artifacts repositories create flipper-ai \
  --repository-format=docker \
  --location=us-central1 \
  --description="Flipper AI Docker images"
```

### Critical: Secret Naming — Verify Before Configuring

Story 1.1 specifies the convention `{BUILD_ENV}_{KEY}` (e.g., `PRODUCTION_DATABASE_URL`). However, Story 1.3's interim approach may use simpler names (e.g., `DATABASE_URL` without prefix). **Before writing secret injection config, verify actual secret names:** `gcloud secrets list --project=axovia-flipper`.

This story uses `google-github-actions/deploy-cloudrun@v2` action's `secrets` input (not `gcloud run deploy --set-secrets`). The action's `secrets` parameter uses newline-separated `ENV_VAR=SECRET_NAME:VERSION` format — see Task 4.2 for the complete mapping.

### Critical: pnpm Version Consistency

The existing CI workflows use `pnpm/action-setup@v4` with `version: 9`. Maintain this across all jobs. Do NOT mix npm and pnpm in the same pipeline. The Firebase deploy workflow currently uses `npm ci` — Task 7 addresses this.

### Critical: Node.js Version

All CI jobs use Node.js 22.x (`node-version: '22.x'`). The Dockerfile also uses `node:22-alpine`. The Playwright tests workflow still references Node 20 — this is a known inconsistency but Playwright tests are non-blocking.

### Critical: Database Migration Must Precede Deploy

The pipeline must run `npx prisma migrate deploy` BEFORE deploying the new container:
1. Authenticate to GCP
2. Retrieve `DATABASE_URL` from Secret Manager
3. Run `prisma migrate deploy` (applies pending migrations to production DB)
4. Deploy new container to Cloud Run

If migration fails, the deploy must NOT proceed. This prevents schema-mismatch errors.

### Critical: Coverage Thresholds Must Not Regress

Jest enforces these coverage thresholds in `jest.config.js` (CI fails if breached):
- Statements: 99%
- Branches: 96%
- Functions: 98%
- Lines: 99%

The existing `test` job already handles this. Do NOT modify coverage thresholds.

### Project Structure Notes

Files to modify/create:
| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | **MODIFY** | Replace `deploy-vercel` with `deploy-cloud-run`, upgrade `docker` job |
| `.github/workflows/vercel-deploy.yml` | **MODIFY** | Deprecate, change to manual trigger only |
| `.github/workflows/deploy-firebase.yml` | **MODIFY** | Switch from npm to pnpm, add test dependency |
| `.github/workflows/playwright-tests.yml` | **NO CHANGE** | Already non-blocking. Uses npm + Node 20 (known inconsistency, future cleanup candidate — do NOT fix in this story) |
| `.github/workflows/health-check.yml` | **MODIFY** | Update PRODUCTION_URL fallback message from Vercel to Cloud Run URL |

### Anti-Patterns to Avoid

- Do NOT rewrite existing CI jobs (lint, test, build) — they work correctly
- Do NOT use `gcr.io` — use Artifact Registry (`us-central1-docker.pkg.dev`)
- Do NOT store service account keys in the repository — use GitHub secrets
- Do NOT auto-rollback on health check failure — manual rollback is safer
- Do NOT delete the Vercel deploy workflow — keep as fallback
- Do NOT skip database migrations in the deploy pipeline
- Do NOT mix npm and pnpm in the same pipeline
- Do NOT hardcode secret values in workflow files — use `${{ secrets.* }}` or `--set-secrets`
- Do NOT change coverage thresholds — they are enforced and stable
- Do NOT make BDD/E2E tests blocking — they are non-blocking by design (`continue-on-error: true`)

### Dependencies on Prior Stories

- **Story 1.1 (Secret Manager):** Provides secret naming convention and GCP Secret Manager setup. Secrets must exist before deploy can inject them. Status: `review`. **Key detail:** GCP project `axovia-flipper`, service account `flipper-run@axovia-flipper.iam.gserviceaccount.com`, secret pattern `{BUILD_ENV}_{KEY}`
- **Story 1.2 (Cloud SQL):** Provides the production database that `prisma migrate deploy` targets. Status: `review`
- **Story 1.3 (Cloud Run):** Provides the Cloud Run services. Service names: `flipper-production` (prod), `flipper-staging` (staging). Registry: initially `gcr.io/axovia-flipper/flipper-web` — this story migrates to Artifact Registry. Status: `in-progress`
- **Story 1.4 (Firebase Auth):** Sets up Firebase Auth. Not directly blocking CI/CD but the deployed app will use Firebase Auth. Status: `ready-for-dev`
- **Story 1.7 (FCM Setup):** Added `firebase@^11`, `firebase-admin@^13`, `NEXT_PUBLIC_FIREBASE_*` env vars, CSP updates. CI pipeline must handle these build-time env vars

### What Future Stories Will Need from This Pipeline

- **Story 1.9 (Health Check):** Health endpoints already exist (`/api/health`, `/api/health/ready`). The CI pipeline's post-deploy health check validates these.
- **Epic 2+ stories:** Will add tests that automatically run in the pipeline. No CI changes needed.
- **Epic 11 (Push Notifications):** May need Firebase build-time env vars (`NEXT_PUBLIC_FIREBASE_*`). These should be set in the Cloud Run `--set-env-vars` or as build args in the Dockerfile.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.8] — Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#FR-INFRA-06] — CI/CD pipeline requirement
- [Source: _bmad-output/planning-artifacts/epics.md#NFR-TEST-05] — CI runs all test levels on every push/PR
- [Source: _bmad-output/planning-artifacts/architecture.md] — Infrastructure patterns, deployment config, CI workflow details
- [Source: _bmad-output/project-context.md] — Project conventions, commands, tech stack
- [Source: .github/workflows/ci.yml] — Existing CI/CD pipeline (lint, test, build, Vercel deploy)
- [Source: .github/workflows/vercel-deploy.yml] — Existing Vercel deployment workflow
- [Source: .github/workflows/deploy-firebase.yml] — Existing Firebase Hosting deployment
- [Source: .github/workflows/health-check.yml] — Existing cron health check
- [Source: .github/workflows/playwright-tests.yml] — Existing Playwright test workflow
- [Source: config/docker/Dockerfile] — Multi-stage Docker build for Cloud Run
- [Source: config/docker/docker-compose.prod.yml] — Docker Compose production config
- [Source: app/api/health/route.ts] — Liveness probe endpoint
- [Source: app/api/health/ready/route.ts] — Readiness probe endpoint
- [Source: _bmad-output/implementation-artifacts/1-7-firebase-cloud-messaging-setup.md] — Previous story patterns

### Previous Story Patterns (from Stories 1.1-1.7)

- GCP project: `axovia-flipper`, region: `us-central1`
- Service account: `flipper-run@axovia-flipper.iam.gserviceaccount.com`
- Package manager: `pnpm` (never npm), Node.js 22.x
- Test pattern: Jest with mocks, coverage thresholds enforced
- Commit style: emoji prefix + category tag (e.g., `[INFRA]`, `[TEST]`)
- Zod v4 (`^4.2.1`) for env validation
- Firebase env vars: `NEXT_PUBLIC_FIREBASE_*` (build-time, public)

### Git Intelligence

**Recent commit patterns:**
- Commits use emoji prefixes and category tags: `[DOCS]`, `[LEGAL]`, `[TEST]`, `[Coverage]`, `[P1]`, `[P2]`
- Test fixes actively worked on (Dashboard tests, market-value-calculator mocks)
- Error handling standardized (AppError/ErrorCode from `@/lib/errors`)
- Commit `3d9c577` specifically added a database migration step to CI/CD pipeline
- Coverage actively maintained and verified above thresholds

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None required — clean implementation with no blocking issues.

### Completion Notes List

- Replaced `docker` job with `build-container` — pushes to Artifact Registry (us-central1-docker.pkg.dev), specifies `file: config/docker/Dockerfile`, removed main-branch-only condition
- Replaced `deploy-vercel` job with `deploy-cloud-run` — uses `google-github-actions/deploy-cloudrun@v2`, depends on test/integration-test/python-test/build-container
- GCP auth uses dual conditional steps: WIF (preferred) with SA key fallback. Both `build-container` and `deploy-cloud-run` jobs have independent GCP auth
- Dynamic deploy target selection: PR→staging (flipper-staging), main push→production (flipper-production) via step outputs
- Database migration runs before deploy using `gcloud secrets` to retrieve DATABASE_URL from Secret Manager
- Secret injection uses `deploy-cloudrun@v2` action's `secrets` input with `{PREFIX}_SECRET_NAME:latest` format. Staging uses `STAGING_` prefix
- Post-deploy health checks: liveness (`/api/health` → status "ok") and readiness (`/api/health/ready` → status "ready") with retry logic for cold starts
- PR comment with staging URL uses `actions/github-script@v7` with environment variables (not direct expression interpolation in `run:` blocks) for security
- Vercel deploy workflow deprecated to `workflow_dispatch` only, kept as manual fallback
- Firebase deploy workflow updated: npm→pnpm, Node 20→22, added prisma generate, added build-time env vars
- Health-check workflow updated: Vercel URL reference replaced with Cloud Run URL
- Added 20 new CI workflow validation tests in `build-script.test.ts` using `js-yaml` to parse and validate YAML structure
- Added 5 Gherkin acceptance scenarios (@E-001-S-17 through @E-001-S-21) covering all 5 ACs
- Fixed pre-existing TypeScript build error in `app/api/diagnostics/route.ts` (unknown type access)
- All 141 test suites pass (2680 tests), lint clean (0 errors), build succeeds

### File List

- `.github/workflows/ci.yml` — **MODIFIED** — Replaced docker/deploy-vercel jobs with build-container/deploy-cloud-run, added GCP auth, migration, secret injection, health checks, secrets documentation comment
- `.github/workflows/vercel-deploy.yml` — **MODIFIED** — Deprecated, changed trigger to workflow_dispatch only
- `.github/workflows/deploy-firebase.yml` — **MODIFIED** — npm→pnpm, Node 20→22, added prisma generate, added build-time env vars
- `.github/workflows/health-check.yml` — **MODIFIED** — Updated fallback URL reference from Vercel to Cloud Run
- `src/__tests__/build-script.test.ts` — **MODIFIED** — Added 20 CI workflow validation tests using js-yaml
- `test/acceptance/features/E-001-production-infrastructure.feature` — **MODIFIED** — Added 5 acceptance scenarios for Story 1.8 (S-17 through S-21)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — **MODIFIED** — Updated FR-INFRA-06 and NFR-TEST-05 coverage
- `app/api/diagnostics/route.ts` — **MODIFIED** — Fixed pre-existing TypeScript error (unknown type property access)
- `package.json` — **MODIFIED** — Added js-yaml and @types/js-yaml dev dependencies
- `pnpm-lock.yaml` — **MODIFIED** — Lockfile updated for js-yaml dependencies

### Change Log

- **2026-03-01**: Implemented GitHub Actions CI/CD Pipeline (Story 1.8) — Migrated deployment from Vercel to Cloud Run with GCP auth, Artifact Registry container builds, Secret Manager integration, database migration, and post-deploy health checks. Added 25 validation tests and 5 Gherkin acceptance scenarios.
- **2026-03-01**: Code Review (AI) — Fixed 5 issues: (H1) Vercel fallback workflow unreachable jobs — added `workflow_dispatch` input and fixed job conditions; (H2) Removed dead imports from diagnostics/route.ts; (M1) `:latest` tag now only applied on main branch pushes, not PRs; (M2) Removed misleading `GCP_REGION` secret documentation, clarified it's hardcoded; (M3) Added Trello-Card-ID to story frontmatter. All 25 CI validation tests pass.
