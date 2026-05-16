import { api } from "@/lib/api";

export async function fetchNotifications() {
  const { data } = await api.get("/notifications?page=1&page_size=20");
  return data.items ?? [];
}

export async function markNotificationsAsReadByType(type: string | null = null) {
  const { data } = await api.post("/notifications/mark-read-by-type", { type });
  return data;
}

