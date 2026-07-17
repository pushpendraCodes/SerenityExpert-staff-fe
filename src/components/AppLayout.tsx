import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
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
import { clearCallNotice } from "@/store/slices/callSlice";
import { cn } from "@/lib/utils";
import type { ExpertStatus } from "@/types";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { SocketListener } from "./SocketListener";
import { FcmRegistration } from "./FcmRegistration";
import { PwaRegister } from "./PwaRegister";
import { PwaInstallBanner } from "./PwaInstallBanner";
import { getNotificationPermission, isPushSupported } from "@/lib/firebase";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/chats", label: "Chats", icon: MessageSquare },
  { to: "/earnings", label: "Earn", icon: Wallet },
  { to: "/availability", label: "Avail", icon: CalendarClock },
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
  const callNotice = useAppSelector((s) => s.calls.notice);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!callNotice) return;
    const t = setTimeout(() => dispatch(clearCallNotice()), 4500);
    return () => clearTimeout(t);
  }, [callNotice, dispatch]);

  useEffect(() => {
    const onPerm = () => setPushPermission(getNotificationPermission());
    window.addEventListener("staff-push-permission", onPerm);
    window.addEventListener("focus", onPerm);
    return () => {
      window.removeEventListener("staff-push-permission", onPerm);
      window.removeEventListener("focus", onPerm);
    };
  }, []);

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  const onStatus = (status: ExpertStatus) => {
    if (expert?.status === status) return;
    dispatch(updateStatus(status));
  };

  const enablePush = async () => {
    setEnablingPush(true);
    try {
      const fn = (window as unknown as { __enableStaffPush?: () => Promise<boolean> }).__enableStaffPush;
      const ok = fn ? await fn() : false;
      setPushPermission(getNotificationPermission());
      if (!ok && getNotificationPermission() === "denied") {
        alert(
          "Notifications are blocked. Open browser site settings → Notifications → Allow, then tap Enable again."
        );
      }
    } finally {
      setEnablingPush(false);
    }
  };

  const showPushBanner =
    isPushSupported() && pushPermission !== "granted" && pushPermission !== "unsupported";

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <SocketListener />
      <PwaRegister />
      <FcmRegistration />
      <IncomingCallBanner />
      <PwaInstallBanner appName="Staff" />

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
              {label === "Home"
                ? "Dashboard"
                : label === "Earn"
                  ? "Earnings"
                  : label === "Avail"
                    ? "Availability"
                    : label}
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
          {showPushBanner && (
            <button
              type="button"
              onClick={enablePush}
              disabled={enablingPush}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Bell className="h-4 w-4" /> Enable call alerts
            </button>
          )}
          <button
            onClick={onLogout}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-danger hover:underline"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[4.25rem] lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted">Welcome back</p>
              <h2 className="truncate text-lg font-bold text-ink">{user?.name || "Expert"}</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 sm:gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onStatus(opt.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition sm:px-3",
                      expert?.status === opt.value
                        ? "bg-white text-ink shadow-sm"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", opt.color)} />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger lg:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {showPushBanner && (
          <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 sm:mx-6">
            <div className="flex items-start gap-2 text-sm text-ink-soft">
              <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Call push alerts are off. Enable them so you get notified when the app is in the
                background or closed.
              </span>
            </div>
            <button
              type="button"
              onClick={enablePush}
              disabled={enablingPush}
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
            >
              {enablingPush ? "Enabling…" : "Enable notifications"}
            </button>
          </div>
        )}

        {callNotice && (
          <div className="mx-4 mt-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink-soft sm:mx-6">
            {callNotice}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="flex overflow-x-auto scrollbar-none">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium",
                    isActive ? "text-primary" : "text-muted"
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
                {label === "Alerts" && unread > 0 && (
                  <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-danger" />
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
