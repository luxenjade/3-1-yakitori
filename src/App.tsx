import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./store/store-context";
import { OfflineBanner } from "./components/OfflineBanner";
import TopPage from "./pages/TopPage";
import SignagePage from "./pages/SignagePage";
import CashierPage from "./pages/CashierPage";
import AdminPage from "./pages/AdminPage";
import { StaffAuthProvider } from "./auth/staff-auth";
import { StaffRoute } from "./components/StaffRoute";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

export default function App() {
  return (
    <AppErrorBoundary>
      <StaffAuthProvider>
        <StoreProvider>
          <BrowserRouter>
            <OfflineBanner />
            <Routes>
              <Route path="/" element={<TopPage />} />
              <Route path="/signage" element={<SignagePage />} />
              <Route
                path="/cashier"
                element={
                  <StaffRoute roles={["pos", "admin"]}>
                    <CashierPage />
                  </StaffRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <StaffRoute roles={["admin"]}>
                    <AdminPage />
                  </StaffRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </StaffAuthProvider>
    </AppErrorBoundary>
  );
}
