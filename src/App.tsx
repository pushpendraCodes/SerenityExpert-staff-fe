import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateAuth } from "@/store/slices/authSlice";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CallsPage from "@/pages/CallsPage";
import ChatsPage from "@/pages/ChatsPage";
import EarningsPage from "@/pages/EarningsPage";
import ProfilePage from "@/pages/ProfilePage";
import AvailabilityPage from "@/pages/AvailabilityPage";
import NotificationsPage from "@/pages/NotificationsPage";
import { fetchNotifications } from "@/store/slices/notificationSlice";

function AppRoutes() {
  const dispatch = useAppDispatch();
  const { hydrated, isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(hydrateAuth());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchNotifications(1));
  }, [dispatch, isAuthenticated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="calls" element={<CallsPage />} />
          <Route path="chats" element={<ChatsPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}
