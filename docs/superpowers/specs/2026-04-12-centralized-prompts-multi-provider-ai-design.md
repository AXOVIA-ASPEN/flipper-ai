# Centralized Prompts + Multi-Provider AI

> **Date:** 2026-04-12
> **Status:** Approved
> **Branch:** django-main

## Problem

Flipper.ai has 12 AI prompts scattered across 10 files in `src/lib/`. Each file independently creates its own OpenAI or Anthropic client, hardcodes prompt text inline, and requires `OPENAI_API_KEY` (paid) to function. There is no way to:

1. Iterate on prompts without touching business logic
2. Use free AI providers (Gemini, Groq) instead of paid ones
3. Swap providers per task based on cost/speed tradeoffs
4. Gracefully degrade when a provider's API key is missing

## Solution

A new `src/lib/ai/` module with two layers:

1. **Prompts layer** — all prompt text in domain-organized files, exported as typed config objects
2. **Provider layer** — adapter pattern over Gemini, Groq, OpenAI, and Anthropic with per-task routing and automatic fallback

## Architecture

```
src/lib/ai/
├── index.ts                     # Public API: completeAI(taskName, context)
├── providers/
│   ├── types.ts                 # AIProvider interface, AIMessage, AIResponse, ModelConfig
│   ├── index.ts                 # getProvider(name) factory + fallback logic
│   ├── gemini.ts                # Google Gemini adapter (@google/generative-ai)
│   ├── groq.ts                  # Groq adapter (openai SDK, different baseURL)
│   ├── openai.ts                # OpenAI adapter (existing openai SDK)
│   └── anthropic.ts             # Anthropic Claude adapter (existing @anthropic-ai/sdk)
├── prompts/
│   ├── types.ts                 # PromptConfig, PromptContext types
│   ├── index.ts                 # Prompt registry (name → config lookup)
│   ├── flip-analysis.ts         # flipAnalysis, quickDiscountCheck, claudeAnalysis
│   ├── negotiation.ts           # negotiationStrategy, counterOfferAnalysis
│   ├── messaging.ts             # purchaseMessage
│   ├── listing.ts               # listingTitle, listingDescription, apiDescription
│   └── identification.ts        # productIdentification, logisticsClassification, itemCompleteness
```

## Provider Interface

```ts
interface AIProvider {
  name: string;
  isAvailable(): boolean;               // checks if API key is configured
  complete(
    messages: AIMessage[],
    config: ModelConfig
  ): Promise<AIResponse>;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat?: 'json' | 'text';
}

interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: { promptTokens: number; completionTokens: number };
}
```

## Provider Adapters

### Gemini (`@google/generative-ai`)

- **Env:** `GOOGLE_API_KEY`
- **Default model:** `gemini-2.0-flash`
- **Free tier:** 15 RPM, 1M tokens/day
- Maps `system` role to Gemini's `systemInstruction` field
- JSON mode via `responseMimeType: 'application/json'`

### Groq (OpenAI-compatible)

- **Env:** `GROQ_API_KEY`
- **Default model:** `llama-3.3-70b-versatile`
- **Free tier:** 30 RPM, 14,400 requests/day
- Uses `openai` SDK with `baseURL: 'https://api.groq.com/openai/v1'`
- JSON mode via `response_format: { type: 'json_object' }`

### OpenAI (existing)

- **Env:** `OPENAI_API_KEY`
- **Default model:** `gpt-4o-mini`
- **Tier:** Paid only
- Already installed, direct usage of `openai` SDK

### Anthropic (existing)

- **Env:** `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`
- **Default model:** `claude-sonnet-4-5-20250929` (or `CLAUDE_MODEL` env)
- **Tier:** Paid only
- Already installed, direct usage of `@anthropic-ai/sdk`
- Maps `system` message to Anthropic's top-level `system` parameter

## Prompt Config Structure

Each prompt is a typed config object:

```ts
interface PromptConfig {
  name: string;                          // unique identifier
  description: string;                   // human-readable purpose
  provider: ProviderName;                // preferred provider
  fallbacks: ProviderName[];             // ordered fallback list
  model: string;                         // default model for preferred provider
  temperature: number;
  maxTokens: number;
  responseFormat: 'json' | 'text';
  systemPrompt: string;                  // system message text
  buildUserPrompt: (context: any) => string;  // context → user message
}
```

## Per-Task Provider Routing

