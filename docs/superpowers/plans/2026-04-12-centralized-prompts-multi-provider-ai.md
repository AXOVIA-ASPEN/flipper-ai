# Centralized Prompts + Multi-Provider AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize all 12 AI prompts into `src/lib/ai/prompts/` and add a multi-provider abstraction (Gemini, Groq, OpenAI, Anthropic) with per-task routing and automatic fallback.

**Architecture:** A `src/lib/ai/` module with provider adapters implementing a shared interface, a prompt registry mapping task names to configs, and a single `completeAI(taskName, context)` public API. The 10 consumer files swap inline `new OpenAI(...)` calls for `completeAI()` imports while keeping their public signatures unchanged.

**Tech Stack:** TypeScript, `@google/generative-ai` (already installed), `openai` SDK (reused for Groq), `@anthropic-ai/sdk` (existing)

**Key context:**
- `src/lib/gemini-client.ts` already exists with `geminiGenerateText()` and `geminiGenerateJSON()` — the new Gemini adapter wraps this or replaces it
- Existing tests mock at SDK level (`jest.mock('openai')`) — after migration, tests mock `@/lib/ai` instead
- File header standard: `@file`, `@author Stephen Boyett`, `@company Axovia AI`, `@date`, `@version 1.0`, `@brief`, `@description`

---

## File Structure

```
src/lib/ai/
├── index.ts                     # Public API: completeAI(), getAvailableProviders()
├── providers/
│   ├── types.ts                 # AIProvider, AIMessage, AIResponse, ModelConfig, ProviderName
│   ├── index.ts                 # getProvider() factory, resolveProvider() fallback logic
│   ├── gemini.ts                # Gemini adapter using @google/generative-ai
│   ├── groq.ts                  # Groq adapter using openai SDK with custom baseURL
│   ├── openai.ts                # OpenAI adapter wrapping existing openai SDK
│   └── anthropic.ts             # Anthropic adapter wrapping existing @anthropic-ai/sdk
├── prompts/
│   ├── types.ts                 # PromptConfig, context types per prompt
│   ├── index.ts                 # Prompt registry: PROMPTS map + getPrompt()
│   ├── flip-analysis.ts         # flipAnalysis, quickDiscountCheck, claudeAnalysis
│   ├── negotiation.ts           # negotiationStrategy, counterOfferAnalysis
│   ├── messaging.ts             # purchaseMessage
│   ├── listing.ts               # listingTitle, listingDescription, apiDescription
│   └── identification.ts        # productIdentification, logisticsClassification, itemCompleteness
```

**Tests:**
```
src/__tests__/lib/ai/
├── providers/
│   ├── gemini.test.ts
│   ├── groq.test.ts
│   ├── openai.test.ts
│   └── anthropic.test.ts
├── prompts/
│   └── registry.test.ts         # All prompts registered, buildUserPrompt returns strings
├── complete-ai.test.ts          # completeAI() integration: provider selection, fallback, errors
```

---

### Task 1: Provider Types

**Files:**
- Create: `src/lib/ai/providers/types.ts`

- [ ] **Step 1: Create provider types file**

```ts
/**
 * @file src/lib/ai/providers/types.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Shared types for the multi-provider AI abstraction layer.
 *
 * @description
 * Defines the AIProvider interface that all provider adapters implement,
 * plus the message, config, and response types used across the AI module.
 */

export type ProviderName = 'gemini' | 'groq' | 'openai' | 'anthropic';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat?: 'json' | 'text';
}

export interface AIResponse {
  content: string;
  model: string;
  provider: ProviderName;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIProvider {
  name: ProviderName;
  isAvailable(): boolean;
  complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/providers/types.ts
git commit -m "feat(ai): add provider types — AIProvider interface, AIMessage, AIResponse"
```

---

### Task 2: Gemini Provider Adapter

**Files:**
- Create: `src/lib/ai/providers/gemini.ts`
- Create: `src/__tests__/lib/ai/providers/gemini.test.ts`

- [ ] **Step 1: Write failing test for Gemini adapter**

