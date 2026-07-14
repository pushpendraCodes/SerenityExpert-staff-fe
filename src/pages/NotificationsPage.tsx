import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchNotifications, markNotificationRead } from "@/store/slices/notificationSlice";
import { Pagination } from "@/components/ui/Pagination";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

function notificationPath(n: Notification): string | null {
  if (n.type === "chat") {
    const chatId = n.data?.chatId;
    return chatId ? `/chats?chat=${String(chatId)}` : "/chats";
  }
  if (n.type === "call") {
    return "/calls";
  }
  return null;
}

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, pagination, loading, error } = useAppSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications(1));
  }, [dispatch]);

  const goToPage = (nextPage: number) => {
    dispatch(fetchNotifications(nextPage));
  };

  const onClickNotification = (n: Notification) => {
    if (!n.isRead) dispatch(markNotificationRead(n._id));
    const path = notificationPath(n);
    if (path) navigate(path);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Notifications</h1>
        <p className="mt-1 text-sm text-muted">Call requests, chats & payment updates</p>
      </div>

      {loading && list.length === 0 ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : list.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-muted">No notifications yet</div>
      ) : (
        <>
          <ul className={`card divide-y divide-border overflow-hidden ${loading ? "opacity-60" : ""}`}>
            {list.map((n) => (
              <li key={n._id}>
                <button
                  onClick={() => onClickNotification(n)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-primary-soft/40"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? "bg-border" : "bg-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Pagination pagination={pagination} onPageChange={goToPage} loading={loading} />
        </>
      )}
    </div>
  );
}
