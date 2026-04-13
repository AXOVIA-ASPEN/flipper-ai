/**
 * @file src/lib/ai/prompts/messaging.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Prompt config for AI-powered purchase message generation.
 *
 * @description
 * Contains the purchaseMessage prompt configuration extracted from
 * message-generator.ts. Generates personalized buyer-to-seller messages
 * with platform-appropriate tone (casual/friendly/professional) and
 * support for multiple message types (inquiry, offer, follow-up, negotiation).
 */

import type { PromptConfig } from './types';

const TONE_DESCRIPTIONS: Record<string, string> = {
  casual:
    'Keep it short and casual, like texting a neighbor. Use simple language, mention local pickup if relevant. No formal greetings.',
  friendly:
    'Be warm and conversational, like messaging a friend of a friend. Use a friendly greeting, show genuine interest.',
  professional:
    'Be professional and courteous. Use proper grammar, a polite greeting, and clear structure. Mention shipping if relevant.',
};

const MESSAGE_TYPE_INSTRUCTIONS: Record<string, string> = {
  inquiry:
    'Write a message asking about the item. Express interest, ask relevant questions about condition, availability, or details not in the listing.',
  offer:
    'Write a message making a purchase offer. State the offer price clearly, explain why it is fair, and express readiness to complete the transaction quickly.',
  'follow-up':
    'Write a polite follow-up message to a previous inquiry that received no response. Reference the original interest without being pushy.',
  negotiation:
    "Write a counter-offer or negotiation message. Acknowledge the seller's position, propose a compromise price, and provide reasoning.",
};

export const purchaseMessage: PromptConfig = {
  name: 'purchaseMessage',
  description:
    'Generates personalized purchase messages from buyer to seller with platform-appropriate tone and message type support.',
  provider: 'groq',
  fallbacks: ['gemini', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 400,
  responseFormat: 'json',
  systemPrompt:
    'You are an expert marketplace buyer writing purchase messages to sellers. Always respond with valid JSON only, no markdown formatting.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const listingTitle = String(context.listingTitle ?? '');
    const askingPrice = context.askingPrice as number;
    const platform = String(context.platform ?? '');
    const sellerName = context.sellerName as string | null | undefined;
    const messageType = String(context.messageType ?? 'inquiry');
    const offerPrice = context.offerPrice as number | null | undefined;
    const itemCondition = context.itemCondition as string | null | undefined;
    const additionalContext = context.additionalContext as string | null | undefined;
    const tone = String(context.tone ?? 'professional');

    const sellerRef = sellerName ? `The seller's name is "${sellerName}".` : 'The seller name is unknown.';
    const offerLine =
      messageType === 'offer' && offerPrice
        ? `The buyer wants to offer $${offerPrice}.`
        : '';
    const conditionLine = itemCondition
      ? `Listed condition: ${itemCondition}.`
      : '';
    const contextLine = additionalContext
      ? `Additional context from the buyer: ${additionalContext}`
      : '';

    return `You are writing a purchase message from a buyer to a seller on ${platform}.

LISTING:
- Title: "${listingTitle}"
- Asking Price: $${askingPrice}
${conditionLine}
${sellerRef}
${offerLine}
${contextLine}

TONE: ${TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professional}

MESSAGE TYPE: ${MESSAGE_TYPE_INSTRUCTIONS[messageType] || MESSAGE_TYPE_INSTRUCTIONS.inquiry}

RESPOND WITH ONLY VALID JSON:
{
  "subject": "<short subject line, max 60 chars>",
  "body": "<the message body, 2-4 sentences>"
}`;
  },
};