```ts
/**
 * @file src/__tests__/lib/ai/providers/gemini.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Tests for the Gemini AI provider adapter.
 *
 * @description
 * Verifies Gemini adapter: availability check, message transformation,
 * JSON/text response modes, and error handling.
 */

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

import { GeminiProvider } from '@/lib/ai/providers/gemini';

describe('GeminiProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GOOGLE_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('isAvailable returns true when GOOGLE_API_KEY is set', () => {
    const provider = new GeminiProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  test('isAvailable returns false when GOOGLE_API_KEY is missing', () => {
    delete process.env.GOOGLE_API_KEY;
    const provider = new GeminiProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  test('complete sends messages and returns AIResponse', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '{"score": 85}',
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      },
    });

    const provider = new GeminiProvider();
    const result = await provider.complete(
      [
        { role: 'system', content: 'You are an expert.' },
        { role: 'user', content: 'Analyze this.' },
      ],
      { model: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 800, responseFormat: 'json' }
    );

    expect(result.content).toBe('{"score": 85}');
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-2.0-flash');
    expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 50 });
  });

  test('complete throws when API key is missing', async () => {
    delete process.env.GOOGLE_API_KEY;
    const provider = new GeminiProvider();
    await expect(
      provider.complete(
        [{ role: 'user', content: 'test' }],
        { model: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 100 }
      )
    ).rejects.toThrow('GOOGLE_API_KEY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern="ai/providers/gemini" --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/ai/providers/gemini'`

- [ ] **Step 3: Implement Gemini adapter**

```ts
/**
 * @file src/lib/ai/providers/gemini.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Google Gemini AI provider adapter.
 *
 * @description
 * Wraps @google/generative-ai SDK to implement the AIProvider interface.
 * Maps system messages to Gemini's systemInstruction field, supports
 * JSON response mode via responseMimeType, and handles usage metadata.
 * Free tier: 15 RPM, 1M tokens/day on gemini-2.0-flash.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIMessage, AIResponse, ModelConfig, ProviderName } from './types';

export class GeminiProvider implements AIProvider {
  readonly name: ProviderName = 'gemini';

  isAvailable(): boolean {
    return !!process.env.GOOGLE_API_KEY;
  }

  async complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY not configured — Gemini provider unavailable');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Extract system message for Gemini's systemInstruction field
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const model = genAI.getGenerativeModel({
      model: config.model,
      ...(systemMsg && { systemInstruction: systemMsg.content }),
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        ...(config.responseFormat === 'json' && { responseMimeType: 'application/json' }),
      },
    });

    // Build Gemini content parts from user/assistant messages
    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text();

    return {
      content: text,
      model: config.model,
      provider: 'gemini',
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount ?? 0,
            completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern="ai/providers/gemini" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/providers/gemini.ts src/__tests__/lib/ai/providers/gemini.test.ts
git commit -m "feat(ai): add Gemini provider adapter with tests"
```

---

### Task 3: Groq Provider Adapter

**Files:**
- Create: `src/lib/ai/providers/groq.ts`
- Create: `src/__tests__/lib/ai/providers/groq.test.ts`

- [ ] **Step 1: Write failing test for Groq adapter**

```ts
/**
 * @file src/__tests__/lib/ai/providers/groq.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Tests for the Groq AI provider adapter.
 *
 * @description
 * Verifies Groq adapter: availability check, OpenAI-compatible API call
 * with custom baseURL, JSON mode, and error handling.
 */

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { GroqProvider } from '@/lib/ai/providers/groq';

describe('GroqProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GROQ_API_KEY: 'test-groq-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('isAvailable returns true when GROQ_API_KEY is set', () => {
    const provider = new GroqProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  test('isAvailable returns false when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    const provider = new GroqProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  test('complete sends messages via OpenAI-compatible API', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"strategy": "lowball"}' } }],
      model: 'llama-3.3-70b-versatile',
      usage: { prompt_tokens: 200, completion_tokens: 100 },
    });

    const provider = new GroqProvider();
    const result = await provider.complete(
      [
        { role: 'system', content: 'You are a negotiation expert.' },
        { role: 'user', content: 'What should I offer?' },
      ],
      { model: 'llama-3.3-70b-versatile', temperature: 0.3, maxTokens: 600, responseFormat: 'json' }
    );

    expect(result.content).toBe('{"strategy": "lowball"}');
    expect(result.provider).toBe('groq');
    expect(result.usage).toEqual({ promptTokens: 200, completionTokens: 100 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern="ai/providers/groq" --no-coverage`
