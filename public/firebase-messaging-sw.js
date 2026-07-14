/* eslint-disable no-undef */
// Firebase Cloud Messaging background service worker.
// Runs even when the tab is closed (as long as the browser process is alive),
// which is how the expert gets notified of incoming calls without the portal open.

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Vite can't inject build-time env vars into a static /public file, so the
// Firebase web config is passed in as query params when the SW is registered
// (see src/lib/firebase.ts requestFcmToken()).
const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || "SerenityExpert";
    const body = payload.notification?.body || payload.data?.body || "You have a new update";
    const isCall = payload.data?.type === "incoming_call";

    self.registration.showNotification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: isCall ? `call-${payload.data?.callId}` : undefined,
      requireInteraction: isCall,
      data: payload.data || {},
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let targetUrl = "/notifications";
  if (data.type === "chat" || data.chatId) {
    targetUrl = data.chatId ? `/chats?chat=${data.chatId}` : "/chats";
  } else if (data.type === "call" || data.type === "incoming_call" || data.callId) {
    targetUrl = "/calls";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate ? existing.navigate(targetUrl) : undefined;
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
