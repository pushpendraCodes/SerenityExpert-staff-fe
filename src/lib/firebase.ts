import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();

function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && vapidKey);
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseConfigured()) {
    console.warn(
      "[FCM] Missing Firebase env. Staff portal needs VITE_FIREBASE_* keys in Vercel (and staff/.env locally)."
    );
    return null;
  }
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[FCM] Service workers not available in this browser.");
    return null;
  }
  if (!(await isSupported().catch(() => false))) {
    console.warn("[FCM] Firebase Messaging is not supported in this browser (e.g. iOS Safari without PWA).");
    return null;
  }

  if (!app) {
    app = getApps()[0] || initializeApp(firebaseConfig);
  }
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const swParams = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || "",
    authDomain: firebaseConfig.authDomain || "",
    projectId: firebaseConfig.projectId || "",
    storageBucket: firebaseConfig.storageBucket || "",
    messagingSenderId: firebaseConfig.messagingSenderId || "",
    appId: firebaseConfig.appId || "",
  });
  const swRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${swParams.toString()}`,
    { scope: "/" }
  );
  await navigator.serviceWorker.ready;
  return swRegistration;
}

/**
 * Registers the FCM service worker, asks for notification permission, and
 * returns a classic FCM registration token (works with Firebase Admin SDK).
 */
export async function requestFcmToken(): Promise<string | null> {
  try {
    const msg = await getMessagingInstance();
    if (!msg) return null;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission not granted:", permission);
      return null;
    }

    const swRegistration = await registerServiceWorker();

    // Prefer getToken — returns tokens Firebase Admin can deliver to.
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn("[FCM] getToken() returned empty — check VAPID key & Firebase console Cloud Messaging.");
      return null;
    }

    console.info("[FCM] Token registered");
    return token;
  } catch (err) {
    console.warn("[FCM] token request failed:", err);
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    isFirebaseConfigured()
  );
}

export async function listenForegroundMessages(
  onMessageReceived: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
) {
  const msg = await getMessagingInstance();
  if (!msg) return () => undefined;

  return onMessage(msg, (payload) => {
    onMessageReceived({
      title: payload.notification?.title || (payload.data?.title as string | undefined),
      body: payload.notification?.body || (payload.data?.body as string | undefined),
      data: payload.data as Record<string, string> | undefined,
    });
  });
}
