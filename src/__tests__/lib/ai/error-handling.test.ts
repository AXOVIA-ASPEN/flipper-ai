/**
 * @file src/__tests__/lib/ai/error-handling.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-16
 * @version 1.0
 * @brief Tests for runtime error handling, retry, and provider fallback in completeAI().
 *
 * @description
 * Verifies that provider adapters translate SDK errors into the typed
 * AIProviderError hierarchy, that callWithRetry backs off on transient
 * errors, and that completeAI() falls over to the next provider when the
 * preferred one exhausts its retry budget. Non-AI errors must propagate.
 */

import type { AIProvider, AIMessage, ModelConfig, AIResponse } from '@/lib/ai/providers/types';
import type { PromptConfig } from '@/lib/ai/prompts/types';

jest.mock('@/lib/ai/prompts', () => ({
  getPrompt: jest.fn(),
}));

jest.mock('@/lib/ai/providers', () => {
  const actual = jest.requireActual('@/lib/ai/providers');
  return {
    ...actual,
    getProvider: jest.fn(),
  };
});

import {
  completeAI,
  callWithRetry,
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIMalformedResponseError,
} from '@/lib/ai';
import { getPrompt } from '@/lib/ai/prompts';
import { getProvider } from '@/lib/ai/providers';

const mockGetPrompt = getPrompt as jest.MockedFunction<typeof getPrompt>;
const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;

function makePromptConfig(overrides: Partial<PromptConfig> = {}): PromptConfig {
  return {
    name: 'flipAnalysis',
    description: 'test',
    provider: 'openai',
    fallbacks: ['gemini'],
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000,
    responseFormat: 'json',
    systemPrompt: 'You are an expert.',
    buildUserPrompt: () => 'Do the thing',
    ...overrides,
  };
}

function makeProvider(
  name: 'openai' | 'gemini' | 'groq' | 'anthropic',
  completeImpl?: AIProvider['complete'],
): AIProvider {
  const response: AIResponse = {
    content: '{"ok":true}',
    model: 'test-model',
    provider: name,
  };
  return {
    name,
    isAvailable: () => true,
    complete: (completeImpl ?? jest.fn().mockResolvedValue(response)) as AIProvider['complete'],
  };
}

function setupProviders(providerByName: Partial<Record<string, AIProvider>>) {
  mockGetProvider.mockImplementation((name) => {
    const p = providerByName[name];
    if (!p) {
      return {
        name,
        isAvailable: () => false,
        complete: jest.fn(),
      } as unknown as AIProvider;
    }
    return p;
  });
}

// ─── callWithRetry ───────────────────────────────────────────────────────────

