import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearEarningsMessage, fetchEarnings } from "@/store/slices/earningsSlice";
import { fetchDashboard } from "@/store/slices/dashboardSlice";
import { cn, formatINR, formatRelativeTime } from "@/lib/utils";

export default function EarningsPage() {
  const dispatch = useAppDispatch();
  const { payouts, loading, error } = useAppSelector((s) => s.earnings);
  const earnings = useAppSelector((s) => s.dashboard.data?.earnings);

  useEffect(() => {
    dispatch(fetchEarnings());
    dispatch(fetchDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => dispatch(clearEarningsMessage()), 4000);
    return () => clearTimeout(t);
  }, [error, dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Earnings & payouts</h1>
        <p className="mt-1 text-sm text-muted">
          Track your earnings. Payouts are processed automatically every week, or by admin.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-muted">Lifetime earnings</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatINR(earnings?.totalEarnings || 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">This week (net)</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatINR(earnings?.weeklyEarnings?.netAmount || 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">Commission rate</p>
          <p className="mt-1 text-2xl font-bold text-ink">{earnings?.commissionPercent || 0}%</p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold text-ink">Payout history</h2>
        </div>
        {loading && payouts.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Loading…</p>
        ) : payouts.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No payouts yet</p>
        ) : (
          <ul className="divide-y divide-border">
            {payouts.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <div>
                  <p className="font-semibold text-ink">{formatINR(p.netAmount)}</p>
                  <p className="text-xs text-muted">
                    Gross {formatINR(p.amount)} − commission {formatINR(p.commission)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatRelativeTime(p.createdAt)}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
                    p.status === "completed"
                      ? "bg-mint text-mint-text"
                      : p.status === "failed"
                        ? "bg-danger/10 text-danger"
                        : "bg-primary-soft text-primary"
                  )}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
