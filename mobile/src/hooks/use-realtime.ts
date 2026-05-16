import { useEffect, useState } from "react";

export function useRealtime(userId?: string | null) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const socket = new WebSocket(`${process.env.EXPO_PUBLIC_WS_BASE_URL}/ws/${userId}`);
    socket.onmessage = (event) => {
      setEvents((prev) => [JSON.parse(event.data), ...prev].slice(0, 30));
    };
    return () => socket.close();
  }, [userId]);

  return events;
}

