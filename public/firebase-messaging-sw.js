/* eslint-disable no-undef */
// Firebase Cloud Messaging background service worker.
// Runs even when the tab is closed (as long as the browser process is alive),
// which is how the expert gets notified of incoming calls without the portal open.

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Required for Chrome/Android "Add to Home Screen" / installability criteria
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

function isIncomingCallData(data) {
  if (!data) return false;
  return (
    data.type === "incoming_call" ||
    data.type === "call" ||
    Boolean(data.callId)
  );
}

function buildIncomingCallPayload(data) {
  return {
    callId: data.callId || "",
    callerName: data.callerName || "A user",
    callerAvatar: data.callerAvatar || "",
    pricePerMinute: data.pricePerMinute || "",
  };
}

function buildCallDeepLink(data) {
  const payload = buildIncomingCallPayload(data);
  const q = new URLSearchParams({
    incoming: "1",
    callId: payload.callId,
    callerName: payload.callerName,
  });
  if (payload.callerAvatar) q.set("callerAvatar", payload.callerAvatar);
  if (payload.pricePerMinute) q.set("pricePerMinute", String(payload.pricePerMinute));
  return `/calls?${q.toString()}`;
}

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = payload.notification?.title || data.title || "SerenityExpert";
    const body = payload.notification?.body || data.body || "You have a new update";
    const isCall = isIncomingCallData(data);

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: isCall && data.callId ? `call-${data.callId}` : undefined,
      requireInteraction: isCall,
      vibrate: isCall ? [300, 100, 300, 100, 300] : [100, 50, 100],
      silent: false,
      data,
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  let targetUrl = "/notifications";
  let incomingPayload = null;

  if (data.type === "chat" || (data.chatId && !isIncomingCallData(data))) {
    targetUrl = data.chatId ? `/chats?chat=${data.chatId}` : "/chats";
  } else if (isIncomingCallData(data)) {
    incomingPayload = buildIncomingCallPayload(data);
    targetUrl = buildCallDeepLink(data);
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));

      if (existing) {
        // Tell the open portal to show Accept/Reject banner immediately
        if (incomingPayload?.callId) {
          existing.postMessage({
            type: "INCOMING_CALL",
            payload: incomingPayload,
          });
        }
        await existing.focus();
        if (existing.navigate) {
          return existing.navigate(targetUrl);
        }
        return undefined;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