Expected: FAIL — `Cannot find module '@/lib/ai/providers/groq'`

- [ ] **Step 3: Implement Groq adapter**

```ts
/**
 * @file src/lib/ai/providers/groq.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Groq AI provider adapter (OpenAI-compatible API).
 *
 * @description
 * Uses the existing openai SDK with Groq's base URL. Supports Llama 3.3 70B
 * and other open-source models. Free tier: 30 RPM, 14,400 requests/day.
 */

import OpenAI from 'openai';
import type { AIProvider, AIMessage, AIResponse, ModelConfig, ProviderName } from './types';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export class GroqProvider implements AIProvider {
  readonly name: ProviderName = 'groq';

  isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  async complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured — Groq provider unavailable');
    }

    const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      ...(config.responseFormat === 'json' && {
        response_format: { type: 'json_object' as const },
      }),
    });

    const content = response.choices[0]?.message?.content ?? '';

    return {
      content,
      model: response.model ?? config.model,
      provider: 'groq',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens ?? 0,
            completionTokens: response.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern="ai/providers/groq" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/providers/groq.ts src/__tests__/lib/ai/providers/groq.test.ts
git commit -m "feat(ai): add Groq provider adapter with tests"
```

---

### Task 4: OpenAI Provider Adapter

**Files:**
- Create: `src/lib/ai/providers/openai.ts`
- Create: `src/__tests__/lib/ai/providers/openai.test.ts`

- [ ] **Step 1: Write failing test for OpenAI adapter**

Same pattern as Groq test — mock `openai`, test `isAvailable()`, `complete()`, error on missing key. Tests check `OPENAI_API_KEY` env var, standard OpenAI chat completion call, response mapping.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern="ai/providers/openai" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement OpenAI adapter**

Same structure as Groq but without custom baseURL. Uses `process.env.OPENAI_API_KEY`. Default model: `gpt-4o-mini`. Supports `response_format: { type: 'json_object' }` for JSON mode.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern="ai/providers/openai" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/providers/openai.ts src/__tests__/lib/ai/providers/openai.test.ts
git commit -m "feat(ai): add OpenAI provider adapter with tests"
```

---

### Task 5: Anthropic Provider Adapter

**Files:**
- Create: `src/lib/ai/providers/anthropic.ts`
- Create: `src/__tests__/lib/ai/providers/anthropic.test.ts`

- [ ] **Step 1: Write failing test for Anthropic adapter**

Mock `@anthropic-ai/sdk`. Test `isAvailable()` checks both `ANTHROPIC_API_KEY` and `CLAUDE_API_KEY` (fallback). `complete()` maps system message to Anthropic's top-level `system` param, user messages to `messages` array. Response maps `content[0].text` to `AIResponse.content`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern="ai/providers/anthropic" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement Anthropic adapter**

Uses `process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY`. Model from `process.env.CLAUDE_MODEL` or default `claude-sonnet-4-5-20250929`. Maps `system` role to Anthropic's `system` parameter (not in messages array).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern="ai/providers/anthropic" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/providers/anthropic.ts src/__tests__/lib/ai/providers/anthropic.test.ts
git commit -m "feat(ai): add Anthropic provider adapter with tests"
```

---

### Task 6: Provider Factory + Fallback Logic

**Files:**
- Create: `src/lib/ai/providers/index.ts`

- [ ] **Step 1: Write failing test for provider factory**

Create `src/__tests__/lib/ai/providers/factory.test.ts`. Tests:
- `getProvider('gemini')` returns GeminiProvider when `GOOGLE_API_KEY` is set
- `getProvider('groq')` returns GroqProvider when `GROQ_API_KEY` is set
- `resolveProvider(['gemini', 'groq', 'openai'])` returns first available provider
- `resolveProvider([...])` throws `AIProviderUnavailableError` when none available
- `getAvailableProviders()` returns list of names with configured keys

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern="ai/providers/factory" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement provider factory**

