import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCallHistory } from "@/store/slices/callSlice";
import { Pagination } from "@/components/ui/Pagination";
import { cn, formatDuration, formatINR, formatRelativeTime, getUserAvatar, getUserName } from "@/lib/utils";
import type { User } from "@/types";

export default function CallsPage() {
  const dispatch = useAppDispatch();
  const { history, pagination, loading, error } = useAppSelector((s) => s.calls);

  useEffect(() => {
    dispatch(fetchCallHistory(1));
  }, [dispatch]);

  const goToPage = (nextPage: number) => {
    dispatch(fetchCallHistory(nextPage));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Call history</h1>
        <p className="mt-1 text-sm text-muted">Past consultations with users</p>
      </div>

      {loading && history.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-primary-soft" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : history.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-muted">No calls yet</div>
      ) : (
        <>
          <ul className={`card divide-y divide-border overflow-hidden ${loading ? "opacity-60" : ""}`}>
            {history.map((call) => {
              const user = typeof call.userId === "object" ? (call.userId as User) : undefined;
              return (
                <li key={call._id} className="flex items-center gap-4 px-5 py-4">
                  <img src={getUserAvatar(user)} alt="" className="h-11 w-11 rounded-full bg-primary-soft" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{getUserName(user)}</p>
                    <p className="text-xs text-muted">{formatRelativeTime(call.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                        call.status === "completed"
                          ? "bg-mint text-mint-text"
                          : call.status === "missed" || call.status === "rejected"
                            ? "bg-danger/10 text-danger"
                            : "bg-primary-soft text-primary"
                      )}
                    >
                      {call.status}
                    </span>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {formatINR(call.totalCost)} · {formatDuration(call.durationSeconds)}
                    </p>
                    {call.rating ? (
                      <p className="text-xs text-star">
                        ★ {call.rating}
                        {call.review ? ` — ${call.review}` : ""}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination pagination={pagination} onPageChange={goToPage} loading={loading} />
        </>
      )}
    </div>
  );
}
