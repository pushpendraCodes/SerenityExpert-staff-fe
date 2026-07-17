import { useEffect } from "react";

/**
 * Registers the service worker early so the staff portal is installable as a PWA
 * (Chrome requires an active SW with a fetch handler).
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const cfg = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };

    const params = new URLSearchParams(cfg);
    void navigator.serviceWorker
      .register(`/firebase-messaging-sw.js?${params.toString()}`, { scope: "/" })
      .catch((err) => console.warn("[PWA] SW registration failed:", err));
  }, []);

  return null;
}