```ts
/**
 * @file src/lib/ai/providers/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Provider factory and fallback resolution.
 *
 * @description
 * Creates provider instances by name and resolves the best available
 * provider from an ordered preference list. Throws AIProviderUnavailableError
 * when no configured provider is found.
 */

import type { AIProvider, ProviderName } from './types';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

export class AIProviderUnavailableError extends Error {
  constructor(tried: ProviderName[]) {
    super(`No AI provider available. Tried: ${tried.join(', ')}. Configure at least one API key.`);
    this.name = 'AIProviderUnavailableError';
  }
}

const providers: Record<ProviderName, () => AIProvider> = {
  gemini: () => new GeminiProvider(),
  groq: () => new GroqProvider(),
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider(),
};

export function getProvider(name: ProviderName): AIProvider {
  return providers[name]();
}

export function resolveProvider(preferences: ProviderName[]): AIProvider {
  for (const name of preferences) {
    const provider = getProvider(name);
    if (provider.isAvailable()) return provider;
  }
  throw new AIProviderUnavailableError(preferences);
}

export function getAvailableProviders(): ProviderName[] {
  return (Object.keys(providers) as ProviderName[]).filter(
    (name) => getProvider(name).isAvailable()
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern="ai/providers/factory" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/providers/index.ts src/__tests__/lib/ai/providers/factory.test.ts
git commit -m "feat(ai): add provider factory with fallback resolution"
```

---

### Task 7: Prompt Types + Registry

**Files:**
- Create: `src/lib/ai/prompts/types.ts`
- Create: `src/lib/ai/prompts/index.ts`

- [ ] **Step 1: Create prompt types**

Define `PromptConfig` interface with: `name`, `description`, `provider` (preferred), `fallbacks`, `model`, `temperature`, `maxTokens`, `responseFormat`, `systemPrompt`, `buildUserPrompt(context: Record<string, unknown>): string`.

- [ ] **Step 2: Create prompt registry**

Export a `PROMPTS` Map and a `getPrompt(name: string): PromptConfig` function that throws if prompt not found. Import and register all prompts from domain files (will be populated in Tasks 8-12).

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/types.ts src/lib/ai/prompts/index.ts
git commit -m "feat(ai): add prompt types and registry scaffold"
```

---

### Task 8: Extract Flip Analysis Prompts

**Files:**
- Create: `src/lib/ai/prompts/flip-analysis.ts`

- [ ] **Step 1: Extract prompts from `src/lib/llm-analyzer.ts` and `src/lib/claude-analyzer.ts`**

Move the system prompt and `buildAnalysisPrompt()` template from `llm-analyzer.ts` (lines 57-103) into `flipAnalysis` config. Move the Claude analysis prompt from `claude-analyzer.ts` (lines ~101-142) into `claudeAnalysis` config. Create `quickDiscountCheck` config for the quick screening prompt.

Each config specifies: `provider: 'gemini'`, `fallbacks: ['groq', 'openai']`, except `claudeAnalysis` which uses `provider: 'anthropic'`, `fallbacks: ['gemini', 'openai']`.

- [ ] **Step 2: Register in prompts/index.ts**

Add `flipAnalysis`, `quickDiscountCheck`, and `claudeAnalysis` to the PROMPTS map.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/flip-analysis.ts src/lib/ai/prompts/index.ts
git commit -m "feat(ai): extract flip analysis prompts — flipAnalysis, quickDiscountCheck, claudeAnalysis"
```

---

### Task 9: Extract Negotiation Prompts

**Files:**
- Create: `src/lib/ai/prompts/negotiation.ts`

- [ ] **Step 1: Extract from `src/lib/negotiation-strategy.ts`**

Move the strategy system prompt (line ~593) and user prompt builder (lines ~201-246) into `negotiationStrategy` config. Move counter-offer system prompt (line ~679) and user prompt (lines ~249-281) into `counterOfferAnalysis` config.

`negotiationStrategy`: `provider: 'gemini'`, `fallbacks: ['groq', 'openai']`
`counterOfferAnalysis`: `provider: 'groq'`, `fallbacks: ['gemini', 'openai']` (latency-sensitive)

