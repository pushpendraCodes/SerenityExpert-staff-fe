import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerFcmToken } from "@/store/slices/authSlice";
import { setIncomingCall } from "@/store/slices/callSlice";
import { requestFcmToken, listenForegroundMessages } from "@/lib/firebase";

/**
 * Registers this device for push notifications so the expert still gets
 * notified of an incoming call (with sound, via the OS) even if the staff
 * portal tab is closed or the browser doesn't have focus.
 *
 * Background/closed-tab pushes are shown by the service worker
 * (public/firebase-messaging-sw.js). This component also listens for
 * foreground pushes as a fallback in case the socket event is missed.
 */
export function FcmRegistration() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registeredRef.current) return;
    registeredRef.current = true;

    (async () => {
      const token = await requestFcmToken();
      console.log("token", token);
      if (token) dispatch(registerFcmToken(token));
    })();

    const unsubscribePromise = listenForegroundMessages(({ title, body, data }) => {
      if (data?.type === "incoming_call" && data.callId) {
        dispatch(
          setIncomingCall({
            callId: data.callId,
            callerName: data.callerName || "A user",
            callerAvatar: data.callerAvatar,
            pricePerMinute: data.pricePerMinute ? Number(data.pricePerMinute) : undefined,
          })
        );
      }
      if (document.hidden && Notification.permission === "granted" && title) {
        new Notification(title, { body });
      }
    });

    return () => {
      registeredRef.current = false;
      unsubscribePromise.then((unsub) => unsub?.());
    };
  }, [isAuthenticated, dispatch]);

  return null;
}
