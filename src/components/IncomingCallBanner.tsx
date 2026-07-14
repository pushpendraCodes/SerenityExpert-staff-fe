import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Phone, PhoneOff } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { acceptCall, clearActiveCall, endCall, rejectCall, uploadCallRecording } from "@/store/slices/callSlice";
import { fetchDashboard } from "@/store/slices/dashboardSlice";
import { Button } from "./ui/Button";
import { formatDuration, formatINR } from "@/lib/utils";
import {
  createRingtone,
  getBeatLevels,
  openMicStream,
  startRecorder,
} from "@/lib/callMedia";

export function IncomingCallBanner() {
  const dispatch = useAppDispatch();
  const incoming = useAppSelector((s) => s.calls.incoming);
  const activeCall = useAppSelector((s) => s.calls.activeCall);
  const timer = useAppSelector((s) => s.calls.timer);
  const ending = useAppSelector((s) => s.calls.ending);
  const peerEnded = useAppSelector((s) => s.calls.peerEnded);

  const [levels, setLevels] = useState<number[]>(Array(12).fill(0.15));
  const [micError, setMicError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const rafRef = useRef<number | null>(null);
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const endingRef = useRef(false);

  // Ringtone for incoming
  useEffect(() => {
    if (!incoming || activeCall) {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
      return;
    }
    ringtoneRef.current = createRingtone();
    ringtoneRef.current.start();
    return () => {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
    };
  }, [incoming, activeCall]);

  // Lock page while in call or ringing banner
  useEffect(() => {
    const locked = Boolean(incoming || activeCall);
    if (!locked) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Best-effort block of refresh/close keyboard shortcuts. The browser's own
    // reload button can't be disabled from JS, but it still triggers
    // beforeunload above, which prompts the user before leaving.
    const onKeyDown = (e: KeyboardEvent) => {
      const isRefresh =
        e.key === "F5" || ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));
      const isClose = (e.ctrlKey || e.metaKey) && (e.key === "w" || e.key === "W");
      if (isRefresh || isClose) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown, true);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = "";
    };
  }, [incoming, activeCall]);

  // Mic + beat + recorder when active
  useEffect(() => {
    if (!activeCall) return;
    let cancelled = false;

    (async () => {
      try {
        const { stream, analyser, ctx } = await openMicStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
          return;
        }
        streamRef.current = stream;
        analyserRef.current = analyser;
        audioCtxRef.current = ctx;
        recorderRef.current = startRecorder(stream);
        const tick = () => {
          if (analyserRef.current) setLevels(getBeatLevels(analyserRef.current));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setMicError("Allow microphone access to take the call");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
      streamRef.current = null;
    };
  }, [activeCall]);

  const cleanupMedia = useCallback(async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    ringtoneRef.current?.stop();
    let blob: Blob | null = null;
    try {
      if (recorderRef.current) blob = await recorderRef.current.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void audioCtxRef.current?.close();
    streamRef.current = null;
    return blob;
  }, []);

  // User hung up — upload recording then clear
  useEffect(() => {
    if (!peerEnded || !activeCall || endingRef.current) return;
    (async () => {
      endingRef.current = true;
      const callId = activeCall._id;
      const blob = await cleanupMedia();
      if (blob && blob.size > 0) {
        setUploading(true);
        try {
          await dispatch(uploadCallRecording({ callId, blob }));
        } finally {
          setUploading(false);
        }
      }
      dispatch(clearActiveCall());
      await dispatch(fetchDashboard());
      endingRef.current = false;
    })();
  }, [peerEnded, activeCall, cleanupMedia, dispatch]);

  const onEnd = async () => {
    if (!activeCall || endingRef.current) return;
    endingRef.current = true;
    const callId = activeCall._id;
    const blob = await cleanupMedia();
    await dispatch(endCall(callId));
    if (blob && blob.size > 0) {
      setUploading(true);
      try {
        await dispatch(uploadCallRecording({ callId, blob }));
      } finally {
        setUploading(false);
      }
    }
    await dispatch(fetchDashboard());
    endingRef.current = false;
  };

  if (!incoming && !activeCall) return null;

  // Active call — fullscreen lock
  if (activeCall) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#0b1020] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.35),_transparent_55%)]" />
        <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Live consultation</p>
          <h1 className="mt-3 text-3xl font-bold">On call</h1>

          <div className="mt-10 flex h-28 items-end justify-center gap-1.5">
            {levels.map((level, i) => (
              <span
                key={i}
                className="w-2.5 rounded-full bg-primary transition-[height] duration-75"
                style={{ height: `${Math.max(12, level * 112)}px`, opacity: 0.55 + level * 0.45 }}
              />
            ))}
          </div>

          {timer && (
            <div className="mt-8 text-center">
              <p className="font-mono text-5xl tabular-nums">{formatDuration(timer.elapsed)}</p>
              <p className="mt-2 text-sm text-white/70">Session cost {formatINR(timer.cost)}</p>
            </div>
          )}

          {micError && <p className="mt-4 text-sm text-red-300">{micError}</p>}
          <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
            <Mic className="h-4 w-4" /> Mic live · page locked until call ends
          </div>

          <Button
            variant="danger"
            loading={ending || uploading}
            onClick={onEnd}
            className="mt-8 h-14 min-w-[180px] rounded-full text-base"
          >
            <PhoneOff className="h-5 w-5" /> End call
          </Button>
        </div>
      </div>
    );
  }

  // Incoming ringtone banner — fullscreen overlay
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0b1020]/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Incoming call</p>
        <img
          src={
            incoming!.callerAvatar ||
            `https://api.dicebear.com/9.x/thumbs/svg?seed=${incoming!.callerName}`
          }
          alt=""
          className="mx-auto mt-5 h-20 w-20 animate-pulse rounded-full bg-primary-soft"
        />
        <h2 className="mt-4 text-xl font-bold text-ink">{incoming!.callerName}</h2>
        <p className="mt-1 text-sm text-muted">
          wants a consultation
          {incoming!.pricePerMinute ? ` · ₹${incoming!.pricePerMinute}/min` : ""}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="success"
            className="min-w-32 rounded-full"
            onClick={() => dispatch(acceptCall(incoming!.callId))}
          >
            <Phone className="h-4 w-4" /> Accept
          </Button>
          <Button
            variant="danger"
            className="min-w-32 rounded-full"
            onClick={() => dispatch(rejectCall(incoming!.callId))}
          >
            <PhoneOff className="h-4 w-4" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
