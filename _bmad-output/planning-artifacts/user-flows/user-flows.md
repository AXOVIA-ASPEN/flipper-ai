# Flipper AI — User Flow Diagrams

> **Version:** 1.0
> **Date:** March 1, 2026
> **Author:** BMAD UX Designer
> **Status:** Complete
> **Related:** [PRD](../PRD.md) | [UX Design Spec](../ux-design.md) | [Wireframes](../wireframes.md)

---

## Table of Contents

1. [Complete App Journey (Overview)](#1-complete-app-journey)
2. [Registration & Onboarding](#2-registration--onboarding)
3. [Login & Authentication](#3-login--authentication)
4. [Core Flip Journey](#4-core-flip-journey)
5. [Marketplace Scanning](#5-marketplace-scanning)
6. [AI Analysis & Scoring](#6-ai-analysis--scoring)
7. [Kanban Lifecycle Tracking](#7-kanban-lifecycle-tracking)
8. [Seller Communication](#8-seller-communication)
9. [Cross-Platform Resale Listing](#9-cross-platform-resale-listing)
10. [Analytics & Reporting](#10-analytics--reporting)
11. [Settings & Profile](#11-settings--profile)
12. [Subscription & Billing](#12-subscription--billing)

---

## 1. Complete App Journey

The full end-to-end lifecycle from first visit to recorded profit.

```mermaid
flowchart TD
    A([Visit Landing Page]) --> B{Have Account?}
    B -->|No| C[Register]
    B -->|Yes| D[Login]
    C --> E[Onboarding Wizard]
    E --> F[Dashboard]
    D --> F

    F --> G[Configure Search]
    G --> H[Run Marketplace Scan]
    H --> I[Browse Results]
    I --> J[AI Analysis]
    J --> K{Worth Flipping?}

    K -->|No| L[Pass / Archive]
    K -->|Yes| M[Mark as Opportunity]

    M --> N[Contact Seller]
    N --> O[Negotiate]
    O --> P{Deal Accepted?}

    P -->|No| Q[Move to PASSED]
    P -->|Yes| R[Mark PURCHASED]

    R --> S[Create Resale Listing]
    S --> T[Cross-Post to Platforms]
    T --> U[Track on Kanban]
    U --> V{Item Sold?}

    V -->|Not yet| U
    V -->|Yes| W[Mark SOLD]
    W --> X[Record Profit]
    X --> Y[View Analytics]
    Y --> F

    L --> F

    style A fill:#e0e7ff,stroke:#4f46e5
    style F fill:#dbeafe,stroke:#2563eb
    style M fill:#fef3c7,stroke:#d97706
    style R fill:#ede9fe,stroke:#7c3aed
    style W fill:#d1fae5,stroke:#059669
    style X fill:#d1fae5,stroke:#059669
```

---

## 2. Registration & Onboarding

### 2a. Registration Flow

```mermaid
flowchart TD
    A([Landing Page]) --> B[Click 'Get Started' / 'Sign Up']
    B --> C[/Register Page/]

    C --> D{Auth Method?}
    D -->|OAuth| E[Click Google / GitHub]
    D -->|Email| F[Fill Registration Form]

    E --> G[OAuth Provider Screen]
    G --> H{Authorized?}
    H -->|No| C
    H -->|Yes| I[Account Created]

    F --> J[Enter Name]
    J --> K[Enter Email]
    K --> L[Enter Password]
    L --> M{Password Strong?}
    M -->|No| N[Show Strength Feedback]
    N --> L
    M -->|Yes| O[Confirm Password]
    O --> P{Passwords Match?}
    P -->|No| Q[Show Mismatch Error]
    Q --> O
    P -->|Yes| R[Click 'Create Account']

    R --> S{CAPTCHA Required?}
    S -->|Yes| T[Complete CAPTCHA]
    T --> U{Valid?}
    U -->|No| T
    U -->|Yes| V{Server Validation}
    S -->|No| V

    V -->|Email Taken| W[Show Error: Email Exists]
    W --> K
    V -->|Success| I

    I --> X{First Login?}
    X -->|Yes| Y[Redirect to Onboarding]
    X -->|No| Z[Redirect to Dashboard]

    style A fill:#e0e7ff,stroke:#4f46e5
    style I fill:#d1fae5,stroke:#059669
    style W fill:#fee2e2,stroke:#dc2626
```

### 2b. Onboarding Wizard

```mermaid
flowchart TD
    A([Start Onboarding]) --> B[Step 1: Welcome]
    B --> C{Continue?}
    C -->|Skip All| J[Dashboard]
    C -->|Next| D[Step 2: Select Marketplaces]

    D --> E{Next or Skip?}
    E -->|Skip| F
    E -->|Next| F[Step 3: Select Categories]

    F --> G{Next or Skip?}
    G -->|Skip| H
    G -->|Next| H[Step 4: Set Budget Range]

    H --> I{Next or Skip?}
    I -->|Skip| I2
    I -->|Next| I2[Step 5: Set Location + Radius]

    I2 --> I3{Next or Skip?}
    I3 -->|Skip| J
    I3 -->|Next| I4[Step 6: Complete!]
    I4 --> J([Dashboard])

    subgraph wizard ["Wizard Navigation"]
        direction LR
        BACK["Back Button"] -.-> |"Go to previous step"| BACK
        PROGRESS["Progress Bar: Step N of 6"]
    end

    style A fill:#e0e7ff,stroke:#4f46e5
    style J fill:#d1fae5,stroke:#059669
    style I4 fill:#d1fae5,stroke:#059669
```

---

## 3. Login & Authentication

```mermaid
flowchart TD
    A([Login Page]) --> B{Auth Method?}

    B -->|OAuth| C[Click Google / GitHub]
    C --> D[Provider Auth Screen]
    D --> E{Success?}
    E -->|No| F[Show Error]
    F --> A
    E -->|Yes| G[Dashboard]

    B -->|Email| H[Enter Email + Password]
    H --> I{CAPTCHA Shown?}
    I -->|Yes| J[Complete CAPTCHA]
    J --> K[Click 'Sign In']
    I -->|No| K

    K --> L{Credentials Valid?}
    L -->|No| M[Show Error Message]
    M --> N{Too Many Attempts?}
    N -->|Yes| O[Enable CAPTCHA]
    O --> A
    N -->|No| A
    L -->|Yes| G

    B -->|Forgot Password| P[Click 'Forgot Password']
    P --> Q[/Forgot Password Page/]
    Q --> R[Enter Email]
    R --> S[Click 'Send Reset Link']
    S --> T[Check Email]
    T --> U[Click Reset Link]
    U --> V[/Reset Password Page/]
    V --> W[Enter New Password]
    W --> X[Confirm New Password]
    X --> Y{Passwords Valid?}
    Y -->|No| W
    Y -->|Yes| Z[Password Updated]
    Z --> A

    style A fill:#e0e7ff,stroke:#4f46e5
    style G fill:#d1fae5,stroke:#059669
    style Z fill:#d1fae5,stroke:#059669
    style M fill:#fee2e2,stroke:#dc2626
    style F fill:#fee2e2,stroke:#dc2626
```

---

## 4. Core Flip Journey

The primary value loop — the reason the app exists.

```mermaid
flowchart TD
    FIND["FIND: Scan Marketplaces"]
    EVAL["EVALUATE: AI Analysis"]
    BUY["BUY: Contact & Purchase"]
    SELL["SELL: List for Resale"]
    PROFIT["PROFIT: Track & Record"]

    FIND --> EVAL
    EVAL --> BUY
    BUY --> SELL
    SELL --> PROFIT
    PROFIT -.->|"Repeat"| FIND

    subgraph find_detail ["Find Phase"]
        F1[Configure Search] --> F2[Select Platforms]
        F2 --> F3[Set Keywords + Filters]
        F3 --> F4[Run Scan]
        F4 --> F5[Review Results]
    end

    subgraph eval_detail ["Evaluate Phase"]
        E1[View Listing Details] --> E2[AI Value Score 0-100]
        E2 --> E3[Estimated Resale Value]
        E3 --> E4[Risk Assessment]
        E4 --> E5{Score >= 70?}
        E5 -->|Yes| E6[Auto-mark Opportunity]
        E5 -->|No| E7[Skip / Watch]
    end

    subgraph buy_detail ["Buy Phase"]
        B1[AI Drafts Message] --> B2[Review & Edit]
        B2 --> B3[Send to Seller]
        B3 --> B4[Negotiate]
        B4 --> B5[Agree on Price]
        B5 --> B6[Mark Purchased]
    end

    subgraph sell_detail ["Sell Phase"]
        S1[AI Generates Title + Description] --> S2[Set Resale Price]
        S2 --> S3[Select Platforms]
        S3 --> S4[Queue Cross-Posts]
        S4 --> S5[Monitor Listings]
    end

    subgraph profit_detail ["Profit Phase"]
        P1[Sale Confirmed] --> P2[Record Sale Price]
        P2 --> P3[Calculate Profit]
        P3 --> P4[Update Analytics]
    end

    style FIND fill:#dbeafe,stroke:#2563eb
    style EVAL fill:#fef3c7,stroke:#d97706
    style BUY fill:#ede9fe,stroke:#7c3aed
    style SELL fill:#ffedd5,stroke:#ea580c
    style PROFIT fill:#d1fae5,stroke:#059669
```

---

## 5. Marketplace Scanning

```mermaid
flowchart TD
    A([Scraper Page]) --> B{Use Saved Search?}

    B -->|Yes| C[Select from Dropdown]
    C --> D[Form Pre-filled]
    B -->|No| D[Configure Search Form]

    D --> E[Select Platform]
    E --> F[Enter Location]
    F --> G[Select Category]
    G --> H[Enter Keywords]
    H --> I[Set Price Range]
    I --> J{Save This Search?}

    J -->|Yes| K[Open Save Dialog]
    K --> L[Enter Config Name]
    L --> M[Save]
    J -->|No| N[Click 'Start Scraping']
    M --> N

    N --> O{Platform Available?}
    O -->|No: FB disabled| P[Show Platform Unavailable]
    P --> D
    O -->|Yes| Q[Scrape Running...]

    Q --> R{Scrape Result}
    R -->|Success| S[Show Results Preview]
    R -->|Error| T[Show Error Message]
    R -->|Rate Limited| U[Show Rate Limit Warning]

    S --> V[Display First 10 Results]
    V --> W[Each: Image + Title + Price + Link]

    T --> D
    U --> D

    subgraph history ["Job History Panel"]
        H1[Filter by Status]
        H2[Filter by Date]
        H3[View Past Jobs]
        H4[Delete Old Jobs]
    end

    style A fill:#e0e7ff,stroke:#4f46e5
    style S fill:#d1fae5,stroke:#059669
    style T fill:#fee2e2,stroke:#dc2626
    style U fill:#fef3c7,stroke:#d97706
```

---

## 6. AI Analysis & Scoring

```mermaid
flowchart TD
    A([Listing Card]) --> B[View Listing Details]
    B --> C[Trigger AI Analysis]

    C --> D{API Available?}
    D -->|No| E[Show Fallback: Algorithmic Score Only]
    D -->|Yes| F[Send to LLM]

    F --> G[Receive Analysis]
    G --> H[Parse Response]

    H --> I[Value Score: 0-100]
    H --> J[Estimated Resale: $X]
    H --> K[Profit Potential: $Y]
    H --> L[Risk Factors]
    H --> M[Comparable Sales]
    H --> N[Recommendation]

    N --> O{Recommendation?}
    O -->|BUY| P[Green Badge: Strong Buy]
    O -->|WATCH| Q[Yellow Badge: Monitor]
    O -->|PASS| R[Gray Badge: Skip]

    I --> S{Score >= 70?}
    S -->|Yes| T[Auto-create Opportunity]
    S -->|No| U[Available but Not Flagged]

    T --> V[Card Appears on Kanban: IDENTIFIED]

    subgraph scoring ["Scoring Breakdown"]
        SC1["Category Weight (brand recognition)"]
        SC2["Condition Assessment"]
        SC3["Market Demand Signals"]
        SC4["Price vs Market Value Gap"]
        SC5["Platform Fee Deductions"]
        SC6["Shipping Cost Estimate"]
    end

    style A fill:#e0e7ff,stroke:#4f46e5
    style P fill:#d1fae5,stroke:#059669
    style Q fill:#fef3c7,stroke:#d97706
    style R fill:#f3f4f6,stroke:#6b7280
    style V fill:#dbeafe,stroke:#2563eb
```

---

## 7. Kanban Lifecycle Tracking

```mermaid
flowchart LR
    subgraph IDENTIFIED ["IDENTIFIED"]
        direction TB
        I1["New opportunity\nfrom AI analysis"]
        I2["Value score shown"]
        I3["Actions: View, Edit, Delete"]
    end

    subgraph CONTACTED ["CONTACTED"]
        direction TB
        C1["Seller message sent"]
        C2["Waiting for reply"]
        C3["Negotiation active"]
    end

    subgraph PURCHASED ["PURCHASED"]
        direction TB
        P1["Deal accepted"]
        P2["Purchase price recorded"]
        P3["Ready to list"]
    end

    subgraph LISTED ["LISTED"]
        direction TB
        L1["Cross-posted"]
        L2["Resale URL added"]
        L3["Monitoring views"]
    end

    subgraph SOLD ["SOLD"]
        direction TB
        S1["Sale confirmed"]
        S2["Final price recorded"]
        S3["Profit calculated"]
    end

    IDENTIFIED -->|"Drag or\nSend Message"| CONTACTED
    CONTACTED -->|"Drag or\nMark Purchased"| PURCHASED
    PURCHASED -->|"Drag or\nCreate Listing"| LISTED
    LISTED -->|"Drag or\nConfirm Sale"| SOLD

    style IDENTIFIED fill:#dbeafe,stroke:#2563eb
    style CONTACTED fill:#fef3c7,stroke:#d97706
    style PURCHASED fill:#ede9fe,stroke:#7c3aed
    style LISTED fill:#ffedd5,stroke:#ea580c
    style SOLD fill:#d1fae5,stroke:#059669
```

### Status Transition Rules

```mermaid
stateDiagram-v2
    [*] --> IDENTIFIED : AI scores >= 70
    IDENTIFIED --> CONTACTED : Send message to seller
    IDENTIFIED --> PASSED : User decides to skip

    CONTACTED --> PURCHASED : Deal accepted, price recorded
    CONTACTED --> PASSED : Seller unresponsive / bad deal
    CONTACTED --> IDENTIFIED : Reset (undo contact)

    PURCHASED --> LISTED : Resale listing created
    PURCHASED --> PASSED : Return / cancel purchase

    LISTED --> SOLD : Buyer confirms sale
    LISTED --> PURCHASED : Delist / relist

    SOLD --> [*] : Profit recorded

    PASSED --> [*] : Archived
```

---

## 8. Seller Communication

```mermaid
flowchart TD
    A([Opportunity Card]) --> B[Click 'Contact Seller']

    B --> C[AI Generates Draft Message]
    C --> D[/Message Editor/]

    D --> E{User Action}
    E -->|Edit| F[Modify Message Text]
    F --> D
    E -->|Approve| G[Send Message]
    E -->|Regenerate| H[AI Creates New Draft]
    H --> D

    G --> I[Message Sent]
    I --> J[Move Opportunity to CONTACTED]
    J --> K[Wait for Reply]

    K --> L{Reply Received?}
    L -->|Yes| M[Show in Inbox]
    M --> N{Reply Type?}
    N -->|Counter Offer| O[AI Suggests Response]
    O --> D
    N -->|Accepted| P[Mark PURCHASED]
    N -->|Rejected| Q[Mark PASSED or Re-negotiate]
    L -->|Timeout| R[Send Follow-up?]
    R -->|Yes| C
    R -->|No| S[Archive]

    subgraph inbox ["Messages Inbox"]
        direction TB
        IN1["Tab: All / Inbox / Sent"]
        IN2["Search + Sort"]
        IN3["Direction badges"]
        IN4["Status: New / Read / Replied"]
        IN5["Linked to Opportunity"]
    end

    style A fill:#e0e7ff,stroke:#4f46e5
    style I fill:#d1fae5,stroke:#059669
    style P fill:#d1fae5,stroke:#059669
```

---

## 9. Cross-Platform Resale Listing

```mermaid
flowchart TD
    A([Purchased Item]) --> B[Click 'Create Listing']

    B --> C[AI Generates Title]
    C --> D[AI Generates Description]
    D --> E[AI Suggests Price]

    E --> F[/Listing Editor/]
    F --> G[Review Title + Description]
    G --> H[Adjust Price if Needed]
    H --> I[Select Images from Original]
    I --> J[Select Target Platforms]

    J --> K{Platforms Selected}
    K --> L[eBay]
    K --> M[Facebook Marketplace]
    K --> N[OfferUp]
    K --> O[Mercari]

    L & M & N & O --> P[Add to Posting Queue]

    P --> Q[/Posting Queue Page/]
    Q --> R{Post Status}

    R -->|Pending| S[Waiting in Queue]
    R -->|Processing| T[Posting to Platform...]
    R -->|Success| U[Posted! Link Saved]
    R -->|Failed| V[Show Error + Retry Button]

    U --> W[Move Opportunity to LISTED]

    subgraph queue ["Posting Queue"]
        direction TB
        Q1["View all pending posts"]
        Q2["Retry failed posts"]
        Q3["Stats: success/fail counts"]
    end

    style A fill:#ede9fe,stroke:#7c3aed
    style U fill:#d1fae5,stroke:#059669
    style V fill:#fee2e2,stroke:#dc2626
    style W fill:#ffedd5,stroke:#ea580c
```

---

## 10. Analytics & Reporting

```mermaid
flowchart TD
    A([Analytics Page]) --> B[Load P&L Data]

    B --> C{Has Deals?}
    C -->|No| D[Show Empty State]
    D --> E[CTA: Go to Scraper]
    C -->|Yes| F[Render Dashboard]

    F --> G[Summary Cards]
    G --> G1[Total Invested]
    G --> G2[Total Revenue]
    G --> G3[Net Profit]
    G --> G4[ROI %]
    G --> G5[Completed Deals]
    G --> G6[Active Deals]
    G --> G7[Win Rate]
    G --> G8[Avg Days Held]

    F --> H[Trends Section]
    H --> H1{Granularity?}
    H1 -->|Monthly| H2[Monthly Trend Table]
    H1 -->|Weekly| H3[Weekly Trend Table]

    F --> I[Category Breakdown Table]
    I --> I1[Per Category: Items, Invested, Revenue, Profit, ROI]

    F --> J[Best / Worst Deals]
    J --> J1[Best: Highest Profit]
    J --> J2[Worst: Biggest Loss]

    F --> K[All Deals Table]
    K --> K1[Per Deal: Item, Platform, Status, Bought, Sold, Profit, ROI, Days]

    style A fill:#e0e7ff,stroke:#4f46e5
    style F fill:#dbeafe,stroke:#2563eb
    style D fill:#f3f4f6,stroke:#6b7280
    style G3 fill:#d1fae5,stroke:#059669
```

---

## 11. Settings & Profile

```mermaid
flowchart TD
    A([Settings Page]) --> B[Theme Settings Section]
    A --> C[Notification Settings Section]

    B --> D[View Theme Grid]
    D --> E{Select Theme}
    E --> F[Cosmic Purple]
    E --> G[Ocean Blue]
    E --> H[Sunset Warm]
    E --> I[... more themes]
    F & G & H & I --> J[Theme Applied Instantly]
    J --> K[CSS Variables Updated]
    K --> L[Saved to localStorage]

    C --> M[Toggle Settings]
    M --> M1["Email Notifications: ON/OFF"]
    M --> M2["Push Notifications: ON/OFF"]
    M --> M3["Deal Alerts: ON/OFF"]
    M --> M4["Weekly Digest: ON/OFF"]
    M1 & M2 & M3 & M4 --> N[Save Preferences via API]

    subgraph future ["Planned Sections"]
        FUT1["Profile Management"]
        FUT2["API Keys"]
        FUT3["Account Settings"]
        FUT4["Billing"]
    end

    style A fill:#e0e7ff,stroke:#4f46e5
    style J fill:#d1fae5,stroke:#059669
```

---

## 12. Subscription & Billing

```mermaid
flowchart TD
    A([User Action]) --> B{Hits Tier Limit?}

    B -->|No| C[Action Proceeds]
    B -->|Yes| D[Show Upgrade Prompt]

    D --> E{User Decision}
    E -->|Dismiss| F[Action Blocked]
    E -->|Upgrade| G[/Pricing Page/]

    G --> H{Select Plan}
    H -->|Pro $29/mo| I[Stripe Checkout]
    H -->|Business $99/mo| I

    I --> J[Enter Payment Info]
    J --> K{Payment Success?}
    K -->|No| L[Show Error]
    L --> I
    K -->|Yes| M[Subscription Active]

    M --> N[Unlock Features]
    N --> C

    subgraph manage ["Manage Subscription"]
        MG1["View Current Plan"]
        MG2["Stripe Customer Portal"]
        MG3["Update Payment Method"]
        MG4["Cancel Subscription"]
        MG5["View Invoice History"]
    end

    subgraph tiers ["Tier Limits"]
        T1["FREE: 5 scans/day, 1 platform"]
        T2["PRO: Unlimited scans, 5 platforms"]
        T3["BUSINESS: API access, team collab"]
    end

    style C fill:#d1fae5,stroke:#059669
    style F fill:#fee2e2,stroke:#dc2626
    style M fill:#d1fae5,stroke:#059669
    style D fill:#fef3c7,stroke:#d97706
```

---

## Flow-to-Epic Traceability

| Flow | Epic | Stories | Status |
|------|------|---------|--------|
| Registration & Onboarding | Epic 2 | 2-1 through 2-6 | In Progress |
| Login & Authentication | Epic 2 | 2-1, 2-3, 2-4 | In Progress |
| Marketplace Scanning | Epic 3 | 3-1 through 3-9 | Backlog |
| AI Analysis & Scoring | Epic 4 | 4-1 through 4-6 | Backlog |
| Advanced Market Intel | Epic 5 | 5-1 through 5-5 | Backlog |
| Kanban Lifecycle | Epic 6 | 6-1 through 6-6 | Backlog |
| Subscription & Billing | Epic 7 | 7-1 through 7-4 | Backlog |
| Seller Communication | Epic 8 | 8-1 through 8-5 | Backlog |
| Cross-Platform Listing | Epic 9 | 9-1 through 9-4 | Backlog |
| Notifications | Epic 10-11 | 10-1 through 11-3 | Backlog |
| Settings & Profile | Epic 2 | 2-6 | Backlog |

---

*End of user flow diagrams. Render with any Mermaid-compatible markdown viewer (GitHub, VS Code Mermaid extension, Notion, etc.)*
