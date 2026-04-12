/**
 * @file src/lib/gemini-client.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-12
 * @version 1.0
 * @brief Gemini AI client for fallback when Claude/OpenAI keys are unavailable.
 *
 * @description
 * Provides a shared Gemini client that serves as a fallback for both the
 * primary AI (Claude/Anthropic) and secondary AI (OpenAI GPT-4o-mini).
 * Uses the Google Generative AI SDK with the Gemini 2.0 Flash model.
 *
 * Fallback chain:
 *   Primary:   ANTHROPIC_API_KEY → Claude → fallback → GOOGLE_API_KEY → Gemini
 *   Secondary: OPENAI_API_KEY → GPT-4o-mini → fallback → GOOGLE_API_KEY → Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-2.0-flash';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
  if (genAI) return genAI;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**
 * Check if Gemini fallback is available (GOOGLE_API_KEY is set).
 */
export function isGeminiFallbackAvailable(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

/**
 * Generate text content via Gemini. Returns the raw text response.
 * Throws if GOOGLE_API_KEY is not configured.
 */
export async function geminiGenerateText(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('GOOGLE_API_KEY not configured — Gemini fallback unavailable');
  }

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return text;
}

/**
 * Generate JSON content via Gemini. Parses the response as JSON.
 * Throws if parsing fails or GOOGLE_API_KEY is not configured.
 */
export async function geminiGenerateJSON<T = Record<string, unknown>>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const text = await geminiGenerateText(prompt, systemInstruction);
  // Extract JSON from response (Gemini sometimes wraps in markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in Gemini response');
  }
  return JSON.parse(jsonMatch[0]) as T;
}

// Reset singleton for testing
export function _resetGeminiClient(): void {
  genAI = null;
}
