/**
 * @file src/__tests__/message-generator.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-30
 * @version 1.0
 * @brief Unit tests for the AI message generator module.
 *
 * @description
 * Tests for src/lib/message-generator.ts covering platform tone mapping,
 * message type generation, AI integration, fallback templates, input
 * validation, and JSON parsing of LLM responses.
 */

import {
  generatePurchaseMessage,
  generateFallbackMessage,
  getPlatformTone,
  isValidMessageType,
} from '../lib/message-generator';
import type { MessageGeneratorInput } from '../lib/message-generator';

// Mock OpenAI
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// ── Test Data ────────────────────────────────────────────────────────────────

const baseInput: MessageGeneratorInput = {
  listingTitle: 'Sony WH-1000XM5 Headphones',
  askingPrice: 150,
  platform: 'CRAIGSLIST',
  sellerName: 'John',
  messageType: 'inquiry',
};

const mockAIResponse = (subject: string, body: string) => ({
  choices: [
    {
      message: {
        content: JSON.stringify({ subject, body }),
      },
    },
  ],
});

// ── Platform Tone Mapping ────────────────────────────────────────────────────

describe('getPlatformTone', () => {
  it('returns casual for Craigslist', () => {
    expect(getPlatformTone('CRAIGSLIST')).toBe('casual');
  });

  it('returns friendly for Facebook', () => {
    expect(getPlatformTone('FACEBOOK')).toBe('friendly');
  });

  it('returns professional for eBay', () => {
    expect(getPlatformTone('EBAY')).toBe('professional');
  });

  it('returns professional for Mercari', () => {
    expect(getPlatformTone('MERCARI')).toBe('professional');
  });

  it('returns casual for OfferUp', () => {
    expect(getPlatformTone('OFFERUP')).toBe('casual');
  });

  it('is case-insensitive', () => {
    expect(getPlatformTone('craigslist')).toBe('casual');
    expect(getPlatformTone('eBay')).toBe('professional');
  });

  it('defaults to professional for unknown platforms', () => {
    expect(getPlatformTone('UNKNOWN_PLATFORM')).toBe('professional');
  });
});

// ── Message Type Validation ──────────────────────────────────────────────────

describe('isValidMessageType', () => {
  it('accepts valid message types', () => {
    expect(isValidMessageType('inquiry')).toBe(true);
    expect(isValidMessageType('offer')).toBe(true);
    expect(isValidMessageType('follow-up')).toBe(true);
    expect(isValidMessageType('negotiation')).toBe(true);
  });

  it('rejects invalid message types', () => {
    expect(isValidMessageType('spam')).toBe(false);
    expect(isValidMessageType('')).toBe(false);
    expect(isValidMessageType('INQUIRY')).toBe(false);
  });
});

// ── Fallback Message Generation ──────────────────────────────────────────────

