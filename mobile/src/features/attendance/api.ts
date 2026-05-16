import { api } from "@/lib/api";

export async function checkIn(notes?: string) {
  const { data } = await api.post("/attendance/check-in", { notes });
  return data;
}

export async function checkOut(notes?: string) {
  const { data } = await api.post("/attendance/check-out", { notes });
  return data;
}

export async function fetchAttendance() {
  const { data } = await api.get("/attendance");
  return data;
}

