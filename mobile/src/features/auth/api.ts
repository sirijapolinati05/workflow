import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session-store";

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  useSessionStore.getState().setTokens(data);
  const profile = await api.get("/auth/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  useSessionStore.getState().setUser(profile.data);
  return data;
}

export async function updateProfile(payload: any) {
  const { data } = await api.patch("/users/me", payload);
  return data;
}

