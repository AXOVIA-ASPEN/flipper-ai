@epic-6
Feature: Flip Lifecycle Management & Analytics
  As a user
  I want a dashboard showing my listing inventory with accurate stats and pagination
  So that I can see all my scraped listings at a glance with key metrics about my flipping business

  # =====================================================================
  # Story 6.1: Dashboard with Listings & Stats
  # AC #1: Stats cards with correct server-side aggregations
  # AC #2: Card layout with required fields including status badge
  # AC #3: Pagination with configurable page size selector
  # AC #4: Clicking card navigates to internal listing detail view
  # =====================================================================

  # S-1: Listings API returns server-side stats aggregation
  @E-006-S-1 @FR-DASH-01 @story-6-1
  Scenario: Listings API returns server-side stats with totalListings, opportunitiesFound, activeFlips, totalProfit
    Given the listings API route at "app/api/listings/route.ts"
    When I inspect the GET handler
    Then it uses Promise.all to run stats queries concurrently
    And it includes a listing count query for totalListings
    And it includes an opportunity count query for opportunitiesFound
    And it includes an active flips count query excluding SOLD and PASSED status
    And it includes an opportunity aggregate query for totalProfit from SOLD status
    And the response includes a stats object with totalListings, opportunitiesFound, activeFlips, and totalProfit

  # S-2: Listings API supports page and limit pagination params
  @E-006-S-2 @FR-DASH-01 @story-6-1
  Scenario: Listings API supports page and limit query parameters with skip/take pagination
    Given the listings API route at "app/api/listings/route.ts"
    When I inspect the GET handler pagination logic
    Then it reads a page parameter from query string with default 1
    And it reads a limit parameter from query string with default 20
    And it applies skip and take to the findMany query
    And the response includes a pagination object with page, limit, total, and totalPages
    And it only allows limit values of 10, 20, or 50

  # S-3: Listings API includes images and opportunity relations
  @E-006-S-3 @FR-DASH-01 @story-6-1
  Scenario: Listings API findMany includes images and opportunity relations
    Given the listings API route at "app/api/listings/route.ts"
    When I inspect the findMany call
    Then it includes images with take 1 ordered by imageIndex
    And it includes opportunity with id and status fields selected

  # S-4: Dashboard renders 4 stats cards with server-side data
  @E-006-S-4 @FR-DASH-01 @story-6-1
  Scenario: Dashboard renders 4 stats cards sourced from server-side API response
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the stats rendering
    Then it renders a Total Listings stat card
    And it renders an Opportunities Found stat card
    And it renders an Active Flips stat card
    And it renders a Total Profit stat card
    And the stats are sourced from data.stats in the API response

  # S-5: Dashboard listing cards show status badge
  @E-006-S-5 @FR-DASH-01 @story-6-1
  Scenario: Dashboard listing cards display a status badge for each listing
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the listing card template
    Then each listing card shows the listing status as a badge
    And the status badge uses the listing.status field

  # S-6: Dashboard page size selector is present
  @E-006-S-6 @FR-DASH-01 @story-6-1
  Scenario: Dashboard displays a page size selector with 10, 20, and 50 options
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the page size selector
    Then it renders buttons or controls for 10, 20, and 50 per page options
    And selecting a page size updates the limit filter parameter

  # S-7: Dashboard listing cards are wrapped in internal navigation links
  @E-006-S-7 @FR-DASH-01 @story-6-1
  Scenario: Dashboard listing cards navigate to internal listing detail view when clicked
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the listing card navigation
    Then each listing card is wrapped in a Link component pointing to /listings/[id]
    And the ExternalLink button uses stopPropagation to prevent card navigation
    And the Star button uses stopPropagation to prevent card navigation

  # S-8: Listing detail page exists and shows full listing data
  @E-006-S-8 @FR-DASH-01 @story-6-1
  Scenario: Listing detail page at /listings/[id] displays full listing information
    Given the listing detail page at "app/listings/[id]/page.tsx"
    When I inspect the page content
    Then it fetches the listing from /api/listings/[id]
    And it displays the listing title, platform, asking price, and status
    And it includes a Back to Dashboard link pointing to /dashboard
    And it includes a View on Marketplace external link

  # S-9: Listings [id] API includes images and opportunity relations
  @E-006-S-9 @FR-DASH-01 @story-6-1
  Scenario: Single listing API includes images and opportunity relations in GET response
    Given the single listing API route at "app/api/listings/[id]/route.ts"
    When I inspect the GET handler
    Then it includes images and opportunity in the findUnique query

  # =====================================================================
  # Story 6.2: Kanban Board with Lifecycle Tracking
  # AC #1: Kanban shows 6 columns including PASSED
  # AC #2: Drag updates persisted opportunity status
  # AC #3: Moving to PURCHASED opens modal
  # AC #4: Moving to LISTED opens modal
  # AC #5: Moving to SOLD opens modal with profit calculation
  # AC #6: Moving to PASSED requires no modal
  # =====================================================================

  # S-10: KanbanBoard renders all 6 lifecycle columns including PASSED
  @E-006-S-10 @story-6-2 @FR-DASH-02
  Scenario: KanbanBoard renders all 6 lifecycle columns including PASSED
    Given the KanbanBoard component at "src/components/KanbanBoard.tsx"
    When I inspect the COLUMNS constant
    Then it contains exactly 6 columns
    And column "IDENTIFIED" is present
    And column "CONTACTED" is present
    And column "PURCHASED" is present
    And column "LISTED" is present
    And column "SOLD" is present
    And column "PASSED" is present

  # S-11: Drag to IDENTIFIED or CONTACTED calls PATCH directly without modal
  @E-006-S-11 @story-6-2 @FR-DASH-02
  Scenario: Dragging a card to IDENTIFIED or CONTACTED updates status directly without a modal
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the handleKanbanStatusChange function
    Then it intercepts moves to "PURCHASED", "LISTED", and "SOLD"
    And it calls updateOpportunity directly for other statuses

  # S-12: Dragging to PURCHASED opens a modal requiring purchase price
  @E-006-S-12 @story-6-2 @FR-DASH-03
  Scenario: Dragging a card to PURCHASED column opens a modal that requires a purchase price
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the PURCHASED modal
    Then it renders when pendingKanbanMove targetStatus is "PURCHASED"
    And it has a required purchase price input
    And the confirm button is disabled when purchase price is empty
    And confirming calls updateOpportunity with status "PURCHASED" and purchasePrice and purchaseDate

  # S-13: Dragging to LISTED opens a modal requiring resale URL
  @E-006-S-13 @story-6-2 @FR-DASH-04
  Scenario: Dragging a card to LISTED column opens a modal that requires a resale URL
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the LISTED modal
    Then it renders when pendingKanbanMove targetStatus is "LISTED"
    And it has a required resale URL input
    And confirming calls updateOpportunity with status "LISTED" and resaleUrl

  # S-14: Dragging to SOLD opens a modal with sale price and fees inputs
  @E-006-S-14 @story-6-2 @FR-DASH-05
  Scenario: Dragging a card to SOLD opens a modal with sale price and optional fees for profit calculation
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the SOLD modal
    Then it renders when pendingKanbanMove targetStatus is "SOLD"
    And it has a required sale price input
    And it has an optional fees input
    And confirming calls updateOpportunity with status "SOLD", resalePrice, fees, resaleDate, and purchasePrice

  # S-15: Dragging to PASSED updates status directly without a modal
  @E-006-S-15 @story-6-2 @FR-DASH-02
  Scenario: Dragging a card to PASSED column marks it as passed with no modal required
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the handleKanbanStatusChange function
    Then dragging to "PASSED" does not trigger a modal
    And it calls updateOpportunity directly with status "PASSED"

  # =====================================================================
  # Story 6.3: Advanced Filtering
  # AC #1: Filter panel available with platform, score, profit, category, status
  # AC #2: AND logic across all filter types
  # AC #3: Clearing one filter preserves others
  # AC #4: Filter state encoded in URL and restored on navigation
  # =====================================================================

  # S-16: FilterPanel component provides all required filter types
  @E-006-S-16 @story-6-3 @FR-DASH-06
  Scenario: FilterPanel component provides platform, score, profit, category, and status filters
    Given the FilterPanel component at "src/components/FilterPanel.tsx"
    When I inspect the component props and UI elements
    Then it renders platform chip buttons for CRAIGSLIST, FACEBOOK_MARKETPLACE, EBAY, OFFERUP, and MERCARI
    And it renders a score range with min and max range inputs
    And it renders profit range with min and max number inputs
    And it renders category chip buttons for common categories
    And it renders status chips when statusOptions prop is provided

  # S-17: Listings API supports platforms multi-select filter
  @E-006-S-17 @story-6-3 @FR-DASH-06
  Scenario: GET /api/listings filters by platforms multi-select returning only matching platforms
    Given the listings API route at "app/api/listings/route.ts"
    When I inspect the GET handler filter logic
    Then it reads a platforms query parameter and splits by comma
    And it builds a Prisma where clause with platform using { in: platformList }
    And the multi-select platforms param takes precedence over the single platform param

  # S-18: Listings API AND logic filters multiple dimensions simultaneously
  @E-006-S-18 @story-6-3 @FR-DASH-06
  Scenario: GET /api/listings applies AND logic across all active filters simultaneously
    Given the listings API route at "app/api/listings/route.ts"
    When I inspect the GET handler with multiple active filters
    Then it builds a single Prisma where clause combining userId, platform, valueScore, profitPotential, category, and status
    And all filters are applied as AND conditions using Prisma where object composition

  # S-19: Clearing one filter preserves others in URL state
  @E-006-S-19 @story-6-3 @FR-DASH-06
  Scenario: Clearing a single filter updates URL without resetting other active filters
    Given the useFilterParams hook at "src/hooks/useFilterParams.ts"
    When I inspect the setFilter function with a cleared value
    Then calling setFilter with an empty string removes that parameter from the URL
    And other active filter parameters remain in the URL unchanged

  # S-20: Filter state persists in URL query parameters
  @E-006-S-20 @story-6-3 @FR-DASH-06
  Scenario: Filter state is encoded in URL and fully restored on page load
    Given the useFilterParams hook at "src/hooks/useFilterParams.ts"
    When I inspect the URL encoding behavior
    Then the platforms filter is stored as a comma-separated string in the URL
    And the categories filter is stored as a comma-separated string in the URL
    And the statuses filter is stored as a comma-separated string in the URL
    And all filter values are read back from searchParams on hook initialization

  # Story 6.4: Analytics Dashboard ─────────────────────────────────────────────

  # S-21: Analytics page shows required summary metrics
  @E-006-S-21 @story-6-4 @FR-DASH-07
  Scenario: Analytics page shows required summary metrics
    Given the analytics page at "app/analytics/page.tsx"
    When I inspect the primary metrics section
    Then it renders a "Total Profit" summary card using totalNetProfit
    And it renders a "Flips Completed" summary card using completedDeals
    And it renders an "Avg Profit / Flip" summary card using avgProfitPerFlip
    And it renders a "Success Rate" summary card using successRate with sold-of-total subtitle

  # S-22: Analytics page shows chart visualizations
  @E-006-S-22 @story-6-4 @FR-DASH-07
  Scenario: Analytics page shows chart visualizations
    Given the analytics page at "app/analytics/page.tsx"
    When I inspect the chart sections
    Then it renders a "Monthly Trends" section with a LineChart using trends data
    And it renders a "Profit by Category" section with a BarChart using categoryBreakdown data
    And it renders a "Platform Performance" section with a BarChart using platformBreakdown data
    And it renders a "Best Deal" card showing the highest-profit item

  # S-23: Analytics page shows helpful empty state with no data
  @E-006-S-23 @story-6-4 @FR-DASH-07
  Scenario: Analytics page shows helpful empty state with navigation links
    Given the analytics page at "app/analytics/page.tsx"
    When I inspect the empty state condition for items.length === 0
    Then it renders an empty state heading "No analytics yet"
    And it renders guidance text directing the user to the Opportunities page
    And it renders a link to "/opportunities" labelled "Browse Opportunities"
    And it renders a link to "/scraper" labelled "Start Scanning"

  # S-24: Date range filter wires to API and updates all analytics data
  @E-006-S-24 @story-6-4 @FR-DASH-07
  Scenario: Date range filter updates all analytics data
    Given the analytics page at "app/analytics/page.tsx"
    When I inspect the date range filter implementation
    Then it renders dateFrom and dateTo date inputs
    Then it includes dateFrom in the fetch URL when set
    And it includes dateTo in the fetch URL when set
    And it renders a "Clear dates" button when either date is set
    And the API route at "app/api/analytics/profit-loss/route.ts" forwards dateFrom and dateTo to getProfitLossAnalytics

  # =====================================================================
  # Story 6.5: Performance Report Export
  # AC #1: Export CSV downloads file with correct headers and one row per deal
  # AC #2: Export PDF generates formatted report with summary/trends/categories/transactions
  # AC #3: Export reflects active granularity selection
  # =====================================================================

  # S-25: CSV export API returns correct Content-Type and filename
  @E-006-S-25 @story-6-5 @FR-DASH-08
  Scenario: CSV export API returns text/csv response with correct filename
    Given the analytics export API route at "app/api/analytics/export/route.ts"
    When I inspect the GET handler for format=csv
    Then it calls getProfitLossAnalytics with the user's ID and granularity
    And it returns a response with Content-Type "text/csv; charset=utf-8"
    And it sets Content-Disposition to attachment with filename matching "flipper-report-YYYY-MM-DD.csv"

  # S-26: CSV export includes all required columns per AC #1
  @E-006-S-26 @story-6-5 @FR-DASH-08
  Scenario: buildCsvContent produces CSV with all required headers and one row per deal
    Given the analytics export library at "src/lib/analytics-export.ts"
    When I inspect the buildCsvContent function
    Then the first row contains headers: "Title,Platform,Category,Status,Purchase Price,Sale Price,Fees,Gross Profit,Net Profit,ROI %,Days Held,Purchase Date,Sale Date"
    And each subsequent row contains one deal with values mapped from ProfitLossItem fields
    And null values are represented as empty fields
    And fields containing commas or double-quotes are properly escaped per RFC 4180

  # S-27: PDF export route returns 400 (PDF is client-side only)
  @E-006-S-27 @story-6-5 @FR-DASH-08
  Scenario: Analytics export API returns 400 for format=pdf since PDF is client-side only
    Given the analytics export API route at "app/api/analytics/export/route.ts"
    When I inspect the GET handler for format=pdf
    Then it returns a 400 response with error "Unsupported format. Use format=csv."

  # S-28: Analytics page has Export CSV and Export PDF buttons
  @E-006-S-28 @story-6-5 @FR-DASH-08
  Scenario: Analytics page renders Export CSV and Export PDF buttons
    Given the analytics page at "app/analytics/page.tsx"
    When I inspect the page header
    Then it renders an "Export CSV" button
    And it renders an "Export PDF" button
    And the Export CSV button triggers a fetch to /api/analytics/export?format=csv
    And the Export PDF button uses dynamic import of analytics-pdf-export to generate the PDF client-side

  # S-29: Export respects active granularity selection per AC #3
  @E-006-S-29 @story-6-5 @FR-DASH-08
  Scenario: CSV export passes active granularity to the export API
    Given the analytics page at "app/analytics/page.tsx"
    When I inspect the handleExportCsv function
    Then the fetch URL includes the current granularity as a query parameter
    And changing granularity to "weekly" causes the export URL to include "granularity=weekly"

  # =====================================================================
  # Story 6.6: Inventory View & Real-Time Updates
  # AC #1: Inventory view shows PURCHASED items with holding cost details
  # AC #2: Aging inventory flagging (30+ days)
  # AC #3: Real-time dashboard updates via SSE
  # AC #4: SSE reconnection with exponential backoff
  # =====================================================================

  # S-30: Inventory view renders PURCHASED items with holding cost fields
  @E-006-S-30 @FR-DASH-09 @story-6-6
  Scenario: Inventory view displays PURCHASED items with purchase price, days held, carrying cost, and market value
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the inventory view rendering
    Then it filters opportunities to those with status "PURCHASED"
    And each inventory card shows the listing title
    And each inventory card shows the purchase price
    And each inventory card shows the days held computed from purchaseDate
    And each inventory card shows the carrying cost computed using calculateCarryingCost
    And each inventory card shows the market value from listing.estimatedValue
    And when no PURCHASED items exist it renders "No inventory yet" empty state text

  # S-31: Aging inventory items are visually flagged at 30+ days held
  @E-006-S-31 @FR-DASH-09 @story-6-6
  Scenario: Items held 30 or more days are flagged as aging inventory with bold red carrying cost
    Given the holding cost utility at "src/lib/holding-cost.ts"
    When I inspect the isAgingInventory function
    Then it returns false for daysHeld of 29
    And it returns true for daysHeld of 30
    And it returns true for daysHeld of 31
    And the opportunities page applies an "Aging Inventory" badge when isAgingInventory returns true
    And the carrying cost is rendered with bold red styling when the item is aging

  # S-32: Dashboard refreshes data automatically when SSE events arrive
  @E-006-S-32 @FR-DASH-10 @story-6-6
  Scenario: Dashboard fetches updated listings when new SSE events are received
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the SSE integration
    Then it imports useSseEvents from "@/hooks/useSseEvents"
    And it subscribes to "listing.found", "opportunity.created", and "opportunity.updated" event types
    And it has a useEffect that calls fetchListings when the most recent event receivedAt timestamp changes
    And it renders a connection status indicator showing "Live" when isConnected is true
    And it renders a "Reconnecting" indicator when isConnected is false

  # S-33: SSE error is shown as dismissible banner; reconnection uses exponential backoff
  @E-006-S-33 @FR-DASH-10 @story-6-6
  Scenario: SSE connection error shows a dismissible warning banner without blocking the UI
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the SSE error handling
    Then it renders a non-blocking amber banner when lastError is not null
    And the banner includes a dismiss button that hides the banner
    And the useSseEvents hook at "src/hooks/useSseEvents.ts" implements exponential backoff reconnection internally
