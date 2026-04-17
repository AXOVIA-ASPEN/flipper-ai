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

import { GoogleGenerativeAI, type ModelParams } from '@google/generative-ai';
import type { AIProvider, AIMessage, ModelConfig, AIResponse } from './types';
import { mapSdkError, assertJsonParseable } from './error-mapping';

// Map non-Gemini model names (used in shared prompt configs) to Gemini equivalents.
// Keeps prompt configs provider-agnostic at the model-name level while still allowing
// Gemini to be selected as primary or fallback. Unknown model names pass through unchanged.
const GEMINI_MODEL_MAPPINGS: Record<string, string> = {
  'gpt-4o-mini': 'gemini-2.0-flash',
  'gpt-4o': 'gemini-2.0-flash',
  'gpt-4': 'gemini-2.0-flash',
  'gpt-3.5-turbo': 'gemini-2.0-flash',
  'claude-sonnet-4-5-20250929': 'gemini-2.0-flash',
  'claude-3-5-sonnet': 'gemini-2.0-flash',
  'claude-3-opus': 'gemini-2.0-flash',
};

function mapToGeminiModel(model: string): string {
  return GEMINI_MODEL_MAPPINGS[model] ?? model;
}

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

    // Build model options (map OpenAI/Claude model names → Gemini equivalents)
    const geminiModel = mapToGeminiModel(config.model);
    const modelOptions: ModelParams = {
      model: geminiModel,
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
      model: geminiModel,
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
