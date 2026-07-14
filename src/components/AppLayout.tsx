import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Phone,
  UserRound,
  Wallet,
  CalendarClock,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, updateStatus } from "@/store/slices/authSlice";
import { cn } from "@/lib/utils";
import type { ExpertStatus } from "@/types";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { SocketListener } from "./SocketListener";
import { FcmRegistration } from "./FcmRegistration";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/chats", label: "Chats", icon: MessageSquare },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/availability", label: "Availability", icon: CalendarClock },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

const STATUS_OPTIONS: { value: ExpertStatus; label: string; color: string }[] = [
  { value: "online", label: "Online", color: "bg-success" },
  { value: "busy", label: "Busy", color: "bg-warning" },
  { value: "offline", label: "Offline", color: "bg-muted" },
];

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, expert } = useAppSelector((s) => s.auth);
  const unread = useAppSelector((s) => s.notifications.list.filter((n) => !n.isRead).length);

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  const onStatus = (status: ExpertStatus) => {
    if (expert?.status === status) return;
    dispatch(updateStatus(status));
  };

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <SocketListener />
      <FcmRegistration />
      <IncomingCallBanner />

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white lg:flex">
        <div className="border-b border-border px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Staff Portal</p>
          <h1 className="mt-1 text-lg font-bold text-ink">SerenityExpert</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-surface"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
              {label === "Alerts" && unread > 0 && (
                <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-semibold text-ink">{user?.name || "Expert"}</p>
          <p className="truncate text-xs text-muted">{expert?.mobile || user?.phone}</p>
          <button
            onClick={onLogout}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-danger hover:underline"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Welcome back</p>
              <h2 className="text-lg font-bold text-ink">{user?.name || "Expert"}</h2>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onStatus(opt.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    expert?.status === opt.value
                      ? "bg-white text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", opt.color)} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>

        <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-border bg-white lg:hidden">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-medium",
                  isActive ? "text-primary" : "text-muted"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
