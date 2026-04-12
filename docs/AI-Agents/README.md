/**
 * @file docs/AI-Agents/README.md
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-12
 * @version 1.0
 * @brief Single source of truth for AI agent design decisions in Flipper.ai.
 *
 * @description
 * Documents every AI system used in the Flipper.ai codebase, including the
 * primary analysis engine, secondary LLM layer, browser automation agent,
 * and the algorithmic scoring engine that operates without any AI calls.
 */

# AI Agent Architecture — Flipper.ai

This document is the single source of truth for AI agent design decisions. All AI-related documentation in the repository (CLAUDE.md, project-context.md, README.md) should reference this file.

---

## 1. Primary AI — Claude (Anthropic SDK)

| Attribute      | Detail |
|----------------|--------|
| **Provider**   | Anthropic |
| **Model**      | Claude (via `@anthropic-ai/sdk`) |
| **Role**       | Primary AI for all user-facing intelligence |
| **Used in**    | Listing analysis, negotiation strategy generation, buyer/seller message generation, resale description generation |
| **Key files**  | `src/lib/llm-analyzer.ts` (orchestration), `src/lib/negotiation-strategy.ts`, `src/lib/message-generator.ts`, `src/lib/description-generator.ts` |

Claude is the backbone of Flipper.ai's intelligence layer. Every AI-generated recommendation, message draft, or pricing insight passes through the Anthropic SDK.

---

## 2. Secondary AI — OpenAI GPT-4o-mini

| Attribute      | Detail |
|----------------|--------|
| **Provider**   | OpenAI |
| **Model**      | GPT-4o-mini (`temperature: 0.3`) |
| **Role**       | LLM analysis with two-layer cache |
| **Used in**    | `llm-analyzer.ts` — listing evaluation and market analysis |
| **Caching**    | L1: in-memory LRU keyed `openai:{listingId}`. L2: database `AiAnalysisCache` model with 24h TTL via `expiresAt`. |
| **Key files**  | `src/lib/llm-analyzer.ts` |

OpenAI is used as a secondary analysis engine. The `quickDiscountCheck()` function skips expensive API calls for items below a 40% algorithmic threshold, keeping costs low.

---

## 3. Browser Automation — Google Gemini via Stagehand

| Attribute      | Detail |
|----------------|--------|
| **Provider**   | Google (Gemini) |
| **Integration**| Stagehand browser automation library |
| **Role**       | Facebook Marketplace scraping only |
| **Used in**    | `src/scrapers/facebook/` — navigating Facebook Marketplace, handling dynamic page content, extracting listings |
| **Key files**  | `src/scrapers/facebook/scraper.ts`, `src/scrapers/facebook/auth.ts` |

Stagehand + Gemini is **not** a general-purpose AI in this project. Its sole purpose is driving Playwright browser sessions for Facebook Marketplace, where traditional scraping fails due to heavy client-side rendering and anti-bot measures.

---

## 4. Algorithmic — Value Estimator (No AI)

| Attribute      | Detail |
|----------------|--------|
| **Role**       | Fast, deterministic scoring engine (0-100) |
| **Used in**    | Initial listing triage before any AI calls |
| **Logic**      | Category multipliers, brand detection (regex), condition analysis, risk keyword penalties |
| **Formula**    | `(profitPotential / askingPrice) * 100 + 50`, clamped 0-100. Default fee rate: 13%. |
| **Threshold**  | Items scoring 70+ become opportunities |
| **Key files**  | `src/lib/value-estimator.ts` |

The value estimator runs on every listing with zero latency and zero cost. It acts as the first filter before invoking any AI model, ensuring only promising items consume API credits.

---

## Architecture Diagram

```
Incoming Listing
       │
       ▼
┌──────────────────────┐
│  Value Estimator     │  ← Algorithmic (no AI, instant)
│  Score 0-100         │
└──────────┬───────────┘
           │
     Score ≥ 40?
      ╱         ╲
    No           Yes
    │             │
  Skip AI         ▼
              ┌──────────────────────┐
              │  OpenAI GPT-4o-mini  │  ← Secondary AI (cached)
              │  Market analysis     │
              └──────────┬───────────┘
                         │
                    Score ≥ 70?
                   ╱         ╲
                 No           Yes
                 │             │
               Pass            ▼
                         ┌──────────────────────┐
                         │  Claude (Anthropic)   │  ← Primary AI
                         │  Negotiation strategy │
                         │  Message generation   │
                         │  Description writing  │
                         └──────────────────────┘
```

---

## 5. Fallback Strategy — Google Gemini

| Attribute      | Detail |
|----------------|--------|
| **Provider**   | Google (Gemini) |
| **Model**      | Gemini 2.0 Flash (via `@google/generative-ai` or Stagehand) |
| **Role**       | Fallback for both primary (Claude) and secondary (OpenAI) AI when API keys are unavailable |
| **Env var**    | `GOOGLE_API_KEY` — already used for Stagehand/Facebook scraping |
| **Status**     | **Planned — not yet implemented in code** |

### Fallback chain (target design)

```
Primary:   ANTHROPIC_API_KEY → Claude (Anthropic SDK)
                ↓ (key missing)
Fallback:  GOOGLE_API_KEY → Gemini 2.0 Flash

Secondary: OPENAI_API_KEY → GPT-4o-mini (OpenAI SDK)
                ↓ (key missing)
Fallback:  GOOGLE_API_KEY → Gemini 2.0 Flash
```

When `ANTHROPIC_API_KEY` (or its `CLAUDE_API_KEY` alias) is not set, the system should fall back to Gemini for listing analysis, negotiation strategy, message generation, and description generation. Similarly, when `OPENAI_API_KEY` is not set, Gemini should handle the LLM analysis layer instead of silently skipping it.

This ensures the platform remains functional with a single Google API key — useful for development, staging, and cost-sensitive deployments where maintaining three separate AI provider accounts is impractical.

### Implementation notes

- `src/lib/claude-analyzer.ts`: Add Gemini client initialization when `getClaudeApiKey()` returns null
- `src/lib/llm-analyzer.ts`: Add Gemini fallback when `OPENAI_API_KEY` is not set (replace the current `console.log` + skip behavior)
- Gemini responses should be normalized to the same response shapes as Claude/OpenAI outputs
- Cache keys should be prefixed by provider (`claude:`, `openai:`, `gemini:`) to avoid cross-provider cache collisions

---

## Decision Log

| Date       | Decision | Rationale |
|------------|----------|-----------|
| 2026-04-12 | Document Claude as primary AI | Claude handles all user-facing intelligence; OpenAI is secondary/cached |
| 2026-04-12 | Clarify Stagehand + Gemini scope | Stagehand is browser automation for Facebook only, not general AI |
| 2026-04-12 | Create this file as single source of truth | Prevent drift between README, CLAUDE.md, and project-context.md |
| 2026-04-12 | Add Gemini as fallback for primary + secondary AI | Ensures platform works with single Google API key; reduces provider lock-in; useful for dev/staging |
