@epic-8
Feature: Seller Communication & Negotiation
  As a user
  I want AI to generate personalized purchase messages for sellers
  So that I can quickly contact sellers with professional, platform-appropriate messages

  # ── Story 8.1: AI Message Generation ──────────────────────────────────────

  # AC1: Platform-Appropriate AI Message Generation (FR-COMM-01)

  @FR-COMM-01 @story-8-1 @E-008-S-1
  Scenario: AI generates casual tone message for Craigslist listing
    Given a listing on "CRAIGSLIST" with title "Vintage Record Player" priced at 75
    When the message generator creates a purchase message
    Then the generated message has a "casual" tone
    And the generated message platform is "CRAIGSLIST"

  @FR-COMM-01 @story-8-1 @E-008-S-2
  Scenario: AI generates professional tone message for eBay listing
    Given a listing on "EBAY" with title "Sony WH-1000XM5 Headphones" priced at 200
    When the message generator creates a purchase message
    Then the generated message has a "professional" tone
    And the generated message platform is "EBAY"

  @FR-COMM-01 @story-8-1 @E-008-S-3
  Scenario: AI generates friendly tone message for Facebook listing
    Given a listing on "FACEBOOK" with title "IKEA Standing Desk" priced at 150
    When the message generator creates a purchase message
    Then the generated message has a "friendly" tone
    And the generated message platform is "FACEBOOK"

  @FR-COMM-01 @story-8-1 @E-008-S-4
  Scenario: AI generates professional tone message for Mercari listing
    Given a listing on "MERCARI" with title "Nintendo Switch OLED" priced at 250
    When the message generator creates a purchase message
    Then the generated message has a "professional" tone

  @FR-COMM-01 @story-8-1 @E-008-S-5
  Scenario: AI generates casual tone message for OfferUp listing
    Given a listing on "OFFERUP" with title "Mountain Bike 26 inch" priced at 180
    When the message generator creates a purchase message
    Then the generated message has a "casual" tone

  @FR-COMM-01 @story-8-1 @E-008-S-6
  Scenario: Generated message includes seller name when available
    Given a listing on "CRAIGSLIST" with title "Leather Couch" priced at 300
    And the seller name is "Mike"
    When the message generator creates a purchase message
    Then the generated message body references the seller "Mike"

  # AC2: Multiple Message Types (FR-COMM-02)

  @FR-COMM-02 @story-8-1 @E-008-S-7
  Scenario: AI generates inquiry message type
    Given a listing on "EBAY" with title "Canon EOS R5 Camera" priced at 2500
    When the message generator creates a "inquiry" message
    Then the generated message type is "inquiry"
    And the generated message contains a subject line
    And the generated message contains a body

  @FR-COMM-02 @story-8-1 @E-008-S-8
  Scenario: AI generates offer message type with price
    Given a listing on "CRAIGSLIST" with title "MacBook Pro M3" priced at 1200
    And the buyer offers 1000
    When the message generator creates a "offer" message
    Then the generated message type is "offer"
    And the generated message contains a subject line
    And the generated message contains a body

  @FR-COMM-02 @story-8-1 @E-008-S-9
  Scenario: AI generates follow-up message type
    Given a listing on "FACEBOOK" with title "KitchenAid Mixer" priced at 150
    When the message generator creates a "follow-up" message
    Then the generated message type is "follow-up"
    And the generated message contains a subject line

  @FR-COMM-02 @story-8-1 @E-008-S-10
  Scenario: AI generates negotiation message type
    Given a listing on "MERCARI" with title "Air Jordan 1 Retro" priced at 300
    And the buyer offers 250
    When the message generator creates a "negotiation" message
    Then the generated message type is "negotiation"
    And the generated message contains a subject line

  # AC3: Draft Display (FR-COMM-01)

  @FR-COMM-01 @story-8-1 @E-008-S-11
  Scenario: Generated message is returned as editable draft
    Given a listing on "EBAY" with title "Bose QuietComfort Ultra" priced at 280
    When the message generator creates a purchase message
    Then the generated message has a non-empty subject
    And the generated message has a non-empty body
    And the generated message can be edited before sending

  @FR-COMM-01 @story-8-1 @E-008-S-12
  Scenario: API creates message record with DRAFT status
    Given the message generation API endpoint exists at "app/api/messages/generate/route.ts"
    Then the route creates messages with initial status "DRAFT"
    And the route sets direction to "OUTBOUND"

  # AC4: Template Fallback (FR-COMM-01)

  @FR-COMM-01 @story-8-1 @E-008-S-13
  Scenario: Template fallback when AI API is unavailable
    Given a listing on "CRAIGSLIST" with title "Vintage Turntable" priced at 100
    And the AI API is unavailable
    When the message generator creates a purchase message
    Then the generated message is a fallback template
    And the generated message contains a subject line
    And the generated message contains a body

  @FR-COMM-01 @story-8-1 @E-008-S-14
  Scenario: Template fallback produces platform-appropriate tone
    Given a listing on "EBAY" with title "Dyson V15 Vacuum" priced at 400
    And the AI API is unavailable
    When the message generator creates a purchase message
    Then the generated message is a fallback template
    And the generated message has a "professional" tone

  @FR-COMM-01 @story-8-1 @E-008-S-15
  Scenario: Template fallback supports all message types
    Given a listing on "FACEBOOK" with title "Herman Miller Chair" priced at 500
    And the AI API is unavailable
    When the message generator creates a "offer" message
    Then the generated message is a fallback template
    And the generated message type is "offer"

  @FR-COMM-01 @story-8-1 @E-008-S-16
  Scenario: Template fallback includes placeholder fields for offer price
    Given a listing on "OFFERUP" with title "iPad Pro 12.9" priced at 600
    And the AI API is unavailable
    When the message generator creates a "offer" message
    Then the generated message is a fallback template
    And the generated message body contains a price placeholder

  # ── Story 8.2: AI Negotiation Strategy ─────────────────────────────────────

  # AC1: AI Negotiation Strategy Generation (FR-COMM-03)

  @FR-COMM-03 @story-8-2 @E-008-S-17
  Scenario: AI generates negotiation strategy with initial offer and walk-away price
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    When the negotiation strategy is generated
    Then the strategy includes an initial offer price greater than 0
    And the strategy includes a walk-away price greater than or equal to the initial offer
    And the strategy includes negotiation tactics
    And the strategy includes a confidence level
    And the strategy includes a disclaimer

  @FR-COMM-03 @story-8-2 @E-008-S-18
  Scenario: Negotiation strategy includes counter-offer suggestions
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    When the negotiation strategy is generated
    Then the strategy includes counter-offer suggestions

  # AC2: Market Data-Driven Recommendations (FR-COMM-03)

  @FR-COMM-03 @story-8-2 @E-008-S-19
  Scenario: Strategy adjusts for high-demand items
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    And the listing has demand level "very_high"
    When the negotiation strategy is generated
    Then the initial offer is closer to asking price than default

  @FR-COMM-03 @story-8-2 @E-008-S-20
  Scenario: Strategy adjusts for stale listings over 30 days
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    And the listing has been listed for 45 days
    When the negotiation strategy is generated
    Then the initial offer is more aggressive than default

  @FR-COMM-03 @story-8-2 @E-008-S-21
  Scenario: Strategy adjusts for non-negotiable (firm price) listings
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    And the listing is marked as non-negotiable
    When the negotiation strategy is generated
    Then the initial offer is close to asking price

  @FR-COMM-03 @story-8-2 @E-008-S-22
  Scenario: Strategy accounts for platform-specific fee rates
    Given a listing for negotiation with asking price 100 and market value 130 on "CRAIGSLIST"
    When the negotiation strategy is generated
    Then the strategy walk-away price reflects 0% platform fees

  @FR-COMM-03 @story-8-2 @E-008-S-23
  Scenario: Strategy uses estimated value when verified market value unavailable
    Given a listing for negotiation with asking price 100 and estimated value 120 on "EBAY"
    And the listing has no verified market value
    When the negotiation strategy is generated
    Then the strategy is generated successfully with low or medium confidence

  # AC3: Counter-Offer Analysis (FR-COMM-03)

  @FR-COMM-03 @story-8-2 @E-008-S-24
  Scenario: Counter-offer analysis recommends accept when price is favorable
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    When the counter-offer of 75 is analyzed against our previous offer of 80
    Then the recommendation is "accept"

  @FR-COMM-03 @story-8-2 @E-008-S-25
  Scenario: Counter-offer analysis recommends counter when price is negotiable
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    When the counter-offer of 95 is analyzed against our previous offer of 80
    Then the recommendation is "counter"
    And a suggested counter price is provided

  @FR-COMM-03 @story-8-2 @E-008-S-26
  Scenario: Counter-offer analysis recommends walkaway when price is too high
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    When the counter-offer of 120 is analyzed against our previous offer of 80
    Then the recommendation is "walkaway"

  @FR-COMM-03 @story-8-2 @E-008-S-27
  Scenario: Counter-offer analysis detects bidding war scenario
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    And the listing has demand level "very_high"
    When the counter-offer of 115 is analyzed against our previous offer of 80
    Then the recommendation is "walkaway"
    And the reasoning mentions price escalation

  # AC4: Algorithmic Fallback (FR-COMM-03)

  @FR-COMM-03 @story-8-2 @E-008-S-28
  Scenario: Algorithmic fallback generates strategy when AI unavailable
    Given a listing for negotiation with asking price 100 and market value 130 on "EBAY"
    And the AI API is unavailable for negotiation
    When the negotiation strategy is generated
    Then the strategy is marked as fallback
    And the strategy includes an initial offer price greater than 0
    And the strategy includes a walk-away price greater than or equal to the initial offer

  @FR-COMM-03 @story-8-2 @E-008-S-29
  Scenario: Fallback strategy uses rule-based calculations
    Given a listing for negotiation with asking price 200 and market value 260 on "MERCARI"
    And the listing has been listed for 20 days
    And the AI API is unavailable for negotiation
    When the negotiation strategy is generated
    Then the strategy is marked as fallback
    And the initial offer reflects aging listing discount

  # ── Story 8.3: Message Inbox & Thread History ─────────────────────────────

  # AC1: Thread List View (FR-COMM-04)

  @FR-COMM-04 @story-8-3 @E-008-S-30
  Scenario: Thread list displays conversations grouped by listing
    Given the threads API endpoint exists at "app/api/messages/threads/route.ts"
    Then the endpoint groups messages by listingId
    And each thread includes listing details, last message preview, and message count

  @FR-COMM-04 @story-8-3 @E-008-S-31
  Scenario: Thread list shows most recent message preview
    Given a thread with listing "Vintage Guitar" has 5 messages
    When the thread list is fetched
    Then the thread shows the most recent message body truncated to 100 characters

  @FR-COMM-04 @story-8-3 @E-008-S-32
  Scenario: Thread list excludes messages without a listing
    Given the threads API endpoint exists at "app/api/messages/threads/route.ts"
    Then the endpoint filters to listingId IS NOT NULL
    And orphaned messages without a listing are not included in threads

  @FR-COMM-04 @story-8-3 @E-008-S-33
  Scenario: Messages navigation link exists in Navigation component
    Given the Navigation component at "src/components/Navigation.tsx"
    Then it includes a Messages link with href "/messages"
    And the Messages link uses the MessageSquare icon

  # AC2: Thread Detail View (FR-COMM-04)

  @FR-COMM-04 @story-8-3 @E-008-S-34
  Scenario: Thread detail displays full message history in chronological order
    Given the thread detail API endpoint exists at "app/api/messages/threads/[listingId]/route.ts"
    Then messages are ordered by createdAt ascending
    And each message includes direction indicators (INBOUND/OUTBOUND)

  @FR-COMM-04 @story-8-3 @E-008-S-35
  Scenario: Thread detail includes listing information header
    Given a thread for listing "iPhone 15 Pro" on platform "EBAY" priced at 800
    When the thread detail is fetched
    Then the response includes listing title, platform, and asking price
    And the listing details are displayed in the thread header

  @FR-COMM-04 @story-8-3 @E-008-S-36
  Scenario: Thread detail handles deleted listing gracefully
    Given a thread for a listing that has been deleted
    When the thread detail is fetched
    Then the listing field is null in the response
    And the thread still displays with a "Listing removed" placeholder

  # AC3: Message Storage Requirements (FR-COMM-08)

  @FR-COMM-08 @story-8-3 @E-008-S-37
  Scenario: Messages include all required storage fields
    Given the Message model in the database schema
    Then each message stores direction as INBOUND or OUTBOUND
    And each message stores a status field
    And each message stores a body field
    And each message optionally stores a listingId reference
    And each message optionally stores a parentId for thread linking

  @FR-COMM-08 @story-8-3 @E-008-S-38
  Scenario: Thread detail returns complete message metadata
    Given the thread detail API endpoint exists at "app/api/messages/threads/[listingId]/route.ts"
    Then each message in the response includes id, direction, status, body, parentId, and createdAt

  # AC4: Unread Thread Ordering (FR-COMM-04)

  @FR-COMM-04 @story-8-3 @E-008-S-39
  Scenario: Threads are ordered by most recently active first
    Given the threads API endpoint exists at "app/api/messages/threads/route.ts"
    Then threads are sorted by lastMessageAt in descending order
    And the most recently active thread appears first

  @FR-COMM-04 @story-8-3 @E-008-S-40
  Scenario: Unread thread indicator shows count of unread inbound messages
    Given a thread with 3 unread INBOUND messages (readAt is null)
    When the thread list is fetched
    Then the thread shows an unreadCount of 3

  @FR-COMM-04 @story-8-3 @E-008-S-41
  Scenario: Opening a thread marks inbound messages as read
    Given the thread detail API endpoint exists at "app/api/messages/threads/[listingId]/route.ts"
    When a user opens a thread
    Then all INBOUND messages with null readAt are marked with current timestamp
    And the read marking is fire-and-forget for performance

  # ── Story 8.5: Conversation Status & Inbound Message Tracking ─────────────

  # AC1: Conversation Status Display (FR-COMM-06)

  @FR-COMM-06 @story-8-5 @E-008-S-42
  Scenario: Conversation status API returns pending status
    Given the conversation status service at "src/lib/conversation-status.ts"
    When the conversation status is "pending"
    Then it is a valid conversation status value

  @FR-COMM-06 @story-8-5 @E-008-S-43
  Scenario: Conversation status API returns responded status
    Given the conversation status service at "src/lib/conversation-status.ts"
    When the conversation status is "responded"
    Then it is a valid conversation status value

  @FR-COMM-06 @story-8-5 @E-008-S-44
  Scenario: Conversation status API returns purchased status
    Given the conversation status service at "src/lib/conversation-status.ts"
    When the conversation status is "purchased"
    Then it is a valid conversation status value

  @FR-COMM-06 @story-8-5 @E-008-S-45
  Scenario: Conversation status API endpoint returns status with message stats
    Given the conversation status API endpoint exists at "app/api/listings/[id]/conversation-status/route.ts"
    Then the route exports a GET handler
    And the route requires authentication via getAuthUserId
    And the route scopes listing lookup to userId for ownership

  # AC2: Inbound Message Capture (FR-COMM-07)

  @FR-COMM-07 @story-8-5 @E-008-S-46
  Scenario: Inbound message checker service has platform adapters for all marketplaces
    Given the inbound message checker service at "src/lib/inbound-message-checker.ts"
    Then it has platform checkers for "CRAIGSLIST", "FACEBOOK", "EBAY", "MERCARI", and "OFFERUP"

  @FR-COMM-07 @story-8-5 @E-008-S-47
  Scenario: Check-replies API endpoint requires auth and tier enforcement
    Given the check-replies API endpoint exists at "app/api/messages/check-replies/route.ts"
    Then the route exports a POST handler
    And the route requires authentication via getAuthUserId
    And the route enforces messaging tier access via checkFeatureAccess

  @FR-COMM-07 @story-8-5 @E-008-S-48
  Scenario: Inbound messages are stored with INBOUND direction
    Given the inbound message checker service at "src/lib/inbound-message-checker.ts"
    Then inbound messages are created with direction "INBOUND" and status "DELIVERED"

  # AC3: Auto-Status Transition: Pending → Responded (FR-COMM-06)

  @FR-COMM-06 @story-8-5 @E-008-S-49
  Scenario: Conversation transitions from pending to responded on inbound message
    Given the conversation status service at "src/lib/conversation-status.ts"
    Then transition from "pending" to "responded" is valid

  @FR-COMM-06 @story-8-5 @E-008-S-50
  Scenario: Inbound message checker calls transitionToResponded on new messages
    Given the inbound message checker service at "src/lib/inbound-message-checker.ts"
    Then the service calls transitionToResponded when new inbound messages are stored

  # AC4: Auto-Status Transition: Purchased (FR-COMM-06)

  @FR-COMM-06 @story-8-5 @E-008-S-51
  Scenario: Conversation transitions to purchased from any state
    Given the conversation status service at "src/lib/conversation-status.ts"
    Then transition from "pending" to "purchased" is valid
    And transition from "responded" to "purchased" is valid

  @FR-COMM-06 @story-8-5 @E-008-S-52
  Scenario: Opportunity PATCH handler triggers purchased transition
    Given the opportunities API route at "app/api/opportunities/[id]/route.ts"
    Then the PATCH handler imports transitionToPurchased from conversation-status
    And the transition is fire-and-forget

  @FR-COMM-06 @story-8-5 @E-008-S-53
  Scenario: Message generate route triggers pending transition
    Given the message generate API route at "app/api/messages/generate/route.ts"
    Then the route imports transitionToPending from conversation-status
    And the transition is fire-and-forget

  # AC5: Browser-Based Fallback (FR-COMM-07)

  @FR-COMM-07 @story-8-5 @E-008-S-54
  Scenario: Platform checker routes to platform-specific adapter
    Given the inbound message checker service at "src/lib/inbound-message-checker.ts"
    Then each platform has a dedicated checker that can be replaced with a real implementation

  @FR-COMM-07 @story-8-5 @E-008-S-55
  Scenario: Stub checkers return no messages found for all platforms
    Given the inbound message checker service at "src/lib/inbound-message-checker.ts"
    Then all stub checkers return found false with empty messages array

  # Behavioral scenarios — exercise actual function behavior, not just source structure.

  @FR-COMM-07 @story-8-5 @E-008-S-55a @behavioral
  Scenario: checkForReplies returns unchecked result for unsupported platform
    When checkForReplies is called with an unsupported platform
    Then the result has checked false and newMessages 0 and conversationStatus null

  @FR-COMM-06 @story-8-5 @E-008-S-55b @behavioral
  Scenario: CONVERSATION_STATUSES exposes exactly the three documented states
    Then CONVERSATION_STATUSES contains exactly "pending", "responded", and "purchased"

  # ── Story 8.4: Message Approval Workflow ──────────────────────────────────

  # AC1: Draft Status on Creation (FR-COMM-05)

  @FR-COMM-05 @story-8-4 @E-008-S-56
  Scenario: OUTBOUND messages default to DRAFT status
    Given the messages API route at "app/api/messages/route.ts"
    Then OUTBOUND messages are created with default status "DRAFT"

  # AC2: Approve with Optional Approval Gate (FR-COMM-05)

  @FR-COMM-05 @story-8-4 @E-008-S-57
  Scenario: Approve DRAFT message transitions to SENT when approval not required
    Given the messages PATCH route at "app/api/messages/[id]/route.ts"
    Then approve action on DRAFT with messageApprovalRequired false sets status to "SENT"

  @FR-COMM-05 @story-8-4 @E-008-S-58
  Scenario: Approve DRAFT message transitions to PENDING_APPROVAL when approval required
    Given the messages PATCH route at "app/api/messages/[id]/route.ts"
    Then approve action on DRAFT with messageApprovalRequired true sets status to "PENDING_APPROVAL"

  # AC3: Confirm Send from Pending (FR-COMM-05)

  @FR-COMM-05 @story-8-4 @E-008-S-59
  Scenario: Confirm PENDING_APPROVAL message transitions to SENT
    Given the messages PATCH route at "app/api/messages/[id]/route.ts"
    Then confirm action on PENDING_APPROVAL sets status to "SENT" with sentAt timestamp

  @FR-COMM-05 @story-8-4 @E-008-S-60
  Scenario: Confirm on DRAFT returns ConflictError
    Given the messages PATCH route at "app/api/messages/[id]/route.ts"
    Then confirm action on DRAFT returns status 409

  # AC4: Dispatch Stub (FR-COMM-05)

  @FR-COMM-05 @story-8-4 @E-008-S-61 @stub
  Scenario: Dispatch stub logs intent and returns success
    Given the message dispatcher at "src/lib/message-dispatcher.ts"
    Then dispatchMessage returns success true and stub true for SENT messages

  @FR-COMM-05 @story-8-4 @E-008-S-62 @stub
  Scenario: Dispatch stub does not update message status
    Given the message dispatcher at "src/lib/message-dispatcher.ts"
    Then dispatchMessage does not call prisma message update

  # AC5: Edit Keeps Draft Status (FR-COMM-05)

  @FR-COMM-05 @story-8-4 @E-008-S-63
  Scenario: Edit action only allowed on DRAFT messages
    Given the messages PATCH route at "app/api/messages/[id]/route.ts"
    Then edit action on DRAFT updates body and keeps status "DRAFT"
    And edit action on PENDING_APPROVAL returns status 409

  @FR-COMM-05 @story-8-4 @E-008-S-64
  Scenario: Reject from PENDING_APPROVAL returns to DRAFT
    Given the messages PATCH route at "app/api/messages/[id]/route.ts"
    Then reject action on PENDING_APPROVAL sets status to "DRAFT"
    And reject action on DRAFT sets status to "REJECTED"

  @FR-COMM-05 @story-8-4 @E-008-S-65
  Scenario: Settings API exposes messageApprovalRequired field
    Given the user settings API route at "app/api/user/settings/route.ts"
    Then GET response includes messageApprovalRequired field
    And PATCH accepts and persists messageApprovalRequired boolean

  @FR-COMM-05 @story-8-4 @E-008-S-66
  Scenario: GET messages supports comma-separated status filter
    Given the messages API route at "app/api/messages/route.ts"
    Then GET with status "DRAFT,PENDING_APPROVAL" returns messages matching either status
