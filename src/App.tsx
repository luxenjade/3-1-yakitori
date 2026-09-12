import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./store/store-context";
import { OfflineBanner } from "./components/OfflineBanner";
import TopPage from "./pages/TopPage";
import SignagePage from "./pages/SignagePage";
import TentPage from "./pages/TentPage";
import KitchenRoomPage from "./pages/KitchenRoomPage";
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
                path="/tent"
                element={
                  <StaffRoute roles={["pos", "admin"]}>
                    <TentPage />
                  </StaffRoute>
                }
              />
              <Route
                path="/kitchen"
                element={
                  <StaffRoute roles={["kitchen", "admin"]}>
                    <KitchenRoomPage />
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