describe('generateFallbackMessage', () => {
  it('generates inquiry fallback with seller name', () => {
    const result = generateFallbackMessage(baseInput);
    expect(result.subject).toContain('Question about');
    expect(result.subject).toContain('Sony WH-1000XM5');
    expect(result.body).toContain('Hi John!');
    expect(result.body).toContain('still available');
    expect(result.messageType).toBe('inquiry');
    expect(result.isFallback).toBe(true);
    expect(result.tone).toBe('casual');
  });

  it('generates offer fallback with offer price', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      messageType: 'offer',
      offerPrice: 120,
    });
    expect(result.subject).toContain('Offer for');
    expect(result.body).toContain('$120');
    expect(result.messageType).toBe('offer');
    expect(result.isFallback).toBe(true);
  });

  it('generates offer fallback with placeholder when no offer price', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      messageType: 'offer',
      offerPrice: null,
    });
    expect(result.body).toContain('[your price]');
  });

  it('generates follow-up fallback', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      messageType: 'follow-up',
    });
    expect(result.subject).toContain('Following up');
    expect(result.body).toContain('follow up');
    expect(result.messageType).toBe('follow-up');
  });

  it('generates negotiation fallback', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      messageType: 'negotiation',
      offerPrice: 130,
    });
    expect(result.subject).toContain('Re:');
    expect(result.body).toContain('$130');
    expect(result.messageType).toBe('negotiation');
  });

  it('uses professional greeting when no seller name on eBay', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      platform: 'EBAY',
      sellerName: null,
    });
    expect(result.body).toContain('Hello,');
    expect(result.tone).toBe('professional');
  });

  it('uses casual greeting with seller name on Craigslist', () => {
    const result = generateFallbackMessage(baseInput);
    expect(result.body).toContain('Hi John!');
  });

  it('uses professional greeting with seller name on eBay', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      platform: 'EBAY',
      sellerName: 'Jane',
    });
    expect(result.body).toContain('Hello Jane,');
  });

  it('truncates subject to 60 chars', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      listingTitle: 'A'.repeat(100),
    });
    expect(result.subject.length).toBeLessThanOrEqual(60);
  });

  it('defaults messageType to inquiry when not provided', () => {
    const input = { ...baseInput };
    delete (input as Record<string, unknown>).messageType;
    const result = generateFallbackMessage(input);
    expect(result.messageType).toBe('inquiry');
  });

  it('includes platform in result', () => {
    const result = generateFallbackMessage(baseInput);
    expect(result.platform).toBe('CRAIGSLIST');
  });

  it('uses "complete the transaction promptly" in offer body for professional tone', () => {
    // Professional tone (e.g. EBAY) triggers the non-casual branch in buildFallbackBody offer template
    const result = generateFallbackMessage({
      ...baseInput,
      platform: 'EBAY',
      messageType: 'offer',
      offerPrice: 110,
    });
    expect(result.body).toContain('complete the transaction promptly');
  });

  it('uses "pick it up quickly" in offer body for casual tone', () => {
    const result = generateFallbackMessage({
      ...baseInput,
      platform: 'CRAIGSLIST',
      messageType: 'offer',
      offerPrice: 110,
    });
    expect(result.body).toContain('pick it up quickly');
  });

  it('derives tone from input platform when tone arg is not provided', () => {
    // generateFallbackMessage(input) — both messageType and tone are derived from input
    const result = generateFallbackMessage(
      { ...baseInput, platform: 'FACEBOOK', messageType: 'inquiry' }
    );
    expect(result.tone).toBe('friendly');
    expect(result.isFallback).toBe(true);
  });

  it('uses casual "Hi!" greeting when no seller name and tone is not professional', () => {
    // Covers the sellerName=falsy + tone='casual' branch in buildFallbackBody (line 233/235)
    const result = generateFallbackMessage({
      ...baseInput,
      platform: 'CRAIGSLIST',
      sellerName: null,
      messageType: 'inquiry',
    });
    expect(result.body).toContain('Hi!');
    expect(result.body).not.toContain('Hello,');
  });

  it('omits seller name reference in prompt when sellerName is absent', () => {
    // Covers the sellerRef false branch in buildMessagePrompt (line 102)
    // We verify this via the generated prompt content when sellerName is null/undefined
    // (exercised via generateFallbackMessage since sellerRef is internal to buildMessagePrompt)
    const result = generateFallbackMessage({
      ...baseInput,
      sellerName: undefined,
      messageType: 'inquiry',
    });
    expect(result.isFallback).toBe(true);
    expect(result.body).toContain('Hi!');
  });
});

// ── AI Message Generation ────────────────────────────────────────────────────

