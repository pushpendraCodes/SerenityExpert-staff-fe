import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiGetPaginated, apiPut, getErrorMessage } from "@/lib/api";
import type { Notification, Pagination } from "@/types";

const NOTIFICATIONS_PAGE_SIZE = 10;

interface NotificationState {
  list: Notification[];
  pagination: Pagination | null;
  page: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  list: [],
  pagination: null,
  page: 1,
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/list",
  async (page: number, { rejectWithValue }) => {
    try {
      const pageNum = page || 1;
      const res = await apiGetPaginated<Notification>("/users/me/notifications", {
        page: pageNum,
        limit: NOTIFICATIONS_PAGE_SIZE,
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

export const markNotificationRead = createAsyncThunk(
  "notifications/read",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiPut(`/users/me/notifications/${id}/read`);
      return id;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
        state.page = action.payload.page;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const n = state.list.find((item) => item._id === action.payload);
        if (n) n.isRead = true;
      });
  },
});

export default notificationSlice.reducer;
