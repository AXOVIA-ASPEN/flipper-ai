/**
 * @file test/acceptance/step_definitions/E-001-S17-ci-cd.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-05-02
 * @version 1.0
 * @brief Step definitions for E-001 Story 1.8 — GitHub Actions CI/CD pipeline.
 *
 * @description
 * Source-inspection steps for the CI/CD scenarios (S-17 through S-21 in
 * E-001-production-infrastructure.feature). Each scenario verifies that
 * `.github/workflows/ci.yml` declares the build-container, deploy-cloud-run,
 * and supporting jobs with the dependency wiring documented in Story 1.8's
 * acceptance criteria. Tests run as static-analysis assertions — no live
 * GitHub Actions invocation.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8');
}

function jobBlock(workflowSource: string, jobName: string): string {
  // Jobs in YAML start with a name at indent 2; capture from `  <name>:` to the
  // next top-level job declaration (or the end of file). The capture is wide
  // enough to include `needs:`, `name:`, and individual step blocks.
  const startMarker = `  ${jobName}:`;
  const start = workflowSource.indexOf(startMarker);
  if (start === -1) return '';
  const after = workflowSource.substring(start + startMarker.length);
  const nextJobMatch = after.match(/\n  [a-z][\w-]*:\s*\n/);
  const end = nextJobMatch && typeof nextJobMatch.index === 'number'
    ? start + startMarker.length + nextJobMatch.index
    : workflowSource.length;
  return workflowSource.substring(start, end);
}

// ─── Givens ─────────────────────────────────────────────────────────────────

Given('the CI workflow at {string}', function (filePath: string) {
  this.ciWorkflowSource = readSource(filePath);
  this.ciWorkflowPath = filePath;
});

// ─── Whens (no-op containers — assertions live in Thens) ────────────────────

When('I inspect the workflow configuration', function () {
  // CI workflow source already loaded in Given.
});

When('I inspect the workflow configuration for pull request events', function () {
  // CI workflow source already loaded in Given.
});

When('I inspect the job dependency chain', function () {
  // CI workflow source already loaded in Given.
});

When('I inspect the GCP authentication configuration', function () {
  // CI workflow source already loaded in Given.
});

When('I inspect the post-deploy steps', function () {
  // CI workflow source already loaded in Given.
});

// ─── S-17: Main-branch push triggers full pipeline + Cloud Run deploy ───────

Then(
  'it should trigger on push to the {string} branch',
  function (branch: string) {
    const src = this.ciWorkflowSource as string;
    expect(src).toMatch(/\bon:[\s\S]*?push:[\s\S]*?branches:\s*\[\s*[^\]]*?\b/);
    expect(src).toMatch(new RegExp(`push:[\\s\\S]*?branches:\\s*\\[[^\\]]*?\\b${branch}\\b`));
  }
);

Then(
  'it should have a {string} job that builds and pushes to Artifact Registry',
  function (jobName: string) {
    const src = this.ciWorkflowSource as string;
    expect(src).toMatch(new RegExp(`\\n  ${jobName}:`));
    const body = jobBlock(src, jobName);
    expect(body).toContain('docker/build-push-action');
    expect(body).toMatch(/push:\s*true/);
  }
);

Then(
  'it should have a {string} job that deploys to Cloud Run',
  function (jobName: string) {
    const src = this.ciWorkflowSource as string;
    expect(src).toMatch(new RegExp(`\\n  ${jobName}:`));
    const body = jobBlock(src, jobName);
    expect(body.toLowerCase()).toContain('cloud run');
  }
);

Then(
  'the {string} job should depend on {string}, {string}, {string}, and {string}',
  function (jobName: string, d1: string, d2: string, d3: string, d4: string) {
    const body = jobBlock(this.ciWorkflowSource as string, jobName);
    expect(body).toMatch(/needs:\s*\[/);
    for (const dep of [d1, d2, d3, d4]) {
      expect(body).toMatch(new RegExp(`needs:[\\s\\S]*?\\b${dep}\\b`));
    }
  }
);

Then(
  'the {string} job should use {string}',
  function (jobName: string, dockerfile: string) {
    const body = jobBlock(this.ciWorkflowSource as string, jobName);
    expect(body).toContain(dockerfile);
  }
);

Then(
  'the deploy job should include a database migration step before deployment',
  function () {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    expect(body.toLowerCase()).toMatch(/migrate|prisma migrate|db migrate/);
  }
);

// ─── S-18: PR triggers preview pipeline with staging deployment ─────────────

Then(
  'it should trigger on pull_request to the {string} branch',
  function (branch: string) {
    const src = this.ciWorkflowSource as string;
    expect(src).toMatch(new RegExp(`pull_request:[\\s\\S]*?branches:\\s*\\[[^\\]]*?\\b${branch}\\b`));
  }
);

Then(
  'the deploy job should deploy to Cloud Run staging service for PRs',
  function () {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    expect(body.toLowerCase()).toContain('staging');
    expect(body.toLowerCase()).toMatch(/pull_request|pr\b/i);
  }
);

Then(
  'the deploy job should comment on the PR with the staging URL',
  function () {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    // Either an explicit pull-request comment action or a script that posts via gh.
    expect(body.toLowerCase()).toMatch(/pull-?request|pr\s+comment|comment.*pr|gh\s+pr\s+comment|github-script/);
  }
);

Then(
  'the {string} job should not have a main-branch-only condition',
  function (jobName: string) {
    const body = jobBlock(this.ciWorkflowSource as string, jobName);
    // Job-level `if:` containing "main" would gate it to main-only.
    const hasJobLevelMainGate = /^\s{4}if:[^\n]*\brefs\/heads\/main\b/m.test(body);
    expect(hasJobLevelMainGate).toBe(false);
  }
);

// ─── S-19: Pipeline failure stops deployment ────────────────────────────────

Then(
  'the {string} job should depend on {string} passing',
  function (jobName: string, dep: string) {
    const body = jobBlock(this.ciWorkflowSource as string, jobName);
    expect(body).toMatch(new RegExp(`needs:[\\s\\S]*?\\b${dep}\\b`));
  }
);

Then(
  'if any dependency fails the deploy job should be skipped',
  function () {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    // Default GitHub Actions behavior: a job with `needs: [...]` is skipped when
    // any dependency fails (no `if: always()` override). Confirm we are NOT
    // overriding the default with an always-run condition.
    const hasAlwaysOverride = /^\s{4}if:\s*always\(\)/m.test(body);
    expect(hasAlwaysOverride).toBe(false);
    // And that the job actually declares dependencies.
    expect(body).toMatch(/needs:\s*\[/);
  }
);

// ─── S-20: GCP credentials via GitHub secrets ───────────────────────────────

Then(
  'it should use {string} for authentication',
  function (action: string) {
    expect(this.ciWorkflowSource).toContain(action);
  }
);

Then(
  'credentials should reference {string} variables',
  function (pattern: string) {
    // Tolerate either the literal `${{ secrets.* }}` placeholder or actual
    // `${{ secrets.NAME }}` references in the workflow.
    const src = this.ciWorkflowSource as string;
    if (pattern.includes('*')) {
      const wildcard = pattern.replace(/\${{|}}|\s/g, '').replace(/secrets\./, '').replace('*', '');
      expect(src).toMatch(/\$\{\{\s*secrets\.[A-Z_0-9]+\s*\}\}/);
      // sanity-check that the literal text segment minus * appears (best effort)
      if (wildcard.length > 0) {
        expect(src).toContain('secrets.');
      }
    } else {
      expect(src).toContain(pattern);
    }
  }
);

Then(
  'no service account keys should be hardcoded in the workflow file',
  function () {
    const src = this.ciWorkflowSource as string;
    // A literal service account key would contain "BEGIN PRIVATE KEY" or a
    // raw JSON `"private_key":` field. Either is a hardcoding violation.
    expect(src).not.toContain('BEGIN PRIVATE KEY');
    expect(src).not.toMatch(/"private_key"\s*:/);
  }
);

Then(
  'the required secrets should be documented in workflow comments',
  function () {
    const src = this.ciWorkflowSource as string;
    // Docs-as-comments at the top of the workflow listing required secrets.
    expect(src).toMatch(/#\s*REQUIRED GITHUB SECRETS/i);
  }
);

// ─── S-21: Post-deploy health check ─────────────────────────────────────────

Then(
  'a liveness check should verify {string} returns status {string}',
  function (endpoint: string, status: string) {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    expect(body).toContain(endpoint);
    expect(body).toContain(status);
  }
);

Then(
  'a readiness check should verify {string} returns status {string}',
  function (endpoint: string, status: string) {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    expect(body).toContain(endpoint);
    expect(body).toContain(status);
  }
);

Then(
  'the health checks should retry up to {int} times with delay for cold starts',
  function (retries: number) {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    // Either an explicit retry count or a loop that allows multiple attempts.
    const hasRetry =
      body.includes(`-r ${retries}`) ||
      body.includes(`--retry ${retries}`) ||
      new RegExp(`for\\s+\\w+\\s+in\\s+\\$\\(seq\\s+1\\s+${retries}\\)`).test(body) ||
      new RegExp(`MAX_RETRIES\\s*=\\s*${retries}|MAX_RETRIES=${retries}`).test(body) ||
      new RegExp(`(?:retries|attempts)\\s*[:=]\\s*${retries}`).test(body);
    expect(hasRetry).toBe(true);
  }
);

Then(
  'health check failure should mark the deploy job as failed',
  function () {
    const body = jobBlock(this.ciWorkflowSource as string, 'deploy-cloud-run');
    // The health-check step must propagate failure (no `continue-on-error: true`).
    // Best signal: the step's exit status surfaces as the job's status. Check that
    // the deploy job does NOT mark a health-check step as continue-on-error.
    const hasContinueOnError = /Health\s*Check[\s\S]*?continue-on-error:\s*true/i.test(body);
    expect(hasContinueOnError).toBe(false);
  }
);
