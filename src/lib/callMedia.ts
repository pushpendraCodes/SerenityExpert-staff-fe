/** Web Audio ringtone + mic analyser helpers for in-call UI */

export function createRingtone() {
  let ctx: AudioContext | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let playing = false;

  const beep = () => {
    if (!ctx) ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 740;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.45);
  };

  return {
    start() {
      if (playing) return;
      playing = true;
      beep();
      interval = setInterval(beep, 1600);
    },
    stop() {
      playing = false;
      if (interval) clearInterval(interval);
      interval = null;
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
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  source.connect(analyser);
  return { stream, analyser, ctx };
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
