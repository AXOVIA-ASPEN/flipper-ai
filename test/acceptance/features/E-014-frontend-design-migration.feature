@epic-14
Feature: Frontend Design System Migration
  As a developer
  I want every page to inherit the canonical dark-first design tokens
  So that Flipper.ai presents a single, consistent purple-on-dark aesthetic
    without the legacy light-mode blue tokens cascading into protected routes.

  # =====================================================================
  # Story 14.1: Design Tokens and Base Style Unification
  # AC #1: :root flipped to dark-first palette (AC #6: inline body style removed)
  # AC #7: No visual regression on the canonical exemplar pages
  # AC #9: E2E auth harness reused from Epic 2 (session cookie fixture)
  # =====================================================================

  # S-1: /dashboard body background resolves to the canonical dark token
  @E-014-S-1 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Dashboard body uses the canonical dark background with no inline override
    Given I am logged in
    When I load the "/dashboard" route in the browser
    Then the body computed background color should be "rgb(8, 11, 20)"
    And the body element should not have an inline background style

  # S-2: /dashboard still layers the fixed background mesh beneath content
  @E-014-S-2 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Dashboard keeps the fp-bg-mesh and fp-content stacking order
    Given I am logged in
    When I load the "/dashboard" route in the browser
    Then a fixed-position element with class "fp-bg-mesh" should be present in the DOM
    And an element with class "fp-content" should have position "relative"

  # S-3: /settings inherits the canonical palette — no light-mode bleed-through
  @E-014-S-3 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Settings page inherits the canonical dark palette
    Given I am logged in
    When I load the "/settings" route in the browser
    Then the body computed background color should be "rgb(8, 11, 20)"
    And the body element should not have an inline background style

  # S-4: /dashboard exposes --color-primary as the canonical purple token
  @E-014-S-4 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Dashboard --color-primary resolves to the canonical purple
    Given I am logged in
    When I load the "/dashboard" route in the browser
    Then the CSS custom property "--color-primary" on the root element should equal "#7c3aed"

  # S-5: /posting-queue inherits the canonical palette (second exemplar page)
  @E-014-S-5 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Posting queue page inherits the canonical dark palette
    Given I am logged in
    When I load the "/posting-queue" route in the browser
    Then the body computed background color should be "rgb(8, 11, 20)"
    And the CSS custom property "--color-primary" on the root element should equal "#7c3aed"

  # S-15 (AC #7): /messages inherits the canonical palette (fourth exemplar page)
  @E-014-S-15 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Messages page inherits the canonical dark palette
    Given I am logged in
    When I load the "/messages" route in the browser
    Then the body computed background color should be "rgb(8, 11, 20)"
    And the CSS custom property "--color-primary" on the root element should equal "#7c3aed"

  # S-16 (AC #7 (c)(d)): /dashboard renders both fixed background layers and fp-content stacking
  @E-014-S-16 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Dashboard renders fp-bg-mesh, fp-bg-grid, and fp-content with canonical stacking
    Given I am logged in
    When I load the "/dashboard" route in the browser
    Then a fixed-position element with class "fp-bg-mesh" should be present in the DOM
    And a fixed-position element with class "fp-bg-grid" should be present in the DOM
    And an element with class "fp-content" should have position "relative"
    And an element with class "fp-content" should have z-index "1"

  # S-17 (AC #7 (c)(d)): /settings renders the canonical DOM layering
  @E-014-S-17 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Settings page renders fp-bg-mesh, fp-bg-grid, and fp-content with canonical stacking
    Given I am logged in
    When I load the "/settings" route in the browser
    Then a fixed-position element with class "fp-bg-mesh" should be present in the DOM
    And a fixed-position element with class "fp-bg-grid" should be present in the DOM
    And an element with class "fp-content" should have position "relative"
    And an element with class "fp-content" should have z-index "1"

  # S-18 (AC #7 (c)(d)): /posting-queue renders the canonical DOM layering
  @E-014-S-18 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Posting queue page renders fp-bg-mesh, fp-bg-grid, and fp-content with canonical stacking
    Given I am logged in
    When I load the "/posting-queue" route in the browser
    Then a fixed-position element with class "fp-bg-mesh" should be present in the DOM
    And a fixed-position element with class "fp-bg-grid" should be present in the DOM
    And an element with class "fp-content" should have position "relative"
    And an element with class "fp-content" should have z-index "1"

  # S-19 (AC #7 (c)(d)): /messages renders the canonical DOM layering
  @E-014-S-19 @FR-UI-DESIGN-01 @story-14-1
  Scenario: Messages page renders fp-bg-mesh, fp-bg-grid, and fp-content with canonical stacking
    Given I am logged in
    When I load the "/messages" route in the browser
    Then a fixed-position element with class "fp-bg-mesh" should be present in the DOM
    And a fixed-position element with class "fp-bg-grid" should be present in the DOM
    And an element with class "fp-content" should have position "relative"
    And an element with class "fp-content" should have z-index "1"

  # =====================================================================
  # Story 14.2: Remove Competing Multi-Theme System
  # AC #1: .bg-theme-*, .text-theme-*, .shadow-theme-*, .ring-theme-* CSS removed
  # AC #2: ThemeStyles deleted and unmounted from layout
  # AC #3: ThemeContext deleted and provider unwrapped from layout
  # AC #4: theme-config deleted
  # AC #5: ThemeSettings deleted and removed from settings page
  # AC #6: All quality gates pass — UI regression checks for affected pages
  # AC #7: Zero theme-class usage across app/ and src/
  # =====================================================================

  # S-6 (AC #1): All legacy theme CSS class selectors removed from globals.css
  @E-014-S-6 @FR-UI-DESIGN-03 @story-14-2
  Scenario: All .bg-theme-*, .text-theme-*, .shadow-theme-*, .ring-theme-* CSS classes are removed from app/globals.css
    Given the project is at the current commit
    When a pattern search for theme CSS selectors runs against "app/globals.css"
    Then zero theme-pattern matches are found

  # S-7 (AC #2): ThemeStyles component and layout mount deleted
  @E-014-S-7 @FR-UI-DESIGN-03 @story-14-2
  Scenario: ThemeStyles component and its layout mount are deleted
    Given the project is at the current commit
    Then the source file "src/components/ThemeStyles.tsx" does not exist
    And "app/layout.tsx" does not contain the string "ThemeStyles"

  # S-8 (AC #3): ThemeContext and provider deleted
  @E-014-S-8 @FR-UI-DESIGN-03 @story-14-2
  Scenario: ThemeContext module and its provider mount are deleted
    Given the project is at the current commit
    Then the source file "src/contexts/ThemeContext.tsx" does not exist
    And "app/layout.tsx" does not contain the string "ThemeProvider"

  # S-9 (AC #4): theme-config deleted
  @E-014-S-9 @FR-UI-DESIGN-03 @story-14-2
  Scenario: theme-config module is deleted and has zero import sites
    Given the project is at the current commit
    Then the source file "src/lib/theme-config.ts" does not exist
    And no file in "app" or "src" imports from "@/lib/theme-config"

  # S-10 (AC #5): ThemeSettings component and settings-page mount deleted
  @E-014-S-10 @FR-UI-DESIGN-03 @story-14-2
  Scenario: ThemeSettings component and its Settings-page mount are removed
    Given the project is at the current commit
    Then the source file "src/components/ThemeSettings.tsx" does not exist
    And "app/settings/page.tsx" does not contain the string "ThemeSettings"

  # S-11 (AC #7): Zero theme-class usage across app/ and src/
  @E-014-S-11 @FR-UI-DESIGN-03 @story-14-2
  Scenario: Zero theme-class usage remains across app/ and src/
    Given the project is at the current commit
    When a theme-class pattern search runs across "app" and "src" directories
    Then zero theme-pattern matches are found

  # S-12 (AC #6 — Playwright E2E): Settings page renders after ThemeSettings removed
  @E-014-S-12 @FR-UI-DESIGN-03 @story-14-2
  Scenario: Settings page renders without console errors after ThemeSettings removal
    Given I am logged in
    When I navigate to "/settings" and monitor for console errors
    Then the page renders without uncaught console errors
    And no element with a data-testid starting with "theme-option-" is present in the DOM

  # S-13 (AC #6 — Playwright E2E): Login page renders without theme-class fallbacks
  @E-014-S-13 @FR-UI-DESIGN-03 @story-14-2
  Scenario: Login page renders without legacy theme classes after cleanup
    When I navigate to "/login" and monitor for console errors
    Then the page renders without uncaught console errors
    And no element has a class matching the legacy theme-class patterns

  # S-14 (AC #6 — Playwright E2E): Opportunities page renders after orb divs removed
  @E-014-S-14 @FR-UI-DESIGN-03 @story-14-2
  Scenario: Opportunities page renders after theme orb divs removed
    Given I am logged in
    When I navigate to "/opportunities" and monitor for console errors
    Then the page renders without uncaught console errors
    And no element has a class matching the legacy theme-class patterns

  # =====================================================================
  # Story 14.3: Shared UI State Components
  # AC #1: src/components/ui/ directory with four components + barrel
  # AC #2: LoadingSkeleton renders .fp-glass + .fp-shimmer children
  # AC #3: ErrorBanner uses .fp-alert-danger + retry
  # AC #4: EmptyState renders centred .fp-glass card
  # AC #5: ScoreRing SVG reflects score-based colour
  # AC #6: Five pages consume shared components (no inline loading blocks)
  # AC #7: Unit tests pass; coverage thresholds met
  # AC #8: All quality gates pass
  # =====================================================================

  # S-A / S-20 (AC #1): Shared UI state components exist with canonical file headers
  @E-014-S-20 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Shared UI state components exist with canonical file headers
    Given the project is at the current commit
    Then the source file "src/components/ui/LoadingSkeleton.tsx" exists with canonical header tokens
    And the source file "src/components/ui/ErrorBanner.tsx" exists with canonical header tokens
    And the source file "src/components/ui/EmptyState.tsx" exists with canonical header tokens
    And the source file "src/components/ui/ScoreRing.tsx" exists with canonical header tokens
    And the source file "src/components/ui/index.ts" exists

  # S-B / S-21 (AC #2): Dashboard renders shared loading skeleton while listings load
  @E-014-S-21 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Dashboard renders shared loading skeleton while listings load
    Given I am logged in
    And the "/api/listings" route is intercepted to delay response
    When I load the "/dashboard" route in the browser
    Then an element matching "[data-testid='loading-skeleton']" is visible
    And the loading skeleton has role "status" with aria-busy "true"
    And the loading skeleton contains at least one ".fp-shimmer" child

  # S-C / S-22 (AC #3): Posting-queue renders shared error banner on fetch failure
  @E-014-S-22 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Posting-queue renders shared error banner on fetch failure
    Given I am logged in
    And the "/api/posting-queue/items" route returns status 500
    When I load the "/posting-queue" route in the browser
    Then an element with class "fp-alert-danger" and role "alert" is visible
    And a retry button with class "fp-btn-ghost" is visible

  # S-D / S-23 (AC #4): Posting-queue renders shared empty state when queue is empty
  @E-014-S-23 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Posting-queue renders shared empty state when queue is empty
    Given I am logged in
    And the "/api/posting-queue/items" route returns an empty queue
    When I load the "/posting-queue" route in the browser
    Then an element matching "[data-testid='empty-state']" with class "fp-glass" is visible
    And the empty state contains the heading "No cross-posts yet"
    And the empty state contains a link or button matching "Browse opportunities"

  # S-E / S-24 (AC #5): scoreColor boundary matrix via service-level test
  @E-014-S-24 @FR-UI-DESIGN-06 @story-14-3
  Scenario Outline: scoreColor returns the correct tier colour for boundary values
    Given the scoreColor function is imported from "src/components/ui/ScoreRing"
    When scoreColor is called with score <score>
    Then the returned colour should be "<colour>"

    Examples:
      | score | colour  |
      | 0     | #f87171 |
      | 59    | #f87171 |
      | 60    | #fbbf24 |
      | 79    | #fbbf24 |
      | 80    | #34d399 |
      | 100   | #34d399 |

  # S-F / S-25 (AC #6): Listings detail page uses shared error banner when listing not found
  @E-014-S-25 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Listings detail page uses shared error banner when listing is not found
    Given I am logged in
    When I load the "/listings/nonexistent-id-abc123" route in the browser
    Then an element with class "fp-alert-danger" is visible on the page
    And a retry button with class "fp-btn-ghost" is visible
    And no element with class "text-gray-600" is present on the page

  # S-G / S-26 (AC #6): Messages page uses shared empty state when thread list is empty
  @E-014-S-26 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Messages page uses shared empty state when thread list is empty
    Given I am logged in
    And the "/api/messages/threads" route returns an empty thread list
    When I load the "/messages" route in the browser
    Then an element matching "[data-testid='empty-state']" with class "fp-glass" is visible
    And the empty state contains the text "No messages yet"
    And the empty state contains a link to "/opportunities" labelled "Browse Opportunities"

  # S-H / S-27 (AC #6): Inline min-h-screen loading blocks are removed from target pages
  @E-014-S-27 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Inline min-h-screen loading blocks are removed from the five target pages
    Given the project is at the current commit
    When a grep for inline loading block patterns runs across the five target pages
    Then zero inline loading blocks are found

  # S-28 (AC #5 + Task 5a.4): Opportunities page renders ScoreRing with correct colour for score ≥ 80
  @E-014-S-28 @FR-UI-DESIGN-06 @story-14-3
  Scenario: Opportunities page renders ScoreRing with green stroke for a score of 82
    Given I am logged in
    And the "/api/opportunities" route returns one opportunity with valueScore 82
    When I load the "/opportunities" route in the browser
    Then an element matching "[data-testid='score-ring']" is visible
    And the ScoreRing foreground circle has stroke colour "#34d399"

  # =====================================================================
  # Story 14.6: PriceCalculator Canonical Reference Implementation
  # Reserves @E-014-S-29..@E-014-S-36 — appended 2026-04-17
  # FR-UI-DESIGN-02 (canonical fp-* utilities) + -04 (green for profit)
  # + -07 (accessibility: ARIA, focus, touch target)
  # =====================================================================

  # S-29: PriceCalculator source uses fp-glass on its root surface
  @E-014-S-29 @FR-UI-DESIGN-02 @story-14-6
  Scenario: PriceCalculator root container uses canonical fp-glass surface
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the source should contain the pattern "fp-glass p-6 rounded-lg"

  # S-30: Zero raw Tailwind palette classes remain (primary regression guard)
  @E-014-S-30 @FR-UI-DESIGN-02 @story-14-6
  Scenario: PriceCalculator source has zero raw Tailwind palette classes
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the raw Tailwind palette class count should equal 0

  # S-31: All numeric inputs use canonical .fp-input
  @E-014-S-31 @FR-UI-DESIGN-02 @story-14-6
  Scenario: PriceCalculator numeric inputs use canonical fp-input class
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the source should contain the pattern "fp-input w-28 text-right"
    And the source should contain the pattern "fp-input w-20 text-right"
    And the source should contain the pattern "fp-input w-24 text-right"

  # S-32: All action buttons use canonical .fp-btn-* variants
  @E-014-S-32 @FR-UI-DESIGN-02 @story-14-6
  Scenario: PriceCalculator action buttons use canonical fp-btn-* variants
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the source should contain the pattern "fp-btn-primary text-xs px-3 py-1.5"
    And the source should contain the pattern "fp-btn-ghost text-xs px-3 py-1.5"

  # S-33: All alert banners use canonical .fp-alert-* variants with preserved padding
  @E-014-S-33 @FR-UI-DESIGN-02 @story-14-6
  Scenario: PriceCalculator alert banners use canonical fp-alert-* variants
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the source should contain the pattern "fp-alert-warn px-4 py-3"
    And the source should contain the pattern "fp-alert-danger px-4 py-3"

  # S-34: Range slider drops accent-purple class and uses canonical inline accentColor
  @E-014-S-34 @FR-UI-DESIGN-07 @story-14-6
  Scenario: Range slider uses canonical accent-color without palette class
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the source should contain the pattern "accentColor: '#7c3aed'"
    And the source should not contain the pattern "accent-purple-"

  # S-35: Full listing detail page renders the rebuilt calculator as a canonical glass surface (AC #15)
  @E-014-S-35 @FR-UI-DESIGN-02 @FR-UI-DESIGN-07 @story-14-6
  Scenario: Listing detail page renders PriceCalculator on a canonical glass surface
    Given I am logged in
    And the "/api/listings/mock-listing-14-6" route returns a mocked listing with optimal pricing
    When I load the "/listings/mock-listing-14-6" route in the browser
    Then an element matching "[data-testid='price-calculator']" with class "fp-glass" is visible
    And the element "[data-testid='price-calculator-hero']" has aria-live "polite"
    And the slider "#price-calc-margin-slider" has aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext populated

  # S-36: Best-platform badge uses canonical .fp-badge .fp-badge-purple
  @E-014-S-36 @FR-UI-DESIGN-02 @story-14-6
  Scenario: PriceCalculator best-platform badge uses canonical fp-badge-purple
    Given the source file "src/components/PriceCalculator.tsx" exists
    When I read the source of "src/components/PriceCalculator.tsx"
    Then the source should contain the pattern "fp-badge fp-badge-purple"

  # =====================================================================
  # Story 14.4 reserves @E-014-S-37..@E-014-S-50 — appended 2026-04-17
  # Story 14.4: Landing Page and Auth Pages Rebuild
  # AC #1: No page-level background override, no animated orbs on landing
  # AC #2: Feature icons monochrome purple in .fp-glass-sm circles
  # AC #3: Landing hero uses canonical purple gradient + canonical CTAs
  # AC #4: Pricing tier Pro uses .fp-hot-card cycling border
  # AC #5: Auth pages are centered .fp-glass cards over root grid
  # AC #6: Auth form fields, buttons, alerts are canonical fp-* classes
  # AC #7: Zero banned non-purple palette matches on rebuilt pages
  # AC #8: Zero Story-14.2 interim placeholders and theme class remnants
  # AC #9: Navigation between landing and auth pages works end-to-end
  # AC #10: Accessibility not regressed (axe-core, aria-labels)
  # =====================================================================

  # S-37 (AC #1): Landing page source has no page-level bg override or orbs
  @E-014-S-37 @FR-UI-DESIGN-02 @FR-UI-DESIGN-05 @story-14-4
  Scenario: Landing page source has no bg-gradient-to-br wrapper and no animate-blob elements
    Given the project is at the current commit
    Then "app/page.tsx" does not contain the string "bg-gradient-to-br from-slate"
    And "app/page.tsx" does not contain the string "animate-blob"
    And "app/page.tsx" does not contain the string "bg-purple-500 rounded-full mix-blend-multiply"
    And "app/page.tsx" does not contain the string "bg-pink-500 rounded-full mix-blend-multiply"

  # S-38 (AC #2): Feature icons are monochrome purple in fp-glass-sm circles
  @E-014-S-38 @FR-UI-DESIGN-02 @story-14-4
  Scenario: Landing page feature icons use fp-glass-sm circles with monochrome purple color
    Given the project is at the current commit
    And "app/page.tsx" contains the string "fp-glass-sm"
    And "app/page.tsx" contains the string "color: '#8b5cf6'"
    And "app/page.tsx" does not contain the string "from-purple-500 to-pink-500"
    Then "app/page.tsx" does not contain the string "from-blue-500 to-cyan-500"
    And "app/page.tsx" does not contain the string "from-orange-500 to-red-500"
    And "app/page.tsx" does not contain the string "from-green-500 to-emerald-500"

  # S-39 (AC #3): Landing hero canonical purple headline and fp-btn-hot CTAs
  @E-014-S-39 @FR-UI-DESIGN-02 @story-14-4
  Scenario: Landing hero uses fp-grad-purple and fp-btn-hot with no pink gradient CTAs
    Given the project is at the current commit
    Then "app/page.tsx" contains the string "fp-grad-purple"
    And "app/page.tsx" contains the string "fp-btn-hot"
    And "app/page.tsx" does not contain the string "from-purple-500 to-pink-500"
    And "app/page.tsx" does not contain the string "to-pink-500"

  # S-40 (AC #4): Pro pricing tier uses fp-hot-card cycling border
  @E-014-S-40 @FR-UI-DESIGN-02 @story-14-4
  Scenario: Pro pricing tier uses fp-hot-card and fp-badge-purple with no pink gradient
    Given the project is at the current commit
    Then "app/page.tsx" contains the string "fp-hot-card"
    And "app/page.tsx" contains the string "fp-badge-purple"
    And "app/page.tsx" does not contain the string "from-purple-500/20 to-pink-500/20"
    And "app/page.tsx" does not contain the string "border-purple-500 scale-105"

  # S-41 (AC #5): Each auth page is a centered fp-glass card without orbs
  @E-014-S-41 @FR-UI-DESIGN-02 @FR-UI-DESIGN-05 @story-14-4
  Scenario Outline: Auth page <page> renders as a fp-glass card without animate-blob orbs
    When I load "<page>" in the browser without authentication
    Then no DOM element has the class "animate-blob"
    And at least one DOM element has the class "fp-glass"

    Examples:
      | page                              |
      | /login                            |
      | /register                         |
      | /forgot-password                  |
      | /reset-password?token=e2e-test-token |

  # S-42 (AC #6): Auth form inputs and primary buttons use canonical fp-* classes
  @E-014-S-42 @FR-UI-DESIGN-02 @story-14-4
  Scenario Outline: Auth page <page> form uses fp-input and fp-btn-primary
    Given the project is at the current commit
    Then "<file>" contains the string "fp-input"
    And "<file>" contains the string "fp-btn-primary"

    Examples:
      | page             | file                                  |
      | /login           | app/(auth)/login/page.tsx             |
      | /register        | app/(auth)/register/page.tsx          |
      | /forgot-password | app/(auth)/forgot-password/page.tsx   |
      | /reset-password  | app/(auth)/reset-password/page.tsx    |

  # S-43 (AC #6): Auth error banners use fp-alert-danger with role=alert
  @E-014-S-43 @FR-UI-DESIGN-02 @story-14-4
  Scenario: Login page error banner uses fp-alert-danger with role alert
    Given the project is at the current commit
    Then "app/(auth)/login/page.tsx" contains the string "fp-alert-danger"
    And "app/(auth)/login/page.tsx" contains the string "role=\"alert\""
    And "app/(auth)/forgot-password/page.tsx" contains the string "fp-alert-danger"
    And "app/(auth)/register/page.tsx" contains the string "fp-alert-danger"
    And "app/(auth)/reset-password/page.tsx" contains the string "fp-alert-danger"

  # S-44 (AC #7): Zero banned non-purple palette matches across rebuilt pages
  @E-014-S-44 @FR-UI-DESIGN-02 @FR-UI-DESIGN-04 @story-14-4
  Scenario: Zero banned palette class matches across all five rebuilt pages
    Given the project is at the current commit
    When I count banned palette matches across the five rebuilt landing and auth pages
    Then the count of banned palette matches is zero

  # S-45 (AC #8): Zero Story-14.2 interim placeholder markers remain
  @E-014-S-45 @FR-UI-DESIGN-02 @FR-UI-DESIGN-03 @story-14-4
  Scenario: No FLIPPER-14-2 interim markers remain on rebuilt pages
    Given the project is at the current commit
    When I count FLIPPER-14-2 occurrences across the five rebuilt landing and auth pages
    Then the count of FLIPPER-14-2 occurrences is zero

  # S-46 (AC #8): Zero legacy theme class references on rebuilt pages
  @E-014-S-46 @FR-UI-DESIGN-03 @story-14-4
  Scenario: No legacy bg-theme- text-theme- shadow-theme- or var(--theme-) references remain
    Given the project is at the current commit
    When I count legacy theme class references across the five rebuilt landing and auth pages
    Then the count of legacy theme class references is zero

  # S-47 (AC #9): Clicking Get Started Free from landing navigates to /register with fp-glass card
  @E-014-S-47 @FR-UI-DESIGN-02 @FR-UI-DESIGN-05 @story-14-4
  Scenario: Landing page Get Started Free navigates to register with canonical fp-glass card
    When I load "/" in the browser without authentication
    And I click the first button with text "Get Started Free"
    Then the current page URL contains "/register"
    And at least one DOM element has the class "fp-glass"

  # S-48 (AC #9): Forgot-password page loads with canonical fp-glass card
  @E-014-S-48 @FR-UI-DESIGN-02 @story-14-4
  Scenario: Forgot-password page renders with canonical fp-glass card and fp-input field
    When I load "/forgot-password" in the browser without authentication
    Then at least one DOM element has the class "fp-glass"
    And at least one input element has the class "fp-input"
    And no DOM element has the class "animate-blob"

  # S-49 (AC #10): Axe-core smoke passes with zero critical or serious violations
  @E-014-S-49 @FR-UI-DESIGN-02 @FR-UI-DESIGN-07 @story-14-4
  Scenario Outline: Page <page> passes axe-core with zero critical and serious violations
    When I load "<page>" in the browser without authentication
    Then the page passes axe-core with zero critical and serious violations

    Examples:
      | page                              |
      | /                                 |
      | /login                            |
      | /register                         |
      | /forgot-password                  |
      | /reset-password?token=e2e-test-token |

  # S-50 (AC #10): Password eye-toggle has accessible aria-label
  @E-014-S-50 @FR-UI-DESIGN-07 @story-14-4
  Scenario: Login page password eye-toggle button has an accessible aria-label
    When I load "/login" in the browser without authentication
    Then the password eye-toggle button has an aria-label of "Show password" or "Hide password"

  # =====================================================================
  # Story 14.5: Onboarding Wizard Dark Migration
  # AC #1–#7 — Rebuild /onboarding to canonical .fp-* dark glassmorphism.
  # Scenario-number reservation: @E-014-S-51..@E-014-S-57 (appended 2026-04-17)
  # Original story allocation (S-29..S-35) was superseded by Stories 14.6 and
  # 14.4 before Story 14.5 reached dev — continuing the sequential tag numbering.
  # =====================================================================

  # S-51 (AC #1): WizardLayout card uses fp-glass and no light-mode background
  @E-014-S-51 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Onboarding wizard card uses fp-glass and no light-mode gradient
    Given I am logged in
    When I load the "/onboarding" route in the browser
    Then the onboarding page wrapper has no class containing "bg-gradient" or "bg-blue" or "bg-white" or "bg-indigo"
    And at least one DOM element has the class "fp-glass"

  # S-52 (AC #1): Progress bar uses fp-prog-track and fp-prog-fill with purple gradient
  @E-014-S-52 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Onboarding progress bar uses fp-prog-track and fp-prog-fill with purple gradient
    Given I am logged in
    When I load the "/onboarding" route in the browser
    Then the onboarding progress bar container has the class "fp-prog-track"
    And the onboarding progress fill element has the class "fp-prog-fill"
    And the onboarding progress fill computed background includes "rgb(124, 58, 237)"

  # S-53 (AC #1): Navigation buttons use fp-btn-primary and fp-btn-ghost
  @E-014-S-53 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Onboarding Continue and Back buttons use canonical .fp-btn-* classes
    Given I am logged in
    When I load the "/onboarding" route in the browser
    Then the onboarding Continue button has the class "fp-btn-primary"
    When I click the onboarding Continue button to advance to step 2
    Then the onboarding Back button has the class "fp-btn-ghost"

  # S-54 (AC #2, AC #4): Marketplace selection cards use fp-glass-sm with purple accent and no blue or green
  @E-014-S-54 @FR-UI-DESIGN-02 @FR-UI-DESIGN-04 @story-14-5
  Scenario: Marketplace selection card renders with fp-glass-sm and purple accent when selected
    Given I am logged in
    When I load the "/onboarding" route in the browser
    And I click the onboarding Continue button to advance to step 2
    And I select the onboarding marketplace option "eBay"
    Then the selected marketplace card has a computed border color containing "109, 40, 217"
    And the selected marketplace card has a computed background color containing "109, 40, 217"
    And no onboarding marketplace card has a class containing "blue" or "green"

  # S-55 (AC #3): ZIP input uses fp-input class with purple focus ring
  @E-014-S-55 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Onboarding ZIP input uses fp-input class and focuses with a purple ring
    Given I am logged in
    When I load the "/onboarding" route in the browser
    And I click the onboarding Continue button to advance to step 2
    And I select the onboarding marketplace option "eBay"
    And I click the onboarding Continue button to advance to step 3
    And I click the onboarding Continue button to advance to step 4
    And I click the onboarding Continue button to advance to step 5
    Then the onboarding ZIP input has the class "fp-input"
    When I focus the onboarding ZIP input
    Then the onboarding ZIP input has a computed border color containing "109, 40, 217"

  # S-56 (AC #5): Zero palette matches across src/components/Onboarding and app/onboarding
  @E-014-S-56 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Onboarding folder has zero banned Tailwind palette matches
    When I count banned palette matches across the onboarding folder files
    Then the count of onboarding palette matches is zero

  # S-57 (AC #1, AC #6): Full 6-step onboarding wizard completes with canonical design throughout
  @E-014-S-57 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Full 6-step onboarding wizard renders canonically and lands on dashboard
    Given I am logged in
    When I load the "/onboarding" route in the browser
    And I click the onboarding Continue button to advance to step 2
    And I select the onboarding marketplace option "eBay"
    And I click the onboarding Continue button to advance to step 3
    And I click the onboarding Continue button to advance to step 4
    And I click the onboarding Continue button to advance to step 5
    And I click the onboarding Continue button to advance to step 6
    Then the onboarding "Go to Dashboard" button has the class "fp-btn-primary"
    And every captured onboarding step had a wrapper without the class "bg-gradient-to-br"