- [ ] **Step 2: Register in prompts/index.ts**

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/negotiation.ts src/lib/ai/prompts/index.ts
git commit -m "feat(ai): extract negotiation prompts — strategy and counter-offer"
```

---

### Task 10: Extract Messaging Prompts

**Files:**
- Create: `src/lib/ai/prompts/messaging.ts`

- [ ] **Step 1: Extract from `src/lib/message-generator.ts`**

Move system prompt (line ~160) and user prompt template (lines ~100-132) into `purchaseMessage` config. `provider: 'groq'`, `fallbacks: ['gemini', 'openai']` (latency-sensitive, real-time conversation).

- [ ] **Step 2: Register in prompts/index.ts**

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/messaging.ts src/lib/ai/prompts/index.ts
git commit -m "feat(ai): extract messaging prompts — purchaseMessage"
```

---

### Task 11: Extract Listing Prompts

**Files:**
- Create: `src/lib/ai/prompts/listing.ts`

- [ ] **Step 1: Extract from `title-generator.ts`, `description-generator.ts`, `app/api/listings/[id]/description/route.ts`**

Move title system+user prompts into `listingTitle`, description system+user into `listingDescription`, API route description prompt into `apiDescription`. All use `provider: 'gemini'`, `fallbacks: ['groq', 'openai']`.

- [ ] **Step 2: Register in prompts/index.ts**

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/listing.ts src/lib/ai/prompts/index.ts
git commit -m "feat(ai): extract listing prompts — title, description, apiDescription"
```

---

### Task 12: Extract Identification Prompts

**Files:**
- Create: `src/lib/ai/prompts/identification.ts`

- [ ] **Step 1: Extract from `llm-identifier.ts`, `logistics-classifier.ts`, `item-completeness-analyzer.ts`**

Move product ID prompt into `productIdentification`, logistics prompt into `logisticsClassification`, vision prompt into `itemCompleteness`. All `provider: 'gemini'` except `itemCompleteness` which is `provider: 'openai'` (vision required).

- [ ] **Step 2: Register in prompts/index.ts**

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/identification.ts src/lib/ai/prompts/index.ts
git commit -m "feat(ai): extract identification prompts — product ID, logistics, completeness"
```

---

### Task 13: Prompt Registry Tests

**Files:**
- Create: `src/__tests__/lib/ai/prompts/registry.test.ts`

- [ ] **Step 1: Write registry tests**

Test that all 12 prompts are registered, `getPrompt()` returns valid configs, `buildUserPrompt()` returns non-empty strings for sample contexts, and `getPrompt('nonexistent')` throws.

- [ ] **Step 2: Run tests**

Run: `pnpm test -- --testPathPattern="ai/prompts/registry" --no-coverage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/ai/prompts/registry.test.ts
git commit -m "test(ai): add prompt registry tests — all 12 prompts registered and valid"
```

---

### Task 14: Public API — `completeAI()`

**Files:**
- Create: `src/lib/ai/index.ts`
- Create: `src/__tests__/lib/ai/complete-ai.test.ts`

- [ ] **Step 1: Write failing tests for `completeAI()`**

Test cases:
- Resolves prompt by name, selects preferred provider, calls `complete()`
- Falls back to next provider when preferred is unavailable
- Throws `AIProviderUnavailableError` when no providers configured
- Throws on unknown prompt name
- Passes correct messages (system + user built from context) and config to provider

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern="ai/complete-ai" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement `completeAI()`**

```ts
/**
 * @file src/lib/ai/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Public API for the centralized AI module.
 *
 * @description
 * Provides completeAI(taskName, context) — the single entry point for all
 * AI operations. Looks up the prompt config, resolves the best available
 * provider, builds messages, and returns a typed AIResponse.
 */

import { getPrompt } from './prompts';
import { resolveProvider, getAvailableProviders, AIProviderUnavailableError } from './providers';
import type { AIResponse } from './providers/types';

export { AIProviderUnavailableError } from './providers';
export { getAvailableProviders } from './providers';
export type { AIResponse } from './providers/types';
export type { PromptConfig } from './prompts/types';

export async function completeAI(
  taskName: string,
  context: Record<string, unknown>
): Promise<AIResponse> {
  const prompt = getPrompt(taskName);

  const provider = resolveProvider([prompt.provider, ...prompt.fallbacks]);

  const messages = [
    ...(prompt.systemPrompt ? [{ role: 'system' as const, content: prompt.systemPrompt }] : []),
    { role: 'user' as const, content: prompt.buildUserPrompt(context) },
  ];

  return provider.complete(messages, {
    model: prompt.model,
    temperature: prompt.temperature,
    maxTokens: prompt.maxTokens,
    responseFormat: prompt.responseFormat,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern="ai/complete-ai" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/index.ts src/__tests__/lib/ai/complete-ai.test.ts
git commit -m "feat(ai): add completeAI() public API with provider fallback"
```

