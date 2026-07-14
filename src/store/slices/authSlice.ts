import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Expert, ExpertStatus, User } from "@/types";

interface AuthState {
  user: User | null;
  expert: Expert | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  loading: boolean;
  otpSent: boolean;
  devOtp: string | null;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  expert: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  hydrated: false,
  loading: false,
  otpSent: false,
  devOtp: null,
  error: null,
};

export const sendOtp = createAsyncThunk(
  "staffAuth/sendOtp",
  async (phone: string, { rejectWithValue }) => {
    try {
      const res = await apiPost<{ otp?: string }>("/auth/expert/send-otp", { phone });
      return { phone, devOtp: res.data?.otp ?? null };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to send OTP"));
    }
  }
);

export const verifyOtp = createAsyncThunk(
  "staffAuth/verifyOtp",
  async ({ phone, otp }: { phone: string; otp: string }, { rejectWithValue }) => {
    try {
      const res = await apiPost<{
        user: User;
        expert: Expert;
        accessToken: string;
        refreshToken: string;
      }>("/auth/expert/verify-otp", { phone, otp });
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Invalid OTP"));
    }
  }
);

export const fetchProfile = createAsyncThunk(
  "staffAuth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const [userRes, expertRes] = await Promise.all([
        apiGet<User>("/users/me"),
        apiGet<Expert>("/experts/me/profile"),
      ]);
      return { user: userRes.data!, expert: expertRes.data! };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

export const updateStatus = createAsyncThunk(
  "staffAuth/updateStatus",
  async (status: ExpertStatus, { rejectWithValue }) => {
    try {
      const res = await apiPut<Expert>("/experts/me/status", { status });
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to update status"));
    }
  }
);

export const logout = createAsyncThunk("staffAuth/logout", async () => {
  try {
    await apiPost("/auth/logout");
  } catch {
    /* ignore */
  }
  disconnectSocket();
});

export const registerFcmToken = createAsyncThunk(
  "staffAuth/registerFcmToken",
  async (token: string, { rejectWithValue }) => {
    try {
      await apiPut("/users/me/fcm-token", { token });
      return token;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

const authSlice = createSlice({
  name: "staffAuth",
  initialState,
  reducers: {
    hydrateAuth(state) {
      const accessToken = localStorage.getItem("staffAccessToken");
      const refreshToken = localStorage.getItem("staffRefreshToken");
      const userRaw = localStorage.getItem("staffUser");
      const expertRaw = localStorage.getItem("staffExpert");
      if (accessToken && userRaw) {
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.user = JSON.parse(userRaw);
        state.expert = expertRaw ? JSON.parse(expertRaw) : null;
        state.isAuthenticated = true;
        connectSocket(accessToken);
      }
      state.hydrated = true;
    },
    clearError(state) {
      state.error = null;
    },
    resetOtp(state) {
      state.otpSent = false;
      state.devOtp = null;
      state.error = null;
    },
    setExpert(state, action: PayloadAction<Expert>) {
      state.expert = action.payload;
      localStorage.setItem("staffExpert", JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = true;
        state.devOtp = action.payload.devOtp;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.expert = action.payload.expert;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        localStorage.setItem("staffAccessToken", action.payload.accessToken);
        localStorage.setItem("staffRefreshToken", action.payload.refreshToken);
        localStorage.setItem("staffUser", JSON.stringify(action.payload.user));
        localStorage.setItem("staffExpert", JSON.stringify(action.payload.expert));
        connectSocket(action.payload.accessToken);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.expert = action.payload.expert;
        localStorage.setItem("staffUser", JSON.stringify(action.payload.user));
        localStorage.setItem("staffExpert", JSON.stringify(action.payload.expert));
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        state.expert = action.payload;
        localStorage.setItem("staffExpert", JSON.stringify(action.payload));
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.expert = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.otpSent = false;
        state.devOtp = null;
        localStorage.removeItem("staffAccessToken");
        localStorage.removeItem("staffRefreshToken");
        localStorage.removeItem("staffUser");
        localStorage.removeItem("staffExpert");
      });
  },
});

export const { hydrateAuth, clearError, resetOtp, setExpert } = authSlice.actions;
export default authSlice.reducer;
