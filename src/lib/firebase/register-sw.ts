'use client';

/**
 * Firebase Cloud Messaging — Service Worker Registration
 *
 * Registers the FCM service worker at the root scope.
 * Do NOT auto-register on app load — call this function only when the
 * user explicitly opts into push notifications (Epic 11).
 */

/**
 * Register the FCM service worker.
 * Returns the ServiceWorkerRegistration on success, or null on failure.
 */
export async function registerFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );
    console.log('FCM service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('FCM service worker registration failed:', error);
    return null;
  }
}