---

### Task 15: Migrate Consumer Files

**Files:**
- Modify: `src/lib/llm-analyzer.ts`
- Modify: `src/lib/claude-analyzer.ts`
- Modify: `src/lib/negotiation-strategy.ts`
- Modify: `src/lib/message-generator.ts`
- Modify: `src/lib/title-generator.ts`
- Modify: `src/lib/description-generator.ts`
- Modify: `src/lib/llm-identifier.ts`
- Modify: `src/lib/logistics-classifier.ts`
- Modify: `src/lib/item-completeness-analyzer.ts`
- Modify: `app/api/listings/[id]/description/route.ts`

- [ ] **Step 1: Migrate each consumer file**

For each file:
1. Replace `import OpenAI from 'openai'` (or `import Anthropic`) with `import { completeAI, AIProviderUnavailableError } from '@/lib/ai'`
2. Remove inline prompt text (now in `src/lib/ai/prompts/`)
3. Replace `new OpenAI(...)` + `client.chat.completions.create(...)` with `await completeAI('task-name', context)`
4. Replace `!process.env.OPENAI_API_KEY` guards with try/catch for `AIProviderUnavailableError`
5. Keep all existing public function signatures, caching logic, and fallback behavior unchanged

- [ ] **Step 2: Update existing test mocks**

For each test file, replace `jest.mock('openai', ...)` with `jest.mock('@/lib/ai', ...)`. Mock `completeAI` to return the same response shapes the tests already expect.

- [ ] **Step 3: Run all tests**

Run: `pnpm test --no-coverage`
Expected: ALL PASS

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds with zero TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(ai): migrate 10 consumer files to centralized completeAI() API

Replaced inline OpenAI/Anthropic SDK calls with completeAI() imports.
All prompts now sourced from src/lib/ai/prompts/.
Zero changes to public function signatures or API routes."
```

---

### Task 16: Remove Legacy gemini-client.ts

**Files:**
- Delete: `src/lib/gemini-client.ts`
- Modify: `src/lib/llm-analyzer.ts` (remove gemini-client import if still present)

- [ ] **Step 1: Verify gemini-client.ts is no longer imported anywhere**

Run: `grep -r "gemini-client" src/ app/ --include="*.ts" --include="*.tsx"`
Expected: No matches (all callers now use `@/lib/ai`)

- [ ] **Step 2: Delete and remove any remaining test mocks for it**

```bash
git rm src/lib/gemini-client.ts
```

- [ ] **Step 3: Run all tests**

Run: `pnpm test --no-coverage`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy gemini-client.ts — replaced by ai/providers/gemini.ts"
```

---

### Task 17: Add GROQ_API_KEY to .env.example + Documentation

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md` (tech stack AI line)
- Modify: `docs/DISCREPANCIES.md` (if needed)

- [ ] **Step 1: Add `GROQ_API_KEY` to `.env.example`**

Add under the API Keys section:
```env
# Groq API key — free tier: 30 RPM, 14,400 req/day (Llama 3.3 70B)
# Get your key at: https://console.groq.com/keys
GROQ_API_KEY=""
```

- [ ] **Step 2: Update CLAUDE.md AI line**

Update the tech stack to reflect the new multi-provider architecture:
```
- **AI**: Multi-provider (Gemini, Groq, OpenAI, Anthropic) via `src/lib/ai/`. Prompts centralized in `src/lib/ai/prompts/`. Per-task provider routing with automatic fallback.
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: add GROQ_API_KEY to .env.example, update CLAUDE.md AI description"
```

---

### Task 18: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `make test`
Expected: ALL PASS, coverage thresholds met

- [ ] **Step 2: Run build**

Run: `make build`
Expected: Build succeeds

- [ ] **Step 3: Run lint**

Run: `make lint`
Expected: Clean

- [ ] **Step 4: Verify provider availability with just GOOGLE_API_KEY**

Set only `GOOGLE_API_KEY` in `.env.local`, start dev server (`make dev`), hit an AI endpoint. Verify it uses Gemini and returns a real AI response.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build clean, lint clean"
```