| Prompt Name | Preferred | Fallbacks | Rationale |
|---|---|---|---|
| `flip-analysis` | gemini | groq, openai | Deep analysis, free tier sufficient |
| `quick-discount-check` | gemini | groq, openai | Fast screening |
| `claude-analysis` | anthropic | gemini, openai | Best reasoning, premium |
| `negotiation-strategy` | gemini | groq, openai | Structured output |
| `counter-offer-analysis` | groq | gemini, openai | Low latency for real-time |
| `purchase-message` | groq | gemini, openai | Low latency for conversation |
| `listing-title` | gemini | groq, openai | Creative + structured |
| `listing-description` | gemini | groq, openai | Longer generation |
| `api-description` | gemini | groq, openai | Same as listing-description |
| `product-identification` | gemini | groq, openai | Classification task |
| `logistics-classification` | gemini | groq, openai | Classification task |
| `item-completeness` | openai | gemini | Vision required (gpt-4o) |

## Public API

```ts
// Simple usage — prompt name + context
const result = await completeAI('flip-analysis', {
  listing: { title, askingPrice, condition },
  marketData: { medianSoldPrice, recentSalesCount }
});

// Result shape
{
  content: '{"sellabilityScore": 82, ...}',  // raw AI response
  model: 'gemini-2.0-flash',
  provider: 'gemini',
  usage: { promptTokens: 450, completionTokens: 200 }
}
```

## Fallback Behavior

`completeAI` follows this sequence:

1. Look up prompt config by name
2. Try preferred provider — if `isAvailable()` returns true, call `complete()`
3. If preferred unavailable (no API key) or throws a rate-limit error → try fallbacks in order
4. If all providers unavailable → throw `AIProviderUnavailableError`
5. Consumer modules catch this and fall back to algorithmic-only behavior (existing pattern)

## Migration Plan

The 10 existing consumer files keep their public function signatures. Internally they change from:

```ts
// Before
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a resale expert...' },
    { role: 'user', content: `Analyze: ${listing.title}...` }
  ]
});
```

To:

```ts
// After
import { completeAI } from '@/lib/ai';
const response = await completeAI('flip-analysis', { listing, marketData });
```

### Files to Migrate

| File | Prompts Extracted | Changes |
|---|---|---|
| `src/lib/llm-analyzer.ts` | `flip-analysis`, `quick-discount-check` | Remove OpenAI import, use `completeAI` |
| `src/lib/claude-analyzer.ts` | `claude-analysis` | Remove Anthropic import, use `completeAI` |
| `src/lib/negotiation-strategy.ts` | `negotiation-strategy`, `counter-offer-analysis` | Remove OpenAI import, use `completeAI` |
| `src/lib/message-generator.ts` | `purchase-message` | Remove OpenAI import, use `completeAI` |
| `src/lib/title-generator.ts` | `listing-title` | Remove OpenAI import, use `completeAI` |
| `src/lib/description-generator.ts` | `listing-description` | Remove OpenAI import, use `completeAI` |
| `src/lib/llm-identifier.ts` | `product-identification` | Remove OpenAI import, use `completeAI` |
| `src/lib/logistics-classifier.ts` | `logistics-classification` | Remove OpenAI import, use `completeAI` |
| `src/lib/item-completeness-analyzer.ts` | `item-completeness` | Remove OpenAI import, use `completeAI` |
| `app/api/listings/[id]/description/route.ts` | `api-description` | Remove OpenAI import, use `completeAI` |

### Zero Breaking Changes

- All existing public function signatures stay the same
- API routes and components don't change
- Existing fallback patterns (algorithmic scoring when no API key) preserved
- Existing caching layers (`AiAnalysisCache`, in-memory LRU) untouched

## New Dependency

- `@google/generative-ai` — Google Gemini SDK (only new package needed)
- Groq uses the existing `openai` SDK with a different `baseURL`

## New Env Vars

```env
# Add to .env.example:
GROQ_API_KEY=""           # Groq API key (free tier: 14,400 req/day)
```

`GOOGLE_API_KEY` is already documented. No other new vars needed.

## Testing Strategy

### Unit Tests for Provider Layer

- Each adapter: mock the SDK, verify message transformation and response parsing
- `getProvider()` factory: test fallback logic when keys are missing
- `completeAI()`: test prompt lookup, provider selection, fallback chain, error handling

### Unit Tests for Prompts

- Each prompt's `buildUserPrompt()`: verify output shape with sample contexts
- Verify all prompts are registered in the registry

### Existing Test Compatibility

- Existing tests mock at the module level (`jest.mock('openai')`)
- After migration, tests mock `@/lib/ai` instead — same pattern, different mock target
- All existing test assertions on response shapes remain valid

## Success Criteria

1. All 12 prompts centralized in `src/lib/ai/prompts/` — no inline prompt text in consumer files
2. With only `GOOGLE_API_KEY` set, 8 of 10 AI tasks function (vision and claude-analysis need their respective keys)
3. All existing tests pass with updated mocks
4. New tests for provider adapters, fallback logic, and prompt builders
5. `make build` and `make lint` pass cleanly
