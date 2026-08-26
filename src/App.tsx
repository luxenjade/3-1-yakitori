import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./store/store-context";
import { OfflineBanner } from "./components/OfflineBanner";
import OrderPage from "./pages/OrderPage";
import PosPage from "./pages/PosPage";
import KitchenPage from "./pages/KitchenPage";
import SignagePage from "./pages/SignagePage";

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/signage" element={<SignagePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
