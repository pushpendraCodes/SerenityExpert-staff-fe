import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export function ProtectedRoute() {
  const { isAuthenticated, hydrated } = useAppSelector((s) => s.auth);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading portal…
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
