/**
 * Firebase Cloud Messaging — Server-side helpers (Admin SDK)
 *
 * Uses the modern messaging.send() API, NOT the deprecated
 * sendToDevice()/sendToTopic() methods.
 *
 * On Cloud Run: Uses ADC from the service account automatically.
 * On local: Requires `gcloud auth application-default login` or
 * GOOGLE_APPLICATION_CREDENTIALS env var.
 *
 * This module is infrastructure-only (Story 1.7). Actual notification
 * sending is implemented in Epic 10/11.
 */

import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { adminApp } from './admin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  clickAction?: string;
}

let messagingAdmin: Messaging | null = null;

/**
 * Get the Firebase Admin Messaging singleton.
 * Returns null if Admin SDK credentials are not configured.
 */
export function getMessagingAdmin(): Messaging | null {
  if (messagingAdmin) return messagingAdmin;

  try {
    messagingAdmin = getMessaging(adminApp);
    return messagingAdmin;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === 'app/no-app' || code === 'app/invalid-credential') {
      console.warn(
        'Firebase Admin credentials not configured — FCM send unavailable. ' +
          'Run gcloud auth application-default login for local development.'
      );
    } else {
      console.warn('FCM Admin messaging initialization failed:', error);
    }
    return null;
  }
}

/**
 * Send a push notification to a specific device token.
 * Uses the modern messaging.send() API with token field at top level.
 *
 * @returns The message ID string on success, or null on failure.
 */
export async function sendToDevice(
  token: string,
  payload: NotificationPayload
): Promise<string | null> {
  const messaging = getMessagingAdmin();
  if (!messaging) return null;

  try {
    const messageId = await messaging.send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });
    return messageId;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/registration-token-not-registered'
    ) {
      console.warn(`Stale FCM token detected (${code}): ${token.slice(0, 10)}...`);
    } else {
      console.warn('FCM sendToDevice failed:', error);
    }
    return null;
  }
}

/**
 * Send a push notification to a topic.
 * Uses the modern messaging.send() API with topic field.
 *
 * @returns The message ID string on success, or null on failure.
 */
export async function sendToTopic(
  topic: string,
  payload: NotificationPayload
): Promise<string | null> {
  const messaging = getMessagingAdmin();
  if (!messaging) return null;

  try {
    const messageId = await messaging.send({
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });
    return messageId;
  } catch (error) {
    console.warn('FCM sendToTopic failed:', error);
    return null;
  }
}
