import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiGetPaginated, apiPost, apiPut, apiUpload, getErrorMessage } from "@/lib/api";
import type { Chat, Message } from "@/types";

interface ChatState {
  list: Chat[];
  messages: Message[];
  activeChatId: string | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  list: [],
  messages: [],
  activeChatId: null,
  loading: false,
  sending: false,
  error: null,
};

function oldestFirst(messages: Message[]) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function touchChatList(state: ChatState, msg: Message) {
  const chatId = String(msg.chatId);
  const chat = state.list.find((c) => c._id === chatId);
  if (!chat) return;
  chat.lastMessage = msg.messageType === "image" ? "📷 Image" : msg.content;
  chat.lastMessageAt = msg.createdAt;
  // Move to top of inbox
  state.list = [chat, ...state.list.filter((c) => c._id !== chatId)];
  if (state.activeChatId !== chatId) {
    chat.unreadCount = (chat.unreadCount || 0) + 1;
  }
}

export const fetchChats = createAsyncThunk("chats/list", async (_, { rejectWithValue }) => {
  try {
    const res = await apiGetPaginated<Chat>("/chats", { limit: 50 });
    return res.data || [];
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const fetchMessages = createAsyncThunk(
  "chats/messages",
  async (chatId: string, { rejectWithValue }) => {
    try {
      const res = await apiGetPaginated<Message>(`/chats/${chatId}/messages`, { limit: 100 });
      return { chatId, messages: oldestFirst(res.data || []) };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chats/send",
  async (
    { chatId, content, file }: { chatId: string; content?: string; file?: File },
    { rejectWithValue }
  ) => {
    try {
      if (file) {
        const form = new FormData();
        form.append("image", file);
        if (content) form.append("content", content);
        const res = await apiUpload<Message>(`/chats/${chatId}/messages`, form);
        return res.data!;
      }
      const res = await apiPost<Message>(`/chats/${chatId}/messages`, { content });
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to send message"));
    }
  }
);

export const markChatRead = createAsyncThunk("chats/read", async (chatId: string) => {
  await apiPut(`/chats/${chatId}/read`);
  return chatId;
});

const chatSlice = createSlice({
  name: "chats",
  initialState,
  reducers: {
    setActiveChat(state, action) {
      state.activeChatId = action.payload;
      state.messages = [];
    },
    addMessage(state, action) {
      const msg = action.payload as Message;
      const chatId = String(msg.chatId);
      touchChatList(state, msg);
      if (state.activeChatId && String(state.activeChatId) === chatId) {
        if (!state.messages.some((m) => m._id === msg._id)) {
          state.messages.push(msg);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.activeChatId = action.payload.chatId;
        state.messages = action.payload.messages;
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        const msg = action.payload;
        touchChatList(state, { ...msg, chatId: msg.chatId || state.activeChatId || "" });
        if (!state.messages.some((m) => m._id === msg._id)) {
          state.messages.push(msg);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload as string;
      })
      .addCase(markChatRead.fulfilled, (state, action) => {
        const chat = state.list.find((c) => c._id === action.payload);
        if (chat) chat.unreadCount = 0;
      });
  },
});

export const { setActiveChat, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
