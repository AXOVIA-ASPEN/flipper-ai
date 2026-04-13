/**
 * @file src/__tests__/lib/ai/complete-ai.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the completeAI() public API entry point.
 *
 * @description
 * Verifies that completeAI() correctly resolves prompt configs, selects an
 * available provider (with fallback), builds the correct message array, and
 * passes the right ModelConfig through to the provider. Mocks both the prompts
 * and providers modules to keep tests isolated from real implementations.
 */

import type { AIProvider, AIResponse, AIMessage, ModelConfig } from '@/lib/ai/providers/types';
import type { PromptConfig } from '@/lib/ai/prompts/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/ai/prompts', () => ({
  getPrompt: jest.fn(),
}));

jest.mock('@/lib/ai/providers', () => ({
  resolveProvider: jest.fn(),
  getAvailableProviders: jest.fn(),
  AIProviderUnavailableError: class AIProviderUnavailableError extends Error {
    constructor(tried: string[]) {
      super(`No AI provider available. Tried: ${tried.join(', ')}. Configure at least one API key.`);
      this.name = 'AIProviderUnavailableError';
    }
  },
}));

import { completeAI } from '@/lib/ai';
import { getPrompt } from '@/lib/ai/prompts';
import { resolveProvider, AIProviderUnavailableError } from '@/lib/ai/providers';

const mockGetPrompt = getPrompt as jest.MockedFunction<typeof getPrompt>;
const mockResolveProvider = resolveProvider as jest.MockedFunction<typeof resolveProvider>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePromptConfig(overrides: Partial<PromptConfig> = {}): PromptConfig {
  return {
    name: 'flipAnalysis',
    description: 'Analyze a listing for flip potential',
    provider: 'openai',
    fallbacks: ['gemini', 'anthropic'],
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2048,
    responseFormat: 'json',
    systemPrompt: 'You are a flip analysis expert.',
    buildUserPrompt: (ctx: Record<string, unknown>) =>
      `Analyze: ${ctx.title} at $${ctx.price}`,
    ...overrides,
  };
}

function makeProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    name: 'openai',
    isAvailable: () => true,
    complete: jest.fn().mockResolvedValue({
      content: '{"score": 85}',
      model: 'gpt-4o',
      provider: 'openai',
      usage: { promptTokens: 100, completionTokens: 50 },
    } satisfies AIResponse),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('completeAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves prompt, selects provider, calls complete(), and returns AIResponse', async () => {
    const prompt = makePromptConfig();
    const provider = makeProvider();
    mockGetPrompt.mockReturnValue(prompt);
    mockResolveProvider.mockReturnValue(provider);

    const context = { title: 'iPhone 14', price: 400 };
    const result = await completeAI('flipAnalysis', context);

    expect(mockGetPrompt).toHaveBeenCalledWith('flipAnalysis');
    expect(mockResolveProvider).toHaveBeenCalledWith(['openai', 'gemini', 'anthropic']);
    expect(result).toEqual({
      content: '{"score": 85}',
      model: 'gpt-4o',
      provider: 'openai',
      usage: { promptTokens: 100, completionTokens: 50 },
    });
  });

  it('falls back to next provider when preferred is unavailable', async () => {
    const prompt = makePromptConfig({ provider: 'groq', fallbacks: ['openai'] });
    const fallbackProvider = makeProvider({ name: 'openai' });
    mockGetPrompt.mockReturnValue(prompt);
    mockResolveProvider.mockReturnValue(fallbackProvider);

    await completeAI('flipAnalysis', { title: 'Test', price: 10 });

    // resolveProvider receives the full preference list
    expect(mockResolveProvider).toHaveBeenCalledWith(['groq', 'openai']);
  });

  it('throws AIProviderUnavailableError when no providers configured', async () => {
    const prompt = makePromptConfig();
    mockGetPrompt.mockReturnValue(prompt);
    mockResolveProvider.mockImplementation(() => {
      throw new AIProviderUnavailableError(['openai', 'gemini', 'anthropic']);
    });

    await expect(completeAI('flipAnalysis', {})).rejects.toThrow(AIProviderUnavailableError);
  });

  it('throws on unknown prompt name', async () => {
    mockGetPrompt.mockImplementation(() => {
      throw new Error('Unknown prompt: "bogus". Available: flipAnalysis, quickDiscountCheck');
    });

    await expect(completeAI('bogus', {})).rejects.toThrow(/Unknown prompt: "bogus"/);
  });

  it('passes correct system + user messages built from context to provider', async () => {
    const prompt = makePromptConfig();
    const provider = makeProvider();
    mockGetPrompt.mockReturnValue(prompt);
    mockResolveProvider.mockReturnValue(provider);

    await completeAI('flipAnalysis', { title: 'PS5', price: 300 });

    const completeFn = provider.complete as jest.Mock;
    const [messages] = completeFn.mock.calls[0] as [AIMessage[], ModelConfig];

    expect(messages).toEqual([
      { role: 'system', content: 'You are a flip analysis expert.' },
      { role: 'user', content: 'Analyze: PS5 at $300' },
    ]);
  });

  it('passes correct ModelConfig from prompt config', async () => {
    const prompt = makePromptConfig({
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: 'text',
    });
    const provider = makeProvider();
    mockGetPrompt.mockReturnValue(prompt);
    mockResolveProvider.mockReturnValue(provider);

    await completeAI('flipAnalysis', { title: 'Test', price: 1 });

    const completeFn = provider.complete as jest.Mock;
    const [, config] = completeFn.mock.calls[0] as [AIMessage[], ModelConfig];

    expect(config).toEqual({
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 4096,
      responseFormat: 'text',
    });
  });

  it('omits system message when systemPrompt is empty string', async () => {
    const prompt = makePromptConfig({ systemPrompt: '' });
    const provider = makeProvider();
    mockGetPrompt.mockReturnValue(prompt);
    mockResolveProvider.mockReturnValue(provider);

    await completeAI('flipAnalysis', { title: 'Lamp', price: 20 });

    const completeFn = provider.complete as jest.Mock;
    const [messages] = completeFn.mock.calls[0] as [AIMessage[], ModelConfig];

    expect(messages).toEqual([
      { role: 'user', content: 'Analyze: Lamp at $20' },
    ]);
  });
});
