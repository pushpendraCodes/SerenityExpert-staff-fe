import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerFcmToken } from "@/store/slices/authSlice";
import { openIncomingCallIfAvailable } from "@/store/slices/callSlice";
import {
  requestFcmToken,
  listenForegroundMessages,
  getNotificationPermission,
  isPushSupported,
} from "@/lib/firebase";

function parseIncomingFromSearch(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("incoming") !== "1") return null;
  const callId = params.get("callId");
  if (!callId) return null;
  return {
    callId,
    callerName: params.get("callerName") || "A user",
    callerAvatar: params.get("callerAvatar") || undefined,
    pricePerMinute: params.get("pricePerMinute")
      ? Number(params.get("pricePerMinute"))
      : undefined,
  };
}

function isIncomingCallPush(data?: Record<string, string>) {
  if (!data) return false;
  return data.type === "incoming_call" || data.type === "call" || Boolean(data.callId);
}

function showCallSystemNotification(title: string, body: string, data?: Record<string, string>) {
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title || "Incoming call", {
      body: body || "You have an incoming consultation call",
      icon: "/favicon.svg",
      tag: data?.callId ? `call-${data.callId}` : "incoming-call",
      requireInteraction: true,
      data,
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/**
 * Registers this device for push notifications and restores the incoming-call
 * banner when the expert taps a call push — only if the call is still ringing.
 */
export function FcmRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const registeredRef = useRef(false);
  const [permission, setPermission] = useState(getNotificationPermission());

  const registerPush = useCallback(async () => {
    const token = await requestFcmToken();
    setPermission(getNotificationPermission());
    if (token) {
      await dispatch(registerFcmToken(token));
      return true;
    }
    return false;
  }, [dispatch]);

  // Deep link from push click
  useEffect(() => {
    if (!isAuthenticated) return;
    const incoming = parseIncomingFromSearch(location.search);
    if (!incoming) return;

    void dispatch(openIncomingCallIfAvailable(incoming));
    navigate("/calls", { replace: true });
  }, [isAuthenticated, location.search, dispatch, navigate]);

  // SW postMessage when portal was already open
  useEffect(() => {
    if (!isAuthenticated || !("serviceWorker" in navigator)) return;

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type !== "INCOMING_CALL" || !data.payload?.callId) return;
      void dispatch(
        openIncomingCallIfAvailable({
          callId: String(data.payload.callId),
          callerName: data.payload.callerName || "A user",
          callerAvatar: data.payload.callerAvatar || undefined,
          pricePerMinute: data.payload.pricePerMinute
            ? Number(data.payload.pricePerMinute)
            : undefined,
        })
      );
      navigate("/calls");
    };

    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [isAuthenticated, dispatch, navigate]);

  useEffect(() => {
    if (!isAuthenticated || registeredRef.current) return;
    registeredRef.current = true;

    void registerPush();

    const unsubscribePromise = listenForegroundMessages(({ title, body, data }) => {
      if (isIncomingCallPush(data) && data?.callId) {
        // Always show a system notification for calls — even when the tab is open
        // (mobile users otherwise only hear the soft in-page ringtone).
        showCallSystemNotification(
          title || "Incoming consultation call",
          body || `${data.callerName || "A user"} is calling you`,
          data
        );
        try {
          navigator.vibrate?.([300, 100, 300, 100, 300]);
        } catch {
          /* ignore */
        }
        void dispatch(
          openIncomingCallIfAvailable({
            callId: data.callId,
            callerName: data.callerName || "A user",
            callerAvatar: data.callerAvatar,
            pricePerMinute: data.pricePerMinute ? Number(data.pricePerMinute) : undefined,
          })
        );
        navigate("/calls");
        return;
      }

      // Non-call pushes: only when tab is in background
      if (document.hidden && Notification.permission === "granted" && title) {
        new Notification(title, { body, data });
      }
    });

    return () => {
      registeredRef.current = false;
      unsubscribePromise.then((unsub) => unsub?.());
    };
  }, [isAuthenticated, dispatch, navigate, registerPush]);

  // Expose enable helper for the layout banner (user gesture)
  useEffect(() => {
    (window as unknown as { __enableStaffPush?: () => Promise<boolean> }).__enableStaffPush =
      async () => {
        const ok = await registerPush();
        setPermission(getNotificationPermission());
        return ok;
      };
    return () => {
      delete (window as unknown as { __enableStaffPush?: () => Promise<boolean> }).__enableStaffPush;
    };
  }, [registerPush]);

  // Re-check permission when returning to the tab
  useEffect(() => {
    const onFocus = () => setPermission(getNotificationPermission());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Hidden state for parent via custom event
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("staff-push-permission", {
        detail: { permission, supported: isPushSupported() },
      })
    );
  }, [permission]);

  return null;
}
