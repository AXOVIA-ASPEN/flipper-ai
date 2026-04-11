/**
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background push notifications when the app is not in the foreground.
 * This is a stub — actual notification routing/customization is deferred to Epic 11.
 *
 * IMPORTANT: This file must remain at public/firebase-messaging-sw.js
 * so it registers at the root scope (/) for FCM to work correctly.
 */

// Version must match firebase package in package.json
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

// Firebase config — public values, safe to hardcode in service worker.
// NOTE: Service workers cannot access process.env at runtime. These values
// must be literal strings. Replace the TODO strings with values from:
// Firebase Console → Project Settings → General → Your apps → Web App → Config
// (matches NEXT_PUBLIC_FIREBASE_API_KEY, _MESSAGING_SENDER_ID, _APP_ID in .env.local)
try {
  firebase.initializeApp({
    apiKey: 'AIzaSyDUbLTQogeNg5YZzrIF0ATZJ_YvBbtF3Ls',
    authDomain: 'axovia-flipper.firebaseapp.com',
    projectId: 'axovia-flipper',
    storageBucket: 'axovia-flipper.firebasestorage.app',
    messagingSenderId: '45047000631',
    appId: '1:45047000631:web:56aa94d525f688245599b2',
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const title = notification.title || 'Flipper AI';
    const options = {
      body: notification.body || 'New notification',
      icon: '/icon-192x192.png',
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn('[FCM SW] Firebase initialization failed:', e.message || e);
}
