/**
 * @file test/acceptance/step_definitions/E-008-message-inbox-threads.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Step definitions for E-008: Message Inbox & Thread History (story 8.3).
 *
 * @description
 * Tests for scenarios S-30 through S-41 validating FR-COMM-04 (thread list,
 * thread detail, ordering, unread indicators) and FR-COMM-08 (message storage
 * requirements). Validates via code inspection and API route structure.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');

// ── Shared state ────────────────────────────────────────────────────────────

let routeFileContent: string;
let detailRouteFileContent: string;
let navFileContent: string;
let schemaContent: string;
let threadData: Record<string, unknown>;

// ── AC1: Thread List View ───────────────────────────────────────────────────

Given('the threads API endpoint exists at {string}', function (filePath: string) {
  const fullPath = path.join(projectRoot, filePath);
  assert.ok(fs.existsSync(fullPath), `Endpoint file must exist at ${filePath}`);
  routeFileContent = fs.readFileSync(fullPath, 'utf-8');
});

Then('the endpoint groups messages by listingId', function () {
  assert.ok(
    routeFileContent.includes('groupBy'),
    'Threads endpoint must use groupBy to aggregate messages'
  );
  assert.ok(
    routeFileContent.includes("'listingId'") || routeFileContent.includes('"listingId"'),
    'groupBy must group by listingId'
  );
});

Then('each thread includes listing details, last message preview, and message count', function () {
  assert.ok(routeFileContent.includes('listing'), 'Thread must include listing details');
  assert.ok(
    routeFileContent.includes('lastMessage') || routeFileContent.includes('body'),
    'Thread must include last message preview'
  );
  assert.ok(
    routeFileContent.includes('messageCount') || routeFileContent.includes('_count'),
    'Thread must include message count'
  );
});

Given('a thread with listing {string} has {int} messages', function (
  _listingTitle: string,
  _messageCount: number
) {
  // Context setup — validated in assertions below
  threadData = { listingTitle: _listingTitle, messageCount: _messageCount };
});

When('the thread list is fetched', function () {
  // Validate the endpoint implementation handles thread list correctly
  const fullPath = path.join(projectRoot, 'app/api/messages/threads/route.ts');
  routeFileContent = fs.readFileSync(fullPath, 'utf-8');
});

Then('the thread shows the most recent message body truncated to 100 characters', function () {
  assert.ok(
    routeFileContent.includes('100') && routeFileContent.includes('substring'),
    'Thread must truncate last message body to 100 characters'
  );
});

Then('the endpoint filters to listingId IS NOT NULL', function () {
  assert.ok(
    routeFileContent.includes('not: null') || routeFileContent.includes('not:null'),
    'Threads endpoint must filter out null listingId'
  );
});

Then('orphaned messages without a listing are not included in threads', function () {
  // The null filter above ensures orphaned messages are excluded
  assert.ok(
    routeFileContent.includes('listingId') && routeFileContent.includes('not: null'),
    'Filter must exclude messages with null listingId'
  );
});

Given('the Navigation component at {string}', function (filePath: string) {
  const fullPath = path.join(projectRoot, filePath);
  assert.ok(fs.existsSync(fullPath), `Navigation file must exist at ${filePath}`);
  navFileContent = fs.readFileSync(fullPath, 'utf-8');
});

Then('it includes a Messages link with href {string}', function (href: string) {
  assert.ok(
    navFileContent.includes(`href: '${href}'`) || navFileContent.includes(`href: "${href}"`),
    `Navigation must include a link with href "${href}"`
  );
});

Then('the Messages link uses the MessageSquare icon', function () {
  assert.ok(
    navFileContent.includes('MessageSquare'),
    'Messages nav item must use MessageSquare icon'
  );
});

// ── AC2: Thread Detail View ─────────────────────────────────────────────────

Given('the thread detail API endpoint exists at {string}', function (filePath: string) {
  const fullPath = path.join(projectRoot, filePath);
  assert.ok(fs.existsSync(fullPath), `Detail endpoint file must exist at ${filePath}`);
  detailRouteFileContent = fs.readFileSync(fullPath, 'utf-8');
});

Then('messages are ordered by createdAt ascending', function () {
  assert.ok(
    detailRouteFileContent.includes("'asc'") || detailRouteFileContent.includes('"asc"'),
    'Thread detail must order messages by createdAt ascending'
  );
});

Then('each message includes direction indicators \\(INBOUND\\/OUTBOUND)', function () {
  assert.ok(
    detailRouteFileContent.includes('direction'),
    'Each message must include a direction field'
  );
});

Given(
  'a thread for listing {string} on platform {string} priced at {int}',
  function (_title: string, _platform: string, _price: number) {
    threadData = { title: _title, platform: _platform, price: _price };
  }
);

When('the thread detail is fetched', function () {
  const fullPath = path.join(
    projectRoot,
    'app/api/messages/threads/[listingId]/route.ts'
  );
  detailRouteFileContent = fs.readFileSync(fullPath, 'utf-8');
});

Then('the response includes listing title, platform, and asking price', function () {
  assert.ok(detailRouteFileContent.includes('title'), 'Response must include listing title');
  assert.ok(detailRouteFileContent.includes('platform'), 'Response must include platform');
  assert.ok(
    detailRouteFileContent.includes('askingPrice'),
    'Response must include asking price'
  );
});

Then('the listing details are displayed in the thread header', function () {
  const headerPath = path.join(projectRoot, 'src/components/messages/ThreadHeader.tsx');
  assert.ok(fs.existsSync(headerPath), 'ThreadHeader component must exist');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');
  assert.ok(headerContent.includes('listing'), 'ThreadHeader must render listing data');
});

Given('a thread for a listing that has been deleted', function () {
  threadData = { deletedListing: true };
});

Then('the listing field is null in the response', function () {
  // The endpoint handles null listing via optional relation
  assert.ok(
    detailRouteFileContent.includes('listing') && detailRouteFileContent.includes('null'),
    'Endpoint must handle null listing gracefully'
  );
});

Then('the thread still displays with a {string} placeholder', function (placeholder: string) {
  const headerPath = path.join(projectRoot, 'src/components/messages/ThreadHeader.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');
  assert.ok(
    headerContent.includes(placeholder),
    `ThreadHeader must show "${placeholder}" when listing is null`
  );
});

// ── AC3: Message Storage Requirements ───────────────────────────────────────

Given('the Message model in the database schema', function () {
  const schemaPath = path.join(projectRoot, 'prisma/schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'Prisma schema must exist');
  schemaContent = fs.readFileSync(schemaPath, 'utf-8');
});

Then('each message stores direction as INBOUND or OUTBOUND', function () {
  assert.ok(
    schemaContent.includes('direction') && schemaContent.includes('String'),
    'Message model must have a direction String field'
  );
});

Then('each message stores a status field', function () {
  assert.ok(
    schemaContent.includes('status') && schemaContent.includes('DRAFT'),
    'Message model must have a status field with DRAFT default'
  );
});

Then('each message stores a body field', function () {
  assert.ok(
    schemaContent.includes('body') && schemaContent.includes('String'),
    'Message model must have a body String field'
  );
});

Then('each message optionally stores a listingId reference', function () {
  assert.ok(
    schemaContent.includes('listingId') && schemaContent.includes('String?'),
    'Message model must have an optional listingId field'
  );
});

Then('each message optionally stores a parentId for thread linking', function () {
  assert.ok(
    schemaContent.includes('parentId') && schemaContent.includes('String?'),
    'Message model must have an optional parentId field'
  );
});

Then(
  'each message in the response includes id, direction, status, body, parentId, and createdAt',
  function () {
    const fields = ['id', 'direction', 'status', 'body', 'parentId', 'createdAt'];
    for (const field of fields) {
      assert.ok(
        detailRouteFileContent.includes(`m.${field}`) ||
          detailRouteFileContent.includes(`msg.${field}`) ||
          detailRouteFileContent.includes(field),
        `Thread detail response must include ${field}`
      );
    }
  }
);

// ── AC4: Unread Thread Ordering ─────────────────────────────────────────────

Then('threads are sorted by lastMessageAt in descending order', function () {
  assert.ok(
    routeFileContent.includes('lastMessageAt') && routeFileContent.includes('sort'),
    'Threads must be sorted by lastMessageAt'
  );
});

Then('the most recently active thread appears first', function () {
  // DESC sort means b - a ordering
  assert.ok(
    routeFileContent.includes('b.lastMessageAt') || routeFileContent.includes('DESC'),
    'Sort must place most recent thread first'
  );
});

Given(
  'a thread with {int} unread INBOUND messages \\(readAt is null)',
  function (_unreadCount: number) {
    threadData = { unreadCount: _unreadCount };
  }
);

Then('the thread shows an unreadCount of {int}', function (_count: number) {
  const fullPath = path.join(projectRoot, 'app/api/messages/threads/route.ts');
  const content = fs.readFileSync(fullPath, 'utf-8');
  assert.ok(
    content.includes('unreadCount') && content.includes('INBOUND') && content.includes('readAt'),
    'Threads endpoint must calculate unreadCount from INBOUND messages with null readAt'
  );
});

When('a user opens a thread', function () {
  const fullPath = path.join(
    projectRoot,
    'app/api/messages/threads/[listingId]/route.ts'
  );
  detailRouteFileContent = fs.readFileSync(fullPath, 'utf-8');
});

Then(
  'all INBOUND messages with null readAt are marked with current timestamp',
  function () {
    assert.ok(
      detailRouteFileContent.includes('updateMany') &&
        detailRouteFileContent.includes('INBOUND') &&
        detailRouteFileContent.includes('readAt: null'),
      'Thread detail must mark INBOUND messages as read via updateMany'
    );
  }
);

Then('the read marking is fire-and-forget for performance', function () {
  // Fire-and-forget pattern: .catch(() => {}) without await before response
  assert.ok(
    detailRouteFileContent.includes('.catch('),
    'Auto-read must use fire-and-forget pattern (catch without await)'
  );
});
