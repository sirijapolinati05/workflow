import { api } from "@/lib/api";

export async function fetchReports() {
  const { data } = await api.get("/reports");
  return data;
}

