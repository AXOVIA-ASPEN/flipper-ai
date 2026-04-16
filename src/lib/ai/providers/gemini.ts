/**
 * @file src/lib/ai/providers/gemini.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Google Gemini AI provider adapter.
 *
 * @description
 * Adapts the Google Generative AI SDK (@google/generative-ai) behind the
 * shared AIProvider interface. Maps system messages to Gemini's
 * systemInstruction field, converts assistant roles to model roles, and
 * supports JSON response format via responseMimeType.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIMessage, ModelConfig, AIResponse } from './types';
import { mapSdkError, assertJsonParseable } from './error-mapping';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;

  isAvailable(): boolean {
    return Boolean(process.env.GOOGLE_API_KEY);
  }

  async complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Extract system message for Gemini's systemInstruction field
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    // Build generation config
    const generationConfig: Record<string, unknown> = {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    };

    if (config.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    // Build model options
    const modelOptions: Record<string, unknown> = {
      model: config.model,
      generationConfig,
    };

    if (systemMessage) {
      modelOptions.systemInstruction = systemMessage.content;
    }

    const model = genAI.getGenerativeModel(modelOptions);

    // Map messages to Gemini format (assistant → model)
    const contents = nonSystemMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    let result;
    try {
      result = await model.generateContent({ contents });
    } catch (err) {
      throw mapSdkError(err, 'gemini');
    }
    const response = result.response;
    const text = response.text();
    assertJsonParseable(text, 'gemini', config.responseFormat);

    const metadata = response.usageMetadata;

    return {
      content: text,
      model: config.model,
      provider: 'gemini',
      usage: metadata
        ? {
            promptTokens: metadata.promptTokenCount,
            completionTokens: metadata.candidatesTokenCount,
          }
        : undefined,
    };
  }
}
