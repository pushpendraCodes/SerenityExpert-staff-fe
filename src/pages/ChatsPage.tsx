import { type FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchChats, fetchMessages, markChatRead, sendMessage, setActiveChat } from "@/store/slices/chatSlice";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/Button";
import { cn, formatRelativeTime, getUserAvatar, getUserName } from "@/lib/utils";
import type { User } from "@/types";

export default function ChatsPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatParam = searchParams.get("chat");

  const { list, messages, activeChatId, loading, sending } = useAppSelector((s) => s.chats);
  const myId = useAppSelector((s) => s.auth.user?._id);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedChatRef = useRef<string | null>(null);

  useEffect(() => {
    dispatch(fetchChats());
  }, [dispatch]);

  // Open chat from notification deep-link (?chat=id)
  useEffect(() => {
    if (!chatParam || list.length === 0) return;
    if (list.some((c) => c._id === chatParam) && activeChatId !== chatParam) {
      dispatch(setActiveChat(chatParam));
      dispatch(fetchMessages(chatParam));
      dispatch(markChatRead(chatParam));
    }
  }, [chatParam, list, activeChatId, dispatch]);

  // Join socket room so realtime messages arrive
  useEffect(() => {
    if (!activeChatId) return;
    const socket = getSocket();
    if (joinedChatRef.current && joinedChatRef.current !== activeChatId) {
      socket?.emit("chat:leave", joinedChatRef.current);
    }
    socket?.emit("chat:join", activeChatId);
    joinedChatRef.current = activeChatId;

    return () => {
      if (joinedChatRef.current) {
        socket?.emit("chat:leave", joinedChatRef.current);
        joinedChatRef.current = null;
      }
    };
  }, [activeChatId]);

  // Keep view scrolled to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatId]);

  const openChat = (chatId: string) => {
    dispatch(setActiveChat(chatId));
    dispatch(fetchMessages(chatId));
    dispatch(markChatRead(chatId));
    setSearchParams({ chat: chatId }, { replace: true });
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !text.trim()) return;
    await dispatch(sendMessage({ chatId: activeChatId, content: text.trim() }));
    setText("");
  };

  const activeChat = list.find((c) => c._id === activeChatId);
  const peer = activeChat && typeof activeChat.userId === "object" ? (activeChat.userId as User) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Chats</h1>
        <p className="mt-1 text-sm text-muted">Message users who started a consultation chat</p>
      </div>

      <div className="card grid h-[calc(100vh-220px)] min-h-[480px] overflow-hidden lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <ul className="max-h-48 overflow-y-auto lg:max-h-full">
            {list.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted">No chats yet</li>
            ) : (
              list.map((chat) => {
                const user = typeof chat.userId === "object" ? (chat.userId as User) : undefined;
                return (
                  <li key={chat._id}>
                    <button
                      onClick={() => openChat(chat._id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-soft/50",
                        activeChatId === chat._id && "bg-primary-soft"
                      )}
                    >
                      <img src={getUserAvatar(user)} alt="" className="h-10 w-10 rounded-full bg-primary-soft" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink">{getUserName(user)}</p>
                          {chat.lastMessageAt && (
                            <span className="text-[10px] text-muted">{formatRelativeTime(chat.lastMessageAt)}</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted">{chat.lastMessage || "No messages"}</p>
                      </div>
                      {(chat.unreadCount || 0) > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col">
          {!activeChatId ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <img src={getUserAvatar(peer)} alt="" className="h-9 w-9 rounded-full bg-primary-soft" />
                <div>
                  <p className="text-sm font-semibold text-ink">{getUserName(peer)}</p>
                  <p className="text-xs capitalize text-muted">{activeChat?.status}</p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loading ? (
                  <p className="text-center text-sm text-muted">Loading messages…</p>
                ) : (
                  <>
                    {messages.map((m) => {
                      const mine =
                        String(m.senderId) === String(myId) || m.senderRole === "expert";
                      return (
                        <div key={m._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                              mine ? "bg-primary text-white" : "bg-surface text-ink"
                            )}
                          >
                            {m.imageUrl && (
                              <img src={m.imageUrl} alt="" className="mb-2 max-h-48 rounded-lg" />
                            )}
                            {m.content && <p>{m.content}</p>}
                            <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted")}>
                              {formatRelativeTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              <form onSubmit={onSend} className="flex gap-2 border-t border-border p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-border px-4 text-sm outline-none focus:border-primary"
                />
                <Button type="submit" loading={sending} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
