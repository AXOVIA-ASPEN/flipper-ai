/**
 * @file src/components/messages/MessageBubble.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Single message display with direction-based styling.
 *
 * @description
 * Renders a message bubble aligned left for INBOUND messages and right
 * for OUTBOUND messages. Includes direction indicator with aria-label,
 * status badge, message body, and relative timestamp. REJECTED messages
 * show muted/strikethrough styling. Story 14.7 migration: bubble surfaces
 * use `.fp-glass-sm` with inline purple tint (outbound) or neutral tint
 * (inbound); copy colors use canonical inline hex tokens; legacy
 * light/dark prefixes removed (dark-first app post-Story 14.1).
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
        className="fp-glass-sm max-w-[80%] sm:max-w-[70%] rounded-lg px-4 py-3"
        style={{ background: isOutbound ? 'rgba(124,58,237,0.15)' : undefined }}
      >
        {/* Direction + status header */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-medium"
            style={{ color: isOutbound ? '#c4b5fd' : '#94a3b8' }}
            aria-label={isOutbound ? 'Sent message' : 'Received message'}
          >
            {isOutbound ? '↑ Sent' : '↓ Received'}
          </span>
          <span className={STATUS_COLORS[status] || 'fp-badge fp-badge-gray'}>
            {status}
          </span>
        </div>

        {/* Subject line */}
        {subject && (
          <p
            className="text-xs font-medium mb-1"
            style={{
              color: isRejected ? '#64748b' : '#94a3b8',
              textDecoration: isRejected ? 'line-through' : undefined,
            }}
          >
            {subject}
          </p>
        )}

        {/* Body */}
        <p
          className="text-sm whitespace-pre-wrap"
          style={{
            color: isRejected ? '#64748b' : '#e2e8f0',
            textDecoration: isRejected ? 'line-through' : undefined,
          }}
        >
          {body}
        </p>

        {/* Timestamp */}
        <p className="text-xs mt-1.5 text-right" style={{ color: '#64748b' }}>
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
