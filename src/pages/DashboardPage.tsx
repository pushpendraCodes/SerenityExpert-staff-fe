import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock3, Phone, Star, Wallet } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDashboard } from "@/store/slices/dashboardSlice";
import { fetchProfile } from "@/store/slices/authSlice";
import { formatDuration, formatINR, formatRelativeTime, getUserName } from "@/lib/utils";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((s) => s.dashboard);
  const expert = useAppSelector((s) => s.auth.expert);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchProfile());
  }, [dispatch]);

  if (loading && !data) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-primary-soft" />)}</div>;
  }

  if (error && !data) return <p className="text-danger">{error}</p>;

  const earnings = data?.earnings;
  const weekly = earnings?.weeklyEarnings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Status: <span className="font-semibold capitalize text-primary">{expert?.status || "offline"}</span>
          {" · "}₹{expert?.pricePerMinute || 0}/min
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total earnings" value={formatINR(earnings?.totalEarnings || 0)} />
        <StatCard icon={Phone} label="Calls completed" value={String(earnings?.totalCalls || 0)} />
        <StatCard icon={Clock3} label="Minutes served" value={String(earnings?.totalMinutes || 0)} />
        <StatCard icon={Star} label="Rating" value={`${(expert?.rating || 0).toFixed(1)} (${expert?.totalRatings || 0})`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">This week</h2>
            <Link to="/earnings" className="text-sm font-medium text-primary hover:underline">View earnings</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-primary-soft/60 p-3">
              <p className="text-muted">Gross</p>
              <p className="mt-1 text-lg font-bold text-ink">{formatINR(weekly?.grossAmount || 0)}</p>
            </div>
            <div className="rounded-xl bg-mint/40 p-3">
              <p className="text-muted">Net</p>
              <p className="mt-1 text-lg font-bold text-ink">{formatINR(weekly?.netAmount || 0)}</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-muted">Commission ({earnings?.commissionPercent || 0}%)</p>
              <p className="mt-1 font-bold text-ink">{formatINR(weekly?.commission || 0)}</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-muted">Calls</p>
              <p className="mt-1 font-bold text-ink">{weekly?.callCount || 0}</p>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">Recent calls</h2>
            <Link to="/calls" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(earnings?.recentCalls || []).length === 0 ? (
              <li className="py-8 text-center text-sm text-muted">No completed calls yet</li>
            ) : (
              (earnings?.recentCalls || []).slice(0, 5).map((call) => (
                <li key={call._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{getUserName(typeof call.userId === "object" ? call.userId : undefined)}</p>
                    <p className="text-xs text-muted">{formatRelativeTime(call.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatINR(call.totalCost)}</p>
                    <p className="text-xs text-muted">{formatDuration(call.durationSeconds)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
