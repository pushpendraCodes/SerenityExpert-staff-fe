import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerFcmToken } from "@/store/slices/authSlice";
import { setIncomingCall } from "@/store/slices/callSlice";
import { requestFcmToken, listenForegroundMessages } from "@/lib/firebase";

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

/**
 * Registers this device for push notifications and restores the incoming-call
 * banner when the expert taps a call push (deep link or SW postMessage).
 */
export function FcmRegistration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const registeredRef = useRef(false);

  // Deep link from push click: /calls?incoming=1&callId=...
  useEffect(() => {
    if (!isAuthenticated) return;
    const incoming = parseIncomingFromSearch(location.search);
    if (!incoming) return;

    dispatch(setIncomingCall(incoming));
    // Clean query so refresh doesn't re-open a stale banner forever
    navigate("/calls", { replace: true });
  }, [isAuthenticated, location.search, dispatch, navigate]);

  // SW postMessage when portal was already open in background
  useEffect(() => {
    if (!isAuthenticated || !("serviceWorker" in navigator)) return;

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type !== "INCOMING_CALL" || !data.payload?.callId) return;
      dispatch(
        setIncomingCall({
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

    (async () => {
      const token = await requestFcmToken();
      if (token) dispatch(registerFcmToken(token));
    })();

    const unsubscribePromise = listenForegroundMessages(({ title, body, data }) => {
      if (isIncomingCallPush(data) && data?.callId) {
        dispatch(
          setIncomingCall({
            callId: data.callId,
            callerName: data.callerName || "A user",
            callerAvatar: data.callerAvatar,
            pricePerMinute: data.pricePerMinute ? Number(data.pricePerMinute) : undefined,
          })
        );
        navigate("/calls");
      }
      if (document.hidden && Notification.permission === "granted" && title) {
        new Notification(title, { body, data });
      }
    });

    return () => {
      registeredRef.current = false;
      unsubscribePromise.then((unsub) => unsub?.());
    };
  }, [isAuthenticated, dispatch, navigate]);

  return null;
}
