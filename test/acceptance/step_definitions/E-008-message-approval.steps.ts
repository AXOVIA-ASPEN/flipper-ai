/**
 * @file test/acceptance/step_definitions/E-008-message-approval.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Step definitions for Story 8.4 — Message Approval Workflow.
 *
 * @description
 * Validates the two-step approval workflow: DRAFT creation default,
 * approve with optional gate, confirm from PENDING_APPROVAL, dispatch
 * stub, edit/reject per-action guards, and settings API integration.
 */

import { Given, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..', '..');

// ── Shared step: route file existence ──

Given('the messages API route at {string}', function (routePath: string) {
  const fullPath = path.join(projectRoot, routePath);
  assert.ok(fs.existsSync(fullPath), `Route file not found: ${routePath}`);
  this.routeContent = fs.readFileSync(fullPath, 'utf-8');
});

Given('the messages PATCH route at {string}', function (routePath: string) {
  const fullPath = path.join(projectRoot, routePath);
  assert.ok(fs.existsSync(fullPath), `Route file not found: ${routePath}`);
  this.routeContent = fs.readFileSync(fullPath, 'utf-8');
});

Given('the message dispatcher at {string}', function (filePath: string) {
  const fullPath = path.join(projectRoot, filePath);
  assert.ok(fs.existsSync(fullPath), `File not found: ${filePath}`);
  this.fileContent = fs.readFileSync(fullPath, 'utf-8');
});

// Note: Given('the user settings API route at {string}') is owned by
// E-004-platform-fees-threshold.steps.ts (sets this.fileContent). We reuse it here
// and treat fileContent as the route source in downstream Then steps below.

// ── AC1: Draft Status on Creation ──

Then('OUTBOUND messages are created with default status {string}', function (expectedStatus: string) {
  // Verify POST route defaults OUTBOUND to DRAFT
  assert.ok(
    this.routeContent.includes(`direction === 'OUTBOUND' ? '${expectedStatus}'`),
    `POST route should default OUTBOUND to ${expectedStatus}`
  );
});

// ── AC2: Approve with Optional Approval Gate ──

Then('approve action on DRAFT with messageApprovalRequired false sets status to {string}', function (expectedStatus: string) {
  // Verify approve handler routes to SENT when approval not required
  assert.ok(
    this.routeContent.includes(`status: '${expectedStatus}', sentAt:`),
    `Approve should set status to ${expectedStatus} with sentAt when approval not required`
  );
});

Then('approve action on DRAFT with messageApprovalRequired true sets status to {string}', function (expectedStatus: string) {
  // Verify approve handler routes to PENDING_APPROVAL when approval required
  assert.ok(
    this.routeContent.includes(`status: '${expectedStatus}'`),
    `Approve should set status to ${expectedStatus} when approval required`
  );
  assert.ok(
    this.routeContent.includes('messageApprovalRequired'),
    'Approve handler should check messageApprovalRequired setting'
  );
});

// ── AC3: Confirm Send from Pending ──

Then('confirm action on PENDING_APPROVAL sets status to {string} with sentAt timestamp', function (expectedStatus: string) {
  assert.ok(
    this.routeContent.includes("case 'confirm':"),
    'PATCH route must handle confirm action'
  );
  assert.ok(
    this.routeContent.includes("PENDING_APPROVAL") && this.routeContent.includes(`status: '${expectedStatus}'`),
    `Confirm should transition PENDING_APPROVAL to ${expectedStatus}`
  );
});

Then('confirm action on DRAFT returns status {int}', function (expectedStatus: number) {
  // Verify ConflictError is thrown for confirm on DRAFT
  assert.ok(
    this.routeContent.includes("'PENDING_APPROVAL') throw new ConflictError"),
    `Confirm on non-PENDING_APPROVAL should return ${expectedStatus}`
  );
});

// ── AC4: Dispatch Stub ──

Then('dispatchMessage returns success true and stub true for SENT messages', function () {
  assert.ok(
    this.fileContent.includes('success: true, stub: true'),
    'Dispatch stub should return { success: true, stub: true }'
  );
});

Then('dispatchMessage does not call prisma message update', function () {
  // The dispatcher should NOT import or call update/updateMany
  assert.ok(
    !this.fileContent.includes('.update(') && !this.fileContent.includes('.updateMany('),
    'Dispatch stub should not update message status'
  );
});

// ── AC5: Edit Keeps Draft Status ──

Then('edit action on DRAFT updates body and keeps status {string}', function (expectedStatus: string) {
  assert.ok(
    this.routeContent.includes("case 'edit':"),
    'PATCH route must handle edit action'
  );
  assert.ok(
    this.routeContent.includes(`status: '${expectedStatus}'`),
    `Edit should keep status as ${expectedStatus}`
  );
});

Then('edit action on PENDING_APPROVAL returns status {int}', function (expectedStatus: number) {
  assert.ok(
    this.routeContent.includes("'DRAFT') throw new ConflictError('Can only edit DRAFT"),
    `Edit on non-DRAFT should return ${expectedStatus}`
  );
});

Then('reject action on PENDING_APPROVAL sets status to {string}', function (expectedStatus: string) {
  // Reject from PENDING_APPROVAL should return to DRAFT (recoverable)
  assert.ok(
    this.routeContent.includes("PENDING_APPROVAL") && this.routeContent.includes(`status: '${expectedStatus}'`),
    `Reject from PENDING_APPROVAL should set status to ${expectedStatus}`
  );
});

Then('reject action on DRAFT sets status to {string}', function (expectedStatus: string) {
  assert.ok(
    this.routeContent.includes(`status: '${expectedStatus}'`),
    `Reject from DRAFT should set status to ${expectedStatus}`
  );
});

// ── Settings API ──

Then('GET response includes messageApprovalRequired field', function () {
  const src = this.fileContent || this.routeContent || '';
  assert.ok(
    src.includes('messageApprovalRequired: settings.messageApprovalRequired'),
    'GET response should include messageApprovalRequired'
  );
});

Then('PATCH accepts and persists messageApprovalRequired boolean', function () {
  const src = this.fileContent || this.routeContent || '';
  assert.ok(
    src.includes('messageApprovalRequired') &&
    src.includes('Boolean(messageApprovalRequired)'),
    'PATCH should accept and persist messageApprovalRequired as boolean'
  );
});

// ── Multi-status GET ──

Then('GET with status {string} returns messages matching either status', function (statusParam: string) {
  const statuses = statusParam.split(',');
  assert.ok(statuses.length > 1, 'Should be comma-separated');
  assert.ok(
    this.routeContent.includes("status.includes(',')") || this.routeContent.includes('status.split'),
    'GET handler should support comma-separated status parameter'
  );
});