describe('callWithRetry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the response on first success', async () => {
    const provider = makeProvider('openai');
    const messages: AIMessage[] = [{ role: 'user', content: 'x' }];
    const config: ModelConfig = { model: 'm', temperature: 0, maxTokens: 1 };

    const result = await callWithRetry(provider, messages, config, 3);
    expect(result.content).toBe('{"ok":true}');
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it('retries transient AIRateLimitError up to maxAttempts then throws it', async () => {
    const fail = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>();
    fail.mockRejectedValue(new AIRateLimitError('429', 'openai'));
    const provider: AIProvider = { name: 'openai', isAvailable: () => true, complete: fail };

    await expect(
      callWithRetry(provider, [{ role: 'user', content: 'x' }], { model: 'm', temperature: 0, maxTokens: 1 }, 3),
    ).rejects.toBeInstanceOf(AIRateLimitError);
    expect(fail).toHaveBeenCalledTimes(3);
  });

  it('retries AITimeoutError and eventually succeeds', async () => {
    const complete = jest
      .fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValueOnce(new AITimeoutError('t', 'openai'))
      .mockRejectedValueOnce(new AITimeoutError('t', 'openai'))
      .mockResolvedValueOnce({ content: 'ok', model: 'm', provider: 'openai' });
    const provider: AIProvider = { name: 'openai', isAvailable: () => true, complete };

    const result = await callWithRetry(
      provider,
      [{ role: 'user', content: 'x' }],
      { model: 'm', temperature: 0, maxTokens: 1 },
      3,
    );
    expect(result.content).toBe('ok');
    expect(complete).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry AIMalformedResponseError (treats as permanent)', async () => {
    const complete = jest
      .fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new AIMalformedResponseError('bad', 'openai', 'not-json'));
    const provider: AIProvider = { name: 'openai', isAvailable: () => true, complete };

    await expect(
      callWithRetry(provider, [{ role: 'user', content: 'x' }], { model: 'm', temperature: 0, maxTokens: 1 }, 3),
    ).rejects.toBeInstanceOf(AIMalformedResponseError);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry non-AI errors (e.g. TypeError from buggy prompt builder)', async () => {
    const complete = jest
      .fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new TypeError('ctx.title is undefined'));
    const provider: AIProvider = { name: 'openai', isAvailable: () => true, complete };

    await expect(
      callWithRetry(provider, [{ role: 'user', content: 'x' }], { model: 'm', temperature: 0, maxTokens: 1 }, 3),
    ).rejects.toBeInstanceOf(TypeError);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('honors retryAfterMs from AIRateLimitError', async () => {
    const complete = jest
      .fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValueOnce(new AIRateLimitError('429', 'openai', 1000))
      .mockResolvedValueOnce({ content: 'ok', model: 'm', provider: 'openai' });
    const provider: AIProvider = { name: 'openai', isAvailable: () => true, complete };

    const start = Date.now();
    await callWithRetry(provider, [{ role: 'user', content: 'x' }], { model: 'm', temperature: 0, maxTokens: 1 }, 3);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(900); // ~1000ms honored (allow jitter)
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

// ─── completeAI fallback on runtime errors ───────────────────────────────────

describe('completeAI runtime fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to next provider when preferred exhausts rate-limit retries', async () => {
    mockGetPrompt.mockReturnValue(makePromptConfig());
    const failingOpenai = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new AIRateLimitError('429', 'openai'));
    const workingGemini = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockResolvedValue({ content: 'ok', model: 'gem', provider: 'gemini' });

    setupProviders({
      openai: { name: 'openai', isAvailable: () => true, complete: failingOpenai },
      gemini: { name: 'gemini', isAvailable: () => true, complete: workingGemini },
    });

    const result = await completeAI('flipAnalysis', {});
    expect(result.provider).toBe('gemini');
    expect(failingOpenai).toHaveBeenCalledTimes(3); // retried 3 times before giving up
    expect(workingGemini).toHaveBeenCalledTimes(1);
  });

  it('falls back on AITimeoutError', async () => {
    mockGetPrompt.mockReturnValue(makePromptConfig());
    const failingOpenai = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new AITimeoutError('fetch failed', 'openai'));
    const workingGemini = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockResolvedValue({ content: 'ok', model: 'gem', provider: 'gemini' });

    setupProviders({
      openai: { name: 'openai', isAvailable: () => true, complete: failingOpenai },
      gemini: { name: 'gemini', isAvailable: () => true, complete: workingGemini },
    });

    const result = await completeAI('flipAnalysis', {});
    expect(result.provider).toBe('gemini');
  });

  it('falls back on AIMalformedResponseError (first attempt, no retry)', async () => {
    mockGetPrompt.mockReturnValue(makePromptConfig());
    const failingOpenai = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new AIMalformedResponseError('bad', 'openai', 'not-json'));
    const workingGemini = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockResolvedValue({ content: 'ok', model: 'gem', provider: 'gemini' });

    setupProviders({
      openai: { name: 'openai', isAvailable: () => true, complete: failingOpenai },
      gemini: { name: 'gemini', isAvailable: () => true, complete: workingGemini },
    });

    const result = await completeAI('flipAnalysis', {});
    expect(result.provider).toBe('gemini');
    expect(failingOpenai).toHaveBeenCalledTimes(1); // no retry
  });

  it('throws last AIProviderError when all providers fail', async () => {
    mockGetPrompt.mockReturnValue(makePromptConfig());
    const failOpenai = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new AIRateLimitError('429', 'openai'));
    const failGemini = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new AIProviderError('gemini down', 'gemini'));

    setupProviders({
      openai: { name: 'openai', isAvailable: () => true, complete: failOpenai },
      gemini: { name: 'gemini', isAvailable: () => true, complete: failGemini },
    });

    await expect(completeAI('flipAnalysis', {})).rejects.toBeInstanceOf(AIProviderError);
  });

  it('does NOT fall back on non-AI errors (bugs must propagate)', async () => {
    mockGetPrompt.mockReturnValue(makePromptConfig());
    const buggyOpenai = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockRejectedValue(new TypeError('ctx.foo is undefined'));
    const workingGemini = jest.fn<Promise<AIResponse>, [AIMessage[], ModelConfig]>()
      .mockResolvedValue({ content: 'ok', model: 'gem', provider: 'gemini' });

    setupProviders({
      openai: { name: 'openai', isAvailable: () => true, complete: buggyOpenai },
      gemini: { name: 'gemini', isAvailable: () => true, complete: workingGemini },
    });

    await expect(completeAI('flipAnalysis', {})).rejects.toBeInstanceOf(TypeError);
    expect(workingGemini).not.toHaveBeenCalled();
  });
});
