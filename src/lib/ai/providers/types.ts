/**
 * @file src/lib/ai/providers/types.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Shared type definitions for the multi-provider AI abstraction layer.
 *
 * @description
 * Defines the common interfaces and types used across all AI provider adapters.
 * The AIProvider interface is the contract that each adapter (Gemini, Groq,
 * OpenAI, Anthropic) must implement to enable per-task provider routing with
 * automatic fallback.
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
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AIProvider {
  name: ProviderName;
  isAvailable(): boolean;
  complete(messages: AIMessage[], config: ModelConfig): Promise<AIResponse>;
}
