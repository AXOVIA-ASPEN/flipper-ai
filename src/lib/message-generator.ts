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

import OpenAI from 'openai';

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

// ── Tone Descriptions (for LLM prompt) ──────────────────────────────────────

const TONE_DESCRIPTIONS: Record<PlatformTone, string> = {
  casual:
    'Keep it short and casual, like texting a neighbor. Use simple language, mention local pickup if relevant. No formal greetings.',
  friendly:
    'Be warm and conversational, like messaging a friend of a friend. Use a friendly greeting, show genuine interest.',
  professional:
    'Be professional and courteous. Use proper grammar, a polite greeting, and clear structure. Mention shipping if relevant.',
};

// ── Message Type Descriptions (for LLM prompt) ──────────────────────────────

const MESSAGE_TYPE_INSTRUCTIONS: Record<MessageType, string> = {
  inquiry:
    'Write a message asking about the item. Express interest, ask relevant questions about condition, availability, or details not in the listing.',
  offer:
    'Write a message making a purchase offer. State the offer price clearly, explain why it is fair, and express readiness to complete the transaction quickly.',
  'follow-up':
    'Write a polite follow-up message to a previous inquiry that received no response. Reference the original interest without being pushy.',
  negotiation:
    'Write a counter-offer or negotiation message. Acknowledge the seller\'s position, propose a compromise price, and provide reasoning.',
};

// ── OpenAI Singleton ─────────────────────────────────────────────────────────

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// ── LLM Prompt Builder ──────────────────────────────────────────────────────

function buildMessagePrompt(input: MessageGeneratorInput, tone: PlatformTone): string {
  const sellerRef = input.sellerName ? `The seller's name is "${input.sellerName}".` : 'The seller name is unknown.';
  const offerLine =
    input.messageType === 'offer' && input.offerPrice
      ? `The buyer wants to offer $${input.offerPrice}.`
      : '';
  const conditionLine = input.itemCondition
    ? `Listed condition: ${input.itemCondition}.`
    : '';
  const contextLine = input.additionalContext
    ? `Additional context from the buyer: ${input.additionalContext}`
    : '';

  return `You are writing a purchase message from a buyer to a seller on ${input.platform}.

LISTING:
- Title: "${input.listingTitle}"
- Asking Price: $${input.askingPrice}
${conditionLine}
${sellerRef}
${offerLine}
${contextLine}

TONE: ${TONE_DESCRIPTIONS[tone]}

MESSAGE TYPE: ${MESSAGE_TYPE_INSTRUCTIONS[input.messageType || 'inquiry']}

RESPOND WITH ONLY VALID JSON:
{
  "subject": "<short subject line, max 60 chars>",
  "body": "<the message body, 2-4 sentences>"
}`;
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

  // If no API key, use fallback immediately
  if (!process.env.OPENAI_API_KEY) {
    return generateFallbackMessage(input, messageType, tone);
  }

  try {
    const client = getOpenAI();
    const prompt = buildMessagePrompt(input, tone);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert marketplace buyer writing purchase messages to sellers. Always respond with valid JSON only, no markdown formatting.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const responseText = response.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from message generation response:', responseText);
      return generateFallbackMessage(input, messageType, tone);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      subject: parsed.subject || buildFallbackSubject(input, messageType),
      body: parsed.body || buildFallbackBody(input, messageType, tone),
      messageType,
      platform: input.platform,
      tone,
      isFallback: false,
    };
  } catch (error) {
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
