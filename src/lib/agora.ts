/** Agora RTC voice-channel join/publish/subscribe helpers.
 * The SDK touches browser-only APIs, so it's always loaded dynamically.
 */
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";

export interface CallSession {
  client: IAgoraRTCClient;
  localAudioTrack: IMicrophoneAudioTrack;
}

/** Deterministic numeric UID from a Mongo user id — must mirror be/src/services/agora.service.ts */
export function generateUidFromUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647 || 1;
}

async function loadAgoraRTC() {
  const mod = await import("agora-rtc-sdk-ng");
  return mod.default;
}

export async function joinCallChannel(opts: {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
  onRemoteAudio?: (track: IRemoteAudioTrack) => void;
  /** Fired when the Agora transport drops or fails — caller should end the call */
  onConnectionLost?: (reason: string) => void;
}): Promise<CallSession> {
  const AgoraRTC = await loadAgoraRTC();
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  client.on("user-published", async (user, mediaType) => {
    if (mediaType !== "audio") return;
    await client.subscribe(user, mediaType);
    const remoteTrack = user.audioTrack;
    remoteTrack?.play();
    if (remoteTrack) opts.onRemoteAudio?.(remoteTrack);
  });

  client.on("connection-state-change", (curState, _revState, reason) => {
    // Only a *terminal* disconnect counts as a lost connection. Agora auto-recovers
    // transient network blips via the RECONNECTING state, and "LEAVE" is our own
    // intentional teardown — neither should end the call.
    if (curState === "DISCONNECTED" && reason && reason !== "LEAVE") {
      opts.onConnectionLost?.(String(reason));
    }
  });

  // NOTE: the "exception" event is a quality/statistics signal (e.g. AUDIO_INPUT_LEVEL_TOO_LOW
  // fires whenever the mic is briefly silent). It is NOT a fatal error and must never end the call.
  client.on("exception", (event) => {
    console.warn("[agora] exception", event?.code, event?.msg);
  });

  await client.join(opts.appId, opts.channelName, opts.token || null, opts.uid);
  const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([localAudioTrack]);

  return { client, localAudioTrack };
}

export async function leaveCallChannel(session: CallSession | null): Promise<void> {
  if (!session) return;
  try {
    session.localAudioTrack.stop();
    session.localAudioTrack.close();
  } catch {
    /* ignore */
  }
  try {
    await session.client.unpublish();
  } catch {
    /* ignore */
  }
  try {
    await session.client.leave();
  } catch {
    /* ignore */
  }
}

/** Wraps the local mic track's underlying MediaStreamTrack for analyser/recorder reuse */
export function getLocalMediaStream(session: CallSession): MediaStream {
  return new MediaStream([session.localAudioTrack.getMediaStreamTrack()]);
}