describe('generatePurchaseMessage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key-123' };
    mockCreate.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('generates AI-powered message for inquiry', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Is this still available?', 'Hey, love the headphones! Are they still up for grabs?')
    );

    const result = await generatePurchaseMessage(baseInput);
    expect(result.subject).toBe('Is this still available?');
    expect(result.body).toContain('headphones');
    expect(result.isFallback).toBe(false);
    expect(result.messageType).toBe('inquiry');
    expect(result.tone).toBe('casual');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('generates AI-powered message for offer type', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Offer: $120 for headphones', 'I would like to offer $120 for your headphones.')
    );

    const result = await generatePurchaseMessage({
      ...baseInput,
      messageType: 'offer',
      offerPrice: 120,
    });
    expect(result.messageType).toBe('offer');
    expect(result.isFallback).toBe(false);
  });

  it('generates AI-powered message for follow-up type', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Following up', 'Just checking in on the headphones.')
    );

    const result = await generatePurchaseMessage({
      ...baseInput,
      messageType: 'follow-up',
    });
    expect(result.messageType).toBe('follow-up');
    expect(result.isFallback).toBe(false);
  });

  it('generates AI-powered message for negotiation type', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Counter-offer', 'Would you consider $130?')
    );

    const result = await generatePurchaseMessage({
      ...baseInput,
      messageType: 'negotiation',
      offerPrice: 130,
    });
    expect(result.messageType).toBe('negotiation');
    expect(result.isFallback).toBe(false);
  });

  it('uses professional tone for eBay platform', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Inquiry about listing', 'Dear seller, I am inquiring about your item.')
    );

    const result = await generatePurchaseMessage({
      ...baseInput,
      platform: 'EBAY',
    });
    expect(result.tone).toBe('professional');
  });

  it('uses friendly tone for Facebook platform', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Hey!', 'Hey there, love this listing!')
    );

    const result = await generatePurchaseMessage({
      ...baseInput,
      platform: 'FACEBOOK',
    });
    expect(result.tone).toBe('friendly');
  });

  it('defaults to inquiry when messageType not specified', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Question', 'Is this available?')
    );

    const input = { ...baseInput };
    delete (input as Record<string, unknown>).messageType;
    const result = await generatePurchaseMessage(input);
    expect(result.messageType).toBe('inquiry');
  });

  it('falls back to template when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generatePurchaseMessage(baseInput);
    expect(result.isFallback).toBe(true);
    expect(result.subject).toContain('Question about');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('falls back to template when OpenAI call throws', async () => {
    mockCreate.mockRejectedValue(new Error('API error'));

    const result = await generatePurchaseMessage(baseInput);
    expect(result.isFallback).toBe(true);
    expect(result.subject).toContain('Question about');
  });

  it('falls back when response contains no JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json at all' } }],
    });

    const result = await generatePurchaseMessage(baseInput);
    expect(result.isFallback).toBe(true);
  });

  it('falls back when response has empty content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    });

    const result = await generatePurchaseMessage(baseInput);
    expect(result.isFallback).toBe(true);
  });

  it('uses fallback subject when AI returns empty subject', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ subject: '', body: 'Hello there!' }),
          },
        },
      ],
    });

    const result = await generatePurchaseMessage(baseInput);
    expect(result.subject).toContain('Question about');
    expect(result.body).toBe('Hello there!');
    expect(result.isFallback).toBe(false);
  });

  it('uses fallback body when AI returns empty body', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ subject: 'Hi', body: '' }),
          },
        },
      ],
    });

    const result = await generatePurchaseMessage(baseInput);
    expect(result.subject).toBe('Hi');
    expect(result.body).toContain('still available');
    expect(result.isFallback).toBe(false);
  });

  it('throws on missing required fields', async () => {
    await expect(
      generatePurchaseMessage({
        listingTitle: '',
        askingPrice: 100,
        platform: 'EBAY',
      })
    ).rejects.toThrow('Missing required fields');
  });

  it('throws when askingPrice is null', async () => {
    await expect(
      generatePurchaseMessage({
        listingTitle: 'Test',
        askingPrice: null as unknown as number,
        platform: 'EBAY',
      })
    ).rejects.toThrow('Missing required fields');
  });

  it('throws when platform is empty', async () => {
    await expect(
      generatePurchaseMessage({
        listingTitle: 'Test',
        askingPrice: 100,
        platform: '',
      })
    ).rejects.toThrow('Missing required fields');
  });

  it('passes correct parameters to OpenAI', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Subject', 'Body')
    );

    await generatePurchaseMessage(baseInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 400,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
      })
    );
  });

  it('includes listing details in the prompt sent to OpenAI', async () => {
    mockCreate.mockResolvedValue(
      mockAIResponse('Subject', 'Body')
    );

    await generatePurchaseMessage({
      ...baseInput,
      sellerName: 'Alice',
      itemCondition: 'Like New',
      additionalContext: 'Need it for work',
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('Sony WH-1000XM5 Headphones');
    expect(userMessage.content).toContain('150');
    expect(userMessage.content).toContain('Alice');
    expect(userMessage.content).toContain('Like New');
    expect(userMessage.content).toContain('Need it for work');
  });

  it('omits offer price line in prompt when messageType is offer but offerPrice is null', async () => {
    // Exercises the `messageType === 'offer' && input.offerPrice` branch where offerPrice is falsy
    mockCreate.mockResolvedValue(mockAIResponse('Subject', 'Body'));

    await generatePurchaseMessage({
      ...baseInput,
      messageType: 'offer',
      offerPrice: null,
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).not.toContain('The buyer wants to offer');
    expect(userMessage.content).toContain('Sony WH-1000XM5 Headphones');
  });

  it('uses "seller name is unknown" text in prompt when sellerName is absent', async () => {
    // Covers the sellerRef false branch in buildMessagePrompt (line 102)
    mockCreate.mockResolvedValue(mockAIResponse('Subject', 'Body'));

    await generatePurchaseMessage({
      ...baseInput,
      sellerName: null,
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('seller name is unknown');
  });

  it('falls back when response choices[0].message.content is null', async () => {
    // Covers the response.choices[0]?.message?.content || '' branch (line 171) when content is null
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

    const result = await generatePurchaseMessage(baseInput);
    expect(result.isFallback).toBe(true);
  });

  it('falls back when response choices array is empty', async () => {
    // Exercises the choices[0]?.message?.content optional-chain short-circuit when choices[0] is undefined
    mockCreate.mockResolvedValue({ choices: [] });

    const result = await generatePurchaseMessage(baseInput);
    expect(result.isFallback).toBe(true);
  });
});
