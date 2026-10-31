import { useEffect, useRef, useState } from "react";

export type NetworkStatus = "online" | "offline" | "reconnecting";

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    navigator.onLine ? "online" : "offline",
  );
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const onOnline = () => {
      setIsOnline(true);
      setStatus("reconnecting");
      setJustReconnected(true);
      clearTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        setStatus("online");
        setJustReconnected(false);
      }, 1800);
    };

    const onOffline = () => {
      clearTimer();
      setIsOnline(false);
      setStatus("offline");
      setJustReconnected(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearTimer();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { status, isOnline, justReconnected };
}
