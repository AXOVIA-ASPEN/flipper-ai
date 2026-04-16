/**
 * @file src/lib/ai/providers/anthropic.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Anthropic Claude AI provider adapter.
 *
 * @description
 * Adapts the Anthropic SDK (@anthropic-ai/sdk) behind the shared AIProvider
 * interface. Maps system messages to the top-level system parameter (not in
 * the messages array). Supports ANTHROPIC_API_KEY and CLAUDE_API_KEY env
 * vars, with ANTHROPIC_API_KEY taking priority.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIMessage, ModelConfig, AIResponse } from './types';
import { mapSdkError, assertJsonParseable } from './error-mapping';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const;

  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
  }

  async complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY is not configured');
    }

    const client = new Anthropic({ apiKey });

    // Extract system message for Anthropic's top-level system parameter
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const model = process.env.CLAUDE_MODEL || config.model || DEFAULT_MODEL;

    const requestParams: Record<string, unknown> = {
      model,
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };

    if (systemMessage) {
      requestParams.system = systemMessage.content;
    }

    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        requestParams as Anthropic.MessageCreateParamsNonStreaming,
      );
    } catch (err) {
      throw mapSdkError(err, 'anthropic');
    }

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    assertJsonParseable(content, 'anthropic', config.responseFormat);

    const usage = response.usage;

    return {
      content,
      model: response.model ?? model,
      provider: 'anthropic',
      usage: usage
        ? {
            promptTokens: usage.input_tokens,
            completionTokens: usage.output_tokens,
          }
        : undefined,
    };
  }
}
