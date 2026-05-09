import { NextResponse } from 'next/server';
import { getFirebasePublicConfig } from '@/lib/notifications/firebase-public-config';

export function GET() {
  const config = getFirebasePublicConfig();
  const body = `
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = ${JSON.stringify(config ? {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
} : null)};

if (firebaseConfig) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    self.registration.showNotification(data.title || 'Solara Plural', {
      body: data.body || 'You have a new update.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        url: data.url || '/notifications',
        notificationId: data.notificationId || null,
      },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil(clients.openWindow(url));
});
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  });
}
