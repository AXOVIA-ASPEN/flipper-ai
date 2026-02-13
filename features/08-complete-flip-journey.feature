Feature: Complete Flip Journey - End-to-End User Flow
  As a flipper
  I want to complete the entire flipping process from search to sale
  So that I can make profit from reselling items

  Background:
    Given I am logged in as a verified user
    And I have set up my preferred search locations
    And I have connected all marketplace accounts

  @critical @e2e
  Scenario: Successful Complete Flip Journey
    # Step 1: Discover Opportunity
    When I navigate to the opportunities page
    And I search for "vintage camera" in "Tampa, FL"
    And I wait for results to load
    Then I should see opportunities from multiple marketplaces
    And each opportunity should display:
      | Field               | Type       |
      | title               | string     |
      | price               | number     |
      | marketplace         | string     |
      | estimated_profit    | number     |
      | profit_margin       | percentage |
      | images              | array      |

    # Step 2: Analyze Opportunity
    When I click on the first profitable opportunity
    Then I should see the opportunity detail page
    And I should see AI analysis results within 5 seconds
    And the analysis should include:
      | Section              | Content                    |
      | Market Value         | Comparable sales data      |
      | Condition Assessment | AI-powered analysis        |
      | Profit Estimate      | Expected profit range      |
      | Risk Score           | High/Medium/Low            |
      | Selling Strategy     | Recommended platforms      |

    # Step 3: Visual Verification
    When I click "View Images"
    Then I should see a gallery of product images
    And I should be able to zoom into images
    And I should see AI-detected condition issues highlighted
    When I take a screenshot as "opportunity-analysis"
    Then the screenshot should match the baseline

    # Step 4: Contact Seller
    When I click "Contact Seller"
    Then I should see the messaging interface
    When I send message "Is this still available? Can you do $X?"
    And I wait for 2 seconds
    Then the message should be marked as sent
    And I should see it in my conversation history

    # Step 5: Negotiate Price
    When seller responds with "Yes, it's available at $Y"
    And I counter with "How about $Z? I can pick up today"
    And seller accepts with "Deal!"
    Then I should see a notification "Seller accepted your offer"
    And the opportunity status should change to "Negotiating → Purchased"

    # Step 6: Mark as Purchased
    When I click "Mark as Purchased"
    And I enter purchase details:
      | Field          | Value     |
      | Purchase Price | 150       |
      | Condition      | Very Good |
      | Pickup Date    | Today     |
    And I click "Confirm Purchase"
    Then I should see success message "Item marked as purchased"
    And the opportunity should move to "My Inventory"

    # Step 7: Create Resale Listing
    When I navigate to "My Inventory"
    And I select the purchased item
    And I click "Create Listing"
    Then I should see the listing creation form
    When I enter listing details:
      | Field       | Value                                    |
      | Title       | Vintage Canon AE-1 Camera - Excellent    |
      | Description | Professionally cleaned and tested        |
      | Price       | 250                                      |
      | Category    | Cameras & Photography                    |
      | Condition   | Used - Very Good                         |
    And I select marketplaces:
      | Marketplace | Selected |
      | eBay        | Yes      |
      | Facebook    | Yes      |
      | Mercari     | Yes      |
    And I click "Generate Listing"
    Then I should see AI-optimized listings for each platform
    And each listing should be tailored to platform best practices

    # Step 8: Visual Verification of Listings
    When I preview the eBay listing
    Then I take a screenshot as "ebay-listing-preview"
    And the screenshot should match the baseline
    When I preview the Facebook listing
    Then I take a screenshot as "facebook-listing-preview"
    And the screenshot should match the baseline

    # Step 9: Publish Listings
    When I click "Publish to All Platforms"
    And I wait for publishing to complete
    Then I should see success messages for each platform:
      | Platform | Status    |
      | eBay     | Published |
      | Facebook | Published |
      | Mercari  | Published |
    And the item status should change to "Listed"

    # Step 10: Track Performance
    When I navigate to the dashboard
    Then I should see the listed item in "Active Listings"
    And I should see real-time metrics:
      | Metric      | Visible |
      | Views       | Yes     |
      | Watchers    | Yes     |
      | Messages    | Yes     |
      | Time Listed | Yes     |

    # Step 11: Receive Offers
    When a buyer sends an offer of "$225"
    Then I should receive a notification
    And I should see the offer in my dashboard
    When I counter with "$240"
    And the buyer accepts
    Then I should see "Sale Pending" status

    # Step 12: Complete Sale
    When I mark the item as sold:
      | Field       | Value   |
      | Sale Price  | 240     |
      | Platform    | eBay    |
      | Buyer       | john123 |
      | Sale Date   | Today   |
    And I click "Confirm Sale"
    Then I should see profit calculation:
      | Metric          | Value |
      | Purchase Price  | $150  |
      | Sale Price      | $240  |
      | Fees            | $24   |
      | Net Profit      | $66   |
      | ROI             | 44%   |
    And the item should move to "Sold Items"
    And my dashboard stats should update:
      | Stat          | Change |
      | Total Profit  | +$66   |
      | Items Sold    | +1     |
      | Success Rate  | Update |

  @edge-case
  Scenario: Handle Seller Not Responding
    Given I have contacted a seller 3 days ago
    And the seller has not responded
    When I view the opportunity
    Then I should see "No Response" warning
    And I should see option to "Move to Archive"
    When I click "Move to Archive"
    Then the opportunity should be archived
    And I should see it in "Archived Opportunities"

  @edge-case
  Scenario: Deal Falls Through After Agreement
    Given I have agreed on a price with seller
    And I marked it as "Purchase Pending"
    When the seller cancels the deal
    And I click "Deal Cancelled"
    Then the opportunity should return to "Available"
    And I should be able to re-negotiate or skip

  @performance
  Scenario: Fast Listing Creation Under 10 Seconds
    Given I have a purchased item in inventory
    When I start creating a listing
    And the AI generates optimized listings
    Then the total time should be under 10 seconds
    And all three marketplace listings should be ready

  @visual-regression
  Scenario: Visual Consistency Across Journey
    Given I complete the full flip journey
    When I take screenshots at each major step
    Then all screenshots should match their baselines
    And there should be no layout shifts or visual bugs

  @accessibility
  Scenario: Journey Accessible via Keyboard Only
    Given I am using keyboard navigation only
    When I complete the entire flip journey using only Tab and Enter
    Then I should be able to complete every step
    And all interactive elements should be reachable
    And focus indicators should be clearly visible

  @mobile
  Scenario: Complete Journey on Mobile Device
    Given I am using a mobile device (375x667)
    When I complete the flip journey on mobile
    Then all features should work correctly
    And the interface should be responsive
    And touch targets should be at least 44x44px
    When I take mobile screenshots
    Then they should match mobile baselines
