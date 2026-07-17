import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiGetPaginated, getErrorMessage } from "@/lib/api";
import type { Payout } from "@/types";

interface EarningsState {
  payouts: Payout[];
  loading: boolean;
  error: string | null;
}

const initialState: EarningsState = {
  payouts: [],
  loading: false,
  error: null,
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

const earningsSlice = createSlice({
  name: "earnings",
  initialState,
  reducers: {
    clearEarningsMessage(state) {
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
      });
  },
});

export const { clearEarningsMessage } = earningsSlice.actions;
export default earningsSlice.reducer;
