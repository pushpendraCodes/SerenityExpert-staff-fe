import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  register,
  onRegistered,
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
      "[FCM] Missing Firebase env. Staff portal needs VITE_FIREBASE_* keys in staff/.env (not NEXT_PUBLIC_*)."
    );
    return null;
  }
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[FCM] Service workers not available in this browser.");
    return null;
  }
  if (!(await isSupported().catch(() => false))) {
    console.warn("[FCM] Firebase Messaging is not supported in this browser.");
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
    `/firebase-messaging-sw.js?${swParams.toString()}`
  );
  await navigator.serviceWorker.ready;
  return swRegistration;
}

/**
 * Prefer the new register/onRegistered FID flow; fall back to getToken so
 * push still works if onRegistered never fires.
 */
async function obtainPushId(
  msg: Messaging,
  swRegistration: ServiceWorkerRegistration
): Promise<string | null> {
  const fid = await new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsub();
      resolve(value);
    };

    const timeout = setTimeout(() => finish(null), 8000);
    const unsub = onRegistered(msg, (id) => finish(id || null));

    register(msg, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    }).catch((err) => {
      console.warn("[FCM] register() failed:", err);
      finish(null);
    });
  });

  if (fid) return fid;

  // Fallback: classic FCM registration token (still accepted by Admin SDK)
  try {
    // getToken is deprecated but remains the reliable path for legacy token sends
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    return token || null;
  } catch (err) {
    console.warn("[FCM] getToken() fallback failed:", err);
    return null;
  }
}

/**
 * Registers the FCM service worker, asks for notification permission, and
 * returns a device push id (FID or FCM token) to send to the backend.
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
    const pushId = await obtainPushId(msg, swRegistration);
    if (!pushId) {
      console.warn("[FCM] Could not obtain push id (register + getToken both empty).");
    }
    return pushId;
  } catch (err) {
    console.warn("[FCM] token request failed:", err);
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function listenForegroundMessages(
  onMessageReceived: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
) {
  const msg = await getMessagingInstance();
  if (!msg) return () => undefined;

  return onMessage(msg, (payload) => {
    onMessageReceived({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data as Record<string, string> | undefined,
    });
  });
}
