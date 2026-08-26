import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-center text-sm font-semibold py-2 px-4">
      オフライン・自動再接続中
    </div>
  );
}
