import { api } from "@/lib/api";

export async function fetchMyTasks() {
  const { data } = await api.get("/tasks?page=1&page_size=20");
  return data.items ?? [];
}

export async function createSubmission(payload: Record<string, unknown>) {
  const { data } = await api.post("/submissions", payload);
  return data;
}

