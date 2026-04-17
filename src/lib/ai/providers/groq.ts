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
import { mapSdkError, assertJsonParseable } from './error-mapping';

// Map non-Groq model names (used in shared prompt configs) to Groq equivalents.
// Groq hosts open-source models — we default all to Llama 3.3 70B (versatile).
const GROQ_MODEL_MAPPINGS: Record<string, string> = {
  'gpt-4o-mini': 'llama-3.3-70b-versatile',
  'gpt-4o': 'llama-3.3-70b-versatile',
  'gpt-4': 'llama-3.3-70b-versatile',
  'gpt-3.5-turbo': 'llama-3.3-70b-versatile',
  'claude-sonnet-4-5-20250929': 'llama-3.3-70b-versatile',
  'claude-3-5-sonnet': 'llama-3.3-70b-versatile',
  'claude-3-opus': 'llama-3.3-70b-versatile',
};

function mapToGroqModel(model: string): string {
  return GROQ_MODEL_MAPPINGS[model] ?? model;
}

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

    const groqModel = mapToGroqModel(config.model);
    const requestParams: Record<string, unknown> = {
      model: groqModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    if (config.responseFormat === 'json') {
      requestParams.response_format = { type: 'json_object' };
    }

    let response: OpenAI.ChatCompletion;
    try {
      response = await client.chat.completions.create(
        requestParams as OpenAI.ChatCompletionCreateParamsNonStreaming,
      );
    } catch (err) {
      throw mapSdkError(err, 'groq');
    }

    const content = response.choices[0]?.message?.content ?? '';
    assertJsonParseable(content, 'groq', config.responseFormat);

    const usage = response.usage;

    return {
      content,
      model: response.model ?? groqModel,
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
