import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiGetPaginated, apiPost, apiUpload, getErrorMessage } from "@/lib/api";
import type { Call, Pagination } from "@/types";

const CALLS_PAGE_SIZE = 10;

interface IncomingCall {
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
};

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
      .addCase(acceptCall.fulfilled, (state, action) => {
        state.incoming = null;
        state.peerEnded = false;
        state.activeCall = action.payload.call;
        state.agoraToken = action.payload.agoraToken || null;
        state.channelName = action.payload.channelName || null;
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

export const { setIncomingCall, clearActiveCall, setTimer, markPeerEnded } = callSlice.actions;
export default callSlice.reducer;
