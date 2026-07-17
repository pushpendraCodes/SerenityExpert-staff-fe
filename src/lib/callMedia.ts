/** Web Audio ringtone + mic analyser helpers for in-call UI */

/** Phone-like dual-tone ring — loud enough to hear on mobile speakers */
export function createRingtone() {
  let ctx: AudioContext | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let playing = false;

  const ensureCtx = async () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
    return ctx;
  };

  const beep = async () => {
    const audio = await ensureCtx();
    const now = audio.currentTime;

    // Dual oscillators (classic ringtone feel) at high volume
    const master = audio.createGain();
    master.gain.value = 0;
    master.connect(audio.destination);

    const makeOsc = (freq: number) => {
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      g.gain.value = 0.35;
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.55);
      return osc;
    };

    makeOsc(880);
    makeOsc(980);

    // Attack → sustain → release (peak ~0.85 — loud but not clipping)
    master.gain.setValueAtTime(0.001, now);
    master.gain.exponentialRampToValueAtTime(0.85, now + 0.04);
    master.gain.setValueAtTime(0.85, now + 0.4);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  };

  const vibrate = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([280, 120, 280, 120, 280]);
      }
    } catch {
      /* ignore */
    }
  };

  return {
    start() {
      if (playing) return;
      playing = true;
      void beep();
      vibrate();
      // Faster cadence so it's harder to miss
      interval = setInterval(() => {
        void beep();
        vibrate();
      }, 1100);
    },
    stop() {
      playing = false;
      if (interval) clearInterval(interval);
      interval = null;
      try {
        navigator.vibrate?.(0);
      } catch {
        /* ignore */
      }
      void ctx?.close();
      ctx = null;
    },
  };
}

export async function openMicStream(): Promise<{
  stream: MediaStream;
  analyser: AnalyserNode;
  ctx: AudioContext;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const { analyser, ctx } = buildAnalyser(stream);
  return { stream, analyser, ctx };
}

/** Build a beat-visualizer analyser from an existing stream (e.g. an Agora local audio track) */
export function buildAnalyser(stream: MediaStream): { analyser: AnalyserNode; ctx: AudioContext } {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  source.connect(analyser);
  return { analyser, ctx };
}

/** Idempotent AudioContext close — safe to call more than once (e.g. from overlapping cleanup paths) */
export function safeCloseAudioContext(ctx: AudioContext | null): void {
  if (!ctx || ctx.state === "closed") return;
  ctx.close().catch(() => {
    /* ignore — already closing/closed */
  });
}

export function startRecorder(stream: MediaStream) {
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(1000);
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
        if (recorder.state !== "inactive") recorder.stop();
        else resolve(new Blob(chunks, { type: mime }));
      }),
  };
}

export function getBeatLevels(analyser: AnalyserNode, bars = 12): number[] {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const step = Math.max(1, Math.floor(data.length / bars));
  return Array.from({ length: bars }, (_, i) => data[i * step] / 255);
}
