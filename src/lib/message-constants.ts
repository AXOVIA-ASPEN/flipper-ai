/**
 * @file src/lib/message-constants.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Shared message status badge colors and constants.
 *
 * @description
 * Centralizes message status display colors used across MessageBubble,
 * MessageApprovalCard, and other message-related components.
 */

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300',
  PENDING_APPROVAL: 'bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  SENT: 'bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  DELIVERED: 'bg-green-200 text-green-700 dark:bg-green-900 dark:text-green-300',
  READ: 'bg-purple-200 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  REPLIED: 'bg-teal-200 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  FAILED: 'bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-300',
  REJECTED: 'bg-slate-300 text-slate-700 line-through dark:bg-slate-700 dark:text-slate-300',
};
