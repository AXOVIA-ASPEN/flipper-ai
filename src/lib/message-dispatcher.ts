/**
 * @file src/lib/message-dispatcher.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Stub dispatcher for sending messages to marketplace platforms.
 *
 * @description
 * Validates that a message exists and is in SENT status, then logs the
 * dispatch intent. Does NOT update message status or generate content.
 * Returns a DispatchResult indicating success/failure with stub flag.
 *
 * WARNING: Fire-and-forget is stub-only. Real dispatch needs a durable
 * job queue with retry and FAILED_DISPATCH status.
 */

import prisma from '@/lib/db';

export interface DispatchResult {
  success: boolean;
  stub: boolean;
  error?: string;
}

export async function dispatchMessage(messageId: string): Promise<DispatchResult> {
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message) {
    console.warn(`[message-dispatcher] Message ${messageId} not found`);
    return { success: false, stub: true, error: 'not_found' };
  }

  if (message.status !== 'SENT') {
    console.warn(`[message-dispatcher] Message ${messageId} not SENT (status: ${message.status})`);
    return { success: false, stub: true, error: 'invalid_status' };
  }

  // STUB — Replace with real platform dispatch (Craigslist email relay, eBay API, etc.)
  // WARNING: Fire-and-forget is stub-only. Real dispatch needs a durable job queue with retry and FAILED_DISPATCH status.
  console.log(`[message-dispatcher] STUB: Would dispatch ${messageId} to ${message.platform} for ${message.sellerName}`);
  return { success: true, stub: true };
}
