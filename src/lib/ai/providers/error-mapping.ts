/**
 * @file src/lib/ai/providers/error-mapping.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-16
 * @version 1.0
 * @brief SDK error → AIProviderError translation helpers.
 *
 * @description
 * Each provider SDK throws its own error shapes. These helpers normalize
 * them into the AIProviderError hierarchy so completeAI() can make uniform
 * retry/fallback decisions.
 */

import type { ProviderName } from './types';
import {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIMalformedResponseError,
} from './errors';

interface SdkErrorShape {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
  headers?: Record<string, string> | { get?: (k: string) => string | null };
}

function parseRetryAfter(headers: SdkErrorShape['headers']): number | undefined {
  if (!headers) return undefined;
  let raw: string | null | undefined;
  if (typeof (headers as { get?: unknown }).get === 'function') {
    raw = (headers as { get: (k: string) => string | null }).get('retry-after');
  } else {
    raw = (headers as Record<string, string>)['retry-after']
      ?? (headers as Record<string, string>)['Retry-After'];
  }
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds)) return undefined;
  return seconds * 1000;
}

const TIMEOUT_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN']);
const TIMEOUT_NAMES = new Set(['AbortError', 'TimeoutError', 'FetchError']);

/**
 * Map any SDK/runtime error thrown from a provider SDK call into the typed
 * AIProviderError hierarchy. Preserves the original error as `cause`.
 *
 * Detection order:
 *   1. Already an AIProviderError → return as-is (no double-wrapping)
 *   2. HTTP 429 or message/code containing "rate limit"/"quota"/"429" → AIRateLimitError
 *   3. Network/timeout codes or AbortError → AITimeoutError
 *   4. Everything else → AIProviderError (generic)
 */
export function mapSdkError(err: unknown, provider: ProviderName): AIProviderError {
  if (err instanceof AIProviderError) return err;

  const e = (err ?? {}) as SdkErrorShape;
  const status = e.status;
  const message = e.message ?? String(err);
  const lowerMessage = message.toLowerCase();

  // Rate limit
  if (
    status === 429 ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('quota') ||
    lowerMessage.includes('429')
  ) {
    return new AIRateLimitError(
      `${provider} rate limit: ${message}`,
      provider,
      parseRetryAfter(e.headers),
      err
    );
  }

  // Timeout / network
  if (
    (e.code && TIMEOUT_CODES.has(e.code)) ||
    (e.name && TIMEOUT_NAMES.has(e.name)) ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('econnreset')
  ) {
    return new AITimeoutError(`${provider} timeout: ${message}`, provider, err);
  }

  return new AIProviderError(`${provider} error: ${message}`, provider, err);
}

/**
 * When prompt config requested JSON mode, verify the returned content parses.
 * Throws AIMalformedResponseError on failure so completeAI falls back.
 */
export function assertJsonParseable(
  content: string,
  provider: ProviderName,
  responseFormat: 'json' | 'text' | undefined
): void {
  if (responseFormat !== 'json') return;
  try {
    JSON.parse(content);
  } catch (parseError) {
    throw new AIMalformedResponseError(
      `${provider} returned non-JSON content when JSON was requested`,
      provider,
      content,
      parseError
    );
  }
}
