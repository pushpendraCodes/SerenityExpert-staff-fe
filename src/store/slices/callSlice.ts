import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiGet, apiGetPaginated, apiPost, apiUpload, getErrorMessage } from "@/lib/api";
import type { Call, Pagination, User } from "@/types";

const CALLS_PAGE_SIZE = 10;

export interface IncomingCall {
  callId: string;
  callerName: string;
  callerAvatar?: string;
  pricePerMinute?: number;
}

interface CallSession {
  call: Call;
  agoraToken?: string;
  channelName?: string;
}

interface CallState {
  history: Call[];
  pagination: Pagination | null;
  page: number;
  incoming: IncomingCall | null;
  activeCall: Call | null;
  agoraToken: string | null;
  channelName: string | null;
  timer: { elapsed: number; cost: number; balance: number } | null;
  loading: boolean;
  ending: boolean;
  peerEnded: boolean;
  error: string | null;
  /** Shown when user taps a stale call notification */
  notice: string | null;
}

const initialState: CallState = {
  history: [],
  pagination: null,
  page: 1,
  incoming: null,
  activeCall: null,
  agoraToken: null,
  channelName: null,
  timer: null,
  loading: false,
  ending: false,
  peerEnded: false,
  error: null,
  notice: null,
};

function callerFromCall(call: Call, fallback?: IncomingCall): IncomingCall {
  const user = call.userId && typeof call.userId !== "string" ? (call.userId as User) : null;
  return {
    callId: call._id,
    callerName: fallback?.callerName || user?.name || "A user",
    callerAvatar: fallback?.callerAvatar || user?.avatar,
    pricePerMinute: fallback?.pricePerMinute ?? call.pricePerMinute,
  };
}

export const fetchCallHistory = createAsyncThunk(
  "calls/history",
  async (page: number, { rejectWithValue }) => {
    try {
      const pageNum = page || 1;
      const res = await apiGetPaginated<Call>("/calls/history", {
        page: pageNum,
        limit: CALLS_PAGE_SIZE,
      });
      return {
        data: res.data || [],
        pagination: res.pagination,
        page: pageNum,
      };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

/**
 * Open incoming-call banner only if the call is still ringing.
 * Used when tapping push/in-app notifications for old calls.
 */
export const openIncomingCallIfAvailable = createAsyncThunk(
  "calls/openIncomingIfAvailable",
  async (payload: IncomingCall, { rejectWithValue }) => {
    try {
      const res = await apiGet<Call>(`/calls/${payload.callId}`);
      const call = res.data;
      if (!call) {
        return rejectWithValue("This call is no longer available");
      }
      if (call.status !== "ringing") {
        const msg =
          call.status === "active"
            ? "This call was already answered"
            : "This call is no longer available";
        return rejectWithValue(msg);
      }
      return callerFromCall(call, payload);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "This call is no longer available"));
    }
  }
);

export const acceptCall = createAsyncThunk(
  "calls/accept",
  async (callId: string, { rejectWithValue }) => {
    try {
      const res = await apiPost<CallSession>(`/calls/${callId}/accept`);
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to accept call"));
    }
  }
);

export const rejectCall = createAsyncThunk(
  "calls/reject",
  async (callId: string, { rejectWithValue }) => {
    try {
      await apiPost(`/calls/${callId}/reject`);
      return callId;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to reject call"));
    }
  }
);

export const endCall = createAsyncThunk(
  "calls/end",
  async (callId: string, { rejectWithValue }) => {
    try {
      const res = await apiPost<Call>(`/calls/${callId}/end`);
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to end call"));
    }
  }
);

export const uploadCallRecording = createAsyncThunk(
  "calls/uploadRecording",
  async ({ callId, blob }: { callId: string; blob: Blob }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append("recording", blob, `call_${callId}.webm`);
      const res = await apiUpload<Call>(`/calls/${callId}/recording`, form);
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Recording upload failed"));
    }
  }
);

const callSlice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    setIncomingCall(state, action: PayloadAction<IncomingCall | null>) {
      state.incoming = action.payload;
      if (action.payload) state.notice = null;
    },
    clearActiveCall(state) {
      state.activeCall = null;
      state.agoraToken = null;
      state.channelName = null;
      state.timer = null;
      state.ending = false;
      state.peerEnded = false;
    },
    setTimer(state, action: PayloadAction<{ elapsed: number; cost: number; balance: number } | null>) {
      state.timer = action.payload;
    },
    markPeerEnded(state) {
      state.peerEnded = true;
      state.incoming = null;
    },
    clearCallNotice(state) {
      state.notice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCallHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCallHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.data;
        state.pagination = action.payload.pagination;
        state.page = action.payload.page;
      })
      .addCase(fetchCallHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(openIncomingCallIfAvailable.fulfilled, (state, action) => {
        state.incoming = action.payload;
        state.notice = null;
      })
      .addCase(openIncomingCallIfAvailable.rejected, (state, action) => {
        state.incoming = null;
        state.notice = (action.payload as string) || "This call is no longer available";
      })
      .addCase(acceptCall.fulfilled, (state, action) => {
        state.incoming = null;
        state.peerEnded = false;
        state.activeCall = action.payload.call;
        state.agoraToken = action.payload.agoraToken || null;
        state.channelName = action.payload.channelName || null;
      })
      .addCase(acceptCall.rejected, (state, action) => {
        state.incoming = null;
        state.notice = (action.payload as string) || "Could not accept call";
      })
      .addCase(rejectCall.fulfilled, (state) => {
        state.incoming = null;
      })
      .addCase(endCall.pending, (state) => {
        state.ending = true;
      })
      .addCase(endCall.fulfilled, (state) => {
        state.ending = false;
        state.activeCall = null;
        state.agoraToken = null;
        state.channelName = null;
        state.timer = null;
        state.incoming = null;
        state.peerEnded = false;
      })
      .addCase(endCall.rejected, (state, action) => {
        state.ending = false;
        state.error = action.payload as string;
      });
  },
});

export const { setIncomingCall, clearActiveCall, setTimer, markPeerEnded, clearCallNotice } =
  callSlice.actions;
export default callSlice.reducer;
