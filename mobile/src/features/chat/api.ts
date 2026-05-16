import { api } from "@/lib/api";

export async function fetchMessages() {
  const { data } = await api.get("/chat/messages?page=1&page_size=20");
  return data.items ?? [];
}

export async function sendMessage(body: string) {
  const { data } = await api.post("/chat/messages", { body });
  return data;
}

