import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./store/store-context";
import { OfflineBanner } from "./components/OfflineBanner";
import OrderPage from "./pages/OrderPage";
import PosPage from "./pages/PosPage";
import KitchenPage from "./pages/KitchenPage";
import SignagePage from "./pages/SignagePage";
import { StaffAuthProvider } from "./auth/staff-auth";
import { StaffRoute } from "./components/StaffRoute";

export default function App() {
  return (
    <StaffAuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <OfflineBanner />
          <Routes>
            <Route path="/" element={<OrderPage />} />
            <Route path="/pos" element={<StaffRoute roles={["pos", "admin"]}><PosPage /></StaffRoute>} />
            <Route path="/kitchen" element={<StaffRoute roles={["kitchen", "admin"]}><KitchenPage /></StaffRoute>} />
            <Route path="/signage" element={<StaffRoute roles={["signage", "admin"]}><SignagePage /></StaffRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </StaffAuthProvider>
  );
}
