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

// Firebase config — public values, safe to include in client bundle.
// TODO: Fill in apiKey, authDomain, messagingSenderId, and appId from
// Firebase Console > Project Settings > General > Your apps after
// completing Task 1 manual setup.
try {
  firebase.initializeApp({
    apiKey: 'TODO_FIREBASE_API_KEY',
    authDomain: 'axovia-flipper.firebaseapp.com',
    projectId: 'axovia-flipper',
    storageBucket: 'axovia-flipper.firebasestorage.app',
    messagingSenderId: 'TODO_MESSAGING_SENDER_ID',
    appId: 'TODO_FIREBASE_APP_ID',
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
  console.warn('[FCM SW] Firebase initialization failed — fill in config values after Task 1:', e.message || e);
}
