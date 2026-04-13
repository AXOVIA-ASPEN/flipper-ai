/**
 * @file src/lib/ai/providers/groq.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Groq AI provider adapter using OpenAI-compatible API.
 *
 * @description
 * Adapts the Groq inference API behind the shared AIProvider interface.
 * Uses the OpenAI SDK with Groq's base URL (https://api.groq.com/openai/v1)
 * since Groq exposes an OpenAI-compatible chat completions endpoint.
 * Supports JSON response format via response_format parameter.
 */

import OpenAI from 'openai';
import type { AIProvider, AIMessage, ModelConfig, AIResponse } from './types';

export class GroqProvider implements AIProvider {
  readonly name = 'groq' as const;

  isAvailable(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  }

  async complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const requestParams: Record<string, unknown> = {
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    if (config.responseFormat === 'json') {
      requestParams.response_format = { type: 'json_object' };
    }

    const response = await client.chat.completions.create(
      requestParams as OpenAI.ChatCompletionCreateParamsNonStreaming,
    );

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage;

    return {
      content,
      model: response.model ?? config.model,
      provider: 'groq',
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
          }
        : undefined,
    };
  }
}
