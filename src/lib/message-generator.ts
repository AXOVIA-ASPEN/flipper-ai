/**
 * @file src/lib/message-generator.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-30
 * @version 1.0
 * @brief AI-powered purchase message generator for seller communication.
 *
 * @description
 * Generates personalized purchase messages using OpenAI gpt-4o-mini with
 * platform-appropriate tone and support for multiple message types (inquiry,
 * offer, follow-up, negotiation). Falls back to template-based messages when
 * the AI API is unavailable. Follows the same patterns as llm-analyzer.ts
 * for OpenAI integration (lazy singleton, JSON-only responses, null on error).
 */

import { completeAI, AIProviderUnavailableError } from '@/lib/ai';

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageType = 'inquiry' | 'offer' | 'follow-up' | 'negotiation';

export type PlatformTone = 'casual' | 'professional' | 'friendly';

export interface MessageGeneratorInput {
  listingTitle: string;
  askingPrice: number;
  platform: string;
  sellerName?: string | null;
  messageType?: MessageType;
  offerPrice?: number | null;
  itemCondition?: string | null;
  additionalContext?: string | null;
}

export interface GeneratedMessage {
  subject: string;
  body: string;
  messageType: MessageType;
  platform: string;
  tone: PlatformTone;
  isFallback: boolean;
}

// ── Platform Tone Mapping ────────────────────────────────────────────────────

const PLATFORM_TONES: Record<string, PlatformTone> = {
  CRAIGSLIST: 'casual',
  FACEBOOK: 'friendly',
  EBAY: 'professional',
  MERCARI: 'professional',
  OFFERUP: 'casual',
};

export function getPlatformTone(platform: string): PlatformTone {
  return PLATFORM_TONES[platform.toUpperCase()] || 'professional';
}

// ── AI Message Generation ────────────────────────────────────────────────────

export async function generatePurchaseMessage(
  input: MessageGeneratorInput
): Promise<GeneratedMessage> {
  const messageType: MessageType = input.messageType || 'inquiry';
  const tone = getPlatformTone(input.platform);

  // Validate required fields
  if (!input.listingTitle || input.askingPrice == null || !input.platform) {
    throw new Error('Missing required fields: listingTitle, askingPrice, platform');
  }

  try {
    const response = await completeAI('purchaseMessage', {
      listingTitle: input.listingTitle,
      askingPrice: input.askingPrice,
      platform: input.platform,
      sellerName: input.sellerName,
      messageType,
      offerPrice: input.offerPrice,
      itemCondition: input.itemCondition,
      additionalContext: input.additionalContext,
      tone,
    });

    const responseText = response.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from message generation response:', responseText);
      return generateFallbackMessage(input, messageType, tone);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const aiBody: string = parsed.body || buildFallbackBody(input, messageType, tone);

    return {
      subject: parsed.subject || buildFallbackSubject(input, messageType),
      body: ensureSellerNameInBody(aiBody, input.sellerName, tone),
      messageType,
      platform: input.platform,
      tone,
      isFallback: false,
    };
  } catch (error) {
    if (error instanceof AIProviderUnavailableError) {
      return generateFallbackMessage(input, messageType, tone);
    }
    console.error('AI message generation error:', error);
    return generateFallbackMessage(input, messageType, tone);
  }
}

// ── Fallback Template Messages ───────────────────────────────────────────────

export function generateFallbackMessage(
  input: MessageGeneratorInput,
  messageType?: MessageType,
  tone?: PlatformTone
): GeneratedMessage {
  const effectiveType: MessageType = messageType || input.messageType || 'inquiry';
  const effectiveTone: PlatformTone = tone || getPlatformTone(input.platform);

  return {
    subject: buildFallbackSubject(input, effectiveType),
    body: buildFallbackBody(input, effectiveType, effectiveTone),
    messageType: effectiveType,
    platform: input.platform,
    tone: effectiveTone,
    isFallback: true,
  };
}

/**
 * Ensures the seller's name appears in the message body. AI providers may drop
 * the name even when instructed — this guarantees the AC contract that messages
 * address the seller by name when one is provided.
 */
function ensureSellerNameInBody(
  body: string,
  sellerName: string | null | undefined,
  tone: PlatformTone
): string {
  if (!sellerName || body.includes(sellerName)) return body;
  const greeting = tone === 'professional' ? `Hello ${sellerName},` : `Hi ${sellerName}!`;
  return `${greeting}\n\n${body}`;
}

function buildFallbackSubject(input: MessageGeneratorInput, messageType: MessageType): string {
  const subjects: Record<MessageType, string> = {
    inquiry: `Question about ${input.listingTitle}`,
    offer: `Offer for ${input.listingTitle}`,
    'follow-up': `Following up: ${input.listingTitle}`,
    negotiation: `Re: ${input.listingTitle}`,
  };
  return subjects[messageType].slice(0, 60);
}

function buildFallbackBody(
  input: MessageGeneratorInput,
  messageType: MessageType,
  tone: PlatformTone
): string {
  const greeting = input.sellerName
    ? tone === 'professional'
      ? `Hello ${input.sellerName},`
      : `Hi ${input.sellerName}!`
    : tone === 'professional'
      ? 'Hello,'
      : 'Hi!';

  const templates: Record<MessageType, string> = {
    inquiry: `${greeting}\n\nI'm interested in your listing "${input.listingTitle}" priced at $${input.askingPrice}. Is this item still available? I'd love to learn more about its condition and availability.\n\nThank you!`,
    offer: `${greeting}\n\nI'm interested in your "${input.listingTitle}" listed at $${input.askingPrice}. Would you consider ${input.offerPrice ? `$${input.offerPrice}` : '[your price]'}? I can ${tone === 'casual' ? 'pick it up quickly' : 'complete the transaction promptly'}.\n\nThank you!`,
    'follow-up': `${greeting}\n\nI reached out previously about your "${input.listingTitle}" and wanted to follow up. Is it still available? I'm still very interested.\n\nThanks!`,
    negotiation: `${greeting}\n\nThank you for your response regarding "${input.listingTitle}". Would you consider ${input.offerPrice ? `$${input.offerPrice}` : '[your price]'}? I believe this is a fair price given the current market.\n\nLooking forward to hearing from you!`,
  };

  return templates[messageType];
}

// ── Validation ───────────────────────────────────────────────────────────────

const VALID_MESSAGE_TYPES: MessageType[] = ['inquiry', 'offer', 'follow-up', 'negotiation'];

export function isValidMessageType(type: string): type is MessageType {
  return VALID_MESSAGE_TYPES.includes(type as MessageType);
}
