import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setIncomingCall, setTimer, markPeerEnded } from "@/store/slices/callSlice";
import { addMessage } from "@/store/slices/chatSlice";
import { fetchNotifications } from "@/store/slices/notificationSlice";
import type { Message } from "@/types";

export function SocketListener() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const bind = () => {
      const socket = getSocket();
      if (!socket) return () => undefined;

      const onIncoming = (payload: {
        callId: string;
        callerName: string;
        callerAvatar?: string;
        pricePerMinute?: number;
      }) => {
        dispatch(setIncomingCall(payload));
      };
      const onEnded = () => {
        dispatch(setIncomingCall(null));
        dispatch(markPeerEnded());
      };
      const onCancelled = () => {
        dispatch(setIncomingCall(null));
      };
      const onTimer = (data: { elapsed: number; cost: number; balance: number }) => {
        dispatch(setTimer(data));
      };
      const onMessage = (data: { chatId: string; message: Message }) => {
        const msg = data?.message;
        if (!msg) return;
        // Ensure chatId is present (some payloads only nest it on the wrapper)
        dispatch(addMessage({ ...msg, chatId: msg.chatId || data.chatId }));
      };
      const onNotify = () => {
        dispatch(fetchNotifications(1));
      };

      socket.on("call:incoming", onIncoming);
      socket.on("call:ended", onEnded);
      socket.on("call:rejected", onEnded);
      socket.on("call:cancelled", onCancelled);
      socket.on("call:timer", onTimer);
      socket.on("message:received", onMessage);
      socket.on("notification:new", onNotify);

      return () => {
        socket.off("call:incoming", onIncoming);
        socket.off("call:ended", onEnded);
        socket.off("call:rejected", onEnded);
        socket.off("call:cancelled", onCancelled);
        socket.off("call:timer", onTimer);
        socket.off("message:received", onMessage);
        socket.off("notification:new", onNotify);
      };
    };

    let unbind = bind();
    const socket = getSocket();
    const onConnect = () => {
      unbind?.();
      unbind = bind();
    };
    socket?.on("connect", onConnect);

    return () => {
      unbind?.();
      socket?.off("connect", onConnect);
    };
  }, [dispatch, isAuthenticated, token]);

  return null;
}
