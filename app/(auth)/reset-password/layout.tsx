/**
 * @file app/(auth)/reset-password/layout.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Reset-password route layout — emits no-referrer header.
 *
 * @description
 * Per-route Next.js layout that overrides the default referrer policy to
 * "no-referrer" for the password reset page so the one-time reset token in
 * the URL is never leaked through Referer headers when the user clicks
 * outbound links from the page. Renders children unchanged.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  other: {
    referrer: 'no-referrer',
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
