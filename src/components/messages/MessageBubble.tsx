/**
 * @file src/components/messages/MessageBubble.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Single message display with direction-based styling.
 *
 * @description
 * Renders a message bubble aligned left for INBOUND messages and right
 * for OUTBOUND messages. Includes direction indicator with aria-label,
 * status badge, message body, and relative timestamp. REJECTED messages
 * show muted/strikethrough styling. Supports dark mode.
 */

import { formatDistanceToNow } from 'date-fns';
import { STATUS_COLORS } from '@/lib/message-constants';

interface MessageBubbleProps {
  direction: string;
  status: string;
  subject: string | null;
  body: string;
  createdAt: string;
}

export default function MessageBubble({
  direction,
  status,
  subject,
  body,
  createdAt,
}: MessageBubbleProps) {
  const isOutbound = direction === 'OUTBOUND';
  const isRejected = status === 'REJECTED';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-lg px-4 py-3 ${
          isOutbound
            ? 'bg-blue-100 dark:bg-blue-800'
            : 'bg-gray-100 dark:bg-gray-700'
        }`}
      >
        {/* Direction + status header */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-medium ${
              isOutbound
                ? 'text-blue-600 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label={isOutbound ? 'Sent message' : 'Received message'}
          >
            {isOutbound ? '↑ Sent' : '↓ Received'}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              STATUS_COLORS[status] || 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Subject line */}
        {subject && (
          <p
            className={`text-xs font-medium mb-1 ${
              isRejected
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {subject}
          </p>
        )}

        {/* Body */}
        <p
          className={`text-sm whitespace-pre-wrap ${
            isRejected
              ? 'text-gray-400 dark:text-gray-500 line-through'
              : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {body}
        </p>

        {/* Timestamp */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-right">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
