'use client';

/**
 * Firebase Cloud Messaging — Client-side helpers
 *
 * All firebase/messaging imports use dynamic import() to prevent SSR crashes.
 * The firebase/messaging module references browser globals (self, navigator)
 * at import time, which breaks during server-side rendering.
 *
 * This module is infrastructure-only (Story 1.7). User-facing notification
 * features are implemented in Epic 11.
 */

import type { MessagePayload, Messaging } from 'firebase/messaging';

let messagingInstance: Messaging | null = null;

/**
 * Get the FCM Messaging singleton instance.
 * Returns null when running on the server or in unsupported browsers.
 */
export async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;

  if (messagingInstance) return messagingInstance;

  try {
    const { getMessaging } = await import('firebase/messaging');
    const { firebaseApp } = await import('./config');
    messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch {
    return null;
  }
}

/**
 * Request browser notification permission.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof Notification === 'undefined') return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Get the FCM device token for this browser.
 * Requires notification permission to be granted first.
 * Returns the token string, or null if unavailable.
 */
export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function, or a no-op if messaging is unavailable.
 */
export async function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};

    const { onMessage } = await import('firebase/messaging');
    return onMessage(messaging, callback);
  } catch {
    return () => {};
  }
}
