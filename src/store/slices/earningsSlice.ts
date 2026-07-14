import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiGetPaginated, apiPost, getErrorMessage } from "@/lib/api";
import type { Payout } from "@/types";

interface EarningsState {
  payouts: Payout[];
  loading: boolean;
  withdrawing: boolean;
  error: string | null;
  message: string | null;
}

const initialState: EarningsState = {
  payouts: [],
  loading: false,
  withdrawing: false,
  error: null,
  message: null,
};

export const fetchEarnings = createAsyncThunk(
  "earnings/list",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiGetPaginated<Payout>("/experts/me/earnings", { limit: 50 });
      return res.data || [];
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

export const requestWithdraw = createAsyncThunk(
  "earnings/withdraw",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPost<Payout>("/experts/me/withdraw");
      return { payout: res.data!, message: res.message };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Withdrawal failed"));
    }
  }
);

const earningsSlice = createSlice({
  name: "earnings",
  initialState,
  reducers: {
    clearEarningsMessage(state) {
      state.message = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEarnings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.loading = false;
        state.payouts = action.payload;
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(requestWithdraw.pending, (state) => {
        state.withdrawing = true;
        state.error = null;
      })
      .addCase(requestWithdraw.fulfilled, (state, action) => {
        state.withdrawing = false;
        state.message = action.payload.message || "Withdrawal requested";
        if (action.payload.payout) {
          state.payouts = [action.payload.payout, ...state.payouts];
        }
      })
      .addCase(requestWithdraw.rejected, (state, action) => {
        state.withdrawing = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEarningsMessage } = earningsSlice.actions;
export default earningsSlice.reducer;
