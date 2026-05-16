import { useEffect, useState } from "react";

export function useRealtime(userId?: string | null) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const socket = new WebSocket(`${import.meta.env.VITE_WS_BASE_URL}/ws/${userId}`);
    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setEvents((prev) => [parsed, ...prev].slice(0, 50));
    };
    return () => socket.close();
  }, [userId]);

  return { events };
}

