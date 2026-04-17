/**
 * @file src/lib/ai/providers/openai.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief OpenAI provider adapter for the multi-provider AI abstraction.
 *
 * @description
 * Adapts the OpenAI SDK directly behind the shared AIProvider interface.
 * Uses standard chat completion API with support for JSON response format
 * via response_format parameter.
 */

import OpenAI from 'openai';
import type { AIProvider, AIMessage, ModelConfig, AIResponse } from './types';
import { mapSdkError, assertJsonParseable } from './error-mapping';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const client = new OpenAI({ apiKey });

    const requestParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: config.model,
      messages: messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    if (config.responseFormat === 'json') {
      requestParams.response_format = { type: 'json_object' };
    }

    let response: OpenAI.ChatCompletion;
    try {
      response = await client.chat.completions.create(requestParams);
    } catch (err) {
      throw mapSdkError(err, 'openai');
    }

    const content = response.choices[0]?.message?.content ?? '';
    assertJsonParseable(content, 'openai', config.responseFormat);

    const usage = response.usage;
    return {
      content,
      model: response.model ?? config.model,
      provider: 'openai',
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
          }
        : undefined,
    };
  }
}
